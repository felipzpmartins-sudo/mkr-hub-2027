import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { db } from "../src/lib/db";

const hubUrl = "https://mkr-hub-2027-production.up.railway.app";
const marketingOrigin = new URL(process.env.CENTRAL_MARKETING_ORIGIN || "").origin;
const marketingApi = new URL(process.env.CENTRAL_MARKETING_SUPABASE_URL || "").origin;
const hubProvisionKey = process.env.CENTRAL_MARKETING_HUB_PROVISION_KEY || "";
const encryptionSecret = process.env.HUB_SSO_ENCRYPTION_KEY || "";
const verificationEmail = "lf473418@gmail.com";
let ticketHash: string | null = null;

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
  console.log(`OK  ${message}`);
}

try {
  check(hubProvisionKey, "chave privada HUB/Marketing está configurada");
  check(encryptionSecret, "chave de criptografia SSO está configurada");
  const hubUser = await db.user.findUnique({ where: { email: verificationEmail } });
  check(hubUser, "conta principal existe no banco do HUB");

  const directoryResponse = await fetch(`${marketingApi}/api/admin/users`, {
    headers: { "x-hub-provision-key": hubProvisionKey },
  });
  check(directoryResponse.status === 200, "HUB consulta o diretório privado do Marketing");
  const directory = (await directoryResponse.json()) as { users?: Array<{ email?: unknown }> };
  const marketingUsers = Array.isArray(directory.users) ? directory.users : [];
  check(marketingUsers.length === 38, "área Contas recebe os 38 usuários restaurados do Marketing");
  check(marketingUsers.some((user) => user.email === verificationEmail), "conta principal aparece na área Contas");

  const provisionResponse = await fetch(`${marketingApi}/api/auth/hub-provision`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-hub-provision-key": hubProvisionKey },
    body: JSON.stringify({ email: hubUser.email, name: hubUser.name }),
  });
  check(provisionResponse.status === 200, "HUB cria ou reutiliza a identidade do Marketing sem pedir outra senha");
  const identity = (await provisionResponse.json()) as {
    access_token?: unknown;
    refresh_token?: unknown;
    user?: { email?: unknown };
  };
  check(identity.user?.email === verificationEmail, "identidade do Marketing corresponde à conta do HUB");
  check(typeof identity.access_token === "string" && typeof identity.refresh_token === "string", "Marketing devolve uma sessão válida ao HUB");

  const session = { accessToken: identity.access_token, refreshToken: identity.refresh_token };
  const iv = randomBytes(12);
  const key = createHash("sha256").update(encryptionSecret).digest();
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(session), "utf8"), cipher.final()]);
  const encryptedPayload = `${iv.toString("base64url")}.${encrypted.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}`;
  const ticket = randomBytes(32).toString("base64url");
  ticketHash = createHash("sha256").update(ticket).digest("base64url");
  await db.ssoTicket.create({
    data: {
      userId: hubUser.id,
      tokenHash: ticketHash,
      encryptedPayload,
      expiresAt: new Date(Date.now() + 90_000),
    },
  });
  check(ticket.length === 43, "HUB gerou o ticket de acesso único do Marketing");

  const exchange = await fetch(`${hubUrl}/api/sso/central/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: marketingOrigin },
    body: JSON.stringify({ ticket }),
  });
  check(exchange.status === 200, "HUB trocou o ticket pela sessão do Marketing");
  const exchangedSession = (await exchange.json()) as { accessToken?: unknown; refreshToken?: unknown };
  check(typeof exchangedSession.accessToken === "string" && typeof exchangedSession.refreshToken === "string", "sessão SSO contém os dois tokens esperados");

  const remoteUser = await fetch(`${marketingOrigin}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${exchangedSession.accessToken}` },
  });
  check(remoteUser.status === 200, "token SSO abre a sessão no Central de Marketing");
  const remoteIdentity = (await remoteUser.json()) as { email?: unknown };
  check(remoteIdentity.email === verificationEmail, "sessão aberta pertence à conta correta");

  const replay = await fetch(`${hubUrl}/api/sso/central/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: marketingOrigin },
    body: JSON.stringify({ ticket }),
  });
  check(replay.status === 403, "ticket SSO não pode ser reutilizado");
} finally {
  if (ticketHash) await db.ssoTicket.deleteMany({ where: { tokenHash: ticketHash } });
  await db.$disconnect();
}
