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
