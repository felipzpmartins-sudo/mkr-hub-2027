"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, ensureHubSchema } from "@/lib/db";
import { auth } from "@/auth";
import { requireAdmin, requireUser } from "@/services/authorization";
import {
  createCentralMarketingSsoUrl,
  createCentralPurchasesSsoUrl,
  createMakerWalletSsoUrl,
  createCentralVideoSsoUrl,
  findExistingMakerWalletAccount,
  provisionSystemAccount,
  signInWithStoredSystemSecret,
} from "@/services/central-purchases";
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
  // The first request after an upgrade may be a system launch rather than the
  // dashboard render. Repair the additive SSO schema before reading access.
  await ensureHubSchema();
  const user = await requireUser();
  const session = await auth();
  const systemId = String(form.get("systemId") || "");
  const system = await db.system.findUnique({ where: { id: systemId } });
  if (!system) redirect("/systems");
  const access = await db.userSystemAccess.findUnique({
    where: { userId_systemId: { userId: user.id, systemId } },
  });
  if (access && (!access.enabled || access.status === "REVOKED")) redirect("/forbidden");
  if (system.status !== "ONLINE" || !system.url || !isSafeSystemUrl(system.url))
    redirect("/systems?notice=unavailable");
  let activeAccess = access;
  let systemSession = sessionForSystem(system.slug, session?.user);
  if (!systemSession && activeAccess?.encryptedExternalSecret) {
    const restored = await signInWithStoredSystemSecret(
      system.slug,
      user.email,
      activeAccess.encryptedExternalSecret,
    );
    systemSession = restored?.session ?? null;
  }

  if (
    !systemSession &&
    (!activeAccess ||
      system.slug === "central-de-videos" ||
      (system.slug === "maker-wallet" && activeAccess.enabled && activeAccess.status === "ACTIVE"))
  ) {
    const requestedRole = activeAccess?.role === "ADMIN" ? "ADMIN" : "USER";
    const provisioned =
      system.slug === "maker-wallet"
        ? await provisionSystemAccount(system.slug, user, requestedRole)
        : await provisionSystemAccount(system.slug, user);
    if (provisioned) {
      const data = {
        userId: user.id,
        systemId: system.id,
        enabled: true,
        role: "USER",
        externalUserId: provisioned.identity.subject,
        externalUserEmail: provisioned.identity.email,
        externalDisplayName: provisioned.identity.name,
        externalProvider: system.slug,
        externalIssuer: system.url,
        externalSubject: provisioned.identity.subject,
        encryptedExternalSecret: provisioned.encryptedSecret,
        linkedAt: new Date(),
      };
      activeAccess = activeAccess
        ? await db.userSystemAccess.update({ where: { id: activeAccess.id }, data })
        : await db.userSystemAccess.create({ data });
      if (!access) {
        await db.auditLog.create({
          data: {
            userId: user.id,
            action: "USER_SYSTEM_ACCESS_CREATED",
            target: activeAccess.id,
            ipAddress: await requestIp(),
            metadata: { systemSlug: system.slug, source: "hub-automatic-provisioning" },
          },
        });
      }
      systemSession = provisioned.session;
    }
  }

  const ssoUrl = systemSession
    ? await createSystemSsoUrl(system.slug, user.id, system.url, systemSession)
    : null;
  const connected =
    !!activeAccess &&
    activeAccess.enabled &&
    activeAccess.status === "ACTIVE" &&
    !!activeAccess.externalSubject;
  if (!ssoUrl && connected) redirect("/systems?notice=sign-in");
  if (!ssoUrl) redirect("/systems?notice=provisioning");

  const destination = ssoUrl;
  await db.auditLog.create({
    data: {
      userId: user.id,
      action: "SYSTEM_ACCESSED",
      target: system.id,
      ipAddress: await requestIp(),
      metadata: { role: activeAccess?.role, method: "sso_ticket" },
    },
  });
  redirect(destination);
}

