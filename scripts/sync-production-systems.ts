import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL não configurada.");

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

type SystemDefinition = {
  slug: string;
  name: string;
  description: string;
  icon: string;
  url: string | undefined;
};

type ProductionSystem = Omit<SystemDefinition, "url"> & { url: string };

const systemDefinitions: SystemDefinition[] = [
  {
    slug: "central-de-compras",
    name: "Central de Compras",
    description: "Solicitações, aprovações e acompanhamento de compras.",
    icon: "shopping",
    url: process.env.CENTRAL_PURCHASES_ORIGIN,
  },
  {
    slug: "central-de-marketing",
    name: "Central de Marketing",
    description: "Solicitações de artes e materiais de marketing.",
    icon: "megaphone",
    url: process.env.CENTRAL_MARKETING_ORIGIN,
  },
  {
    slug: "maker-wallet",
    name: "Maker Wallet",
    description: "Gestão segura de acessos e credenciais.",
    icon: "shield",
    url: process.env.MAKER_WALLET_ORIGIN,
  },
  {
    slug: "central-de-videos",
    name: "Central de Vídeos",
    description: "Solicitações e acompanhamento de produções de vídeo.",
    icon: "video",
    url: process.env.CENTRAL_VIDEO_ORIGIN,
  },
];

const systems = systemDefinitions.filter((system): system is ProductionSystem => !!system.url);

async function main() {
  // Railway can retain a database from an earlier deployment where this
  // additive migration was not recorded. Ensure the SSO secret column exists
  // before dashboard queries use it. This never removes or rewrites data.
  await db.$executeRawUnsafe(
    'ALTER TABLE "user_system_access" ADD COLUMN IF NOT EXISTS "encrypted_external_secret" TEXT',
  );

  for (const system of systems) {
    await db.system.upsert({
      where: { slug: system.slug },
      update: {
        name: system.name,
        description: system.description,
        icon: system.icon,
        url: system.url,
        status: "ONLINE",
      },
      create: { ...system, status: "ONLINE" },
    });
  }
  console.log(`Sistemas de produção sincronizados: ${systems.map((system) => system.slug).join(", ")}.`);
}

main()
  .finally(() => db.$disconnect());
