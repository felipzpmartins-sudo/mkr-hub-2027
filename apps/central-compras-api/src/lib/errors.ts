import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "INTERNAL_ERROR";

export function sendError(
  reply: FastifyReply,
  statusCode: 400 | 401 | 403 | 404 | 500,
  code: ErrorCode,
  message: string,
) {
  return reply.code(statusCode).send({ error: { code, message } });
}

export function registerErrorHandlers(app: FastifyInstance): void {
  app.setNotFoundHandler((_, reply) =>
    sendError(reply, 404, "NOT_FOUND", "Route not found."),
  );

  app.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    if (error.validation) {
      return sendError(reply, 400, "VALIDATION_ERROR", "Invalid request payload.");
    }

    // Avoid logging request bodies, which may contain passwords on login routes.
    request.log.error({ err: error }, "Unhandled API error");
    return sendError(reply, 500, "INTERNAL_ERROR", "Internal server error.");
  });
}
