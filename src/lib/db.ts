import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalDb = globalThis as unknown as { prisma?: PrismaClient };
export const db =
  globalDb.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 5000,
      max: 10,
    }),
  });
if (process.env.NODE_ENV !== "production") globalDb.prisma = db;

let ssoColumnReady: Promise<void> | undefined;

/**
 * Supports databases created before the SSO secret field was introduced.
 * This is an idempotent, additive migration and deliberately preserves all
 * existing rows.
 */
export function ensureHubSchema() {
  ssoColumnReady ??= db
    .$executeRawUnsafe(
      'ALTER TABLE "user_system_access" ADD COLUMN IF NOT EXISTS "encrypted_external_secret" TEXT',
    )
    .then(() => undefined);
  return ssoColumnReady;
}
