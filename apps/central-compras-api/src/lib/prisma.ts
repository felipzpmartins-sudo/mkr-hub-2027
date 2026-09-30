import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { env } from "../config/env.js";

let prisma: PrismaClient | undefined;

/**
 * Creates a database client only when a future route actually needs it.
 * The health endpoint deliberately does not call this function.
 */
export function getPrisma(): PrismaClient {
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required before database features are enabled.");
  }

  prisma ??= new PrismaClient({
    adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
  });

  return prisma;
}
