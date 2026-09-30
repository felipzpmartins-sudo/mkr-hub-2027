import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  DATABASE_URL: z.string().default(""),
  SESSION_SECRET: z.string().default(""),
  COOKIE_DOMAIN: z.string().default(""),
  CORS_ORIGIN: z.string().default(""),
});

export const env = envSchema.parse(process.env);
