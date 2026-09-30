import { Activity, Layers3, ShieldCheck, Sparkles } from "lucide-react";
import { requireUser } from "@/services/authorization";
import { findUserSystems } from "@/repositories/systems";
import { SystemCard } from "@/components/system-card";
import { EmptyState } from "@/components/ui";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();
  const accesses = await findUserSystems(user.id);
  const online = accesses.filter((access) => access.system.status === "ONLINE" && access.system.url)
    .length;
  const firstName = user.name.trim().split(/\s+/)[0] || "";

  return (
    <div className="dashboard-page">
      <section className="dashboard-hero">
        <div className="dashboard-hero-grid" aria-hidden="true" />
        <div className="dashboard-hero-content">
          <p className="dashboard-kicker">
            <Sparkles size={13} /> SEU ECOSSISTEMA DE TRABALHO
          </p>
          <h1>
            Bem-vindo, {firstName}
            <span>.</span>
          </h1>
          <p>Todos os seus sistemas em um só lugar.</p>
          <div className="dashboard-hero-metrics">
            <span>
              <Layers3 size={14} /> {accesses.length} sistemas liberados
            </span>
            <span>
              <Activity size={14} /> {online} online agora
            </span>
          </div>
        </div>
        <div className="dashboard-hero-signal" aria-hidden="true">
          <span className="signal-ring ring-one" />
          <span className="signal-ring ring-two" />
          <span className="signal-core">
            <ShieldCheck size={31} />
          </span>
          <span className="signal-dot dot-one" />
          <span className="signal-dot dot-two" />
        </div>
      </section>

      <div className="dashboard-section-heading">
        <div>
          <p className="eyebrow">SISTEMAS LIBERADOS</p>
          <h2>Seu painel de acesso</h2>
          <p>Ferramentas conectadas ao seu perfil corporativo.</p>
        </div>
        <span className="dashboard-count">{accesses.length} disponíveis</span>
      </div>

      {accesses.length ? (
        <div className="systems-grid dashboard-systems-grid">
          {accesses.map((access) => (
            <SystemCard key={access.id} system={access.system} role={access.role} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Seu workspace está pronto para começar"
          description={
            user.hubRole === "ADMIN"
              ? "Configure os sistemas e libere as permissões para a sua conta na administração."
              : "Solicite ao administrador os sistemas que você precisa acessar."
          }
        />
      )}
    </div>
  );
}
