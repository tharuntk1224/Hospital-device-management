import { CalibrationDueStatus } from '../types';

/**
 * Dynamically compute calibration due status from nextCalibrationDate.
 * Never stored permanently — always calculated on read.
 */
export function getCalibrationDueStatus(
  nextCalibrationDate: Date | null,
  calibrationRequired: boolean
): CalibrationDueStatus {
  if (!calibrationRequired) return 'not_required';
  if (!nextCalibrationDate) return 'overdue';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDate = new Date(
    nextCalibrationDate.getFullYear(),
    nextCalibrationDate.getMonth(),
    nextCalibrationDate.getDate()
  );

  const diffMs = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'overdue';
  if (diffDays === 0) return 'due_today';
  if (diffDays <= 7) return 'due_soon';
  return 'valid';
}

export function getDaysUntilCalibration(nextCalibrationDate: Date | null): number {
  if (!nextCalibrationDate) return -9999;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDate = new Date(
    nextCalibrationDate.getFullYear(),
    nextCalibrationDate.getMonth(),
    nextCalibrationDate.getDate()
  );
  const diffMs = dueDate.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function calculateNextCalibrationDate(
  lastCalibrationDate: Date,
  frequencyDays: number
): Date {
  const next = new Date(lastCalibrationDate);
  next.setDate(next.getDate() + frequencyDays);
  return next;
}
