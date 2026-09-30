import Link from "next/link";
import { ShieldX } from "lucide-react";
export default function Forbidden() {
  return (
    <main id="main-content" className="standalone-state">
      <ShieldX size={40} />
      <h1>Acesso negado.</h1>
      <p>
        Sua conta não possui permissão para acessar este recurso.
        <br />
        Entre em contato com seu administrador.
      </p>
      <Link className="button button-primary" href="/">
        Voltar ao início
      </Link>
    </main>
  );
}
