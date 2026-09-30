import { createHmac, randomBytes } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { env } from "../config/env.js";

export const sessionCookieName = "central_compras_session";

function sessionSecret(): string {
  if (!env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET is required before authentication is enabled.");
  }

  return env.SESSION_SECRET;
}

export function createSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * HMAC lets the database retain only a non-reversible session-token verifier.
 * The raw token exists only in the HttpOnly browser cookie.
 */
export function hashSessionToken(token: string): string {
  return createHmac("sha256", sessionSecret()).update(token).digest("hex");
}

function cookieAttributes(maxAge?: number): string {
  const attributes = ["Path=/", "HttpOnly", "SameSite=Lax"];

  if (typeof maxAge === "number") {
    attributes.push(`Max-Age=${maxAge}`);
  }

  if (env.COOKIE_DOMAIN) {
    attributes.push(`Domain=${env.COOKIE_DOMAIN}`);
  }

  if (env.NODE_ENV === "production") {
    attributes.push("Secure");
  }

  return attributes.join("; ");
}

export function setSessionCookie(reply: FastifyReply, token: string): void {
  const maxAge = env.SESSION_TTL_HOURS * 60 * 60;
  reply.header("Set-Cookie", `${sessionCookieName}=${token}; ${cookieAttributes(maxAge)}`);
}

export function clearSessionCookie(reply: FastifyReply): void {
  reply.header("Set-Cookie", `${sessionCookieName}=; ${cookieAttributes(0)}`);
}

export function readSessionToken(request: FastifyRequest): string | undefined {
  const cookieHeader = request.headers.cookie;

  if (!cookieHeader) {
    return undefined;
  }

  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${sessionCookieName}=`));

  return cookie?.slice(sessionCookieName.length + 1) || undefined;
}
