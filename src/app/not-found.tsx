import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Scene } from "@/components/scene";
export default function NotFound() {
  return (
    <main id="main-content" className="standalone-state">
      <Scene variant="hero" fixed />
      <div className="standalone-inner">
        <p className="standalone-code" aria-hidden="true">
          404
        </p>
        <span className="section-kicker">404 · MKR HUB</span>
        <h1>Página não encontrada.</h1>
        <p>Este endereço não existe ou não está mais disponível.</p>
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
