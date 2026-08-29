import api from './api';
import { type Device, type PaginatedData, type PaginationParams } from '../types';

export interface DeviceFilters extends PaginationParams {
  departmentId?: string;
  categoryId?: string;
  status?: string;
  riskLevel?: string;
  calibrationStatus?: string;
}

export const deviceService = {
  getAll: (params?: DeviceFilters) =>
    api.get<{ success: boolean; data: PaginatedData<Device> }>('/devices', { params }),

  getById: (id: string) =>
    api.get<{ success: boolean; data: Device }>(`/devices/${id}`),

  create: (data: Partial<Device>) =>
    api.post<{ success: boolean; data: Device }>('/devices', data),

  update: (id: string, data: Partial<Device>) =>
    api.put<{ success: boolean; data: Device }>(`/devices/${id}`, data),

  delete: (id: string) =>
    api.delete<{ success: boolean }>(`/devices/${id}`),
};

export const departmentService = {
  getAll: () => api.get('/departments'),
  create: (data: unknown) => api.post('/departments', data),
  update: (id: string, data: unknown) => api.put(`/departments/${id}`, data),
  delete: (id: string) => api.delete(`/departments/${id}`),
};

export const categoryService = {
  getAll: () => api.get('/categories'),
  create: (data: unknown) => api.post('/categories', data),
  update: (id: string, data: unknown) => api.put(`/categories/${id}`, data),
  delete: (id: string) => api.delete(`/categories/${id}`),
};

export const technicianService = {
  getAll: (params?: PaginationParams) => api.get('/technicians', { params }),
  getById: (id: string) => api.get(`/technicians/${id}`),
  create: (data: unknown) => api.post('/technicians', data),
  update: (id: string, data: unknown) => api.put(`/technicians/${id}`, data),
  delete: (id: string) => api.delete(`/technicians/${id}`),
};

export const calibrationService = {
  getAll: (params?: PaginationParams) => api.get('/calibrations', { params }),
  getById: (id: string) => api.get(`/calibrations/${id}`),
  create: (data: unknown) => api.post('/calibrations', data),
  update: (id: string, data: unknown) => api.put(`/calibrations/${id}`, data),
  delete: (id: string) => api.delete(`/calibrations/${id}`),
};

export const maintenanceService = {
  getAll: (params?: PaginationParams) => api.get('/maintenance', { params }),
  getById: (id: string) => api.get(`/maintenance/${id}`),
  create: (data: unknown) => api.post('/maintenance', data),
  update: (id: string, data: unknown) => api.put(`/maintenance/${id}`, data),
  delete: (id: string) => api.delete(`/maintenance/${id}`),
};

export const maintenanceRequestService = {
  getAll: (params?: PaginationParams) => api.get('/maintenance-requests', { params }),
  create: (data: unknown) => api.post('/maintenance-requests', data),
  update: (id: string, data: unknown) => api.put(`/maintenance-requests/${id}`, data),
};

export const dashboardService = {
  getStats: () => api.get('/dashboard/statistics'),
  getCalibrationAlerts: () => api.get('/dashboard/calibration-alerts'),
  getCompliance: () => api.get('/dashboard/compliance'),
};

export const reportService = {
  getDeviceReport: (params?: Record<string, string>) => api.get('/reports/devices', { params }),
  getCalibrationReport: (params?: Record<string, string>) => api.get('/reports/calibration', { params }),
  getMaintenanceReport: (params?: Record<string, string>) => api.get('/reports/maintenance', { params }),
};

export const auditService = {
  getLogs: (params?: PaginationParams) => api.get('/audit-logs', { params }),
};

export const notificationService = {
  getAll: (params?: { unread?: boolean }) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/mark-all-read'),
};

export const userService = {
  getAll: (params?: PaginationParams) => api.get('/users', { params }),
  getById: (id: string) => api.get(`/users/${id}`),
  create: (data: unknown) => api.post('/users', data),
  update: (id: string, data: unknown) => api.put(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
};

export const authService = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post('/auth/change-password', data),
};
