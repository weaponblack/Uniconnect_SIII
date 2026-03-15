import type { Request, Response, NextFunction } from 'express';
import jwt, { type JwtHeader, type SigningKeyCallback } from 'jsonwebtoken';
import jwksRsa from 'jwks-rsa';
import { env } from '../../config/env.js';
import { AppError } from '../../errors/app-error.js';

export type JwtPayload = {
    sub: string;
    email?: string;
    role?: string;
    [key: string]: any;
};

// Set up the JWKS client for Auth0
const client = jwksRsa({
    jwksUri: `https://${env.AUTH0_DOMAIN}/.well-known/jwks.json`,
    cache: true,
    rateLimit: true,
});

function getKey(header: JwtHeader, callback: SigningKeyCallback) {
    if (!header.kid) {
        return callback(new Error('No kid in token header'));
    }
    client.getSigningKey(header.kid, (err, key) => {
        if (err || !key) {
            return callback(err || new Error('Unable to get signing key'));
        }
        const signingKey = key.getPublicKey();
        callback(null, signingKey);
    });
}

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
        jwt.verify(token, getKey, { algorithms: ['RS256'] }, (err, payload) => {
            if (err) {
                console.error('Auth0 token verification failed:', err.message);
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
            console.error('Local token verification failed:', error);
            next(new AppError(401, 'Invalid or expired token'));
        }
    }
}
