import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const systems = [
  {
    name: "Central de Compras",
    slug: "central-de-compras",
    description: "Solicitações, aprovações e acompanhamento de compras.",
    icon: "shopping",
  },
  {
    name: "Central de Marketing",
    slug: "central-de-marketing",
    description: "Solicitações de artes e materiais de marketing",
    icon: "megaphone",
  },
  {
    name: "Maker Car",
    slug: "maker-car",
    description: "Gestão e reserva de veículos",
    icon: "car",
  },
  {
    name: "Central de Vídeos",
    slug: "central-de-videos",
    description: "Solicitações e acompanhamento de produções de vídeo",
    icon: "video",
  },
  {
    name: "Maker Wallet",
    slug: "maker-wallet",
    description: "Gestão segura de acessos e credenciais",
    icon: "shield",
  },
];
async function main() {
  if (!process.env.DATABASE_URL) throw new Error("Configure DATABASE_URL.");
  for (const system of systems)
    await db.system.upsert({
      where: { slug: system.slug },
      update: { name: system.name, description: system.description, icon: system.icon },
      create: system,
    });
  console.log(
    "Cinco sistemas cadastrados. Configure URLs, status e permissões no painel administrativo.",
  );
}
main()
  .catch(() => {
    console.error("Não foi possível executar o seed. Verifique a conexão e as migrations.");
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
