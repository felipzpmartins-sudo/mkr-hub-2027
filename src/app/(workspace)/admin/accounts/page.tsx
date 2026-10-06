import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { requireUser } from "@/services/authorization";
import { db } from "@/lib/db";
import { EmptyState, PageHeading } from "@/components/ui";
import { canViewAccountDirectory } from "@/lib/account-directory";
import { redirect } from "next/navigation";

export const metadata = { title: "Contas por sistema" };

function accountStatus(access: { enabled: boolean; externalSubject: string | null }) {
  if (!access.enabled) return "Solicitação pendente";
  if (!access.externalSubject) return "Aguardando vínculo";
  return "Acesso liberado";
}

export default async function AccountsPage() {
  const user = await requireUser();
  if (!canViewAccountDirectory(user.email)) redirect("/forbidden");
  const systems = await db.system.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      accesses: {
        include: { user: { select: { id: true, name: true, email: true, status: true } } },
        orderBy: { user: { name: "asc" } },
      },
    },
  });
  const accountCount = systems.reduce((total, system) => total + system.accesses.length, 0);

  return (
    <>
      <PageHeading
        eyebrow="ADMINISTRAÇÃO"
        title="Contas por sistema"
        description={`${accountCount} conta${accountCount === 1 ? "" : "s"} registrada${accountCount === 1 ? "" : "s"} ou vinculada${accountCount === 1 ? "" : "s"} no MKR HUB.`}
      />
      <div className="stack-list">
        {systems.map((system) => (
          <section className="panel table-panel" key={system.id}>
            <div className="panel-heading">
              <div>
                <p className="eyebrow">{system.status}</p>
                <h2>{system.name}</h2>
              </div>
              <span className="count-pill">{system.accesses.length} conta{system.accesses.length === 1 ? "" : "s"}</span>
            </div>
            {system.accesses.length ? (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Pessoa</th>
                      <th>E-mail no MKR HUB</th>
                      <th>Conta no sistema</th>
                      <th>Situação</th>
                      <th><span className="sr-only">Gerenciar</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {system.accesses.map((access) => (
                      <tr key={access.id}>
                        <td>
                          <strong>{access.externalDisplayName || access.user.name}</strong>
                          <small className="table-subtext">{access.role}</small>
                        </td>
                        <td>{access.user.email}</td>
                        <td>{access.externalUserEmail || access.user.email}</td>
                        <td>
                          <span className={access.enabled && access.externalSubject ? "permission-tag" : "muted"}>
                            {accountStatus(access)}
                          </span>
                        </td>
                        <td>
                          <Link
                            href={`/admin/users/${access.user.id}#access`}
                            className="icon-button"
                            aria-label={`Gerenciar acesso de ${access.user.name}`}
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
              <EmptyState title="Nenhuma conta vinculada" description="As contas autorizadas neste sistema aparecerão aqui." />
            )}
          </section>
        ))}
      </div>
      <p className="page-note">A lista mostra as contas e solicitações registradas no MKR HUB. Contas antigas de um sistema só aparecem após serem vinculadas ao HUB.</p>
    </>
  );
}
