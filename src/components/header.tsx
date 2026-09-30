import Link from "next/link";
import { ChevronDown, ChevronRight, LogOut, Search, Settings2, ShieldCheck } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { Avatar } from "./ui";

export function Header({
  name,
  jobTitle,
  hubRole,
}: {
  name: string;
  jobTitle: string | null;
  hubRole: string;
}) {
  const profile = hubRole === "ADMIN" ? "Administrador" : jobTitle || "Colaborador";
  return (
    <header className="topbar">
      <div className="breadcrumb">
        <span>Workspace</span>
        <ChevronRight size={13} />
        <strong>MKR HUB</strong>
      </div>
      <div className="topbar-right">
        <form action="/systems" className="header-search" role="search">
          <Search size={16} />
          <input name="q" placeholder="Buscar um sistema..." aria-label="Buscar um sistema" />
        </form>
        <span className="session-label">
          <ShieldCheck size={15} /> Sessão protegida
        </span>
        <details className="user-menu">
          <summary aria-label="Abrir menu do usuário">
            <Avatar name={name} />
            <span className="user-menu-copy">
              <strong>{name}</strong>
              <small>{profile}</small>
            </span>
            <ChevronDown size={14} />
          </summary>
          <div className="user-menu-popover">
            <div>
              <strong>{name}</strong>
              <span>{profile}</span>
            </div>
            <Link href="/profile">
              <Settings2 size={15} /> Minha conta
            </Link>
            <form action={logoutAction}>
              <button>
                <LogOut size={15} /> Sair
              </button>
            </form>
          </div>
        </details>
      </div>
    </header>
  );
}
