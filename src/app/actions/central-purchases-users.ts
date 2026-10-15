"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionError, BusinessError } from "@/lib/action-error";
import { canViewAccountDirectory } from "@/lib/account-directory";
import { db } from "@/lib/db";
import { passwordSchema } from "@/lib/validation";
import { requestIp } from "@/lib/request";
import { requireUser } from "@/services/authorization";
import { manageCentralMarketingUser, manageCentralPurchasesUser } from "@/services/central-purchases";
import type { FormState } from "@/types/forms";

const userIdSchema = z.string().uuid("Usuário inválido.");

export async function manageCentralPurchasesAccount(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const actor = await requireUser();
  if (!canViewAccountDirectory(actor.email)) return { error: "Acesso não autorizado." };

  try {
    const userId = userIdSchema.parse(String(form.get("userId") || ""));
    const action = String(form.get("action") || "");
    let auditAction: "PASSWORD_CHANGED" | "USER_DISABLED" | "USER_UPDATED";
    let success: string;

    try {
      if (action === "reset_password") {
        const password = passwordSchema.parse(form.get("password"));
        if (password !== form.get("confirmation")) {
          throw new BusinessError("A confirmação da senha não confere.");
        }
        await manageCentralPurchasesUser({ action, userId, password });
        auditAction = "PASSWORD_CHANGED";
        success = "Senha do usuário redefinida.";
      } else if (action === "activate" || action === "deactivate") {
        const active = action === "activate";
        await manageCentralPurchasesUser({ action: "set_active", userId, active });
        auditAction = active ? "USER_UPDATED" : "USER_DISABLED";
        success = active ? "Usuário reativado no Central de Compras." : "Usuário desativado no Central de Compras.";
      } else {
        throw new BusinessError("Ação inválida.");
      }
    } catch (error) {
      if (error instanceof BusinessError || error instanceof z.ZodError) throw error;
      throw new BusinessError(error instanceof Error ? error.message : "Não foi possível atualizar o usuário.");
    }

    await db.auditLog.create({
      data: {
        userId: actor.id,
        action: auditAction,
        target: userId,
        ipAddress: await requestIp(),
        metadata: { system: "central-de-compras", operation: action },
      },
    });
    revalidatePath("/accounts");
    return { success };
  } catch (error) {
    return actionError(error);
  }
}

export async function manageCentralMarketingAccount(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const actor = await requireUser();
  if (!canViewAccountDirectory(actor.email)) return { error: "Acesso não autorizado." };

  try {
    const userId = userIdSchema.parse(String(form.get("userId") || ""));
    const action = String(form.get("action") || "");
    let auditAction: "PASSWORD_CHANGED" | "USER_DISABLED" | "USER_UPDATED";
    let success: string;

    try {
      if (action === "reset_password") {
        const password = passwordSchema.parse(form.get("password"));
        if (password !== form.get("confirmation")) {
          throw new BusinessError("A confirmação da senha não confere.");
        }
        await manageCentralMarketingUser({ action, userId, password });
        auditAction = "PASSWORD_CHANGED";
        success = "Senha do usuário redefinida.";
      } else if (action === "activate" || action === "deactivate") {
        const active = action === "activate";
        await manageCentralMarketingUser({ action: "set_active", userId, active });
        auditAction = active ? "USER_UPDATED" : "USER_DISABLED";
        success = active ? "Usuário reativado no Central de Marketing." : "Usuário desativado no Central de Marketing.";
      } else {
        throw new BusinessError("Ação inválida.");
      }
    } catch (error) {
      if (error instanceof BusinessError || error instanceof z.ZodError) throw error;
      throw new BusinessError(error instanceof Error ? error.message : "Não foi possível atualizar o usuário.");
    }

    await db.auditLog.create({
      data: {
        userId: actor.id,
        action: auditAction,
        target: userId,
        ipAddress: await requestIp(),
        metadata: { system: "central-de-marketing", operation: action },
      },
    });
    revalidatePath("/accounts");
    return { success };
  } catch (error) {
    return actionError(error);
  }
}
