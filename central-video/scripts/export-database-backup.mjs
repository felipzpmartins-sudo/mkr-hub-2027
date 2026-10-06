import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Client } from "pg";

function quoteIdentifier(value) {
  return `"${value.replaceAll('"', '""')}"`;
}

function jsonReplacer(_, value) {
  return Buffer.isBuffer(value) ? { type: "buffer", base64: value.toString("base64") } : value;
}

async function main() {
  const connectionString = process.env.CENTRAL_VIDEO_DATABASE_URL;
  if (!connectionString) throw new Error("A conexão de backup não foi fornecida.");

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const { rows: tables } = await client.query(`
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_schema IN ('public', 'videos') AND table_type = 'BASE TABLE'
      ORDER BY table_schema, table_name
    `);
    const data = [];
    for (const table of tables) {
      const columns = await client.query(
        `SELECT column_name, data_type, is_nullable, column_default
         FROM information_schema.columns
         WHERE table_schema = $1 AND table_name = $2
         ORDER BY ordinal_position`,
        [table.table_schema, table.table_name],
      );
      const rows = await client.query(
        `SELECT * FROM ${quoteIdentifier(table.table_schema)}.${quoteIdentifier(table.table_name)}`,
      );
      data.push({
        schema: table.table_schema,
        name: table.table_name,
        columns: columns.rows.map((column) => ({
          name: column.column_name,
          dataType: column.data_type,
          nullable: column.is_nullable === "YES",
          defaultValue: column.column_default,
        })),
        rows: rows.rows,
      });
    }

    const backupDir = resolve(process.cwd(), "backups");
    await mkdir(backupDir, { recursive: true });
    const timestamp = new Date().toISOString().replaceAll(":", "-").replace(/\.\d{3}Z$/, "Z");
    const backupPath = resolve(backupDir, `central-video-${timestamp}.json`);
    await writeFile(
      backupPath,
      JSON.stringify({ format: "central-video-logical-backup/v1", generatedAt: new Date().toISOString(), tables: data }, jsonReplacer, 2),
    );
    console.log(`Backup concluído: ${data.length} tabelas e ${data.reduce((total, table) => total + table.rows.length, 0)} registros em ${backupPath}`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Não foi possível criar o backup.");
  process.exit(1);
});
