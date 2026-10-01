import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  DATABASE_URL: z.string().default(""),
  SESSION_SECRET: z.string().default(""),
  COOKIE_DOMAIN: z.string().default(""),
  CORS_ORIGIN: z.string().default(""),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().max(24 * 31).default(24 * 7),
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().max(50 * 1024 * 1024).default(10 * 1024 * 1024),
});

export const env = envSchema.parse(process.env);
