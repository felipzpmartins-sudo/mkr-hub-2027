import Fastify from "fastify";
import { attachAuthContext } from "./lib/auth-context.js";
import { registerErrorHandlers } from "./lib/errors.js";
import { authRoutes } from "./routes/auth.js";
import { debugRoutes } from "./routes/debug.js";
import { healthRoutes } from "./routes/health.js";
import { profileRoutes } from "./routes/profile.js";
import { solicitationRoutes } from "./routes/solicitations.js";

export function buildApp() {
  const app = Fastify({ logger: true });

  registerErrorHandlers(app);
  app.addHook("preHandler", attachAuthContext);
  app.register(healthRoutes);
  app.register(authRoutes, { prefix: "/auth" });
  app.register(profileRoutes, { prefix: "/profile" });
  app.register(debugRoutes, { prefix: "/debug" });
  app.register(solicitationRoutes, { prefix: "/solicitations" });

  return app;
}
