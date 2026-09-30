import Link from "next/link";
import { ShieldCheck, Database, Network, ArrowUpRight } from "lucide-react";
import { requireAdmin } from "@/services/authorization";
import { db } from "@/lib/db";
import { PageHeading } from "@/components/ui";
export const metadata = { title: "Configurações" };
export default async function SettingsPage() {
  await requireAdmin();
  const [systems, linked] = await Promise.all([
    db.system.count(),
    db.userSystemAccess.count({
      where: { OR: [{ externalUserId: { not: null } }, { externalUserEmail: { not: null } }] },
    }),
  ]);
  return (
    <>
      <PageHeading
        eyebrow="ADMINISTRAÇÃO"
        title="Configurações"
        description="Configuração operacional e arquitetura do workspace."
      />
      <div className="settings-grid">
        <section className="panel setting-card">
          <ShieldCheck size={24} />
          <h2>Identidade e segurança</h2>
          <dl className="setting-list">
            <div>
              <dt>Cadastro público</dt>
              <dd>Desabilitado</dd>
            </div>
            <div>
              <dt>Duração da sessão</dt>
              <dd>8 horas</dd>
            </div>
            <div>
              <dt>Senha mínima</dt>
              <dd>12 caracteres</dd>
            </div>
            <div>
              <dt>Tentativas por conta</dt>
              <dd>8 / 15 minutos</dd>
            </div>
            <div>
              <dt>Registro de IP via proxy</dt>
              <dd>{process.env.TRUST_PROXY === "true" ? "Habilitado" : "Desabilitado"}</dd>
            </div>
          </dl>
          <p>
            As políticas são versionadas no projeto. Dados sensíveis são definidos por variáveis de
            ambiente.
          </p>
        </section>
        <section className="panel setting-card">
          <Database size={24} />
          <h2>Ecossistema conectado</h2>
          <dl className="setting-list">
            <div>
              <dt>Banco do HUB</dt>
              <dd>PostgreSQL</dd>
            </div>
            <div>
              <dt>Sistemas cadastrados</dt>
              <dd>{systems}</dd>
            </div>
            <div>
              <dt>Vínculos com contas externas</dt>
              <dd>{linked}</dd>
            </div>
            <div>
              <dt>Bases externas</dt>
              <dd>Independentes</dd>
            </div>
          </dl>
          <Link className="text-link" href="/admin/systems">
            Configurar sistemas <ArrowUpRight size={15} />
          </Link>
        </section>
        <section className="panel setting-card span-2">
          <Network size={24} />
          <h2>Preparado para o próximo passo</h2>
          <p>
            O HUB mantém uma identidade central e os vínculos com as contas de cada aplicação. A
            integração de SSO será feita sistema por sistema, preservando os dados e históricos
            existentes.
          </p>
          <div className="sso-flow">
            <span>MKR HUB</span>
            <span>→</span>
            <span>Identidade central</span>
            <span>→</span>
            <span>Sistemas independentes</span>
          </div>
          <p className="page-note">
            Modo atual: redirecionamento com permissão validada. O login externo continua
            necessário; o SSO ainda não está habilitado.
          </p>
        </section>
      </div>
    </>
  );
}
