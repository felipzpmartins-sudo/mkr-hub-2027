import type { Prisma } from "../generated/prisma/client.js";
import type { FastifyPluginAsync } from "fastify";
import { sendError } from "../lib/errors.js";
import { requireAuth } from "../lib/guards.js";
import { getPrisma } from "../lib/prisma.js";
import {
  createSolicitationSchema,
  solicitationIdSchema,
  solicitationListQuerySchema,
} from "../schemas/solicitation.js";

const releasedForStock = ["approved_released", "approved_partial", "delivered"];

function canReadSolicitation(
  auth: NonNullable<import("fastify").FastifyRequest["auth"]>,
  solicitation: { userId: string; requestType: string; approvalStatus: string | null },
): boolean {
  if (auth.roles.includes("admin")) {
    return true;
  }

  if (solicitation.userId === auth.user.id) {
    return true;
  }

  if (auth.roles.includes("requisition_approver") && solicitation.requestType === "internal_requisition") {
    return true;
  }

  return (
    auth.roles.includes("stock") &&
    solicitation.requestType === "internal_requisition" &&
    solicitation.approvalStatus !== null &&
    releasedForStock.includes(solicitation.approvalStatus)
  );
}

function accessFilter(auth: NonNullable<import("fastify").FastifyRequest["auth"]>): Prisma.SolicitationWhereInput {
  if (auth.roles.includes("admin")) {
    return {};
  }

  const visibility: Prisma.SolicitationWhereInput[] = [{ userId: auth.user.id }];

  if (auth.roles.includes("requisition_approver")) {
    visibility.push({ requestType: "internal_requisition" });
  }

  if (auth.roles.includes("stock")) {
    visibility.push({
      requestType: "internal_requisition",
      approvalStatus: { in: releasedForStock },
    });
  }

  return { OR: visibility };
}

function toSolicitationResponse(solicitation: {
  id: string;
  userId: string;
  requesterName: string;
  requesterEmail: string | null;
  requesterPhone: string | null;
  requestType: string;
  status: string;
  approvalStatus: string | null;
  stockStatus: string | null;
  generalDescription: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: solicitation.id,
    userId: solicitation.userId,
    requesterName: solicitation.requesterName,
    requesterEmail: solicitation.requesterEmail,
    requesterPhone: solicitation.requesterPhone,
    requestType: solicitation.requestType,
    status: solicitation.status,
    approvalStatus: solicitation.approvalStatus,
    stockStatus: solicitation.stockStatus,
    generalDescription: solicitation.generalDescription,
    createdAt: solicitation.createdAt,
    updatedAt: solicitation.updatedAt,
  };
}

export const solicitationRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", { preHandler: requireAuth }, async (request, reply) => {
    const query = solicitationListQuerySchema.safeParse(request.query);

    if (!query.success) {
      return sendError(reply, 400, "VALIDATION_ERROR", "Invalid solicitation filters.");
    }

    const { page, limit, status, search } = query.data;
    const filters: Prisma.SolicitationWhereInput[] = [accessFilter(request.auth!)];

    if (status) {
      filters.push({ status });
    }

    if (search) {
      filters.push({
        OR: [
          { requesterName: { contains: search, mode: "insensitive" } },
          { requesterEmail: { contains: search, mode: "insensitive" } },
          { requestType: { contains: search, mode: "insensitive" } },
          { generalDescription: { contains: search, mode: "insensitive" } },
        ],
      });
    }

    const where: Prisma.SolicitationWhereInput = { AND: filters };
    const [total, solicitations] = await getPrisma().$transaction([
      getPrisma().solicitation.count({ where }),
      getPrisma().solicitation.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return reply.send({
      items: solicitations.map(toSolicitationResponse),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  });

  app.get("/:id", { preHandler: requireAuth }, async (request, reply) => {
    const params = solicitationIdSchema.safeParse(request.params);

    if (!params.success) {
      return sendError(reply, 400, "VALIDATION_ERROR", "Invalid solicitation identifier.");
    }

    const solicitation = await getPrisma().solicitation.findUnique({
      where: { id: params.data.id },
      include: {
        statusHistory: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            oldStatus: true,
            newStatus: true,
            justification: true,
            changedBy: true,
            createdAt: true,
          },
        },
      },
    });

    if (!solicitation) {
      return sendError(reply, 404, "NOT_FOUND", "Solicitation not found.");
    }

    if (!canReadSolicitation(request.auth!, solicitation)) {
      return sendError(reply, 403, "FORBIDDEN", "You cannot access this solicitation.");
    }

    return reply.send({
      solicitation: toSolicitationResponse(solicitation),
      statusHistory: solicitation.statusHistory,
    });
  });

  app.post("/", { preHandler: requireAuth }, async (request, reply) => {
    const input = createSolicitationSchema.safeParse(request.body);

    if (!input.success) {
      return sendError(reply, 400, "VALIDATION_ERROR", "Invalid solicitation payload.");
    }

    const auth = request.auth!;
    const requesterName = auth.user.fullName ?? auth.profile?.fullName ?? auth.user.email;
    const requesterPhone = auth.user.phone ?? auth.profile?.phone ?? null;
    const solicitation = await getPrisma().$transaction(async (transaction) => {
      const created = await transaction.solicitation.create({
        data: {
          userId: auth.user.id,
          requesterName,
          requesterEmail: auth.user.email,
          requesterPhone,
          requestType: input.data.requestType,
          generalDescription: input.data.generalDescription,
        },
      });

      const initialHistory = await transaction.statusHistory.create({
        data: {
          solicitationId: created.id,
          changedBy: auth.user.id,
          oldStatus: null,
          newStatus: created.status,
          justification: "Solicitation created in the local laboratory.",
        },
      });

      return { created, initialHistory };
    });

    return reply.code(201).send({
      solicitation: toSolicitationResponse(solicitation.created),
      statusHistory: [solicitation.initialHistory],
    });
  });
};
