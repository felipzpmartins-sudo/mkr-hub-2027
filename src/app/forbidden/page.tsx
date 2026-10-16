import Link from "next/link";
import { ArrowRight, ShieldX } from "lucide-react";
import { Scene } from "@/components/scene";
export default function Forbidden() {
  return (
    <main id="main-content" className="standalone-state">
      <Scene variant="hero" fixed />
      <div className="standalone-inner">
        <ShieldX size={40} />
        <h1>Acesso negado.</h1>
        <p>
          Sua conta não possui permissão para acessar este recurso.
          <br />
          Entre em contato com seu administrador.
        </p>
        <Link className="pill-cta" href="/">
          Voltar ao início
          <span className="pill-cta-icon">
            <ArrowRight size={16} />
          </span>
        </Link>
      </div>
    </main>
  );
}
