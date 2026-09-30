import Link from "next/link";
import { ArrowLeft, CircleDashed } from "lucide-react";
import type { ReactNode } from "react";

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </div>
      {action}
    </div>
  );
}
export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="empty-state">
      <CircleDashed size={32} />
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
const statusLabels: Record<string, string> = {
  ACTIVE: "Ativo",
  INACTIVE: "Inativo",
  ONLINE: "Online",
  MAINTENANCE: "Manutenção",
  OFFLINE: "Offline",
  ADMIN: "Administrador",
  USER: "Colaborador",
};
export function Badge({ value }: { value: string }) {
  return (
    <span className={`badge badge-${value.toLowerCase()}`}>
      <span className="status-dot" />
      {statusLabels[value] || value}
    </span>
  );
}
export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link className="back-link" href={href}>
      <ArrowLeft size={15} />
      {children}
    </Link>
  );
}
export function Avatar({ name, large = false }: { name: string; large?: boolean }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
  return (
    <span className={`avatar ${large ? "avatar-large" : ""}`} aria-hidden="true">
      {initials}
    </span>
  );
}
export function Pagination({
  page,
  total,
  size = 15,
  base,
  query = {},
}: {
  page: number;
  total: number;
  size?: number;
  base: string;
  query?: Record<string, string>;
}) {
  const pages = Math.max(1, Math.ceil(total / size));
  const href = (p: number) => `${base}?${new URLSearchParams({ ...query, page: String(p) })}`;
  return (
    <div className="pagination">
      <span>
        {total} registro{total !== 1 ? "s" : ""} · Página {page} de {pages}
      </span>
      <div>
        {page > 1 && (
          <Link className="button button-secondary button-small" href={href(page - 1)}>
            Anterior
          </Link>
        )}
        {page < pages && (
          <Link className="button button-secondary button-small" href={href(page + 1)}>
            Próxima
          </Link>
        )}
      </div>
    </div>
  );
}
