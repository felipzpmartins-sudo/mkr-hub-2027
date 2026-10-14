import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";

const CENTRAL_SYSTEM_SLUG = "central-de-compras";
const MARKETING_SYSTEM_SLUG = "central-de-marketing";
const WALLET_SYSTEM_SLUG = "maker-wallet";
const VIDEO_SYSTEM_SLUG = "central-de-videos";
const SSO_TICKET_TTL_MS = 90_000;

export type CentralPurchasesSession = {
  accessToken: string;
  refreshToken: string;
};

export type CentralMarketingSession = CentralPurchasesSession;
export type MakerWalletSession = { accessToken: string };
export type CentralVideoSession = { accessToken: string };
type SsoSession = { accessToken: string; refreshToken?: string };

type CentralIdentity = CentralPurchasesSession & {
  subject: string;
  email: string;
  name: string;
};

type MakerWalletIdentity = MakerWalletSession & {
  subject: string;
  email: string;
  name: string;
};

type CentralVideoIdentity = CentralVideoSession & {
  subject: string;
  email: string;
  name: string;
};

type HubAccount = { id: string; name: string; email: string };
type SystemIdentity = { subject: string; email: string; name: string };

export type ProvisionedSystemSession = {
  identity: SystemIdentity;
  session: SsoSession;
  encryptedSecret: string | null;
};

type CentralConfig = {
  supabaseUrl: string;
  publishableKey: string;
  origin: string;
  encryptionKey: Buffer;
};

type PurchaseApiConfig = {
  apiUrl: string;
  origin: string;
  hubProvisionKey: string;
  encryptionKey: Buffer;
};

type MakerWalletConfig = {
  apiUrl: string;
  origin: string;
  encryptionKey: Buffer;
};

type CentralVideoConfig = MakerWalletConfig;

export type CentralPurchasesDirectoryUser = {
  id: string;
  email: string;
  name: string;
  createdAt: string | null;
  lastSignInAt: string | null;
  roles: string[];
  active: boolean;
};

export type CentralPurchasesUserAction =
  | { action: "reset_password"; userId: string; password: string }
  | { action: "set_active"; userId: string; active: boolean };

function configuredValue(name: string) {
  const value = process.env[name]?.trim();
  return value || null;
}

function getCentralConfig(): PurchaseApiConfig | null {
  const apiUrl = configuredValue("CENTRAL_PURCHASES_API_URL");
  const origin = configuredValue("CENTRAL_PURCHASES_ORIGIN");
  const hubProvisionKey = configuredValue("CENTRAL_PURCHASES_HUB_PROVISION_KEY");
  const encryptionSecret = configuredValue("HUB_SSO_ENCRYPTION_KEY");
  if (!apiUrl || !origin || !hubProvisionKey || !encryptionSecret) return null;
  try {
    return {
      apiUrl: new URL(apiUrl).origin,
      origin: new URL(origin).origin,
      hubProvisionKey,
      encryptionKey: createHash("sha256").update(encryptionSecret).digest(),
    };
  } catch {
    return null;
  }
}

function getMarketingConfig(): CentralConfig | null {
  return getIntegrationConfig("CENTRAL_MARKETING");
}

function getMakerWalletConfig(): MakerWalletConfig | null {
  return getApiIntegrationConfig("MAKER_WALLET");
}

function getCentralVideoConfig(): CentralVideoConfig | null {
  return getApiIntegrationConfig("CENTRAL_VIDEO");
}

function getApiIntegrationConfig(prefix: "MAKER_WALLET" | "CENTRAL_VIDEO"): MakerWalletConfig | null {
  const apiUrl = configuredValue(`${prefix}_API_URL`);
  const origin = configuredValue(`${prefix}_ORIGIN`);
  const encryptionSecret = configuredValue("HUB_SSO_ENCRYPTION_KEY");
  if (!apiUrl || !origin || !encryptionSecret) return null;
  try {
    return {
      apiUrl: new URL(apiUrl).origin,
      origin: new URL(origin).origin,
      encryptionKey: createHash("sha256").update(encryptionSecret).digest(),
    };
  } catch {
    return null;
  }
}

