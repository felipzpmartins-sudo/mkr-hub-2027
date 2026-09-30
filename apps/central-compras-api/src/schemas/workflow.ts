import { z } from "zod";

const optionalComment = z.string().trim().min(1).max(2_000).optional();

export const changeMainStatusSchema = z
  .object({
    status: z.enum(["pending", "approved", "rejected", "purchasing", "delivered"]),
    comment: optionalComment,
  })
  .strict();

export const approvalDecisionSchema = z
  .object({
    decision: z.enum(["approved", "rejected"]),
    comment: optionalComment,
  })
  .strict();

export const stockStatusSchema = z
  .object({
    status: z.enum(["pending_pickup", "separating", "ready_pickup", "picked_up", "returned"]),
    comment: optionalComment,
  })
  .strict();
