import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { env, allowedDomains, googleClientIds } from '../../config/env.js';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../errors/app-error.js';

const googleClient = new OAuth2Client();
const GOOGLE_ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com']);

type DeviceContext = {
  ip?: string;
  userAgent?: string;
};

type AppTokenPayload = {
  sub: string;
  email: string;
  role: string;
};

function createAccessToken(payload: AppTokenPayload): string {
  const expiresIn = env.ACCESS_TOKEN_TTL as jwt.SignOptions['expiresIn'];
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn });
}

function hashRefreshToken(tokenPart: string): string {
  return crypto.createHmac('sha256', env.REFRESH_TOKEN_PEPPER).update(tokenPart).digest('hex');
}

function buildRefreshToken(): { tokenPart: string; hash: string } {
  const tokenPart = crypto.randomBytes(48).toString('base64url');
  return {
    tokenPart,
    hash: hashRefreshToken(tokenPart),
  };
}

function assertAllowedInstitutionalDomain(email: string, hostedDomain?: string | null): void {
  if (!allowedDomains.length) {
    return;
  }

  const emailDomain = email.split('@')[1]?.toLowerCase() ?? '';
  const normalizedHd = hostedDomain?.toLowerCase();
  const isAllowed = allowedDomains.includes(emailDomain) || (!!normalizedHd && allowedDomains.includes(normalizedHd));

  if (!isAllowed) {
    throw new AppError(403, 'Institutional domain is not allowed');
  }
}

export async function signInWithGoogle(idToken: string, device: DeviceContext) {
  let ticket;
  try {
    ticket = await googleClient.verifyIdToken({
      idToken,
      audience: googleClientIds,
    });
  } catch (error) {
    const message =
      error instanceof Error ? `Invalid Google token: ${error.message}` : 'Invalid Google token';
    throw new AppError(401, message);
  }

  const payload = ticket.getPayload();

  if (!payload?.sub || !payload.email) {
    throw new AppError(401, 'Invalid Google payload');
  }
  if (!payload.email_verified) {
    throw new AppError(401, 'Google email is not verified');
  }
  if (!payload.iss || !GOOGLE_ISSUERS.has(payload.iss)) {
    throw new AppError(401, 'Invalid Google issuer');
  }

  assertAllowedInstitutionalDomain(payload.email, payload.hd);

  const identity = await prisma.authIdentity.findUnique({
    where: {
      provider_providerUserId: {
        provider: 'google',
        providerUserId: payload.sub,
      },
    },
    include: { user: true },
  });

  let user;
  if (identity) {
    user = await prisma.user.update({
      where: { id: identity.userId },
      data: {
        email: payload.email,
        name: payload.name ?? identity.user.name,
        avatarUrl: payload.picture ?? identity.user.avatarUrl,
      },
    });
  } else {
    const existingUserByEmail = await prisma.user.findUnique({
      where: { email: payload.email },
    });

    if (existingUserByEmail) {
      user = await prisma.user.update({
        where: { id: existingUserByEmail.id },
        data: {
          name: payload.name ?? existingUserByEmail.name,
          avatarUrl: payload.picture ?? existingUserByEmail.avatarUrl,
          identities: {
            create: {
              provider: 'google',
              providerUserId: payload.sub,
              emailAtProvider: payload.email,
              hostedDomain: payload.hd ?? null,
            },
          },
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          email: payload.email,
          name: payload.name ?? null,
          avatarUrl: payload.picture ?? null,
          identities: {
            create: {
              provider: 'google',
              providerUserId: payload.sub,
              emailAtProvider: payload.email,
              hostedDomain: payload.hd ?? null,
            },
          },
        },
      });
    }
  }

  const refreshData = buildRefreshToken();
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  const session = await prisma.session.create({
    data: {
      userId: user.id,
      refreshTokenHash: refreshData.hash,
      userAgent: device.userAgent,
      ip: device.ip,
      expiresAt,
    },
  });

  return {
    accessToken: createAccessToken({ sub: user.id, email: user.email, role: user.role }),
    refreshToken: `${session.id}.${refreshData.tokenPart}`,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
    },
  };
}

export async function refreshSession(refreshToken: string, device: DeviceContext) {
  const [sessionId, tokenPart] = refreshToken.split('.');
  if (!sessionId || !tokenPart) {
    throw new AppError(401, 'Invalid refresh token format');
  }

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  });

  if (!session || session.revokedAt || session.expiresAt <= new Date()) {
    throw new AppError(401, 'Refresh session is invalid or expired');
  }

  const providedHash = hashRefreshToken(tokenPart);
  if (providedHash !== session.refreshTokenHash) {
    await prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
    throw new AppError(401, 'Refresh token mismatch');
  }

  const nextTokenData = buildRefreshToken();
  const nextExpiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  const nextSession = await prisma.session.create({
    data: {
      userId: session.userId,
      refreshTokenHash: nextTokenData.hash,
      userAgent: device.userAgent ?? session.userAgent ?? null,
      ip: device.ip ?? session.ip ?? null,
      expiresAt: nextExpiresAt,
    },
  });

  await prisma.session.update({
    where: { id: session.id },
    data: { revokedAt: new Date() },
  });

  return {
    accessToken: createAccessToken({
      sub: session.user.id,
      email: session.user.email,
      role: session.user.role,
    }),
    refreshToken: `${nextSession.id}.${nextTokenData.tokenPart}`,
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      avatarUrl: session.user.avatarUrl,
      role: session.user.role,
    },
  };
}

export async function signInSimple(email: string, name: string, device: DeviceContext) {
  // Find or create user
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  let user;
  if (existingUser) {
    // Update existing user with new name if provided
    user = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        name: name || existingUser.name,
      },
    });
  } else {
    // Create new user
    user = await prisma.user.create({
      data: {
        email,
        name: name || null,
      },
    });
  }

  const refreshData = buildRefreshToken();
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  const session = await prisma.session.create({
    data: {
      userId: user.id,
      refreshTokenHash: refreshData.hash,
      userAgent: device.userAgent,
      ip: device.ip,
      expiresAt,
    },
  });

  return {
    accessToken: createAccessToken({ sub: user.id, email: user.email, role: user.role }),
    refreshToken: `${session.id}.${refreshData.tokenPart}`,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
    },
  };
}

export async function logout(refreshToken: string): Promise<void> {
  const [sessionId] = refreshToken.split('.');
  if (!sessionId) {
    throw new AppError(400, 'Invalid refresh token format');
  }

  await prisma.session.updateMany({
    where: {
      id: sessionId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}