function getIntegrationConfig(prefix: "CENTRAL_PURCHASES" | "CENTRAL_MARKETING"): CentralConfig | null {
  const supabaseUrl = configuredValue(`${prefix}_SUPABASE_URL`);
  const publishableKey = configuredValue(`${prefix}_SUPABASE_ANON_KEY`);
  const origin = configuredValue(`${prefix}_ORIGIN`);
  const encryptionSecret = configuredValue("HUB_SSO_ENCRYPTION_KEY");
  if (!supabaseUrl || !publishableKey || !origin || !encryptionSecret) return null;

  try {
    const normalizedSupabaseUrl = new URL(supabaseUrl).origin;
    const normalizedOrigin = new URL(origin).origin;
    return {
      supabaseUrl: normalizedSupabaseUrl,
      publishableKey,
      origin: normalizedOrigin,
      encryptionKey: createHash("sha256").update(encryptionSecret).digest(),
    };
  } catch {
    return null;
  }
}

function readIdentity(value: unknown, fallbackEmail: string): CentralIdentity | null {
  if (!value || typeof value !== "object") return null;
  const payload = value as Record<string, unknown>;
  const user = payload.user;
  if (!user || typeof user !== "object") return null;
  const rawUser = user as Record<string, unknown>;
  const subject = typeof rawUser.id === "string" ? rawUser.id.trim() : "";
  const responseEmail = typeof rawUser.email === "string" ? rawUser.email.trim().toLowerCase() : "";
  const accessToken = typeof payload.access_token === "string" ? payload.access_token : "";
  const refreshToken = typeof payload.refresh_token === "string" ? payload.refresh_token : "";
  if (!subject || !responseEmail || !accessToken || !refreshToken) return null;

  const metadata =
    rawUser.user_metadata && typeof rawUser.user_metadata === "object"
      ? (rawUser.user_metadata as Record<string, unknown>)
      : {};
  const metadataName = typeof metadata.full_name === "string" ? metadata.full_name.trim() : "";
  const name = (metadataName || responseEmail || fallbackEmail).slice(0, 100);

  return { subject, email: responseEmail, name, accessToken, refreshToken };
}

export async function listCentralPurchasesUsers(): Promise<CentralPurchasesDirectoryUser[]> {
  const config = getCentralConfig();
  if (!config) throw new Error("Central de Compras não está configurado no MKR HUB.");

  const response = await fetch(`${config.apiUrl}/api/admin/users`, {
    headers: { "x-hub-provision-key": config.hubProvisionKey },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Não foi possível consultar os usuários do Central de Compras (${response.status}).`);
  }

  const payload = (await response.json()) as { users?: unknown };
  if (!Array.isArray(payload.users)) throw new Error("Resposta inválida do Central de Compras.");

  return payload.users.flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const user = value as Record<string, unknown>;
    const id = typeof user.id === "string" ? user.id : "";
    const email = typeof user.email === "string" ? user.email : "";
    if (!id || !email) return [];
    return [{
      id,
      email,
      name: typeof user.full_name === "string" && user.full_name.trim() ? user.full_name.trim() : email,
      createdAt: typeof user.created_at === "string" ? user.created_at : null,
      lastSignInAt: typeof user.last_sign_in_at === "string" ? user.last_sign_in_at : null,
      roles: Array.isArray(user.roles) ? user.roles.filter((role): role is string => typeof role === "string") : [],
      active: user.active !== false,
    }];
  });
}

export async function manageCentralPurchasesUser(input: CentralPurchasesUserAction) {
  const config = getCentralConfig();
  if (!config) throw new Error("Central de Compras não está configurado no MKR HUB.");

  const body = input.action === "reset_password"
    ? { action: input.action, user_id: input.userId, new_password: input.password }
    : { action: input.action, user_id: input.userId, active: input.active };
  const response = await fetch(`${config.apiUrl}/api/admin/users/manage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-hub-provision-key": config.hubProvisionKey,
    },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    if (payload?.error === "user_not_found") throw new Error("Usuário não encontrado no Central de Compras.");
    if (payload?.error === "invalid_password") throw new Error("A nova senha não atende aos requisitos de segurança.");
    throw new Error(`Não foi possível atualizar o usuário do Central de Compras (${response.status}).`);
  }
}

