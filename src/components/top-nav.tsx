"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useState, type CSSProperties } from "react";
import { ArrowUpRight, LogOut, Menu, Search, Settings2, X } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { Brand } from "./brand";
import { Avatar } from "./ui";

type NavItem = { href: string; label: string };
type NavGroup = { key: string; label: string; items: NavItem[] };

const workspace: NavGroup = {
  key: "workspace",
  label: "Workspace",
  items: [
    { href: "/dashboard", label: "Início" },
    { href: "/systems", label: "Meus Sistemas" },
  ],
};
const administration: NavGroup = {
  key: "admin",
  label: "Administração",
  items: [
    { href: "/admin/users", label: "Usuários" },
    { href: "/admin/systems", label: "Sistemas" },
    { href: "/admin/permissions", label: "Permissões" },
    { href: "/admin/logs", label: "Logs" },
  ],
};
const privateArea: NavGroup = {
  key: "private",
  label: "Área privada",
  items: [{ href: "/accounts", label: "Contas" }],
};

export function TopNav({
  user,
}: {
  user: {
    name: string;
    hubRole: string;
    department: string | null;
    jobTitle: string | null;
    canViewAccountDirectory: boolean;
  };
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isAdmin = user.hubRole === "ADMIN";
  const groups = [
    workspace,
    ...(isAdmin ? [administration] : []),
    ...(user.canViewAccountDirectory ? [privateArea] : []),
  ];
  const profile = isAdmin ? "Administrador" : user.jobTitle || user.department || "Colaborador";
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  const firstIndex = groups.map((_, index) =>
    groups.slice(0, index).reduce((total, group) => total + group.items.length, 0),
  );
  return (
    <>
      <header
        className="topbar"
        data-dense={isAdmin || user.canViewAccountDirectory ? "" : undefined}
      >
        <Link href="/dashboard" className="topbar-brand" aria-label="MKR HUB, início">
          <Brand />
        </Link>

        <nav className="pill-nav" aria-label="Menu principal">
          <ul>
            {groups.map((group, index) => (
              <Fragment key={group.key}>
                {index > 0 && <li className="pill-sep" aria-hidden="true" />}
                {group.items.map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="pill-link"
                      aria-current={isActive(href) ? "page" : undefined}
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </Fragment>
            ))}
          </ul>
        </nav>

        <div className="topbar-right">
          <form action="/systems" className="header-search" role="search">
            <label>
              <Search size={16} aria-hidden="true" />
              <input name="q" placeholder="Buscar sistema" aria-label="Buscar um sistema" />
            </label>
          </form>
          <Link href="/profile" className="user-chip" title="Minha conta">
            <Avatar name={user.name} />
            <span className="user-chip-copy">
              <strong>{user.name}</strong>
              <small>{profile}</small>
            </span>
          </Link>
          {isAdmin && (
            <Link
              href="/admin/settings"
              className="nav-icon"
              title="Configurações"
              aria-label="Configurações"
            >
              <Settings2 size={17} />
            </Link>
          )}
          <form action={logoutAction} className="logout-form">
            <button className="nav-icon" title="Sair" aria-label="Sair da conta">
              <LogOut size={17} />
            </button>
          </form>
          <button
            className="nav-icon mobile-menu"
            aria-label="Abrir menu"
            aria-expanded={open}
            aria-controls="menu-sheet"
            onClick={() => setOpen(true)}
          >
            <Menu size={20} />
          </button>
        </div>
      </header>

      <div
        id="menu-sheet"
        className="menu-sheet"
        data-open={open ? "" : undefined}
        inert={!open}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
      >
        <div className="menu-sheet-top">
          <Brand />
          <button className="nav-icon" aria-label="Fechar menu" onClick={() => setOpen(false)}>
            <X size={20} />
          </button>
        </div>
        <nav className="menu-sheet-nav" aria-label="Menu móvel">
          {groups.map((group, groupIndex) => (
            <div className="menu-group" key={group.key}>
              <p className="menu-group-label">{group.label}</p>
              {group.items.map(({ href, label }, itemIndex) => {
                const order = firstIndex[groupIndex] + itemIndex + 1;
                return (
                  <Link
                    key={href}
                    href={href}
                    className="menu-link"
                    style={{ "--i": order } as CSSProperties}
                    aria-current={isActive(href) ? "page" : undefined}
                    onClick={() => setOpen(false)}
                  >
                    <span className="menu-link-index" aria-hidden="true">
                      {String(order).padStart(2, "0")}
                    </span>
                    <span className="menu-link-label">{label}</span>
                    <ArrowUpRight size={22} />
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="menu-sheet-bottom">
          <Link href="/profile" className="user-chip" onClick={() => setOpen(false)}>
            <Avatar name={user.name} />
            <span className="user-chip-copy">
              <strong>{user.name}</strong>
              <small>{profile}</small>
            </span>
          </Link>
          {isAdmin && (
            <Link
              href="/admin/settings"
              className="button button-secondary button-small"
              onClick={() => setOpen(false)}
            >
              <Settings2 size={15} /> Configurações
            </Link>
          )}
          <form action={logoutAction}>
            <button className="button button-secondary button-small">
              <LogOut size={15} /> Sair
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
