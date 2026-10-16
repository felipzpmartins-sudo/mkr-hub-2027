import type { CSSProperties } from "react";
import { Activity, ArrowDown, Layers3, Sparkles } from "lucide-react";
import { requireUser } from "@/services/authorization";
import { findWorkspaceSystems } from "@/repositories/systems";
import { Asterisk } from "@/components/asterisk";
import { Scene } from "@/components/scene";
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
  const online = systems.filter(
    (entry) => entry.system.status === "ONLINE" && entry.system.url,
  ).length;
  const firstName = user.name.trim().split(/\s+/)[0] || "";

  return (
    <div className="dashboard-page">
      <section className="dashboard-hero frame">
        <Scene variant="hero" />
        <div className="dashboard-hero-top">
          <p className="dashboard-kicker">
            <Sparkles size={13} /> SEU ECOSSISTEMA DE TRABALHO
          </p>
          <span className="status-chip">
            <span className="live-dot" /> {online} online agora
          </span>
        </div>
        <div className="dashboard-hero-body">
          <h1 className="greeting" style={{ "--chars": firstName.length } as CSSProperties}>
            <span className="greeting-lead line">
              <span>Bem-vindo,</span>
            </span>
            <span className="greeting-name line">
              <span>
                {firstName}
                <span className="greeting-dot">.</span>
              </span>
            </span>
          </h1>
          <Asterisk className="greeting-star" />
          <div className="dashboard-hero-aside">
            <p>Todos os seus sistemas em um só lugar.</p>
            <div className="dashboard-hero-metrics">
              <span>
                <Layers3 size={14} /> {systems.length} sistemas no HUB
              </span>
              <span>
                <Activity size={14} /> {online} online agora
              </span>
            </div>
            <a href="#sistemas" className="pill-cta">
              Ver meus sistemas
              <span className="pill-cta-icon">
                <ArrowDown size={16} />
              </span>
            </a>
          </div>
        </div>
      </section>

      <div className="dashboard-section-heading" id="sistemas">
        <div>
          <p className="eyebrow">SISTEMAS DO HUB</p>
          <h2>Seu painel de acesso</h2>
          <p>
            Escolha uma ferramenta. Alguns sistemas podem exigir autorização antes do primeiro
            acesso.
          </p>
        </div>
        <span className="dashboard-count">{systems.length} disponíveis</span>
      </div>

      {notice === "wallet-requested" && (
        <p className="notice notice-success">
          Solicitação enviada ao administrador do Maker Wallet. Você será liberado após a
          autorização e a criação da sua conta.
        </p>
      )}
      {notice === "wallet-request-pending" && (
        <p className="notice">Sua solicitação para o Maker Wallet já está em análise.</p>
      )}
      {notice === "wallet-linked" && (
        <p className="notice notice-success">
          Sua conta existente do Maker Wallet foi vinculada. Agora você pode acessar o sistema
          diretamente.
        </p>
      )}

      {systems.length ? (
        <div className="systems-grid dashboard-systems-grid">
          {systems.map((entry) => (
            <SystemCard key={entry.system.id} system={entry.system} access={entry.access} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