export async function signInToCentralPurchases(
  email: string,
  _password: string,
): Promise<CentralIdentity | null> {
  const config = getCentralConfig();
  if (!config) return null;
  try {
    const response = await fetch(`${config.apiUrl}/api/auth/hub-provision`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-hub-provision-key": config.hubProvisionKey,
      },
      body: JSON.stringify({ email, name: email.split("@")[0] || email }),
      cache: "no-store",
    });
    if (!response.ok) return null;
    return readIdentity(await response.json(), email);
  } catch {
    return null;
  }
}

export async function signInToCentralMarketing(
  email: string,
  password: string,
): Promise<CentralIdentity | null> {
  const config = getMarketingConfig();
  return signInWithConfig(config, email, password);
}

async function signInWithConfig(
  config: CentralConfig | null,
  email: string,
  password: string,
): Promise<CentralIdentity | null> {
  if (!config) return null;

  try {
    const response = await fetch(`${config.supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: config.publishableKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });
    if (!response.ok) return null;
    return readIdentity(await response.json(), email);
  } catch {
    return null;
  }
}

export async function signInToMakerWallet(
  email: string,
  password: string,
): Promise<MakerWalletIdentity | null> {
  const config = getMakerWalletConfig();
  if (!config) return null;
  try {
    const response = await fetch(`${config.apiUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const payload: unknown = await response.json();
    if (!payload || typeof payload !== "object") return null;
    const data = (payload as { data?: unknown }).data;
    if (!data || typeof data !== "object") return null;
    const loginData = data as { token?: unknown; user?: unknown };
    const accessToken = loginData.token;
    if (typeof accessToken !== "string" || !accessToken || !loginData.user || typeof loginData.user !== "object") {
      return null;
    }
    const user = loginData.user as Record<string, unknown>;
    const subject = typeof user.id === "string" ? user.id.trim() : "";
    const responseEmail = typeof user.email === "string" ? user.email.trim().toLowerCase() : "";
    const name = typeof user.name === "string" ? user.name.trim().slice(0, 100) : "";
    if (!subject || !responseEmail) return null;
    return { accessToken, subject, email: responseEmail, name: name || responseEmail || email };
  } catch {
    return null;
  }
}

export async function signInToCentralVideo(
  email: string,
  password: string,
): Promise<CentralVideoIdentity | null> {
  const config = getCentralVideoConfig();
  if (!config) return null;
  try {
    const response = await fetch(`${config.apiUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const payload: unknown = await response.json();
    if (!payload || typeof payload !== "object") return null;
    const data = payload as { token?: unknown; user?: unknown };
    if (typeof data.token !== "string" || !data.token || !data.user || typeof data.user !== "object") return null;
    const user = data.user as Record<string, unknown>;
    const subject = typeof user.id === "string" ? user.id.trim() : "";
    const responseEmail = typeof user.email === "string" ? user.email.trim().toLowerCase() : "";
    const name = typeof user.name === "string" ? user.name.trim().slice(0, 100) : "";
    if (!subject || !responseEmail) return null;
    return { accessToken: data.token, subject, email: responseEmail, name: name || responseEmail || email };
  } catch {
    return null;
  }
}

/**
 * Creates a system-local account with an opaque, random credential. The credential is
 * never shown to the person: it is encrypted in the HUB solely to renew SSO later.
 */
export async function provisionSystemAccount(
  slug: string,
  account: HubAccount,
): Promise<ProvisionedSystemSession | null> {
  const secret = randomBytes(32).toString("base64url");
  let identity: (CentralIdentity | MakerWalletIdentity | CentralVideoIdentity) | null = null;

  if (slug === CENTRAL_SYSTEM_SLUG || slug === MARKETING_SYSTEM_SLUG) {
    identity =
      slug === CENTRAL_SYSTEM_SLUG
        ? await signInToCentralPurchases(account.email, secret)
        : await signUpToSupabase(getMarketingConfig(), account, secret);
  } else if (slug === WALLET_SYSTEM_SLUG) {
    const config = getMakerWalletConfig();
    const invite = configuredValue("MAKER_WALLET_REGISTRATION_INVITE_CODE");
    if (!config || !invite) return null;
    try {
      const response = await fetch(`${config.apiUrl}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: account.name, email: account.email, password: secret, invite }),
        cache: "no-store",
      });
      if (!response.ok) return null;
      identity = await signInToMakerWallet(account.email, secret);
    } catch {
      return null;
    }
  } else if (slug === VIDEO_SYSTEM_SLUG) {
    const config = getCentralVideoConfig();
    const hubProvisionKey = configuredValue("CENTRAL_VIDEO_HUB_PROVISION_KEY");
    if (!config || !hubProvisionKey) return null;
    try {
      const response = await fetch(`${config.apiUrl}/api/auth/hub-provision`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-hub-provision-key": hubProvisionKey,
        },
        body: JSON.stringify({ name: account.name, email: account.email }),
        cache: "no-store",
      });
      if (!response.ok) return null;
      identity = readCentralVideoIdentity(await response.json(), account.email);
    } catch {
      return null;
    }
  }

  if (!identity) return null;
  const refreshToken = "refreshToken" in identity && typeof identity.refreshToken === "string"
    ? identity.refreshToken
    : undefined;
  const encryptedSecret = slug === VIDEO_SYSTEM_SLUG ? null : encryptExternalSecret(secret);
  if (slug !== VIDEO_SYSTEM_SLUG && !encryptedSecret) return null;
  return {
    identity: { subject: identity.subject, email: identity.email, name: identity.name },
    session: refreshToken
      ? { accessToken: identity.accessToken, refreshToken }
      : { accessToken: identity.accessToken },
    encryptedSecret,
  };
}

