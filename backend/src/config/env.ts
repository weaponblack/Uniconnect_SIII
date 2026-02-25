import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_IDS: z.string().default(''),
  GOOGLE_ALLOWED_DOMAINS: z.string().default(''),
  JWT_ACCESS_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_PEPPER: z.string().min(16),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables');
}

export const env = parsed.data;
export const googleClientIds = [
  env.GOOGLE_CLIENT_ID,
  ...env.GOOGLE_CLIENT_IDS.split(',').map((value) => value.trim()).filter(Boolean),
];
export const allowedDomains = env.GOOGLE_ALLOWED_DOMAINS.split(',')
  .map((domain) => domain.trim().toLowerCase())
  .filter(Boolean);
