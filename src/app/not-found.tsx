import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main-content" className="standalone-state">
      <span className="section-kicker">404 · MKR HUB</span>
      <h1>Página não encontrada.</h1>
      <p>Este endereço não existe ou não está mais disponível.</p>
      <Link className="button button-primary" href="/">
        Voltar ao início
      </Link>
    </main>
  );
}
