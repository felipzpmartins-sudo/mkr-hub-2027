import { Search } from "lucide-react";
import { requireUser } from "@/services/authorization";
import { findWorkspaceSystems } from "@/repositories/systems";
import { SystemCard } from "@/components/system-card";
import { EmptyState, PageHeading } from "@/components/ui";

export const metadata = { title: "Meus Sistemas" };

export default async function SystemsPage({ searchParams }: { searchParams: Promise<{ q?: string; notice?: string }> }) {
  const user = await requireUser();
  const { q = "", notice } = await searchParams;
  const systems = await findWorkspaceSystems(user.id, q.slice(0, 120));
  return (
    <>
      <PageHeading eyebrow="WORKSPACE" title="Meus Sistemas" description="Escolha uma ferramenta. Alguns sistemas podem exigir autorização antes do primeiro acesso." />
      {notice === "unavailable" && <p className="notice">Este sistema está indisponível. Tente mais tarde ou fale com seu administrador.</p>}
      {notice === "sign-in" && <p className="notice">Para abrir este sistema, entre novamente no MKR HUB usando a conta cadastrada nele.</p>}
      {notice === "provisioning" && <p className="notice">Não foi possível criar seu acesso automático neste sistema. Tente novamente mais tarde.</p>}
      {notice === "wallet-requested" && <p className="notice notice-success">Solicitação enviada ao administrador do Maker Wallet. Você será liberado após a autorização e a criação da sua conta.</p>}
      {notice === "wallet-request-pending" && <p className="notice">Sua solicitação para o Maker Wallet já está em análise.</p>}
      <form className="filter-bar" role="search">
        <div className="search-field"><Search size={17} /><input name="q" defaultValue={q} placeholder="Buscar por nome ou descrição" aria-label="Buscar sistema" maxLength={120} /></div>
        <button className="button button-secondary">Buscar</button>
      </form>
      {systems.length ? (
        <div className="systems-grid">{systems.map((entry) => <SystemCard key={entry.system.id} system={entry.system} access={entry.access} />)}</div>
      ) : (
        <EmptyState title={q ? "Nenhum sistema encontrado" : "Nenhum sistema cadastrado"} description={q ? "Tente buscar por outro nome." : "Os sistemas cadastrados no HUB aparecerão aqui."} />
      )}
      <p className="page-note">Ao abrir um sistema com uma conta já conectada, o acesso é feito sem pedir login novamente.</p>
    </>
  );
}
