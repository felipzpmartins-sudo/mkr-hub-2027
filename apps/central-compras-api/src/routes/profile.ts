import type { FastifyPluginAsync } from "fastify";
import { toPublicAuthUser } from "../lib/auth-context.js";
import { requireAuth } from "../lib/guards.js";

export const profileRoutes: FastifyPluginAsync = async (app) => {
  app.get("/me", { preHandler: requireAuth }, async (request) => ({
    user: toPublicAuthUser(request.auth!),
  }));
};
