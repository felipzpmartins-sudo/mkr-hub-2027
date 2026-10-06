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
    .then(async () => {
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
    });
  return ssoColumnReady;
}
