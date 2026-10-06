import {
  ShoppingBag,
  Megaphone,
  CarFront,
  Clapperboard,
  ShieldCheck,
  LayoutGrid,
  ArrowUpRight,
  LockKeyhole,
  UserPlus,
} from "lucide-react";
import { Badge } from "./ui";
import { launchSystem, requestMakerWalletAccess } from "@/app/actions/systems";
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
  slug: string;
};
type CardAccess = {
  enabled: boolean;
  status: string;
  role: string;
  externalSubject: string | null;
};
export function SystemCard({ system, access }: { system: CardSystem; access: CardAccess | null }) {
  const available = system.status === "ONLINE" && !!system.url;
  const connected = !!access && access.enabled && access.status === "ACTIVE" && !!access.externalSubject;
  const requiresApproval = system.slug === "maker-wallet";
  const pendingApproval = requiresApproval && !!access && !connected;
  const roleLabel =
    {
      ADMIN: "Administrador",
      USER: "Colaborador",
      EDITOR: "Editor",
    }[access?.role ?? ""] || access?.role;
  return (
    <article className="system-card">
      <div className="system-card-top">
        <SystemIcon icon={system.icon} />
        <Badge value={system.status} />
      </div>
      <h3>{system.name}</h3>
      <p className="system-description">{system.description}</p>
      {connected ? (
        <div className="system-role"><LockKeyhole size={12} /><span>Acesso:</span><strong>{roleLabel}</strong></div>
      ) : requiresApproval ? (
        <div className="system-role"><UserPlus size={12} /><span>Conta:</span><strong>{pendingApproval ? "Solicitação em análise" : "Autorização necessária"}</strong></div>
      ) : (
        <div className="system-role"><UserPlus size={12} /><span>Conta:</span><strong>O MKR HUB cria seu acesso</strong></div>
      )}
      <form action={requiresApproval && !connected ? requestMakerWalletAccess : launchSystem}>
        {!requiresApproval || connected ? <input type="hidden" name="systemId" value={system.id} /> : null}
        <LaunchButton
          disabled={!available || pendingApproval}
          label={
            !available
              ? system.status === "MAINTENANCE"
                ? "Em manutenção"
                : "Indisponível"
              : requiresApproval && !connected
                ? pendingApproval
                  ? "Solicitação enviada"
                  : "Solicitar autorização"
                : "Acessar sistema"
          }
          pendingLabel={requiresApproval && !connected ? "Enviando..." : "Abrindo..."}
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
