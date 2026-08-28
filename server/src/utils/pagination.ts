import { Request } from 'express';

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export function getPagination(req: Request): PaginationParams {
  const page = Math.max(1, parseInt(req.query['page'] as string, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query['limit'] as string, 10) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

export function getSortParams(
  req: Request,
  allowedFields: string[],
  defaultField = 'created_at',
  defaultOrder: 'ASC' | 'DESC' = 'DESC'
): { sortBy: string; sortOrder: 'ASC' | 'DESC' } {
  const rawSort = (req.query['sortBy'] as string) || defaultField;
  const sortBy = allowedFields.includes(rawSort) ? rawSort : defaultField;
  const sortOrder = (req.query['sortOrder'] as string)?.toUpperCase() === 'ASC' ? 'ASC' : defaultOrder;
  return { sortBy, sortOrder };
}
