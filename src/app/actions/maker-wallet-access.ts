"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { canViewAccountDirectory } from "@/lib/account-directory";
import { actionError, BusinessError } from "@/lib/action-error";
import { requestIp } from "@/lib/request";
import { requireAdmin } from "@/services/authorization";
import { provisionSystemAccount } from "@/services/central-purchases";
import type { FormState } from "@/types/forms";

function revalidateWalletViews() {
  revalidatePath("/dashboard");
  revalidatePath("/systems");
  revalidatePath("/admin/accounts");
  revalidatePath("/admin/permissions");
}

async function requireWalletApprover() {
  const actor = await requireAdmin();
  if (!canViewAccountDirectory(actor.email)) {
    throw new BusinessError(
      "Somente o administrador responsÃ¡vel pode decidir estas solicitaÃ§Ãµes.",
    );
  }
  return actor;
}

export async function approveMakerWalletAccess(_: FormState, form: FormData): Promise<FormState> {
  try {
    const actor = await requireWalletApprover();
    const accessId = String(form.get("accessId") || "");
    const role = form.get("role") === "ADMIN" ? "ADMIN" : "USER";
    if (!accessId) throw new BusinessError("SolicitaÃ§Ã£o invÃ¡lida.");

    const access = await db.userSystemAccess.findUnique({
      where: { id: accessId },
      include: { user: true, system: true },
    });
    if (!access || access.system.slug !== "maker-wallet") {
      throw new BusinessError("SolicitaÃ§Ã£o do Maker Wallet nÃ£o encontrada.");
    }
    if (access.user.status !== "ACTIVE") {
      throw new BusinessError("O usuÃ¡rio estÃ¡ desativado no MKR HUB.");
    }

    const provisioned = await provisionSystemAccount("maker-wallet", access.user, role);
    if (!provisioned) {
      throw new BusinessError("NÃ£o foi possÃ­vel criar a conta no Maker Wallet. Tente novamente.");
    }

    const ipAddress = await requestIp();
    await db.$transaction(async (tx) => {
      await tx.userSystemAccess.update({
        where: { id: access.id },
        data: {
          enabled: true,
          role,
          status: "ACTIVE",
          externalUserId: provisioned.identity.subject,
          externalUserEmail: provisioned.identity.email,
          externalDisplayName: provisioned.identity.name,
          externalProvider: "maker-wallet",
          externalIssuer: access.system.url,
          externalSubject: provisioned.identity.subject,
          encryptedExternalSecret: null,
          linkedBy: actor.id,
          linkedAt: new Date(),
        },
      });
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: "USER_SYSTEM_ACCESS_UPDATED",
          target: access.id,
          ipAddress,
          metadata: {
            systemSlug: "maker-wallet",
            approved: true,
            role,
            requestedBy: access.userId,
          },
        },
      });
    });

    revalidateWalletViews();
    return { success: `Acesso de ${access.user.name} autorizado.` };
  } catch (error) {
    return actionError(error);
  }
}

export async function rejectMakerWalletAccess(_: FormState, form: FormData): Promise<FormState> {
  try {
    const actor = await requireWalletApprover();
    const accessId = String(form.get("accessId") || "");
    if (!accessId) throw new BusinessError("SolicitaÃ§Ã£o invÃ¡lida.");

    const access = await db.userSystemAccess.findUnique({
      where: { id: accessId },
      include: { user: { select: { name: true } }, system: { select: { slug: true } } },
    });
    if (!access || access.system.slug !== "maker-wallet") {
      throw new BusinessError("SolicitaÃ§Ã£o do Maker Wallet nÃ£o encontrada.");
    }

    const ipAddress = await requestIp();
    await db.$transaction([
      db.userSystemAccess.update({
        where: { id: access.id },
        data: {
          enabled: false,
          status: "REVOKED",
          externalUserId: null,
          externalUserEmail: null,
          externalDisplayName: null,
          externalProvider: null,
          externalIssuer: null,
          externalSubject: null,
          encryptedExternalSecret: null,
          linkedBy: actor.id,
          linkedAt: new Date(),
        },
      }),
      db.auditLog.create({
        data: {
          userId: actor.id,
          action: "USER_SYSTEM_ACCESS_REVOKED",
          target: access.id,
          ipAddress,
          metadata: { systemSlug: "maker-wallet", approved: false },
        },
      }),
    ]);

    revalidateWalletViews();
    return { success: `SolicitaÃ§Ã£o de ${access.user.name} recusada.` };
  } catch (error) {
    return actionError(error);
  }
}
