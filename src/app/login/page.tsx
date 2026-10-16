import { redirect } from "next/navigation";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { auth } from "@/auth";
import { Asterisk } from "@/components/asterisk";
import { Brand } from "@/components/brand";
import { LoginForm } from "@/components/login-form";
import { Scene } from "@/components/scene";
export const metadata = { title: "Entrar" };

const phrases = [
  "Conectando ideias",
  "Pessoas",
  "Resultados",
  "Um só acesso",
  "Seu trabalho, conectado",
];

export default async function LoginPage() {
  const session = await auth();
  if (session?.user?.id) redirect("/");
  return (
    <main id="main-content" className="login-page">
      <section className="login-hero frame" id="sobre">
        <Scene variant="hero" />

        <header className="login-nav-row">
          <a href="#sobre" className="login-brand" aria-label="MKR HUB">
            <Brand />
          </a>
          <nav className="pill-nav" aria-label="Navegação principal">
            <ul>
              <li>
                <a href="#sobre" className="pill-link">
                  Visão
                </a>
              </li>
              <li>
                <a href="#ecossistema" className="pill-link">
                  Ecossistema
                </a>
              </li>
              <li>
                <a href="#acesso" className="pill-link">
                  Acesso
                </a>
              </li>
            </ul>
          </nav>
          <a href="#acesso" className="nav-cta">
            Entrar no HUB <ArrowRight size={14} />
          </a>
        </header>

        <div className="login-hero-body">
          <h1 className="wordmark">
            <span className="line">
              <span>MKR HUB</span>
            </span>
            <Asterisk className="wordmark-star" />
          </h1>

          <div className="login-intro">
            <p className="login-kicker">
              <span className="live-dot" /> WORKSPACE CORPORATIVO
            </p>
            <h2 className="login-tagline">
              Conectando ideias, pessoas e <em>resultados.</em>
            </h2>
            <p className="login-hero-copy">
              Um único lugar para acessar os sistemas que movem o seu trabalho.
            </p>
          </div>

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
        </div>
      </section>

      <section className="marquee" id="ecossistema" aria-hidden="true">
        <div className="marquee-track">
          {[0, 1].map((copy) => (
            <ul key={copy}>
              {phrases.map((phrase) => (
                <li key={phrase}>
                  {phrase}
                  <Asterisk />
                </li>
              ))}
            </ul>
          ))}
        </div>
      </section>

      <footer className="login-footer">
        <span>© {new Date().getFullYear()} MKR HUB</span>
        <span>Um ecossistema conectado para o seu dia.</span>
      </footer>
    </main>
  );
}
