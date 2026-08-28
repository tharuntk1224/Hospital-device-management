import { z } from 'zod';

export const createMaintenanceSchema = z.object({
  deviceId: z.string().uuid(),
  maintenanceType: z.enum(['preventive', 'corrective', 'emergency', 'inspection']),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  requestDate: z.string().datetime().nullable().optional(),
  scheduledDate: z.string().datetime().nullable().optional(),
  startDate: z.string().datetime().nullable().optional(),
  completionDate: z.string().datetime().nullable().optional(),
  technicianId: z.string().uuid().nullable().optional(),
  problemDescription: z.string().max(2000).nullable().optional(),
  workPerformed: z.string().max(2000).nullable().optional(),
  partsReplaced: z.string().max(1000).nullable().optional(),
  cost: z.number().min(0).nullable().optional(),
  downtimeHours: z.number().min(0).nullable().optional(),
  result: z.string().max(500).nullable().optional(),
  remarks: z.string().max(2000).nullable().optional(),
  status: z
    .enum(['requested', 'approved', 'scheduled', 'in_progress', 'completed', 'cancelled'])
    .default('scheduled'),
});

export const updateMaintenanceSchema = createMaintenanceSchema.partial();

export const createMaintenanceRequestSchema = z.object({
  deviceId: z.string().uuid(),
  departmentId: z.string().uuid(),
  problemDescription: z.string().min(10).max(2000),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  requestDate: z.string().datetime().optional(),
});

export const updateMaintenanceRequestSchema = z.object({
  status: z.enum(['requested', 'approved', 'scheduled', 'in_progress', 'completed', 'cancelled']),
  technicianId: z.string().uuid().nullable().optional(),
  maintenanceRecordId: z.string().uuid().nullable().optional(),
  scheduledDate: z.string().datetime().nullable().optional(),
});

export type CreateMaintenanceInput = z.infer<typeof createMaintenanceSchema>;
export type UpdateMaintenanceInput = z.infer<typeof updateMaintenanceSchema>;
export type CreateMaintenanceRequestInput = z.infer<typeof createMaintenanceRequestSchema>;
export type UpdateMaintenanceRequestInput = z.infer<typeof updateMaintenanceRequestSchema>;
