import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { Client } from "pg";

const port = 5435;
const databaseName = "central_video_local";

function shortFile(path: string) {
  return execFileSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      "(New-Object -ComObject Scripting.FileSystemObject).GetFile($env:CENTRAL_VIDEO_PATH).ShortPath",
    ],
    { env: { ...process.env, CENTRAL_VIDEO_PATH: path }, encoding: "utf8", windowsHide: true },
  ).trim();
}

function shortFolder(path: string) {
  return execFileSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      "(New-Object -ComObject Scripting.FileSystemObject).GetFolder($env:CENTRAL_VIDEO_PATH).ShortPath",
    ],
    { env: { ...process.env, CENTRAL_VIDEO_PATH: path }, encoding: "utf8", windowsHide: true },
  ).trim();
}

async function main() {
  if (process.platform !== "win32") throw new Error("Este iniciador local foi preparado para Windows.");
  const root = resolve(process.cwd(), ".local", "postgres");
  const dataDir = resolve(root, "data");
  await mkdir(dataDir, { recursive: true });
  const binary = (await import("@embedded-postgres/windows-x64")) as { initdb: string; pg_ctl: string };
  const initdb = shortFile(binary.initdb);
  const pgCtl = shortFile(binary.pg_ctl);
  const localDataDir = shortFolder(dataDir);

  if (!existsSync(resolve(dataDir, "PG_VERSION"))) {
    execFileSync(initdb, ["-D", localDataDir, "--username=postgres", "--auth=trust", "--encoding=UTF8", "--locale=C"], {
      windowsHide: true,
      stdio: "pipe",
    });
  }

  try {
    execFileSync(pgCtl, ["-D", localDataDir, "-w", "start", "-o", `-p ${port} -h 127.0.0.1`], {
      windowsHide: true,
      stdio: "pipe",
    });
  } catch (error) {
    if (!(error instanceof Error) || !/already running/i.test(error.message)) throw error;
  }

  const client = new Client({ host: "127.0.0.1", port, user: "postgres", database: "postgres" });
  await client.connect();
  try {
    await client.query(`CREATE DATABASE ${databaseName}`);
  } catch (error) {
    if (!(error instanceof Error) || !/already exists/i.test(error.message)) throw error;
  } finally {
    await client.end();
  }
  console.log(`PostgreSQL local pronto em postgresql://postgres@127.0.0.1:${port}/${databaseName}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Não foi possível iniciar o PostgreSQL local.");
  process.exit(1);
});