function readCentralVideoIdentity(value: unknown, fallbackEmail: string): CentralVideoIdentity | null {
  if (!value || typeof value !== "object") return null;
  const payload = value as { token?: unknown; user?: unknown };
  if (typeof payload.token !== "string" || !payload.token || !payload.user || typeof payload.user !== "object")
    return null;
  const user = payload.user as Record<string, unknown>;
  const subject = typeof user.id === "string" ? user.id.trim() : "";
  const email = typeof user.email === "string" ? user.email.trim().toLowerCase() : "";
  const name = typeof user.name === "string" ? user.name.trim().slice(0, 100) : "";
  if (!subject || !email) return null;
  return { accessToken: payload.token, subject, email, name: name || email || fallbackEmail };
}

export async function signInWithStoredSystemSecret(
  slug: string,
  email: string,
  encryptedSecret: string | null,
): Promise<{ identity: SystemIdentity; session: SsoSession } | null> {
  const secret = encryptedSecret ? decryptExternalSecret(encryptedSecret) : null;
  if (!secret) return null;
  const identity =
    slug === CENTRAL_SYSTEM_SLUG
      ? await signInToCentralPurchases(email, secret)
      : slug === MARKETING_SYSTEM_SLUG
        ? await signInToCentralMarketing(email, secret)
        : slug === WALLET_SYSTEM_SLUG
          ? await signInToMakerWallet(email, secret)
          : slug === VIDEO_SYSTEM_SLUG
            ? await signInToCentralVideo(email, secret)
            : null;
  if (!identity) return null;
  const refreshToken = "refreshToken" in identity && typeof identity.refreshToken === "string"
    ? identity.refreshToken
    : undefined;
  return {
    identity: { subject: identity.subject, email: identity.email, name: identity.name },
    session: refreshToken
      ? { accessToken: identity.accessToken, refreshToken }
      : { accessToken: identity.accessToken },
  };
}

