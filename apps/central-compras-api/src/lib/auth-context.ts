import type { FastifyRequest } from "fastify";
import { getPrisma } from "./prisma.js";
import { hashSessionToken, readSessionToken } from "./session.js";

export type AuthenticatedUser = {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  status: string;
  mustResetPassword: boolean;
};

export type AuthenticatedProfile = {
  fullName: string | null;
  phone: string | null;
  department: string | null;
} | null;

export type AuthContext = {
  user: AuthenticatedUser;
  profile: AuthenticatedProfile;
  roles: string[];
  session: {
    id: string;
    expiresAt: Date;
  };
};

function toAuthContext(session: {
  id: string;
  expiresAt: Date;
  user: {
    id: string;
    email: string;
    fullName: string | null;
    phone: string | null;
    status: string;
    mustResetPassword: boolean;
    profile: { fullName: string | null; phone: string | null; department: string | null } | null;
    roles: { role: string }[];
  };
}): AuthContext {
  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      fullName: session.user.fullName,
      phone: session.user.phone,
      status: session.user.status,
      mustResetPassword: session.user.mustResetPassword,
    },
    profile: session.user.profile,
    roles: session.user.roles.map(({ role }) => role),
    session: {
      id: session.id,
      expiresAt: session.expiresAt,
    },
  };
}

/**
 * Resolves the current cookie into public request context. A missing, expired,
 * revoked or inactive session intentionally behaves like no authenticated user.
 */
export async function attachAuthContext(request: FastifyRequest): Promise<void> {
  const token = readSessionToken(request);

  if (!token) {
    return;
  }

  const session = await getPrisma().authSession.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: {
      user: {
        include: {
          profile: true,
          roles: { select: { role: true } },
        },
      },
    },
  });

  if (!session || session.revokedAt || session.expiresAt <= new Date() || session.user.status !== "ACTIVE") {
    return;
  }

  request.auth = toAuthContext(session);
}

export function toPublicAuthUser(auth: AuthContext) {
  return {
    id: auth.user.id,
    email: auth.user.email,
    fullName: auth.user.fullName,
    phone: auth.user.phone,
    status: auth.user.status,
    mustResetPassword: auth.user.mustResetPassword,
    profile: auth.profile,
    roles: auth.roles,
  };
}
