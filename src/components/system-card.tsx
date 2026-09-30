import {
  ShoppingBag,
  Megaphone,
  CarFront,
  Clapperboard,
  ShieldCheck,
  LayoutGrid,
  ArrowUpRight,
  LockKeyhole,
} from "lucide-react";
import { Badge } from "./ui";
import { launchSystem } from "@/app/actions/systems";
import { LaunchButton } from "./submit-button";

const icons = {
  shopping: ShoppingBag,
  megaphone: Megaphone,
  car: CarFront,
  video: Clapperboard,
  shield: ShieldCheck,
  grid: LayoutGrid,
};
export function SystemIcon({ icon }: { icon: string }) {
  const Icon = icons[icon as keyof typeof icons] || LayoutGrid;
  return (
    <span className={`system-icon system-icon-${icon}`}>
      <Icon size={25} strokeWidth={1.6} />
    </span>
  );
}
type CardSystem = {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: string;
  url: string | null;
};
export function SystemCard({ system, role }: { system: CardSystem; role: string }) {
  const available = system.status === "ONLINE" && !!system.url;
  const roleLabel =
    {
      ADMIN: "Administrador",
      USER: "Colaborador",
      EDITOR: "Editor",
    }[role] || role;
  return (
    <article className="system-card">
      <div className="system-card-top">
        <SystemIcon icon={system.icon} />
        <Badge value={system.status} />
      </div>
      <h3>{system.name}</h3>
      <p className="system-description">{system.description}</p>
      <div className="system-role">
        <LockKeyhole size={12} />
        <span>Acesso:</span>
        <strong>{roleLabel}</strong>
      </div>
      <form action={launchSystem}>
        <input type="hidden" name="systemId" value={system.id} />
        <LaunchButton
          disabled={!available}
          label={
            available
              ? "Acessar sistema"
              : system.status === "MAINTENANCE"
                ? "Em manutenção"
                : "Indisponível"
          }
        />
      </form>
    </article>
  );
}
export function SystemPreview({ icon, name }: { icon: string; name: string }) {
  return (
    <div className="system-preview">
      <SystemIcon icon={icon} />
      <span>{name}</span>
      <ArrowUpRight size={16} />
    </div>
  );
}