async function signUpToSupabase(
  config: CentralConfig | null,
  account: HubAccount,
  password: string,
): Promise<CentralIdentity | null> {
  if (!config) return null;
  try {
    const response = await fetch(`${config.supabaseUrl}/auth/v1/signup`, {
      method: "POST",
      headers: { apikey: config.publishableKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: account.email,
        password,
        data: { full_name: account.name },
      }),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const identity = readIdentity(await response.json(), account.email);
    return identity ?? signInWithConfig(config, account.email, password);
  } catch {
    return null;
  }
}

export async function provisionMakerWalletUser(identity: MakerWalletIdentity) {
  const system = await db.system.findUnique({ where: { slug: WALLET_SYSTEM_SLUG } });
  if (!system) return null;

  return db.$transaction(async (tx) => {
    let user = await tx.user.findUnique({ where: { email: identity.email } });
    if (user?.status === "INACTIVE") return null;

    if (!user) {
      user = await tx.user.create({
        data: {
          name: identity.name,
          email: identity.email,
          passwordHash: await hashPassword(randomBytes(32).toString("base64url")),
        },
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "USER_CREATED",
          target: user.id,
          metadata: { source: WALLET_SYSTEM_SLUG },
        },
      });
    }

    const existingAccess = await tx.userSystemAccess.findUnique({
      where: { userId_systemId: { userId: user.id, systemId: system.id } },
    });
    if (existingAccess && (!existingAccess.enabled || existingAccess.status === "REVOKED")) return null;

    if (existingAccess) {
      await tx.userSystemAccess.update({
        where: { id: existingAccess.id },
        data: {
          externalUserId: identity.subject,
          externalUserEmail: identity.email,
          externalDisplayName: identity.name,
          externalProvider: WALLET_SYSTEM_SLUG,
          externalIssuer: getMakerWalletConfig()?.apiUrl,
          externalSubject: identity.subject,
        },
      });
    } else {
      const access = await tx.userSystemAccess.create({
        data: {
          userId: user.id,
          systemId: system.id,
          enabled: true,
          role: "USER",
          externalUserId: identity.subject,
          externalUserEmail: identity.email,
          externalDisplayName: identity.name,
          externalProvider: WALLET_SYSTEM_SLUG,
          externalIssuer: getMakerWalletConfig()?.apiUrl,
          externalSubject: identity.subject,
          linkedAt: new Date(),
        },
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "USER_SYSTEM_ACCESS_CREATED",
          target: access.id,
          metadata: { systemSlug: WALLET_SYSTEM_SLUG, source: WALLET_SYSTEM_SLUG },
        },
      });
    }
    return user;
  });
}

export async function provisionCentralVideoUser(identity: CentralVideoIdentity) {
  const system = await db.system.findUnique({ where: { slug: VIDEO_SYSTEM_SLUG } });
  if (!system) return null;

  return db.$transaction(async (tx) => {
    let user = await tx.user.findUnique({ where: { email: identity.email } });
    if (user?.status === "INACTIVE") return null;
    if (!user) {
      user = await tx.user.create({
        data: {
          name: identity.name,
          email: identity.email,
          passwordHash: await hashPassword(randomBytes(32).toString("base64url")),
        },
      });
      await tx.auditLog.create({
        data: { userId: user.id, action: "USER_CREATED", target: user.id, metadata: { source: VIDEO_SYSTEM_SLUG } },
      });
    }

    const existingAccess = await tx.userSystemAccess.findUnique({
      where: { userId_systemId: { userId: user.id, systemId: system.id } },
    });
    if (existingAccess && (!existingAccess.enabled || existingAccess.status === "REVOKED")) return null;
    if (existingAccess) {
      await tx.userSystemAccess.update({
        where: { id: existingAccess.id },
        data: {
          externalUserId: identity.subject,
          externalUserEmail: identity.email,
          externalDisplayName: identity.name,
          externalProvider: VIDEO_SYSTEM_SLUG,
          externalIssuer: getCentralVideoConfig()?.apiUrl,
          externalSubject: identity.subject,
        },
      });
    } else {
      const access = await tx.userSystemAccess.create({
        data: {
          userId: user.id,
          systemId: system.id,
          enabled: true,
          role: "USER",
          externalUserId: identity.subject,
          externalUserEmail: identity.email,
          externalDisplayName: identity.name,
          externalProvider: VIDEO_SYSTEM_SLUG,
          externalIssuer: getCentralVideoConfig()?.apiUrl,
          externalSubject: identity.subject,
          linkedAt: new Date(),
        },
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "USER_SYSTEM_ACCESS_CREATED",
          target: access.id,
          metadata: { systemSlug: VIDEO_SYSTEM_SLUG, source: VIDEO_SYSTEM_SLUG },
        },
      });
    }
    return user;
  });
}

