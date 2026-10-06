import { readFile } from "node:fs/promises";
import { Client } from "pg";

const quote = (value) => `"${value.replaceAll('"', '""')}"`;
const jsonColumns = new Set(["assigned_to", "assigned_names", "attachments", "deliverables", "notes"]);
const restoreValue = (value) => value && typeof value === "object" && value.type === "buffer" && typeof value.base64 === "string"
  ? Buffer.from(value.base64, "base64")
  : value;

const connectionString = process.env.DATABASE_URL;
const backupPath = process.env.CENTRAL_VIDEO_BACKUP_PATH;
if (!connectionString || !backupPath) throw new Error("DATABASE_URL e CENTRAL_VIDEO_BACKUP_PATH são obrigatórias.");

const backup = JSON.parse(await readFile(backupPath, "utf8"));
// Older backups used the public schema. In the shared MKR HUB database every
// video table is deliberately restored into the isolated `videos` schema.
const tables = backup.tables
  .filter((table) => ["public", "videos"].includes(table.schema))
  .map((table) => ({ ...table, schema: "videos" }));
if (!tables.length) throw new Error("O backup não contém tabelas do Central de Vídeos.");

const client = new Client({ connectionString });
await client.connect();
try {
  await client.query("BEGIN");
  await client.query("CREATE SCHEMA IF NOT EXISTS videos; CREATE EXTENSION IF NOT EXISTS pgcrypto");
  for (const schema of ["videos"]) {
    const users = `${quote(schema)}.${quote("users")}`;
    const requests = `${quote(schema)}.${quote("video_requests")}`;
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${users} (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text UNIQUE NOT NULL,
        name text NOT NULL, password_hash text NOT NULL, role text NOT NULL
        CHECK (role IN ('solicitante','capitao','tripulante')), crew_key text UNIQUE,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS ${requests} (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL, description text,
        video_type text NOT NULL, brand text, platform text, format text, orientation text,
        deadline date, status text NOT NULL DEFAULT 'new', requester_id uuid REFERENCES ${users}(id) ON DELETE SET NULL,
        requester_name text NOT NULL, assigned_to jsonb NOT NULL DEFAULT '[]', assigned_names jsonb NOT NULL DEFAULT '[]',
        attachments jsonb NOT NULL DEFAULT '[]', deliverables jsonb NOT NULL DEFAULT '[]', notes jsonb NOT NULL DEFAULT '[]',
        progress integer NOT NULL DEFAULT 0, whatsapp text, drive_url text,
        created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
  }
  await client.query("SET session_replication_role = replica");
  await client.query("TRUNCATE TABLE videos.video_requests, videos.users RESTART IDENTITY CASCADE");
  for (const table of tables) for (const row of table.rows) {
    const columns = table.columns.map((column) => column.name).filter((column) => column in row);
    if (!columns.length) continue;
    const values = columns.map((column) => {
      const value = restoreValue(row[column]);
      return jsonColumns.has(column) ? JSON.stringify(value ?? []) : value;
    });
    await client.query(`INSERT INTO ${quote(table.schema)}.${quote(table.name)} (${columns.map(quote).join(", ")}) VALUES (${columns.map((_, index) => `$${index + 1}`).join(", ")})`, values);
  }
  await client.query("SET session_replication_role = DEFAULT");
  await client.query("COMMIT");
  console.log(`Restauração concluída: ${tables.length} tabelas.`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
