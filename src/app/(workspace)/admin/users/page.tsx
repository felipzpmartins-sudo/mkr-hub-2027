import Link from "next/link";
import { Plus, Search, ArrowUpRight } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/services/authorization";
import { Avatar, Badge, EmptyState, PageHeading, Pagination } from "@/components/ui";
import { pageNumber } from "@/lib/format";
import type { Prisma } from "@/generated/prisma/client";
export const metadata = { title: "Usuários" };
export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; department?: string; page?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const q = (params.q || "").slice(0, 120),
    department = (params.department || "").slice(0, 120);
  const status =
    params.status === "ACTIVE" || params.status === "INACTIVE" ? params.status : undefined;
  const where: Prisma.UserWhereInput = {
    status,
    department: department || undefined,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const total = await db.user.count({ where });
  const page = Math.min(pageNumber(params.page), Math.max(1, Math.ceil(total / 15)));
  const [users, departments] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * 15,
      take: 15,
      omit: { passwordHash: true },
      include: { _count: { select: { accesses: { where: { enabled: true } } } } },
    }),
    db.user.findMany({
      select: { department: true },
      distinct: ["department"],
      where: { department: { not: null } },
    }),
  ]);
  return (
    <>
      <PageHeading
        eyebrow="ADMINISTRAÇÃO"
        title="Usuários"
        description="Pessoas, equipes e acessos. Tudo sob seu controle."
        action={
          <Link href="/admin/users/new" className="button button-primary">
            <Plus size={17} /> Novo usuário
          </Link>
        }
      />
      <form className="filter-bar">
        <div className="search-field">
          <Search size={17} />
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar nome ou e-mail"
            aria-label="Buscar usuários"
            maxLength={120}
          />
        </div>
        <select name="status" defaultValue={status || ""} aria-label="Filtrar status">
          <option value="">Todos os status</option>
          <option value="ACTIVE">Ativos</option>
          <option value="INACTIVE">Inativos</option>
        </select>
        <select name="department" defaultValue={department} aria-label="Filtrar departamento">
          <option value="">Todos os departamentos</option>
          {departments.map((item) => (
            <option key={item.department} value={item.department!}>
              {item.department}
            </option>
          ))}
        </select>
        <button className="button button-secondary">Filtrar</button>
      </form>
      <section className="panel table-panel">
        {users.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>Departamento / cargo</th>
                  <th>Papel no HUB</th>
                  <th>Status</th>
                  <th>Sistemas</th>
                  <th>
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <Link href={`/admin/users/${user.id}`} className="user-cell">
                        <Avatar name={user.name} />
                        <span>
                          <strong>{user.name}</strong>
                          <small>{user.email}</small>
                        </span>
                      </Link>
                    </td>
                    <td>
                      <span className="stacked-cell">
                        {user.department || "—"}
                        <small>{user.jobTitle || "—"}</small>
                      </span>
                    </td>
                    <td>{user.hubRole === "ADMIN" ? "Administrador" : "Colaborador"}</td>
                    <td>
                      <Badge value={user.status} />
                    </td>
                    <td>
                      <span className="count-pill">{user._count.accesses}</span>
                    </td>
                    <td>
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="icon-button"
                        aria-label={`Editar ${user.name}`}
                      >
                        <ArrowUpRight size={18} />
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
            description="Ajuste os filtros ou crie um novo usuário."
          />
        )}
        <Pagination
          page={page}
          total={total}
          base="/admin/users"
          query={{ q, status: status || "", department }}
        />
      </section>
    </>
  );
}
