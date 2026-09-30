import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const email = process.env.ADMIN_EMAIL;
  if (!email) throw new Error("Configure ADMIN_EMAIL para a prévia.");
  const user = await db.user.findUniqueOrThrow({ where: { email } });
  const systems = await db.system.findMany({ orderBy: { createdAt: "asc" } });

  await db.$transaction(
    systems.flatMap((system) => [
      db.system.update({
        where: { id: system.id },
        data: { status: "ONLINE", url: `https://example.com/${system.slug}` },
      }),
      db.userSystemAccess.upsert({
        where: { userId_systemId: { userId: user.id, systemId: system.id } },
        update: { enabled: true, role: "ADMIN" },
        create: { userId: user.id, systemId: system.id, enabled: true, role: "ADMIN" },
      }),
    ]),
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Falha ao preparar a prévia.");
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
