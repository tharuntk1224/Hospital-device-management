import { z } from 'zod';

export const createDeviceSchema = z.object({
  deviceId: z.string().min(1).max(50),
  assetNumber: z.string().min(1).max(50),
  serialNumber: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  categoryId: z.string().uuid(),
  manufacturer: z.string().min(1).max(100),
  model: z.string().min(1).max(100),
  purchaseDate: z.string().datetime().nullable().optional(),
  installationDate: z.string().datetime().nullable().optional(),
  warrantyExpiry: z.string().datetime().nullable().optional(),
  departmentId: z.string().uuid(),
  location: z.string().max(200).nullable().optional(),
  technicianId: z.string().uuid().nullable().optional(),
  status: z.enum(['active', 'under_maintenance', 'out_of_service', 'retired', 'lost']).default('active'),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  calibrationRequired: z.boolean().default(true),
  calibrationFrequencyDays: z.number().int().positive().nullable().optional(),
  lastCalibrationDate: z.string().datetime().nullable().optional(),
  nextCalibrationDate: z.string().datetime().nullable().optional(),
  lastMaintenanceDate: z.string().datetime().nullable().optional(),
  nextMaintenanceDate: z.string().datetime().nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const updateDeviceSchema = createDeviceSchema.partial();

export const deviceFilterSchema = z.object({
  search: z.string().optional(),
  departmentId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  status: z.enum(['active', 'under_maintenance', 'out_of_service', 'retired', 'lost']).optional(),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  calibrationStatus: z.enum(['valid', 'due_soon', 'due_today', 'overdue', 'not_required']).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['ASC', 'DESC']).optional(),
});

export type CreateDeviceInput = z.infer<typeof createDeviceSchema>;
export type UpdateDeviceInput = z.infer<typeof updateDeviceSchema>;
