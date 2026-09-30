import Link from "next/link";
import { Plus, ArrowUpRight } from "lucide-react";
import { requireAdmin } from "@/services/authorization";
import { db } from "@/lib/db";
import { Badge, EmptyState, PageHeading } from "@/components/ui";
import { SystemIcon } from "@/components/system-card";
export const metadata = { title: "Sistemas" };
export default async function AdminSystemsPage() {
  await requireAdmin();
  const systems = await db.system.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { accesses: { where: { enabled: true, user: { status: "ACTIVE" } } } } },
    },
  });
  return (
    <>
      <PageHeading
        eyebrow="ADMINISTRAÇÃO"
        title="Sistemas"
        description="Gerencie o catálogo de aplicações do ecossistema MKR."
        action={
          <Link href="/admin/systems/new" className="button button-primary">
            <Plus size={17} /> Novo sistema
          </Link>
        }
      />
      <div className="admin-system-list">
        {systems.map((system) => (
          <article key={system.id} className="panel admin-system-row">
            <SystemIcon icon={system.icon} />
            <div className="admin-system-info">
              <h3>{system.name}</h3>
              <p>{system.description}</p>
              <span>{system.url || "URL ainda não configurada"}</span>
            </div>
            <div className="admin-system-meta">
              <Badge value={system.status} />
              <span>{system._count.accesses} usuários ativos</span>
            </div>
            <Link
              href={`/admin/systems/${system.id}`}
              className="button button-secondary button-small"
            >
              Configurar <ArrowUpRight size={15} />
            </Link>
          </article>
        ))}
      </div>
      {!systems.length && (
        <EmptyState
          title="Seu catálogo está vazio"
          description="Cadastre um sistema ou execute o seed inicial."
        />
      )}
    </>
  );
}
