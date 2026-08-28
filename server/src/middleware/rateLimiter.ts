import rateLimit from 'express-rate-limit';
import { config } from '../config/env';
import { sendError } from '../utils/response';
import { Request, Response } from 'express';

export const globalRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    sendError(res, 'Too many requests, please try again later', 'RATE_LIMIT_EXCEEDED', 429);
  },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    sendError(res, 'Too many login attempts, please try again in 15 minutes', 'AUTH_RATE_LIMIT', 429);
  },
});
