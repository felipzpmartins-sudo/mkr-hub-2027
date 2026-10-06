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
  ssoColumnReady ??= (async () => {
      await db.$executeRawUnsafe(
        'ALTER TABLE "user_system_access" ADD COLUMN IF NOT EXISTS "encrypted_external_secret" TEXT',
      );
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "sso_tickets" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "token_hash" TEXT NOT NULL,
          "encrypted_payload" TEXT NOT NULL,
          "expires_at" TIMESTAMP(3) NOT NULL,
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "user_id" TEXT NOT NULL
        )
      `);
      await db.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "sso_tickets_token_hash_key" ON "sso_tickets"("token_hash")');
      await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "sso_tickets_expires_at_idx" ON "sso_tickets"("expires_at")');
      await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "sso_tickets_user_id_expires_at_idx" ON "sso_tickets"("user_id", "expires_at")');

      // Keep the catalog aligned with the deployed services. These are all
      // reachable through MKR HUB; Wallet can still enforce its separate
      // authorization request after the person clicks it.
      const systems = [
        ["central-de-compras", process.env.CENTRAL_PURCHASES_ORIGIN],
        ["central-de-marketing", process.env.CENTRAL_MARKETING_ORIGIN],
        ["central-de-videos", process.env.CENTRAL_VIDEO_ORIGIN],
        ["maker-wallet", process.env.MAKER_WALLET_ORIGIN],
      ] as const;
      await Promise.all(
        systems
          .filter(([, url]) => !!url)
          .map(([slug, url]) =>
            db.system.updateMany({
              where: { slug },
              data: { status: "ONLINE", url },
            }),
          ),
      );
    })();
  return ssoColumnReady;
}
