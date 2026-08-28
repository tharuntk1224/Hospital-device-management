import { Response } from 'express';
import { ApiResponse, PaginatedResponse } from '../types';

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode = 200
): void {
  const response: ApiResponse<T> = { success: true, data, message };
  res.status(statusCode).json(response);
}

export function sendCreated<T>(res: Response, data: T, message = 'Created successfully'): void {
  sendSuccess(res, data, message, 201);
}

export function sendPaginated<T>(
  res: Response,
  items: T[],
  total: number,
  page: number,
  limit: number,
  message = 'Success'
): void {
  const paginatedData: PaginatedResponse<T> = {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
  const response: ApiResponse<PaginatedResponse<T>> = {
    success: true,
    data: paginatedData,
    message,
  };
  res.status(200).json(response);
}

export function sendError(
  res: Response,
  message: string,
  errorCode: string,
  statusCode: number
): void {
  const response: ApiResponse = { success: false, message, error: errorCode };
  res.status(statusCode).json(response);
}
