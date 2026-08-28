import { Response, NextFunction } from 'express';
import { pool } from '../config/database';
import { AuthenticatedRequest } from './auth';

export function auditLog(action: string, entityType: string) {
  return async (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    // Store original json to intercept response
    const originalJson = _res.json.bind(_res);

    _res.json = function (body: unknown) {
      // Only log on successful mutations
      const responseBody = body as { success?: boolean; data?: { id?: string } };
      if (responseBody?.success && req.user) {
        const entityId = responseBody?.data?.id || (req.params['id'] ?? null);
        setImmediate(async () => {
          try {
            await pool.query(
              `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values, ip_address)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [
                req.user!.userId,
                action,
                entityType,
                entityId,
                JSON.stringify(responseBody.data ?? {}),
                req.ip ?? null,
              ]
            );
          } catch (err) {
            console.error('Audit log error:', err);
          }
        });
      }
      return originalJson(body);
    };

    next();
  };
}

/**
 * Direct audit log write for use inside controllers/services
 */
export async function writeAuditLog(params: {
  userId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  ipAddress?: string | null;
}): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        params.userId,
        params.action,
        params.entityType,
        params.entityId ?? null,
        params.oldValues ? JSON.stringify(params.oldValues) : null,
        params.newValues ? JSON.stringify(params.newValues) : null,
        params.ipAddress ?? null,
      ]
    );
  } catch (err) {
    console.error('Audit log write error:', err);
  }
}
