import { Activity, Layers3, ShieldCheck, Sparkles } from "lucide-react";
import { requireUser } from "@/services/authorization";
import { findWorkspaceSystems } from "@/repositories/systems";
import { SystemCard } from "@/components/system-card";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const user = await requireUser();
  const { notice } = await searchParams;
  const systems = await findWorkspaceSystems(user.id);
  const online = systems.filter((entry) => entry.system.status === "ONLINE" && entry.system.url).length;
  const firstName = user.name.trim().split(/\s+/)[0] || "";

  return (
    <div className="dashboard-page">
      <section className="dashboard-hero">
        <div className="dashboard-hero-grid" aria-hidden="true" />
        <div className="dashboard-hero-content">
          <p className="dashboard-kicker"><Sparkles size={13} /> SEU ECOSSISTEMA DE TRABALHO</p>
          <h1>Bem-vindo, {firstName}<span>.</span></h1>
          <p>Todos os seus sistemas em um só lugar.</p>
          <div className="dashboard-hero-metrics">
            <span><Layers3 size={14} /> {systems.length} sistemas no HUB</span>
            <span><Activity size={14} /> {online} online agora</span>
          </div>
        </div>
        <div className="dashboard-hero-signal" aria-hidden="true">
          <span className="signal-ring ring-one" /><span className="signal-ring ring-two" />
          <span className="signal-core"><ShieldCheck size={31} /></span>
          <span className="signal-dot dot-one" /><span className="signal-dot dot-two" />
        </div>
      </section>

      <div className="dashboard-section-heading">
        <div>
          <p className="eyebrow">SISTEMAS DO HUB</p>
          <h2>Seu painel de acesso</h2>
          <p>Escolha uma ferramenta. Alguns sistemas podem exigir autorização antes do primeiro acesso.</p>
        </div>
        <span className="dashboard-count">{systems.length} disponíveis</span>
      </div>

      {notice === "wallet-requested" && <p className="notice notice-success">Solicitação enviada ao administrador do Maker Wallet. Você será liberado após a autorização e a criação da sua conta.</p>}
      {notice === "wallet-request-pending" && <p className="notice">Sua solicitação para o Maker Wallet já está em análise.</p>}

      {systems.length ? (
        <div className="systems-grid dashboard-systems-grid">
          {systems.map((entry) => <SystemCard key={entry.system.id} system={entry.system} access={entry.access} />)}
        </div>
      ) : null}
    </div>
  );
}
