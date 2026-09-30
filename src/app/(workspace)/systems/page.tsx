import { Search } from "lucide-react";
import { requireUser } from "@/services/authorization";
import { findUserSystems } from "@/repositories/systems";
import { SystemCard } from "@/components/system-card";
import { EmptyState, PageHeading } from "@/components/ui";
export const metadata = { title: "Meus Sistemas" };
export default async function SystemsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; notice?: string }>;
}) {
  const user = await requireUser();
  const { q = "", notice } = await searchParams;
  const accesses = await findUserSystems(user.id, q.slice(0, 120));
  return (
    <>
      <PageHeading
        eyebrow="WORKSPACE"
        title="Meus Sistemas"
        description="Um acesso direto às ferramentas que fazem parte do seu trabalho."
      />
      {notice === "unavailable" && (
        <p className="notice">
          Este sistema está indisponível. Tente mais tarde ou fale com seu administrador.
        </p>
      )}
      <form className="filter-bar" role="search">
        <div className="search-field">
          <Search size={17} />
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar por nome ou descrição"
            aria-label="Buscar sistema"
            maxLength={120}
          />
        </div>
        <button className="button button-secondary">Buscar</button>
      </form>
      {accesses.length ? (
        <div className="systems-grid">
          {accesses.map((access) => (
            <SystemCard key={access.id} system={access.system} role={access.role} />
          ))}
        </div>
      ) : (
        <EmptyState
          title={q ? "Nenhum sistema encontrado" : "Nenhum acesso disponível"}
          description={
            q
              ? "Tente buscar por outro nome."
              : "Seu administrador poderá liberar os sistemas para sua conta."
          }
        />
      )}
      <p className="page-note">
        Nesta versão, cada sistema mantém sua própria autenticação. Ao acessar, você poderá precisar
        entrar com sua conta externa.
      </p>
    </>
  );
}
