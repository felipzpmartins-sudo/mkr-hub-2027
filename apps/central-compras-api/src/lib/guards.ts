import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from "fastify";
import { sendError } from "./errors.js";
import { clearSessionCookie, readSessionToken } from "./session.js";

function denyUnauthenticated(request: FastifyRequest, reply: FastifyReply) {
  if (request.auth) {
    return;
  }

  if (readSessionToken(request)) {
    clearSessionCookie(reply);
  }

  return sendError(reply, 401, "UNAUTHORIZED", "Authentication required.");
}

export const requireAuth: preHandlerHookHandler = async (request, reply) =>
  denyUnauthenticated(request, reply);

export function requireAnyRole(roles: readonly string[]): preHandlerHookHandler {
  return async (request, reply) => {
    if (!request.auth) {
      return denyUnauthenticated(request, reply);
    }

    if (!roles.some((role) => request.auth?.roles.includes(role))) {
      return sendError(reply, 403, "FORBIDDEN", "Insufficient role for this action.");
    }
  };
}

export function requireRole(role: string): preHandlerHookHandler {
  return requireAnyRole([role]);
}

export const requireAdmin = requireRole("admin");
export const requireApprover = requireRole("requisition_approver");
export const requireStock = requireRole("stock");
