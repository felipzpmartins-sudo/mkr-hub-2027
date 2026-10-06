import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  await db.$transaction([
    db.system.update({
      where: { slug: "central-de-compras" },
      data: { status: "ONLINE", url: "http://127.0.0.1:4173" },
    }),
    db.system.update({
      where: { slug: "central-de-marketing" },
      data: { status: "ONLINE", url: "http://127.0.0.1:4174" },
    }),
    db.system.update({
      where: { slug: "maker-wallet" },
      data: { status: "ONLINE", url: "http://127.0.0.1:4175" },
    }),
    db.system.update({
      where: { slug: "central-de-videos" },
      data: { status: "ONLINE", url: "http://127.0.0.1:4176" },
    }),
  ]);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Falha ao preparar a prévia SSO.");
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
