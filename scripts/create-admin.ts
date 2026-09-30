import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../src/lib/password";
import { emailSchema, passwordSchema } from "../src/lib/validation";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
async function main() {
  const email = emailSchema.parse(process.env.ADMIN_EMAIL);
  const password = passwordSchema.parse(process.env.ADMIN_PASSWORD);
  const name = process.env.ADMIN_NAME?.trim();
  if (!name || name.length > 100) throw new Error("Configure ADMIN_NAME (até 100 caracteres).");
  const passwordHash = await hashPassword(password);
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(7242027)`;
    if (await tx.user.count({ where: { hubRole: "ADMIN", status: "ACTIVE" } }))
      throw new Error("Já existe um administrador ativo. Use o painel para criar outros usuários.");
    const user = await tx.user.create({ data: { name, email, passwordHash, hubRole: "ADMIN" } });
    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: "USER_CREATED",
        target: user.id,
        metadata: { source: "bootstrap" },
      },
    });
  });
  console.log("Primeiro administrador criado. Faça login e configure os acessos aos sistemas.");
}
main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Falha ao criar administrador.");
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
