import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { AppError } from '../../errors/app-error.js';

export type JwtPayload = {
    sub: string;
    email: string;
    role: string;
};

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
    try {
        const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
        req.user = payload;
        next();
    } catch (error) {
        next(new AppError(401, 'Invalid or expired token'));
    }
}
