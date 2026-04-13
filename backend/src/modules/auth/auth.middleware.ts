import type { Request, Response, NextFunction } from 'express';
import jwt, { type JwtHeader, type SigningKeyCallback } from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { AppError } from '../../errors/app-error.js';
import { AuthManager } from './auth.manager.js';
import { Logger } from '../../lib/logger.js';

export type JwtPayload = {
    sub: string;
    email?: string;
    role?: string;
    [key: string]: any;
};

// Singleton instances
const authManager = AuthManager.getInstance();
const logger = Logger.getInstance();

declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return next(new AppError(401, 'Missing or invalid token'));
    }

    const token = authHeader.split(' ')[1];
    
    // First loosely decode to see where token came from
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || !decoded.header) {
        return next(new AppError(401, 'Invalid token structure'));
    }
    
    // If it comes from Auth0 (has header.alg RS256 and header.kid)
    if (decoded.header.alg === 'RS256' && decoded.header.kid) {
        jwt.verify(token, authManager.getKey, { algorithms: ['RS256'] }, (err, payload) => {
            if (err) {
                logger.error('Auth0 token verification failed:', err.message);
                return next(new AppError(401, 'Invalid or expired Auth0 token'));
            }
            req.user = payload as JwtPayload;
            return next();
        });
    } else {
        // Fallback to local token (HS256)
        try {
            const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
            req.user = payload;
            next();
        } catch (error) {
            logger.error('Local token verification failed:', error);
            next(new AppError(401, 'Invalid or expired token'));
        }
    }
}