export async function provisionCentralMarketingUser(identity: CentralIdentity) {
  const system = await db.system.findUnique({ where: { slug: MARKETING_SYSTEM_SLUG } });
  if (!system) return null;

  return db.$transaction(async (tx) => {
    let user = await tx.user.findUnique({ where: { email: identity.email } });
    if (user?.status === "INACTIVE") return null;
    if (!user) {
      user = await tx.user.create({
        data: {
          name: identity.name,
          email: identity.email,
          passwordHash: await hashPassword(randomBytes(32).toString("base64url")),
        },
      });
      await tx.auditLog.create({
        data: { userId: user.id, action: "USER_CREATED", target: user.id, metadata: { source: MARKETING_SYSTEM_SLUG } },
      });
    }

    const existingAccess = await tx.userSystemAccess.findUnique({
      where: { userId_systemId: { userId: user.id, systemId: system.id } },
    });
    if (existingAccess && (!existingAccess.enabled || existingAccess.status === "REVOKED")) return null;
    const data = {
      externalUserId: identity.subject,
      externalUserEmail: identity.email,
      externalDisplayName: identity.name,
      externalProvider: MARKETING_SYSTEM_SLUG,
      externalIssuer: getMarketingConfig()?.supabaseUrl,
      externalSubject: identity.subject,
    };
    if (existingAccess) {
      await tx.userSystemAccess.update({ where: { id: existingAccess.id }, data });
    } else {
      const access = await tx.userSystemAccess.create({
        data: { userId: user.id, systemId: system.id, enabled: true, role: "USER", linkedAt: new Date(), ...data },
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "USER_SYSTEM_ACCESS_CREATED",
          target: access.id,
          metadata: { systemSlug: MARKETING_SYSTEM_SLUG, source: MARKETING_SYSTEM_SLUG },
        },
      });
    }
    return user;
  });
}

export async function provisionCentralPurchasesUser(identity: CentralIdentity) {
  const system = await db.system.findUnique({ where: { slug: CENTRAL_SYSTEM_SLUG } });
  if (!system) return null;

  return db.$transaction(async (tx) => {
    let user = await tx.user.findUnique({ where: { email: identity.email } });
    if (user?.status === "INACTIVE") return null;

    if (!user) {
      user = await tx.user.create({
        data: {
          name: identity.name,
          email: identity.email,
          passwordHash: await hashPassword(randomBytes(32).toString("base64url")),
        },
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "USER_CREATED",
          target: user.id,
          metadata: { source: "central-de-compras" },
        },
      });
    }

    const existingAccess = await tx.userSystemAccess.findUnique({
      where: { userId_systemId: { userId: user.id, systemId: system.id } },
    });
    if (existingAccess && (!existingAccess.enabled || existingAccess.status === "REVOKED")) return null;

    if (existingAccess) {
      await tx.userSystemAccess.update({
        where: { id: existingAccess.id },
        data: {
          externalUserId: identity.subject,
          externalUserEmail: identity.email,
          externalDisplayName: identity.name,
          externalProvider: CENTRAL_SYSTEM_SLUG,
          externalIssuer: getCentralConfig()?.apiUrl,
          externalSubject: identity.subject,
        },
      });
    } else {
      const access = await tx.userSystemAccess.create({
        data: {
          userId: user.id,
          systemId: system.id,
          enabled: true,
          role: "USER",
          externalUserId: identity.subject,
          externalUserEmail: identity.email,
          externalDisplayName: identity.name,
          externalProvider: CENTRAL_SYSTEM_SLUG,
          externalIssuer: getCentralConfig()?.apiUrl,
          externalSubject: identity.subject,
          linkedAt: new Date(),
        },
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "USER_SYSTEM_ACCESS_CREATED",
          target: access.id,
          metadata: { systemSlug: CENTRAL_SYSTEM_SLUG, source: "central-de-compras" },
        },
      });
    }

    return user;
  });
}

function encryptSession(session: SsoSession, key: Buffer) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(session), "utf8"), cipher.final()]);
  return `${iv.toString("base64url")}.${encrypted.toString("base64url")}.${cipher
    .getAuthTag()
    .toString("base64url")}`;
}

