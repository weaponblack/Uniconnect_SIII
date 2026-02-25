import { Request, Response } from 'express';
import { googleAuthSchema, refreshSchema } from './auth.schemas.js';
import { logout, refreshSession, signInWithGoogle } from './auth.service.js';
import { AppError } from '../../errors/app-error.js';

function getDeviceContext(req: Request): { ip?: string; userAgent?: string } {
  const forwardedFor = req.headers['x-forwarded-for'];
  const ip = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : typeof forwardedFor === 'string'
      ? forwardedFor.split(',')[0]?.trim()
      : req.ip;

  return {
    ip: ip ?? undefined,
    userAgent: Array.isArray(req.headers['user-agent']) ? req.headers['user-agent'][0] : req.headers['user-agent'],
  };
}

export async function googleSignInHandler(req: Request, res: Response) {
  const parsed = googleAuthSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: 'Invalid body',
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const authData = await signInWithGoogle(parsed.data.idToken, getDeviceContext(req));
    return res.status(200).json(authData);
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    if (error instanceof Error) {
      return res.status(401).json({ message: error.message });
    }
    return res.status(401).json({ message: 'Authentication failed' });
  }
}

export async function refreshHandler(req: Request, res: Response) {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: 'Invalid body',
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const authData = await refreshSession(parsed.data.refreshToken, getDeviceContext(req));
    return res.status(200).json(authData);
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    return res.status(401).json({ message: 'Refresh failed' });
  }
}

export async function logoutHandler(req: Request, res: Response) {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: 'Invalid body',
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    await logout(parsed.data.refreshToken);
    return res.status(204).send();
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    return res.status(400).json({ message: 'Logout failed' });
  }
}
