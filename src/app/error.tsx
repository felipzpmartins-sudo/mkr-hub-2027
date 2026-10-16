"use client";
import { RotateCcw } from "lucide-react";
import { Scene } from "@/components/scene";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main-content" className="standalone-state">
      <Scene variant="hero" fixed />
      <div className="standalone-inner">
        <span className="section-kicker">MKR HUB</span>
        <h1>Não foi possível carregar.</h1>
        <p>O serviço está temporariamente indisponível. Tente novamente em instantes.</p>
        <button className="pill-cta" onClick={reset}>
          Tentar novamente
          <span className="pill-cta-icon">
            <RotateCcw size={16} />
          </span>
        </button>
      </div>
    </main>
  );
}
