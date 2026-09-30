"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin, requireUser } from "@/services/authorization";
import { systemSchema, isSafeSystemUrl } from "@/lib/validation";
import { actionError } from "@/lib/action-error";
import { requestIp } from "@/lib/request";
import type { FormState } from "@/types/forms";

export async function saveSystem(_: FormState, form: FormData): Promise<FormState> {
  const actor = await requireAdmin();
  try {
    const id = String(form.get("id") || "");
    const data = systemSchema.parse(Object.fromEntries(form));
    const ipAddress = await requestIp();
    await db.$transaction(async (tx) => {
      const system = id
        ? await tx.system.update({ where: { id }, data })
        : await tx.system.create({ data });
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: id ? "SYSTEM_UPDATED" : "SYSTEM_CREATED",
          target: system.id,
          ipAddress,
          metadata: { name: data.name, status: data.status, url: data.url },
        },
      });
    });
    revalidatePath("/", "layout");
    return {
      success: id
        ? "Sistema atualizado."
        : "Sistema criado. Conceda acessos na área de permissões.",
    };
  } catch (error) {
    return actionError(error);
  }
}

export async function launchSystem(form: FormData) {
  const user = await requireUser();
  const systemId = String(form.get("systemId") || "");
  const access = await db.userSystemAccess.findUnique({
    where: { userId_systemId: { userId: user.id, systemId } },
    include: { system: true },
  });
  if (!access?.enabled) redirect("/forbidden");
  if (
    access.system.status !== "ONLINE" ||
    !access.system.url ||
    !isSafeSystemUrl(access.system.url)
  )
    redirect("/systems?notice=unavailable");
  await db.auditLog.create({
    data: {
      userId: user.id,
      action: "SYSTEM_ACCESSED",
      target: access.system.id,
      ipAddress: await requestIp(),
      metadata: { role: access.role, method: "redirect" },
    },
  });
  redirect(access.system.url);
}
