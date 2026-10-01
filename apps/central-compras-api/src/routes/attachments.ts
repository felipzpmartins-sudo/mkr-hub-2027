import type { FastifyPluginAsync } from "fastify";
import { env } from "../config/env.js";
import { sendError } from "../lib/errors.js";
import { requireAuth } from "../lib/guards.js";
import { getPrisma } from "../lib/prisma.js";
import { canReadSolicitation, canUploadAttachment } from "../lib/solicitation-access.js";
import { buildStoragePath, deleteFile, getFile, saveFile } from "../services/storage.js";
import { solicitationIdSchema } from "../schemas/solicitation.js";

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

function attachmentMetadata(attachment: {
  id: string;
  solicitationId: string;
  uploadedBy: string;
  attachmentType: string;
  originalName: string;
  mimeType: string | null;
  size: number | null;
  createdAt: Date;
}) {
  return {
    id: attachment.id,
    solicitationId: attachment.solicitationId,
    uploadedBy: attachment.uploadedBy,
    attachmentType: attachment.attachmentType,
    originalName: attachment.originalName,
    mimeType: attachment.mimeType,
    size: attachment.size,
    createdAt: attachment.createdAt,
  };
}

function contentDisposition(originalName: string): string {
  return `attachment; filename*=UTF-8''${encodeURIComponent(originalName)}`;
}

export const attachmentRoutes: FastifyPluginAsync = async (app) => {
  app.post("/solicitations/:id/attachments", { preHandler: requireAuth }, async (request, reply) => {
    const params = solicitationIdSchema.safeParse(request.params);

    if (!params.success) {
      return sendError(reply, 400, "VALIDATION_ERROR", "Invalid solicitation identifier.");
    }

    const solicitation = await getPrisma().solicitation.findUnique({ where: { id: params.data.id } });
    if (!solicitation) {
      return sendError(reply, 404, "NOT_FOUND", "Solicitation not found.");
    }

    if (!canUploadAttachment(request.auth!, solicitation)) {
      return sendError(reply, 403, "FORBIDDEN", "You cannot upload to this solicitation.");
    }

    const file = await request.file();
    if (!file) {
      return sendError(reply, 400, "VALIDATION_ERROR", "A file is required.");
    }

    if (!allowedMimeTypes.has(file.mimetype)) {
      file.file.resume();
      return sendError(reply, 400, "VALIDATION_ERROR", "Unsupported file type.");
    }

    const content = await file.toBuffer();
    if (file.file.truncated || content.length > env.MAX_UPLOAD_BYTES) {
      return sendError(reply, 400, "VALIDATION_ERROR", "File exceeds the configured upload limit.");
    }

    const storagePath = buildStoragePath(solicitation.id, file.filename);
    await saveFile(storagePath, content);

    try {
      const attachment = await getPrisma().attachment.create({
        data: {
          solicitationId: solicitation.id,
          uploadedBy: request.auth!.user.id,
          attachmentType: "supporting_document",
          originalName: file.filename,
          storagePath,
          size: content.length,
          mimeType: file.mimetype,
        },
      });

      return reply.code(201).send({ attachment: attachmentMetadata(attachment) });
    } catch (error) {
      await deleteFile(storagePath);
      throw error;
    }
  });

  app.get("/solicitations/:id/attachments", { preHandler: requireAuth }, async (request, reply) => {
    const params = solicitationIdSchema.safeParse(request.params);
    if (!params.success) {
      return sendError(reply, 400, "VALIDATION_ERROR", "Invalid solicitation identifier.");
    }

    const solicitation = await getPrisma().solicitation.findUnique({ where: { id: params.data.id } });
    if (!solicitation) {
      return sendError(reply, 404, "NOT_FOUND", "Solicitation not found.");
    }

    if (!canReadSolicitation(request.auth!, solicitation)) {
      return sendError(reply, 403, "FORBIDDEN", "You cannot access this solicitation.");
    }

    const attachments = await getPrisma().attachment.findMany({
      where: { solicitationId: solicitation.id },
      orderBy: { createdAt: "asc" },
    });
    return reply.send({ items: attachments.map(attachmentMetadata) });
  });

  app.get("/attachments/:id/download", { preHandler: requireAuth }, async (request, reply) => {
    const params = solicitationIdSchema.safeParse(request.params);
    if (!params.success) {
      return sendError(reply, 400, "VALIDATION_ERROR", "Invalid attachment identifier.");
    }

    const attachment = await getPrisma().attachment.findUnique({
      where: { id: params.data.id },
      include: { solicitation: true },
    });
    if (!attachment) {
      return sendError(reply, 404, "NOT_FOUND", "Attachment not found.");
    }

    if (!canReadSolicitation(request.auth!, attachment.solicitation)) {
      return sendError(reply, 403, "FORBIDDEN", "You cannot download this attachment.");
    }

    try {
      const content = await getFile(attachment.storagePath);
      reply.header("Content-Type", attachment.mimeType ?? "application/octet-stream");
      reply.header("Content-Disposition", contentDisposition(attachment.originalName));
      return reply.send(content);
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return sendError(reply, 404, "NOT_FOUND", "Attachment file not found.");
      }

      throw error;
    }
  });

  app.delete("/attachments/:id", { preHandler: requireAuth }, async (request, reply) => {
    const params = solicitationIdSchema.safeParse(request.params);
    if (!params.success) {
      return sendError(reply, 400, "VALIDATION_ERROR", "Invalid attachment identifier.");
    }

    if (!request.auth!.roles.includes("admin")) {
      return sendError(reply, 403, "FORBIDDEN", "Only admins can delete attachments in this laboratory.");
    }

    const attachment = await getPrisma().attachment.findUnique({ where: { id: params.data.id } });
    if (!attachment) {
      return sendError(reply, 404, "NOT_FOUND", "Attachment not found.");
    }

    let content: Buffer;
    try {
      content = await getFile(attachment.storagePath);
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return sendError(reply, 404, "NOT_FOUND", "Attachment file not found.");
      }
      throw error;
    }

    await deleteFile(attachment.storagePath);
    try {
      await getPrisma().$transaction([
        getPrisma().attachment.delete({ where: { id: attachment.id } }),
        getPrisma().statusHistory.create({
          data: {
            solicitationId: attachment.solicitationId,
            changedBy: request.auth!.user.id,
            oldStatus: "attachment:present",
            newStatus: "attachment:deleted",
            justification: `Attachment deleted: ${attachment.originalName}`,
          },
        }),
      ]);
    } catch (error) {
      await saveFile(attachment.storagePath, content);
      throw error;
    }

    return reply.code(204).send();
  });
};
