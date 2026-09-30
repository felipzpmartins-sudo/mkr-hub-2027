import bcrypt from "bcryptjs";
import { getPrisma } from "../lib/prisma.js";

const localPassword = "Teste@123456";
const localUsers = [
  { id: "1aa040f0-3275-4a28-9aff-35a7fb811590", email: "teste.central@local.test", fullName: "Usuário Teste Central", phone: "11999990001", roles: ["admin"] },
  { id: "2bb040f0-3275-4a28-9aff-35a7fb811590", email: "solicitante.central@local.test", fullName: "Solicitante Local", phone: "11999990002", roles: ["user"] },
  { id: "3cc040f0-3275-4a28-9aff-35a7fb811590", email: "aprovador.central@local.test", fullName: "Aprovador Local", phone: "11999990003", roles: ["requisition_approver"] },
  { id: "4dd040f0-3275-4a28-9aff-35a7fb811590", email: "estoque.central@local.test", fullName: "Estoque Local", phone: "11999990004", roles: ["stock"] },
] as const;

const sampleSolicitations = [
  { id: "11111111-1111-4111-8111-111111111111", userId: "2bb040f0-3275-4a28-9aff-35a7fb811590", requesterName: "Solicitante Local", requesterEmail: "solicitante.central@local.test", requesterPhone: "11999990002", requestType: "product", status: "pending", approvalStatus: "pending_approval", generalDescription: "Solicitação local de material de escritório." },
  { id: "22222222-2222-4222-8222-222222222222", userId: "1aa040f0-3275-4a28-9aff-35a7fb811590", requesterName: "Usuário Teste Central", requesterEmail: "teste.central@local.test", requesterPhone: "11999990001", requestType: "internal_requisition", status: "pending", approvalStatus: "pending_approval", generalDescription: "Requisição interna local para validação de aprovador." },
  { id: "33333333-3333-4333-8333-333333333333", userId: "1aa040f0-3275-4a28-9aff-35a7fb811590", requesterName: "Usuário Teste Central", requesterEmail: "teste.central@local.test", requesterPhone: "11999990001", requestType: "product", status: "purchasing", approvalStatus: "approved_released", generalDescription: "Solicitação administrativa local já liberada." },
] as const;

async function seed(): Promise<void> {
  const prisma = getPrisma();
  const passwordHash = await bcrypt.hash(localPassword, 12);

  for (const localUser of localUsers) {
    await prisma.user.upsert({
      where: { id: localUser.id },
      update: { email: localUser.email, passwordHash, fullName: localUser.fullName, phone: localUser.phone, status: "ACTIVE", mustResetPassword: false },
      create: { id: localUser.id, email: localUser.email, passwordHash, fullName: localUser.fullName, phone: localUser.phone, status: "ACTIVE" },
    });
    await prisma.profile.upsert({
      where: { userId: localUser.id },
      update: { fullName: localUser.fullName, phone: localUser.phone },
      create: { userId: localUser.id, fullName: localUser.fullName, phone: localUser.phone },
    });
    for (const role of localUser.roles) {
      await prisma.userRole.upsert({ where: { userId_role: { userId: localUser.id, role } }, update: {}, create: { userId: localUser.id, role } });
    }
  }

  for (const sample of sampleSolicitations) {
    await prisma.approval.deleteMany({ where: { solicitationId: sample.id } });
    await prisma.statusHistory.deleteMany({ where: { solicitationId: sample.id } });
    await prisma.solicitation.upsert({ where: { id: sample.id }, update: sample, create: sample });
    await prisma.solicitation.update({
      where: { id: sample.id },
      data: { approvedCount: 0, releasedAt: null, stockStatus: null },
    });
    await prisma.statusHistory.create({
      data: { solicitationId: sample.id, changedBy: sample.userId, oldStatus: null, newStatus: sample.status, justification: "Initial local laboratory solicitation." },
    });
  }

  console.info("Seeded local laboratory users and solicitations.");
}

seed().catch((error: unknown) => {
  console.error("Unable to seed the local laboratory data.", error);
  process.exitCode = 1;
}).finally(async () => {
  await getPrisma().$disconnect();
});
