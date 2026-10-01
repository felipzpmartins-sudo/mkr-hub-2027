import Fastify from "fastify";
import multipart from "@fastify/multipart";
import { env } from "./config/env.js";
import { attachAuthContext } from "./lib/auth-context.js";
import { registerErrorHandlers } from "./lib/errors.js";
import { authRoutes } from "./routes/auth.js";
import { debugRoutes } from "./routes/debug.js";
import { healthRoutes } from "./routes/health.js";
import { profileRoutes } from "./routes/profile.js";
import { solicitationRoutes } from "./routes/solicitations.js";
import { attachmentRoutes } from "./routes/attachments.js";
import { workflowRoutes } from "./routes/workflow.js";

export function buildApp() {
  const app = Fastify({ logger: true });

  app.addHook("onRequest", async (request, reply) => {
    const origin = request.headers.origin;

    // The lab only opts into the explicitly configured local Vite origin. It
    // intentionally never falls back to a wildcard while cookies are enabled.
    if (origin && env.CORS_ORIGIN && origin === env.CORS_ORIGIN) {
      reply.header("Access-Control-Allow-Origin", origin);
      reply.header("Access-Control-Allow-Credentials", "true");
      reply.header("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
      reply.header("Access-Control-Allow-Headers", "Content-Type");
      reply.header("Vary", "Origin");
    }

    if (request.method === "OPTIONS") {
      return reply.code(204).send();
    }
  });

  registerErrorHandlers(app);
  app.register(multipart, { limits: { files: 1, fileSize: env.MAX_UPLOAD_BYTES } });
  app.addHook("preHandler", attachAuthContext);
  app.register(healthRoutes);
  app.register(authRoutes, { prefix: "/auth" });
  app.register(profileRoutes, { prefix: "/profile" });
  app.register(debugRoutes, { prefix: "/debug" });
  app.register(solicitationRoutes, { prefix: "/solicitations" });
  app.register(attachmentRoutes);
  app.register(workflowRoutes, { prefix: "/solicitations" });

  return app;
}
