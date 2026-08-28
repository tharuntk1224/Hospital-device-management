import { z } from 'zod';

export const createCalibrationSchema = z.object({
  deviceId: z.string().uuid(),
  calibrationDate: z.string().datetime().nullable().optional(),
  nextCalibrationDueDate: z.string().datetime().nullable().optional(),
  calibrationFrequencyDays: z.number().int().positive().nullable().optional(),
  technicianId: z.string().uuid().nullable().optional(),
  calibrationStandard: z.string().max(200).nullable().optional(),
  referenceEquipment: z.string().max(200).nullable().optional(),
  accuracy: z.number().min(0).max(100).nullable().optional(),
  tolerance: z.number().min(0).nullable().optional(),
  result: z.string().max(500).nullable().optional(),
  certificateNumber: z.string().max(100).nullable().optional(),
  remarks: z.string().max(2000).nullable().optional(),
  status: z.enum(['scheduled', 'in_progress', 'passed', 'failed', 'overdue', 'cancelled']).default('scheduled'),
  measurements: z
    .array(
      z.object({
        parameterName: z.string().min(1),
        nominalValue: z.number().nullable().optional(),
        measuredValue: z.number(),
        unit: z.string().max(50).nullable().optional(),
        deviation: z.number().nullable().optional(),
        withinTolerance: z.boolean(),
      })
    )
    .optional(),
});

export const updateCalibrationSchema = createCalibrationSchema.partial();

export type CreateCalibrationInput = z.infer<typeof createCalibrationSchema>;
export type UpdateCalibrationInput = z.infer<typeof updateCalibrationSchema>;
