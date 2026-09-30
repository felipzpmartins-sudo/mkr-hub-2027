import { z } from "zod";

export const solicitationIdSchema = z.object({
  id: z.string().uuid(),
});

export const solicitationListQuerySchema = z.object({
  status: z.string().trim().min(1).max(80).optional(),
  search: z.string().trim().min(1).max(200).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

/**
 * Ownership, requester identity and status are server-owned. Keeping this
 * schema strict rejects accidental or malicious attempts to submit userId.
 */
export const createSolicitationSchema = z
  .object({
    requestType: z.string().trim().min(1).max(80),
    generalDescription: z.string().trim().min(1).max(5_000),
  })
  .strict();
