import bcrypt from "bcryptjs";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { env } from "../config/env.js";
import { getPrisma } from "../lib/prisma.js";
import {
  clearSessionCookie,
  createSessionToken,
  hashSessionToken,
  readSessionToken,
  setSessionCookie,
} from "../lib/session.js";

const loginBodySchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(1).max(256),
});

const invalidCredentials = { error: "Invalid email or password." };
const unauthorized = { error: "Authentication required." };

function toPublicUser(user: {
  id: string;
  email: string;
  fullName: string | null;
  status: string;
  profile: { fullName: string | null; phone: string | null; department: string | null } | null;
  roles: { role: string }[];
}) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    status: user.status,
    roles: user.roles.map(({ role }) => role),
    profile: user.profile
      ? {
          fullName: user.profile.fullName,
          phone: user.profile.phone,
          department: user.profile.department,
        }
      : null,
  };
}

async function findAuthenticatedUser(token: string) {
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
    return undefined;
  }

  return { session, user: session.user };
}

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post("/login", async (request, reply) => {
    const input = loginBodySchema.safeParse(request.body);

    if (!input.success) {
      return reply.code(400).send({ error: "Invalid login payload." });
    }

    const user = await getPrisma().user.findUnique({
      where: { email: input.data.email },
      include: {
        profile: true,
        roles: { select: { role: true } },
      },
    });

    const passwordMatches = user?.passwordHash
      ? await bcrypt.compare(input.data.password, user.passwordHash)
      : false;

    if (!user || !passwordMatches || user.status !== "ACTIVE") {
      return reply.code(401).send(invalidCredentials);
    }

    const token = createSessionToken();
    const expiresAt = new Date(Date.now() + env.SESSION_TTL_HOURS * 60 * 60 * 1000);

    await getPrisma().$transaction([
      getPrisma().authSession.create({
        data: {
          userId: user.id,
          tokenHash: hashSessionToken(token),
          expiresAt,
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"],
        },
      }),
      getPrisma().user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      }),
    ]);

    setSessionCookie(reply, token);
    return reply.send({ user: toPublicUser(user) });
  });

  app.get("/me", async (request, reply) => {
    const token = readSessionToken(request);

    if (!token) {
      return reply.code(401).send(unauthorized);
    }

    const authenticated = await findAuthenticatedUser(token);

    if (!authenticated) {
      clearSessionCookie(reply);
      return reply.code(401).send(unauthorized);
    }

    return reply.send({ user: toPublicUser(authenticated.user) });
  });

  app.post("/logout", async (request, reply) => {
    const token = readSessionToken(request);

    if (token) {
      await getPrisma().authSession.updateMany({
        where: {
          tokenHash: hashSessionToken(token),
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
    }

    clearSessionCookie(reply);
    return reply.code(204).send();
  });
};
