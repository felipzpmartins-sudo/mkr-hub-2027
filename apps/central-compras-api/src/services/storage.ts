import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const storageRoot = path.resolve(process.cwd(), ".storage");

function resolveStoragePath(storagePath: string): string {
  if (!storagePath || path.isAbsolute(storagePath)) {
    throw new Error("Invalid storage path.");
  }

  const resolved = path.resolve(storageRoot, storagePath);
  const storagePrefix = `${storageRoot}${path.sep}`;

  if (!resolved.startsWith(storagePrefix)) {
    throw new Error("Invalid storage path.");
  }

  return resolved;
}

export function buildStoragePath(solicitationId: string, originalName: string): string {
  const extension = path.extname(path.basename(originalName)).toLowerCase().slice(0, 16);
  return path.posix.join(solicitationId, `${randomUUID()}${extension}`);
}

export async function saveFile(storagePath: string, content: Buffer): Promise<void> {
  const destination = resolveStoragePath(storagePath);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, content, { flag: "wx" });
}

export async function getFile(storagePath: string): Promise<Buffer> {
  return readFile(resolveStoragePath(storagePath));
}

export async function deleteFile(storagePath: string): Promise<void> {
  await rm(resolveStoragePath(storagePath), { force: true });
}