function decryptSession(payload: string, key: Buffer): SsoSession | null {
  const [ivValue, encryptedValue, tagValue] = payload.split(".");
  if (!ivValue || !encryptedValue || !tagValue) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivValue, "base64url"));
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedValue, "base64url")),
      decipher.final(),
    ]);
    const value: unknown = JSON.parse(decrypted.toString("utf8"));
    if (!value || typeof value !== "object") return null;
    const session = value as Record<string, unknown>;
    if (typeof session.accessToken !== "string") return null;
    return typeof session.refreshToken === "string"
      ? { accessToken: session.accessToken, refreshToken: session.refreshToken }
      : { accessToken: session.accessToken };
  } catch {
    return null;
  }
}

export function encryptExternalSecret(secret: string) {
  const value = configuredValue("HUB_SSO_ENCRYPTION_KEY");
  if (!value) return null;
  const key = createHash("sha256").update(value).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return `${iv.toString("base64url")}.${encrypted.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}`;
}

export function decryptExternalSecret(payload: string) {
  const value = configuredValue("HUB_SSO_ENCRYPTION_KEY");
  if (!value) return null;
  const [ivValue, encryptedValue, tagValue] = payload.split(".");
  if (!ivValue || !encryptedValue || !tagValue) return null;
  try {
    const key = createHash("sha256").update(value).digest();
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivValue, "base64url"));
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedValue, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}

export async function createCentralPurchasesSsoUrl(
  userId: string,
  systemUrl: string,
  session: CentralPurchasesSession,
) {
  const config = getCentralConfig();
  return createSsoUrl(userId, systemUrl, session, config);
}

export async function createCentralMarketingSsoUrl(
  userId: string,
  systemUrl: string,
  session: CentralMarketingSession,
) {
  const config = getMarketingConfig();
  return createSsoUrl(userId, systemUrl, session, config);
}

export async function createMakerWalletSsoUrl(
  userId: string,
  systemUrl: string,
  session: MakerWalletSession,
) {
  return createSsoUrl(userId, systemUrl, session, getMakerWalletConfig(), "/sso");
}

export async function createCentralVideoSsoUrl(
  userId: string,
  systemUrl: string,
  session: CentralVideoSession,
) {
  return createSsoUrl(userId, systemUrl, session, getCentralVideoConfig(), "/sso");
}

async function createSsoUrl(
  userId: string,
  systemUrl: string,
  session: SsoSession,
  config:
    | Pick<CentralConfig, "origin" | "encryptionKey">
    | Pick<PurchaseApiConfig, "origin" | "encryptionKey">
    | MakerWalletConfig
    | null,
  callbackPath = "/auth/sso",
) {
  if (!config || new URL(systemUrl).origin !== config.origin) return null;

  const ticket = randomBytes(32).toString("base64url");
  await db.ssoTicket.create({
    data: {
      userId,
      tokenHash: createHash("sha256").update(ticket).digest("base64url"),
      encryptedPayload: encryptSession(session, config.encryptionKey),
      expiresAt: new Date(Date.now() + SSO_TICKET_TTL_MS),
    },
  });
  const callback = new URL(callbackPath, config.origin);
  callback.searchParams.set("ticket", ticket);
  return callback.toString();
}

export async function consumeCentralPurchasesSsoTicket(ticket: string) {
  const encryptionKey =
    getCentralConfig()?.encryptionKey ??
    getMarketingConfig()?.encryptionKey ??
    getMakerWalletConfig()?.encryptionKey ??
    getCentralVideoConfig()?.encryptionKey;
  if (!encryptionKey || !/^[A-Za-z0-9_-]{43}$/.test(ticket)) return null;
  try {
    const record = await db.ssoTicket.delete({
      where: { tokenHash: createHash("sha256").update(ticket).digest("base64url") },
    });
    if (record.expiresAt <= new Date()) return null;
    return decryptSession(record.encryptedPayload, encryptionKey);
  } catch {
    return null;
  }
}

export function isCentralPurchasesOrigin(origin: string | null) {
  const allowedOrigins = [
    getCentralConfig()?.origin,
    getMarketingConfig()?.origin,
    getMakerWalletConfig()?.origin,
    getCentralVideoConfig()?.origin,
  ];
  return !!origin && allowedOrigins.includes(origin);
}
