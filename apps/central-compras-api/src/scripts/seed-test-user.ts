import bcrypt from "bcryptjs";
import { getPrisma } from "../lib/prisma.js";

const testUser = {
  id: "1aa040f0-3275-4a28-9aff-35a7fb811590",
  email: "teste.central@local.test",
  password: "Teste@123456",
  fullName: "Usuário Teste Central",
  role: "admin",
};

async function seed(): Promise<void> {
  const prisma = getPrisma();
  const passwordHash = await bcrypt.hash(testUser.password, 12);

  await prisma.user.upsert({
    where: { id: testUser.id },
    update: {
      email: testUser.email,
      passwordHash,
      fullName: testUser.fullName,
      status: "ACTIVE",
      mustResetPassword: false,
    },
    create: {
      id: testUser.id,
      email: testUser.email,
      passwordHash,
      fullName: testUser.fullName,
      status: "ACTIVE",
    },
  });

  await prisma.profile.upsert({
    where: { userId: testUser.id },
    update: { fullName: testUser.fullName },
    create: { userId: testUser.id, fullName: testUser.fullName },
  });

  await prisma.userRole.upsert({
    where: { userId_role: { userId: testUser.id, role: testUser.role } },
    update: {},
    create: { userId: testUser.id, role: testUser.role },
  });

  // Do not print the password or any session material.
  console.info(`Seeded local test user ${testUser.email}.`);
}

seed()
  .catch((error: unknown) => {
    console.error("Unable to seed the local laboratory user.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
