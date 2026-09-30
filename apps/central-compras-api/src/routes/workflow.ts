import type { FastifyPluginAsync } from "fastify";
import { sendError } from "../lib/errors.js";
import { requireAuth } from "../lib/guards.js";
import { getPrisma } from "../lib/prisma.js";
import { solicitationIdSchema } from "../schemas/solicitation.js";
import {
  approvalDecisionSchema,
  changeMainStatusSchema,
  stockStatusSchema,
} from "../schemas/workflow.js";

const stockEligibleApprovals = ["approved_released", "approved_partial"];

async function findSolicitation(id: string) {
  return getPrisma().solicitation.findUnique({ where: { id } });
}

export const workflowRoutes: FastifyPluginAsync = async (app) => {
  app.patch("/:id/status", { preHandler: requireAuth }, async (request, reply) => {
    const params = solicitationIdSchema.safeParse(request.params);
    const input = changeMainStatusSchema.safeParse(request.body);

    if (!params.success || !input.success) {
      return sendError(reply, 400, "VALIDATION_ERROR", "Invalid status change payload.");
    }

    if (!request.auth!.roles.includes("admin")) {
      return sendError(reply, 403, "FORBIDDEN", "Only admins can change the main status.");
    }

    const current = await findSolicitation(params.data.id);
    if (!current) {
      return sendError(reply, 404, "NOT_FOUND", "Solicitation not found.");
    }

    const result = await getPrisma().$transaction(async (transaction) => {
      const solicitation = await transaction.solicitation.update({
        where: { id: current.id },
        data: { status: input.data.status },
      });
      const history = await transaction.statusHistory.create({
        data: {
          solicitationId: current.id,
          changedBy: request.auth!.user.id,
          oldStatus: current.status,
          newStatus: input.data.status,
          justification: input.data.comment ?? "Main status changed by administrator.",
        },
      });
      return { solicitation, history };
    });

    return reply.send({ solicitation: result.solicitation, statusHistory: result.history });
  });

  app.patch("/:id/approval", { preHandler: requireAuth }, async (request, reply) => {
    const params = solicitationIdSchema.safeParse(request.params);
    const input = approvalDecisionSchema.safeParse(request.body);

    if (!params.success || !input.success) {
      return sendError(reply, 400, "VALIDATION_ERROR", "Invalid approval payload.");
    }

    const auth = request.auth!;
    if (!auth.roles.includes("admin") && !auth.roles.includes("requisition_approver")) {
      return sendError(reply, 403, "FORBIDDEN", "Approval role required.");
    }

    const current = await findSolicitation(params.data.id);
    if (!current) {
      return sendError(reply, 404, "NOT_FOUND", "Solicitation not found.");
    }

    if (current.requestType !== "internal_requisition") {
      return sendError(reply, 403, "FORBIDDEN", "Only internal requisitions use this approval workflow.");
    }

    const result = await getPrisma().$transaction(async (transaction) => {
      const approval = await transaction.approval.upsert({
        where: {
          solicitationId_approverId: {
            solicitationId: current.id,
            approverId: auth.user.id,
          },
        },
        update: {
          status: input.data.decision,
          justification: input.data.comment ?? null,
        },
        create: {
          solicitationId: current.id,
          approverId: auth.user.id,
          status: input.data.decision,
          justification: input.data.comment ?? null,
        },
      });

      const approvals = await transaction.approval.findMany({
        where: { solicitationId: current.id },
        select: { status: true },
      });
      const approvedCount = approvals.filter((item) => item.status === "approved").length;
      const approvalStatus = approvals.some((item) => item.status === "rejected")
        ? "rejected"
        : approvedCount >= 1
          ? "approved_released"
          : "pending_approval";
      const releasedAt = approvalStatus === "approved_released" ? current.releasedAt ?? new Date() : current.releasedAt;
      const stockStatus = approvalStatus === "approved_released" ? current.stockStatus ?? "pending_pickup" : current.stockStatus;

      const solicitation = await transaction.solicitation.update({
        where: { id: current.id },
        data: { approvalStatus, approvedCount, releasedAt, stockStatus },
      });
      const history = await transaction.statusHistory.create({
        data: {
          solicitationId: current.id,
          changedBy: auth.user.id,
          oldStatus: `approval:${current.approvalStatus ?? "pending_approval"}`,
          newStatus: `approval:${approvalStatus}`,
          justification: input.data.comment ?? `Approval decision: ${input.data.decision}.`,
        },
      });

      return { approval, solicitation, history };
    });

    return reply.send({ approval: result.approval, solicitation: result.solicitation, statusHistory: result.history });
  });

  app.patch("/:id/stock", { preHandler: requireAuth }, async (request, reply) => {
    const params = solicitationIdSchema.safeParse(request.params);
    const input = stockStatusSchema.safeParse(request.body);

    if (!params.success || !input.success) {
      return sendError(reply, 400, "VALIDATION_ERROR", "Invalid stock status payload.");
    }

    const auth = request.auth!;
    if (!auth.roles.includes("admin") && !auth.roles.includes("stock")) {
      return sendError(reply, 403, "FORBIDDEN", "Stock role required.");
    }

    const current = await findSolicitation(params.data.id);
    if (!current) {
      return sendError(reply, 404, "NOT_FOUND", "Solicitation not found.");
    }

    if (
      current.requestType !== "internal_requisition" ||
      !current.approvalStatus ||
      !stockEligibleApprovals.includes(current.approvalStatus)
    ) {
      return sendError(reply, 403, "FORBIDDEN", "Stock workflow requires an approved internal requisition.");
    }

    const result = await getPrisma().$transaction(async (transaction) => {
      const solicitation = await transaction.solicitation.update({
        where: { id: current.id },
        data: { stockStatus: input.data.status },
      });
      const history = await transaction.statusHistory.create({
        data: {
          solicitationId: current.id,
          changedBy: auth.user.id,
          oldStatus: `stock:${current.stockStatus ?? "none"}`,
          newStatus: `stock:${input.data.status}`,
          justification: input.data.comment ?? "Stock status changed.",
        },
      });
      return { solicitation, history };
    });

    return reply.send({ solicitation: result.solicitation, statusHistory: result.history });
  });
};
