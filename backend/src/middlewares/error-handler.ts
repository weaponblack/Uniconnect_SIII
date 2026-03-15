import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/app-error.js';

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Specific Error Handling
  if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation Error: ' + err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
  } else if (err.code && err.code.startsWith('P')) {
    // Basic Prisma Error Handling
    statusCode = 400;
    message = 'Database Error';
  }

  // Optional: Log unexpected errors for debugging
  if (statusCode === 500) {
    console.error('Unexpected Error:', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    statusCode,
  });
};
