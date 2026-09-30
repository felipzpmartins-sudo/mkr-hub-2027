import { Search } from "lucide-react";
import { requireAdmin } from "@/services/authorization";
import { db } from "@/lib/db";
import { AuditAction, type Prisma } from "@/generated/prisma/client";
import { PageHeading, EmptyState, Pagination } from "@/components/ui";
import { actionLabels, formatDate, pageNumber } from "@/lib/format";
export const metadata = { title: "Logs de auditoria" };
export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; action?: string; page?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const q = (params.q || "").slice(0, 120);
  const action = Object.values(AuditAction).find((a) => a === params.action);
  const where: Prisma.AuditLogWhereInput = {
    action,
    ...(q
      ? {
          OR: [
            { user: { name: { contains: q, mode: "insensitive" } } },
            { user: { email: { contains: q, mode: "insensitive" } } },
            { target: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const total = await db.auditLog.count({ where });
  const page = Math.min(pageNumber(params.page), Math.max(1, Math.ceil(total / 20)));
  const logs = await db.auditLog.findMany({
    where,
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * 20,
    take: 20,
  });
  return (
    <>
      <PageHeading
        eyebrow="ADMINISTRAÇÃO"
        title="Logs de auditoria"
        description="Rastreabilidade das ações no HUB. Datas no horário de Brasília."
      />
      <form className="filter-bar">
        <div className="search-field">
          <Search size={17} />
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar usuário, e-mail ou destino"
            aria-label="Buscar nos logs"
          />
        </div>
        <select name="action" defaultValue={action || ""} aria-label="Filtrar ação">
          <option value="">Todas as ações</option>
          {Object.entries(actionLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <button className="button button-secondary">Filtrar</button>
      </form>
      <section className="panel table-panel">
        {logs.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Data e hora</th>
                  <th>Usuário</th>
                  <th>Ação</th>
                  <th>Destino / detalhes</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="nowrap">{formatDate(log.createdAt)}</td>
                    <td>
                      <strong>{log.user?.name || "Não identificado"}</strong>
                      <small className="table-subtext">{log.user?.email || "—"}</small>
                    </td>
                    <td>
                      <span
                        className={`audit-action ${log.action === "LOGIN_FAILED" ? "audit-warning" : ""}`}
                      >
                        {actionLabels[log.action]}
                      </span>
                    </td>
                    <td>
                      <span className="log-target">{log.target || "—"}</span>
                      {log.metadata && (
                        <details className="log-details">
                          <summary>Detalhes</summary>
                          <pre>{JSON.stringify(log.metadata, null, 2)}</pre>
                        </details>
                      )}
                    </td>
                    <td className="nowrap muted">{log.ipAddress || "Não registrado"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Nenhum evento encontrado"
            description="Os eventos de auditoria aparecerão aqui conforme o HUB for utilizado."
          />
        )}
        <Pagination
          page={page}
          total={total}
          size={20}
          base="/admin/logs"
          query={{ q, action: action || "" }}
        />
      </section>
    </>
  );
}
