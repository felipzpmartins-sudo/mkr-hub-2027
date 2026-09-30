import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Informe um e-mail válido.")
  .max(254);
export const passwordSchema = z
  .string()
  .min(12, "Use uma senha com pelo menos 12 caracteres.")
  .refine(
    (value) => new TextEncoder().encode(value).length <= 72,
    "A senha deve ter no máximo 72 bytes.",
  );
export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1).max(72) });
const optionalText = z
  .string()
  .trim()
  .max(120)
  .transform((value) => value || null);
const optionalExternalText = z
  .string()
  .trim()
  .max(512)
  .transform((value) => value || null);

export function isSafeSystemUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.search && !url.hash;
  } catch {
    return false;
  }
}
export const systemSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    slug: z
      .string()
      .trim()
      .min(2)
      .max(80)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use letras minúsculas, números e hífens."),
    description: z.string().trim().min(5).max(240),
    url: z
      .string()
      .trim()
      .max(2048)
      .refine(
        (value) => !value || isSafeSystemUrl(value),
        "Use HTTPS sem credenciais, parâmetros ou fragmentos.",
      )
      .transform((value) => value || null),
    icon: z.enum(["shopping", "megaphone", "car", "video", "shield", "grid"]),
    status: z.enum(["ONLINE", "MAINTENANCE", "OFFLINE"]),
  })
  .refine((value) => value.status !== "ONLINE" || !!value.url, {
    path: ["url"],
    message: "Configure a URL antes de colocar o sistema online.",
  });

export const userSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: emailSchema,
  department: optionalText,
  jobTitle: optionalText,
  hubRole: z.enum(["ADMIN", "USER"]),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});
export const accessSchema = z.object({
  userId: z.string().min(1).max(100),
  systemId: z.string().min(1).max(100),
  enabled: z.boolean(),
  role: z.string().trim().min(1, "Informe o perfil no sistema.").max(80),
  externalUserId: z
    .string()
    .trim()
    .max(200)
    .transform((value) => value || null),
  externalUserEmail: z.union([emailSchema, z.literal("")]).transform((value) => value || null),
  externalDisplayName: optionalExternalText,
  externalProvider: optionalExternalText,
  externalIssuer: optionalExternalText,
  externalSubject: optionalExternalText,
  status: z.enum(["ACTIVE", "REVOKED"]),
});
