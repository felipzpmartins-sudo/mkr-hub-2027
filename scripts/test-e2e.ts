import EmbeddedPostgres from "embedded-postgres";
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { Client } from "pg";
import { createServer } from "node:net";
import { resolve } from "node:path";

const demoPreview = process.env.DEMO_PREVIEW === "true";

async function freePort() {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No port available");
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return address.port;
}

async function main() {
  const [dbPort, appPort] = await Promise.all([freePort(), freePort()]);
  const password = randomBytes(24).toString("hex");
  // Windows PostgreSQL binaries require an ASCII path when the home directory has accents.
  const workspace =
    process.platform === "win32"
      ? execFileSync(
          "powershell.exe",
          [
            "-NoProfile",
            "-Command",
            "(New-Object -ComObject Scripting.FileSystemObject).GetFolder($env:MKR_E2E_WORKSPACE).ShortPath",
          ],
          {
            env: { ...process.env, MKR_E2E_WORKSPACE: process.cwd() },
            encoding: "utf8",
            windowsHide: true,
          },
        ).trim()
      : process.cwd();
  const directory = resolve(workspace, ".local", `e2e-${Date.now()}`);
  await mkdir(directory, { recursive: true });
  const environment = {
    ...process.env,
    DATABASE_URL: `postgresql://postgres:${password}@127.0.0.1:${dbPort}/mkr_hub_test`,
    AUTH_SECRET: randomBytes(32).toString("base64"),
    AUTH_URL: `http://localhost:${appPort}`,
    AUTH_TRUST_HOST: "true",
    TRUST_PROXY: "false",
    NEXT_TELEMETRY_DISABLED: "1",
    ADMIN_NAME: demoPreview ? "MKR Demo" : "Workspace Admin",
    ADMIN_EMAIL: demoPreview ? "demo@mkrhub.local" : "admin@example.test",
    ADMIN_PASSWORD: demoPreview ? "MKRDemo2027!" : randomBytes(24).toString("hex"),
    TEST_USER_PASSWORD: randomBytes(24).toString("hex"),
    TEST_ARTIFACT_DIR: directory,
  };
  const databaseDir = resolve(directory, "postgres");
  let cluster: {
    initialise(): Promise<void>;
    start(): Promise<void>;
    stop(): Promise<void>;
    createDatabase(name: string): Promise<void>;
  };
  if (process.platform === "win32") {
    const packageName = "@embedded-postgres/windows-x64";
    const binary = (await import(packageName)) as { initdb: string; pg_ctl: string };
    const shortFile = (path: string) =>
      execFileSync(
        "powershell.exe",
        [
          "-NoProfile",
          "-Command",
          "(New-Object -ComObject Scripting.FileSystemObject).GetFile($env:MKR_E2E_FILE).ShortPath",
        ],
        { env: { ...process.env, MKR_E2E_FILE: path }, encoding: "utf8", windowsHide: true },
      ).trim();
    const initdb = shortFile(binary.initdb),
      pgCtl = shortFile(binary.pg_ctl);
    cluster = {
      async initialise() {
        const passwordFile = resolve(directory, "pg-password");
        await writeFile(passwordFile, password);
        try {
          execFileSync(
            initdb,
            [
              "-D",
              databaseDir,
              "--username=postgres",
              "--auth=scram-sha-256",
              `--pwfile=${passwordFile}`,
              "--encoding=UTF8",
              "--locale=C",
            ],
            { windowsHide: true, stdio: "pipe" },
          );
        } finally {
          await unlink(passwordFile);
        }
      },
      async start() {
        execFileSync(
          pgCtl,
          [
            "-D",
            databaseDir,
            "-l",
            resolve(directory, "postgres.log"),
            "-w",
            "start",
            "-o",
            `-p ${dbPort} -h 127.0.0.1`,
          ],
          { windowsHide: true, stdio: "ignore", timeout: 60_000 },
        );
      },
      async stop() {
        execFileSync(pgCtl, ["-D", databaseDir, "-m", "fast", "-w", "stop"], {
          windowsHide: true,
          stdio: "pipe",
        });
      },
      async createDatabase() {
        const client = new Client({
          host: "127.0.0.1",
          port: dbPort,
          user: "postgres",
          password,
          database: "postgres",
        });
        await client.connect();
        try {
          await client.query('CREATE DATABASE "mkr_hub_test"');
        } finally {
          await client.end();
        }
      },
    };
  } else {
    cluster = new EmbeddedPostgres({
      databaseDir,
      port: dbPort,
      user: "postgres",
      password,
      authMethod: "scram-sha-256",
      persistent: true,
      initdbFlags: ["--encoding=UTF8", "--locale=C"],
      postgresFlags: ["-h", "127.0.0.1"],
      onLog: () => {},
      onError: () => {},
    });
  }
  const run = (args: string[]) =>
    new Promise<void>((resolve, reject) => {
      const child = spawn(process.execPath, args, {
        env: environment,
        stdio: "inherit",
        windowsHide: true,
      });
      child.on("error", reject);
      child.on("exit", (code) =>
        code === 0 ? resolve() : reject(new Error(`Command failed (${code}): ${args[0]}`)),
      );
    });
  let app: ChildProcess | undefined;
  let serverLog = "";
  let started = false;
  try {
    console.log("Initializing isolated PostgreSQL test cluster...");
    await cluster.initialise();
    await cluster.start();
    started = true;
    await cluster.createDatabase("mkr_hub_test");
    await run(["node_modules/prisma/build/index.js", "migrate", "deploy"]);
    await run(["--import", "tsx", "prisma/seed.ts"]);
    await run(["--import", "tsx", "prisma/seed.ts"]);
    await run(["--import", "tsx", "scripts/create-admin.ts"]);
    if (demoPreview) await run(["--import", "tsx", "scripts/setup-demo.ts"]);
    app = spawn(
      process.execPath,
      ["node_modules/next/dist/bin/next", "start", "-p", String(appPort), "-H", "127.0.0.1"],
      { env: environment, stdio: ["ignore", "pipe", "pipe"], windowsHide: true },
    );
    app.stdout?.on("data", (chunk) => {
      serverLog += String(chunk);
    });
    app.stderr?.on("data", (chunk) => {
      serverLog += String(chunk);
    });
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      try {
        const response = await fetch(`${environment.AUTH_URL}/api/health`);
        if (response.ok) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (!ready) throw new Error("Test server did not start; inspect the local server log.");
    if (demoPreview) {
      console.log(`Demo pronta em ${environment.AUTH_URL}`);
      console.log(`Login: ${environment.ADMIN_EMAIL}`);
      console.log(`Senha: ${environment.ADMIN_PASSWORD}`);
      await new Promise<void>(() => {});
    }
    await run(["node_modules/@playwright/test/cli.js", "test", ...process.argv.slice(2)]);
    console.log(`Browser verification complete. Screenshots: ${directory}`);
  } finally {
    if (app && app.exitCode === null) {
      const closed = new Promise((resolve) => app!.once("exit", resolve));
      app.kill();
      await closed;
    }
    if (started) await cluster.stop();
    await writeFile(
      resolve(directory, "server.log"),
      serverLog
        .replaceAll(password, "[redacted]")
        .replaceAll(environment.AUTH_SECRET, "[redacted]"),
    );
  }
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Integration test failed.");
  process.exit(1);
});
