import type { FastifyPluginAsync } from "fastify";
import { requireAdmin, requireApprover, requireAuth } from "../lib/guards.js";

/** Laboratory-only routes for validating the authorization foundation. */
export const debugRoutes: FastifyPluginAsync = async (app) => {
  app.get("/protected", { preHandler: requireAuth }, async (request) => ({
    ok: true,
    userId: request.auth?.user.id,
  }));

  app.get("/admin", { preHandler: requireAdmin }, async (request) => ({
    ok: true,
    role: "admin",
    userId: request.auth?.user.id,
  }));

  app.get("/approver", { preHandler: requireApprover }, async () => ({
    ok: true,
    role: "requisition_approver",
  }));
};
