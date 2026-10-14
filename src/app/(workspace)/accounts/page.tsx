import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { redirect } from "next/navigation";
import { EmptyState, PageHeading } from "@/components/ui";
import { canViewAccountDirectory } from "@/lib/account-directory";
import { db } from "@/lib/db";
import { requireUser } from "@/services/authorization";
import {
  listCentralPurchasesUsers,
  type CentralPurchasesDirectoryUser,
} from "@/services/central-purchases";

export const metadata = { title: "Contas por sistema" };

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  super_admin: "Super administrador",
  requisition_approver: "Aprovador",
  stock_manager: "Estoque",
  user: "Usuário",
};

function accountStatus(access: { enabled: boolean; externalSubject: string | null }) {
  if (!access.enabled) return "Solicitação pendente";
  if (!access.externalSubject) return "Aguardando vínculo";
  return "Acesso liberado";
}

function formatDate(value: string | null, withTime = false) {
  if (!value) return "Nunca";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return withTime
    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date)
    : new Intl.DateTimeFormat("pt-BR").format(date);
}

function displayRoles(user: CentralPurchasesDirectoryUser) {
  if (!user.roles.length) return "Usuário";
  return user.roles.map((role) => roleLabels[role] || role).join(", ");
}

export default async function AccountsPage() {
  const user = await requireUser();
  if (!canViewAccountDirectory(user.email)) redirect("/forbidden");

  const [systems, centralResult] = await Promise.all([
    db.system.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        accesses: {
          include: { user: { select: { id: true, name: true, email: true, status: true } } },
          orderBy: { user: { name: "asc" } },
        },
      },
    }),
    listCentralPurchasesUsers()
      .then((users) => ({ users, error: null }))
      .catch((error: unknown) => ({
        users: [] as CentralPurchasesDirectoryUser[],
        error: error instanceof Error ? error.message : "Não foi possível carregar os usuários.",
      })),
  ]);

  const accountCount = systems.reduce((total, system) => total + system.accesses.length, 0);

  return (
    <>
      <PageHeading
        eyebrow="ÁREA PRIVADA"
        title="Contas por sistema"
        description="Usuários cadastrados nos sistemas e acessos vinculados ao MKR HUB."
      />

      <div className="stack-list">
        <section className="panel table-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">BANCO DO CENTRAL DE COMPRAS</p>
              <h2>Usuários do Central de Compras</h2>
            </div>
            <span className="count-pill">
              {centralResult.users.length} usuário{centralResult.users.length === 1 ? "" : "s"}
            </span>
          </div>

          {centralResult.error ? (
            <EmptyState title="Não foi possível carregar os usuários" description={centralResult.error} />
          ) : centralResult.users.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>E-mail</th>
                    <th>Cadastro</th>
                    <th>Último acesso</th>
                    <th>Papéis</th>
                  </tr>
                </thead>
                <tbody>
                  {centralResult.users.map((centralUser) => (
                    <tr key={centralUser.id}>
                      <td><strong>{centralUser.name}</strong></td>
                      <td>{centralUser.email}</td>
                      <td>{formatDate(centralUser.createdAt)}</td>
                      <td>{formatDate(centralUser.lastSignInAt, true)}</td>
                      <td><span className="permission-tag">{displayRoles(centralUser)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="Nenhum usuário encontrado" description="O banco do Central de Compras não retornou usuários." />
          )}
        </section>

        <div className="panel-heading">
          <div>
            <p className="eyebrow">MKR HUB</p>
            <h2>Acessos vinculados</h2>
          </div>
          <span className="count-pill">{accountCount} acesso{accountCount === 1 ? "" : "s"}</span>
        </div>

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
                          {user.hubRole === "ADMIN" ? (
                            <Link
                              href={`/admin/users/${access.user.id}#access`}
                              className="icon-button"
                              aria-label={`Gerenciar acesso de ${access.user.name}`}
                            >
                              <ArrowUpRight size={18} />
                            </Link>
                          ) : (
                            <span className="muted">—</span>
                          )}
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
    </>
  );
}
