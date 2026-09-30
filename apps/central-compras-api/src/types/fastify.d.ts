import type { AuthContext } from "../lib/auth-context.js";

declare module "fastify" {
  interface FastifyRequest {
    auth?: AuthContext;
  }
}

export {};
