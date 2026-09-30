"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main-content" className="standalone-state">
      <span className="section-kicker">MKR HUB</span>
      <h1>Não foi possível carregar.</h1>
      <p>O serviço está temporariamente indisponível. Tente novamente em instantes.</p>
      <button className="button button-primary" onClick={reset}>
        Tentar novamente
      </button>
    </main>
  );
}
