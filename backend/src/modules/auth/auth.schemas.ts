import { z } from 'zod';

export const googleAuthSchema = z.object({
  idToken: z.string().min(1, 'idToken is required'),
});

export const googleWebAuthSchema = z.object({
  accessToken: z.string().min(1, 'accessToken is required'),
});

export const simpleAuthSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'name is required'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken is required'),
});
