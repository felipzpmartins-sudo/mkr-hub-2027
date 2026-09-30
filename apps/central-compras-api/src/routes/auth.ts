import bcrypt from "bcryptjs";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { env } from "../config/env.js";
import { toPublicAuthUser } from "../lib/auth-context.js";
import { sendError } from "../lib/errors.js";
import { requireAuth } from "../lib/guards.js";
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

function toLoginResponseUser(user: {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  status: string;
  profile: { fullName: string | null; phone: string | null; department: string | null } | null;
  roles: { role: string }[];
}) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
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

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post("/login", async (request, reply) => {
    const input = loginBodySchema.safeParse(request.body);

    if (!input.success) {
      return sendError(reply, 400, "VALIDATION_ERROR", "Invalid login payload.");
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
      return sendError(reply, 401, "UNAUTHORIZED", "Invalid email or password.");
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
    return reply.send({ user: toLoginResponseUser(user) });
  });

  app.get("/me", { preHandler: requireAuth }, async (request, reply) => {
    return reply.send({ user: toPublicAuthUser(request.auth!) });
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
