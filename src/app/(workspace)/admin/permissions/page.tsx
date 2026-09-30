import Link from "next/link";
import { Search, ArrowUpRight } from "lucide-react";
import { requireAdmin } from "@/services/authorization";
import { db } from "@/lib/db";
import { PageHeading, EmptyState, Pagination } from "@/components/ui";
import { pageNumber } from "@/lib/format";
export const metadata = { title: "Permissões" };
export default async function PermissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const q = (params.q || "").slice(0, 120);
  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { email: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};
  const total = await db.user.count({ where });
  const page = Math.min(pageNumber(params.page), Math.max(1, Math.ceil(total / 15)));
  const [users, systems] = await Promise.all([
    db.user.findMany({
      where,
      select: { id: true, name: true, email: true, status: true, accesses: true },
      take: 15,
      skip: (page - 1) * 15,
      orderBy: { name: "asc" },
    }),
    db.system.findMany({ orderBy: { createdAt: "asc" } }),
  ]);
  return (
    <>
      <PageHeading
        eyebrow="ADMINISTRAÇÃO"
        title="Permissões"
        description="Uma visão de quem pode acessar cada sistema e com qual perfil."
      />
      <form className="filter-bar">
        <div className="search-field">
          <Search size={17} />
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar usuário"
            aria-label="Buscar usuário"
          />
        </div>
        <button className="button button-secondary">Buscar</button>
      </form>
      <section className="panel table-panel">
        {users.length ? (
          <div className="table-scroll">
            <table className="permissions-table">
              <thead>
                <tr>
                  <th>Usuário</th>
                  {systems.map((s) => (
                    <th key={s.id}>{s.name}</th>
                  ))}
                  <th>Gerenciar</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.name}</strong>
                      <small className="table-subtext">
                        {user.status === "INACTIVE" ? "Conta inativa" : user.email}
                      </small>
                    </td>
                    {systems.map((system) => {
                      const access = user.accesses.find((a) => a.systemId === system.id);
                      return (
                        <td key={system.id}>
                          {access?.enabled ? (
                            <span
                              className={`permission-tag ${user.status === "INACTIVE" ? "permission-inactive" : ""}`}
                            >
                              {access.role}
                            </span>
                          ) : (
                            <span className="muted">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td>
                      <Link className="text-link" href={`/admin/users/${user.id}#access`}>
                        Editar <ArrowUpRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Nenhum usuário encontrado"
            description="Altere a busca para consultar as permissões."
          />
        )}
        <Pagination page={page} total={total} base="/admin/permissions" query={{ q }} />
      </section>
      <p className="page-note">
        Administradores também precisam de permissão explícita para acessar cada sistema. Contas
        inativas não podem entrar no HUB.
      </p>
    </>
  );
}
