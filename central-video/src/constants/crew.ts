import { Crown, Users } from "lucide-react";

export const crewMembers = [
  { id: "captain", name: "Guilherme", role: "Capitão", icon: Crown },
  { id: "richard", name: "Richard", role: "Tripulante", icon: Users },
  { id: "mah", name: "Mah", role: "Tripulante", icon: Users },
  { id: "jade", name: "Jade", role: "Tripulante", icon: Users },
] as const;

export const delegableCrewMembers = crewMembers
  .filter((member) => member.role === "Tripulante")
  .map(({ id, name, role }) => ({ id, name, role }));
