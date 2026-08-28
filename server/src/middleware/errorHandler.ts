import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { sendError } from '../utils/response';
import { config } from '../config/env';

export class AppError extends Error {
  constructor(
    public message: string,
    public errorCode: string,
    public statusCode: number
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Zod validation errors
  if (err instanceof ZodError) {
    const message = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    sendError(res, message, 'VALIDATION_ERROR', 422);
    return;
  }

  // Application errors
  if (err instanceof AppError) {
    sendError(res, err.message, err.errorCode, err.statusCode);
    return;
  }

  // PostgreSQL unique violation
  if ((err as NodeJS.ErrnoException).code === '23505') {
    sendError(res, 'A record with this value already exists', 'DUPLICATE_ENTRY', 409);
    return;
  }

  // PostgreSQL foreign key violation
  if ((err as NodeJS.ErrnoException).code === '23503') {
    sendError(res, 'Referenced record does not exist', 'FOREIGN_KEY_VIOLATION', 400);
    return;
  }

  // Generic server error
  if (!config.isProduction) {
    console.error('Unhandled error:', err);
  }

  sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
}

export function notFoundHandler(_req: Request, res: Response): void {
  sendError(res, 'Route not found', 'NOT_FOUND', 404);
}
