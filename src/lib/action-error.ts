import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import type { FormState } from "@/types/forms";

export class BusinessError extends Error {}
export function actionError(error: unknown): FormState {
  if (error instanceof z.ZodError)
    return { error: error.issues[0]?.message ?? "Confira os campos." };
  if (error instanceof BusinessError) return { error: error.message };
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
    return { error: "Já existe um registro com esse e-mail ou identificador." };
  console.error("Falha na operação:", error instanceof Error ? error.name : "UnknownError");
  return { error: "Não foi possível salvar. Tente novamente." };
}
