import { config } from "dotenv";
import { z } from "zod";

config();

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  API_PREFIX: z.string().default("/api/v1"),
  FRONTEND_ORIGIN: z.string().default("http://localhost:3000"),
  FILE_STORAGE_PROVIDER: z.enum(["local", "vercel_blob"]).default("vercel_blob"),
  BLOB_ACCESS: z.enum(["private", "public"]).default("private"),
  BLOB_READ_WRITE_TOKEN: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default("7d"),
  ADMIN_SETUP_KEY: z.string().min(8).default("alubond-setup-key"),
  ADMIN_EMAIL: z.string().email().default("admin@alubondcrm.local"),
  ADMIN_PASSWORD: z.string().min(8).default("Admin@12345"),
  ADMIN_FIRST_NAME: z.string().default("System"),
  ADMIN_LAST_NAME: z.string().default("Admin")
});

export const env = schema.parse(process.env);
