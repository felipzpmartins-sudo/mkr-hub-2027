import type { Prisma } from "../generated/prisma/client.js";
import type { AuthContext } from "./auth-context.js";

const releasedForStock = ["approved_released", "approved_partial", "delivered"];

export type SolicitationAccessTarget = {
  userId: string;
  requestType: string;
  approvalStatus: string | null;
};

export function canReadSolicitation(auth: AuthContext, solicitation: SolicitationAccessTarget): boolean {
  if (auth.roles.includes("admin") || solicitation.userId === auth.user.id) {
    return true;
  }

  if (auth.roles.includes("requisition_approver") && solicitation.requestType === "internal_requisition") {
    return true;
  }

  return (
    auth.roles.includes("stock") &&
    solicitation.requestType === "internal_requisition" &&
    solicitation.approvalStatus !== null &&
    releasedForStock.includes(solicitation.approvalStatus)
  );
}

export function canUploadAttachment(auth: AuthContext, solicitation: SolicitationAccessTarget): boolean {
  return auth.roles.includes("admin") || solicitation.userId === auth.user.id;
}

export function solicitationAccessFilter(auth: AuthContext): Prisma.SolicitationWhereInput {
  if (auth.roles.includes("admin")) {
    return {};
  }

  const visibility: Prisma.SolicitationWhereInput[] = [{ userId: auth.user.id }];

  if (auth.roles.includes("requisition_approver")) {
    visibility.push({ requestType: "internal_requisition" });
  }

  if (auth.roles.includes("stock")) {
    visibility.push({ requestType: "internal_requisition", approvalStatus: { in: releasedForStock } });
  }

  return { OR: visibility };
}