/** Creates a pending request. The external account is created only after approval. */
export async function requestMakerWalletAccess() {
  await ensureHubSchema();
  const user = await requireUser();
  const system = await db.system.findUnique({ where: { slug: "maker-wallet" } });
  if (!system) redirect("/dashboard?notice=unavailable");

  const existing = await db.userSystemAccess.findUnique({
    where: { userId_systemId: { userId: user.id, systemId: system.id } },
  });
  if (existing?.enabled && existing.status === "ACTIVE") redirect("/dashboard");

  const existingWalletAccount =
    existing?.status === "REVOKED" ? null : await findExistingMakerWalletAccount(user.email);
  if (existingWalletAccount) {
    const role = existingWalletAccount.role === "ADMIN" ? "ADMIN" : "USER";
    const ipAddress = await requestIp();
    await db.$transaction(async (tx) => {
      const access = await tx.userSystemAccess.upsert({
        where: { userId_systemId: { userId: user.id, systemId: system.id } },
        create: {
          userId: user.id,
          systemId: system.id,
          enabled: true,
          role,
          status: "ACTIVE",
          externalUserId: existingWalletAccount.subject,
          externalUserEmail: existingWalletAccount.email,
          externalDisplayName: existingWalletAccount.name,
          externalProvider: "maker-wallet",
          externalIssuer: system.url,
          externalSubject: existingWalletAccount.subject,
          linkedBy: user.id,
          linkedAt: new Date(),
        },
        update: {
          enabled: true,
          role,
          status: "ACTIVE",
          externalUserId: existingWalletAccount.subject,
          externalUserEmail: existingWalletAccount.email,
          externalDisplayName: existingWalletAccount.name,
          externalProvider: "maker-wallet",
          externalIssuer: system.url,
          externalSubject: existingWalletAccount.subject,
          encryptedExternalSecret: null,
          linkedBy: user.id,
          linkedAt: new Date(),
        },
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: existing ? "USER_SYSTEM_ACCESS_UPDATED" : "USER_SYSTEM_ACCESS_CREATED",
          target: access.id,
          ipAddress,
          metadata: {
            systemSlug: system.slug,
            source: "existing-wallet-account-link",
            role,
          },
        },
      });
    });
    revalidatePath("/dashboard");
    revalidatePath("/systems");
    revalidatePath("/admin/accounts");
    redirect("/dashboard?notice=wallet-linked");
  }

  if (existing?.status === "ACTIVE") redirect("/dashboard?notice=wallet-request-pending");

  const ipAddress = await requestIp();
  await db.$transaction(async (tx) => {
    const request = existing
      ? await tx.userSystemAccess.update({
          where: { id: existing.id },
          data: {
            enabled: false,
            role: "USER",
            status: "ACTIVE",
            externalUserId: null,
            externalUserEmail: null,
            externalDisplayName: null,
            externalProvider: null,
            externalIssuer: null,
            externalSubject: null,
            encryptedExternalSecret: null,
            linkedBy: null,
            linkedAt: null,
          },
        })
      : await tx.userSystemAccess.create({
          data: {
            userId: user.id,
            systemId: system.id,
            enabled: false,
            role: "USER",
            status: "ACTIVE",
          },
        });
    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: existing ? "USER_SYSTEM_ACCESS_UPDATED" : "USER_SYSTEM_ACCESS_CREATED",
        target: request.id,
        ipAddress,
        metadata: { systemSlug: system.slug, source: "user-access-request", pendingApproval: true },
      },
    });
  });
  revalidatePath("/dashboard");
  revalidatePath("/systems");
  revalidatePath("/admin/accounts");
  revalidatePath("/admin/permissions");
  redirect("/dashboard?notice=wallet-requested");
}

type SystemSession = { accessToken: string; refreshToken?: string };

type HubSessionUser = {
  centralPurchasesSession?: SystemSession;
  centralMarketingSession?: SystemSession;
  makerWalletSession?: SystemSession;
  centralVideoSession?: SystemSession;
};

function sessionForSystem(slug: string, user: HubSessionUser | undefined): SystemSession | null {
  if (!user) return null;
  if (slug === "central-de-compras") return user.centralPurchasesSession ?? null;
  if (slug === "central-de-marketing") return user.centralMarketingSession ?? null;
  if (slug === "maker-wallet") return user.makerWalletSession ?? null;
  if (slug === "central-de-videos") return user.centralVideoSession ?? null;
  return null;
}

async function createSystemSsoUrl(
  slug: string,
  userId: string,
  systemUrl: string,
  session: SystemSession,
) {
  if (slug === "central-de-compras" && session.refreshToken)
    return createCentralPurchasesSsoUrl(userId, systemUrl, {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    });
  if (slug === "central-de-marketing" && session.refreshToken)
    return createCentralMarketingSsoUrl(userId, systemUrl, {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    });
  if (slug === "maker-wallet") return createMakerWalletSsoUrl(userId, systemUrl, session);
  if (slug === "central-de-videos") return createCentralVideoSsoUrl(userId, systemUrl, session);
  return null;
}
