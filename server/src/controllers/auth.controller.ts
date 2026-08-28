import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database';
import { config } from '../config/env';
import { AuthenticatedRequest } from '../middleware/auth';
import { loginSchema, changePasswordSchema } from '../validators/auth.validator';
import { sendSuccess, sendError } from '../utils/response';
import { writeAuditLog } from '../middleware/auditLogger';
import { AuthTokenPayload, UserRole } from '../types';

function signAccessToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
  });
}

function signRefreshToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const result = await pool.query(
      `SELECT id, email, password_hash, first_name, last_name, role, department_id, is_active
       FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );

    const user = result.rows[0];
    if (!user || !user.is_active) {
      sendError(res, 'Invalid email or password', 'INVALID_CREDENTIALS', 401);
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      sendError(res, 'Invalid email or password', 'INVALID_CREDENTIALS', 401);
      return;
    }

    const tokenPayload: AuthTokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
      departmentId: user.department_id,
    };

    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    await writeAuditLog({
      userId: user.id,
      action: 'USER_LOGIN',
      entityType: 'user',
      entityId: user.id,
      ipAddress: req.ip ?? null,
    });

    sendSuccess(res, {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        departmentId: user.department_id,
      },
    }, 'Login successful');
  } catch (err) {
    next(err);
  }
}

export async function logout(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.user) {
      await writeAuditLog({
        userId: req.user.userId,
        action: 'USER_LOGOUT',
        entityType: 'user',
        entityId: req.user.userId,
        ipAddress: req.ip ?? null,
      });
    }
    sendSuccess(res, null, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
}

export async function getMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.department_id,
              u.is_active, u.created_at, d.name as department_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.id = $1`,
      [req.user!.userId]
    );

    const user = result.rows[0];
    if (!user) {
      sendError(res, 'User not found', 'USER_NOT_FOUND', 404);
      return;
    }

    sendSuccess(res, {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      departmentId: user.department_id,
      departmentName: user.department_name,
      isActive: user.is_active,
      createdAt: user.created_at,
    });
  } catch (err) {
    next(err);
  }
}

export async function changePassword(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    const result = await pool.query(
      'SELECT id, password_hash FROM users WHERE id = $1',
      [req.user!.userId]
    );
    const user = result.rows[0];
    if (!user) {
      sendError(res, 'User not found', 'USER_NOT_FOUND', 404);
      return;
    }

    const match = await bcrypt.compare(currentPassword, user.password_hash);
    if (!match) {
      sendError(res, 'Current password is incorrect', 'INVALID_PASSWORD', 400);
      return;
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [
      newHash,
      user.id,
    ]);

    await writeAuditLog({
      userId: req.user!.userId,
      action: 'PASSWORD_CHANGED',
      entityType: 'user',
      entityId: user.id,
      ipAddress: req.ip ?? null,
    });

    sendSuccess(res, null, 'Password changed successfully');
  } catch (err) {
    next(err);
  }
}

export async function refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken: token } = req.body;
    if (!token) {
      sendError(res, 'Refresh token required', 'MISSING_TOKEN', 400);
      return;
    }

    const payload = jwt.verify(token, config.jwt.refreshSecret) as AuthTokenPayload;
    const newAccessToken = signAccessToken({
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      departmentId: payload.departmentId,
    });

    sendSuccess(res, { accessToken: newAccessToken }, 'Token refreshed');
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError) {
      sendError(res, 'Invalid refresh token', 'INVALID_TOKEN', 401);
      return;
    }
    next(err);
  }
}
