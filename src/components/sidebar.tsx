"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  House,
  LayoutGrid,
  UsersRound,
  PanelsTopLeft,
  KeyRound,
  ScrollText,
  Settings2,
  LogOut,
  PanelLeftClose,
  Menu,
  X,
} from "lucide-react";
import { Brand } from "./brand";
import { Avatar } from "./ui";
import { logoutAction } from "@/app/actions/auth";

const main = [
  { href: "/dashboard", label: "Início", icon: House },
  { href: "/systems", label: "Meus Sistemas", icon: LayoutGrid },
];
const admin = [
  { href: "/admin/users", label: "Usuários", icon: UsersRound },
  { href: "/admin/systems", label: "Sistemas", icon: PanelsTopLeft },
  { href: "/admin/permissions", label: "Permissões", icon: KeyRound },
  { href: "/admin/logs", label: "Logs", icon: ScrollText },
];
export function Sidebar({
  user,
}: {
  user: { name: string; hubRole: string; department: string | null };
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const links = (items: typeof main) =>
    items.map(({ href, label, icon: Icon }) => {
      const active = pathname === href || pathname.startsWith(`${href}/`);
      return (
        <Link
          key={href}
          href={href}
          aria-current={active ? "page" : undefined}
          className={`nav-link ${active ? "active" : ""}`}
          onClick={() => setOpen(false)}
        >
          <Icon size={18} />
          <span>{label}</span>
          {active && <span className="nav-dot" />}
        </Link>
      );
    });
  return (
    <>
      <button
        className="mobile-menu icon-button"
        aria-label="Abrir menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Menu size={22} />
      </button>
      {open && (
        <button
          className="sidebar-overlay"
          aria-label="Fechar menu"
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand">
          <Link href="/dashboard" aria-label="MKR HUB, início">
            <Brand />
          </Link>
          <PanelLeftClose size={16} className="sidebar-desktop-icon" />
          <button
            className="mobile-close icon-button"
            aria-label="Fechar menu"
            onClick={() => setOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        <div className="workspace-label">
          <span className="workspace-icon">M</span>
          <div>
            <strong>Workspace MKR</strong>
            <span>Portal corporativo</span>
          </div>
          <span className="workspace-dot" />
        </div>
        <nav aria-label="Menu principal">
          <p className="nav-label">WORKSPACE</p>
          {links(main)}
          {user.hubRole === "ADMIN" && (
            <>
              <p className="nav-label admin-label">ADMINISTRAÇÃO</p>
              {links(admin)}
            </>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-utility">
            <Link
              href={user.hubRole === "ADMIN" ? "/admin/settings" : "/profile"}
              className="nav-link"
            >
              <Settings2 size={18} />
              <span>Configurações</span>
            </Link>
          </div>
          <div className="sidebar-user">
            <Avatar name={user.name} />
            <div>
              <strong>{user.name}</strong>
              <span>
                {user.hubRole === "ADMIN" ? "Administrador" : user.department || "Colaborador"}
              </span>
            </div>
            <form action={logoutAction}>
              <button className="icon-button" title="Sair" aria-label="Sair da conta">
                <LogOut size={17} />
              </button>
            </form>
          </div>
        </div>
      </aside>
    </>
  );
}
