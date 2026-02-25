import { z } from 'zod';

export const googleAuthSchema = z.object({
  idToken: z.string().min(1, 'idToken is required'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken is required'),
});
