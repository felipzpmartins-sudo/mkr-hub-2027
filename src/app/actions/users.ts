"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin, requireUser } from "@/services/authorization";
import { hashPassword, verifyPassword } from "@/lib/password";
import { userSchema, passwordSchema, accessSchema } from "@/lib/validation";
import { actionError, BusinessError } from "@/lib/action-error";
import { requestIp } from "@/lib/request";
import type { FormState } from "@/types/forms";

export async function saveUser(_: FormState, form: FormData): Promise<FormState> {
  const actor = await requireAdmin();
  try {
    const id = String(form.get("id") || "");
    const data = userSchema.parse(Object.fromEntries(form));
    const password = String(form.get("password") || "");
    const passwordHash =
      password || !id ? await hashPassword(passwordSchema.parse(password)) : undefined;
    const ipAddress = await requestIp();
    await db.$transaction(async (tx) => {
      // Serialize administrator changes so two concurrent edits cannot remove the last admin.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(7242027)`;
      const currentActor = await tx.user.findUnique({ where: { id: actor.id } });
      if (currentActor?.hubRole !== "ADMIN" || currentActor.status !== "ACTIVE")
        throw new BusinessError("Sua permissão foi alterada. Atualize a página.");
      const previous = id ? await tx.user.findUnique({ where: { id } }) : null;
      if (id && !previous) throw new BusinessError("Usuário não encontrado.");
      if (id === actor.id && (data.hubRole !== "ADMIN" || data.status !== "ACTIVE"))
        throw new BusinessError(
          "Você não pode desativar ou remover seu próprio acesso administrativo.",
        );
      if (
        previous?.hubRole === "ADMIN" &&
        previous.status === "ACTIVE" &&
        (data.hubRole !== "ADMIN" || data.status !== "ACTIVE")
      ) {
        const count = await tx.user.count({ where: { hubRole: "ADMIN", status: "ACTIVE" } });
        if (count <= 1) throw new BusinessError("Mantenha ao menos um administrador ativo.");
      }
      const user = id
        ? await tx.user.update({
            where: { id },
            data: { ...data, passwordHash, sessionVersion: { increment: 1 } },
          })
        : await tx.user.create({ data: { ...data, passwordHash: passwordHash! } });
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: !id
            ? "USER_CREATED"
            : data.status === "INACTIVE" && previous?.status === "ACTIVE"
              ? "USER_DISABLED"
              : "USER_UPDATED",
          target: user.id,
          ipAddress,
          metadata: { status: data.status, hubRole: data.hubRole, passwordReset: !!passwordHash },
        },
      });
    });
    revalidatePath("/admin");
    revalidatePath("/admin/users");
    return {
      success: id
        ? "Usuário atualizado. Sessões anteriores foram encerradas."
        : "Usuário criado. Configure os acessos na lista de usuários.",
    };
  } catch (error) {
    return actionError(error);
  }
}

export async function saveAccess(_: FormState, form: FormData): Promise<FormState> {
  const actor = await requireAdmin();
  try {
    const data = accessSchema.parse({
      ...Object.fromEntries(form),
      enabled: form.get("enabled") === "on",
    });
    const ipAddress = await requestIp();
    await db.$transaction(async (tx) => {
      const key = { userId: data.userId, systemId: data.systemId };
      const previous = await tx.userSystemAccess.findUnique({ where: { userId_systemId: key } });
      const system = await tx.system.findUnique({
        where: { id: data.systemId },
        select: { slug: true },
      });
      if (!system) throw new BusinessError("Sistema não encontrado.");
      if (
        system.slug === "central-de-compras" &&
        data.externalUserId &&
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          data.externalUserId,
        )
      ) {
        throw new BusinessError("Para a Central de Compras, use o UUID de auth.users.id.");
      }
      const identityFields = [
        "externalUserId",
        "externalUserEmail",
        "externalDisplayName",
        "externalProvider",
        "externalIssuer",
        "externalSubject",
      ] as const;
      const hasExternalIdentity = identityFields.some((field) => !!data[field]);
      const identityChanged =
        !previous || identityFields.some((field) => previous[field] !== data[field]);
      const linkAudit = identityChanged && hasExternalIdentity ? { linkedBy: actor.id, linkedAt: new Date() } : {};
      await tx.userSystemAccess.upsert({
        where: { userId_systemId: key },
        create: { ...data, ...linkAudit },
        update: { ...data, ...linkAudit },
      });
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action:
            !previous
              ? "USER_SYSTEM_ACCESS_CREATED"
              : data.status === "REVOKED" && previous.status !== "REVOKED"
                ? "USER_SYSTEM_ACCESS_REVOKED"
                : "USER_SYSTEM_ACCESS_UPDATED",
          target: data.userId,
          ipAddress,
          metadata: {
            systemId: data.systemId,
            enabled: data.enabled,
            role: data.role,
            linkStatus: data.status,
            externalProvider: data.externalProvider,
            previousRole: previous?.role ?? null,
            externalAccountLinked: hasExternalIdentity,
          },
        },
      });
    });
    revalidatePath("/", "layout");
    return { success: "Permissão salva." };
  } catch (error) {
    return actionError(error);
  }
}

export async function changePassword(_: FormState, form: FormData): Promise<FormState> {
  const actor = await requireUser();
  try {
    const password = passwordSchema.parse(form.get("password"));
    if (password !== form.get("confirmation"))
      throw new BusinessError("A confirmação da senha não confere.");
    const current = await db.user.findUniqueOrThrow({ where: { id: actor.id } });
    if (!(await verifyPassword(String(form.get("currentPassword") || ""), current.passwordHash)))
      throw new BusinessError("Senha atual incorreta.");
    const passwordHash = await hashPassword(password);
    const ipAddress = await requestIp();
    await db.$transaction([
      db.user.update({
        where: { id: actor.id },
        data: { passwordHash, sessionVersion: { increment: 1 } },
      }),
      db.auditLog.create({
        data: { userId: actor.id, action: "PASSWORD_CHANGED", target: actor.id, ipAddress },
      }),
    ]);
    return { success: "Senha alterada. Faça login novamente com a nova senha." };
  } catch (error) {
    return actionError(error);
  }
}
