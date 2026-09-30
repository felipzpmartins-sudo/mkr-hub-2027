import { redirect } from "next/navigation";
import { ArrowDown, ArrowRight, ShieldCheck } from "lucide-react";
import { auth } from "@/auth";
import { Brand } from "@/components/brand";
import { LoginForm } from "@/components/login-form";
export const metadata = { title: "Entrar" };
export default async function LoginPage() {
  const session = await auth();
  if (session?.user?.id) redirect("/");
  return (
    <main id="main-content" className="login-page">
      <div className="login-ambient" aria-hidden="true">
        <span className="ambient-glow glow-top" />
        <span className="ambient-glow glow-bottom" />
        <span className="ambient-arc arc-left" />
        <span className="ambient-arc arc-right" />
        <span className="ambient-streak" />
      </div>
      <div className="login-stage">
        <header className="login-nav">
          <Brand />
          <nav aria-label="Navegação principal">
            <a href="#sobre">Visão</a>
            <a href="#recursos">Sistemas</a>
            <a href="#acesso">Acesso</a>
          </nav>
          <a href="#acesso" className="login-nav-action">
            Entrar no HUB <ArrowRight size={14} />
          </a>
        </header>

        <section className="login-hero" id="sobre">
          <p className="login-kicker">
            <span className="live-dot" /> WORKSPACE CORPORATIVO
          </p>
          <h1>
            Conectando ideias,
            <br />
            pessoas e <em>resultados.</em>
          </h1>
          <p className="login-hero-copy">
            Um único lugar para acessar os sistemas que movem o seu trabalho.
          </p>
          <div className="login-hero-actions">
            <a href="#acesso" className="login-cta-primary">
              Acessar o MKR HUB <ArrowRight size={17} />
            </a>
            <a href="#recursos" className="login-cta-secondary">
              Conhecer o ecossistema <ArrowDown size={16} />
            </a>
          </div>
        </section>

        <section className="login-access" id="acesso" aria-labelledby="access-title">
          <div className="login-access-heading">
            <span className="secure-chip">
              <ShieldCheck size={14} /> Ambiente seguro
            </span>
            <h2 id="access-title">Entre no seu workspace.</h2>
            <p>Use suas credenciais corporativas para continuar.</p>
          </div>
          <LoginForm />
          <p className="login-support">
            Seu acesso é gerenciado pela empresa. Precisa de ajuda? Fale com seu administrador.
          </p>
        </section>

        <footer className="login-footer" id="recursos">
          <span>© {new Date().getFullYear()} MKR HUB</span>
          <span>Um ecossistema conectado para o seu dia.</span>
        </footer>
      </div>
    </main>
  );
}
