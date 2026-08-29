import React from 'react';
import {
  type CalibrationDueStatus, type DeviceStatus, type RiskLevel,
  type CalibrationStatus, type MaintenanceStatus, type MaintenancePriority,
  type TechnicianStatus,
} from '../../types';

// ── Status to badge class maps ────────────────────────────────────────────────

const deviceStatusMap: Record<DeviceStatus, string> = {
  active:            'badge-active',
  under_maintenance: 'badge-maintenance',
  out_of_service:    'badge-outofservice',
  retired:           'badge-retired',
  lost:              'badge-outofservice',
};

const deviceStatusLabel: Record<DeviceStatus, string> = {
  active:            '● Active',
  under_maintenance: '⚙ Under Maintenance',
  out_of_service:    '✕ Out of Service',
  retired:           '● Retired',
  lost:              '? Lost',
};

const calDueMap: Record<CalibrationDueStatus, string> = {
  overdue:      'badge-overdue',
  due_today:    'badge-due-today',
  due_soon:     'badge-due-soon',
  valid:        'badge-valid',
  not_required: 'badge-retired',
};

const calDueLabel: Record<CalibrationDueStatus, string> = {
  overdue:      '⚠ Overdue',
  due_today:    '⏰ Due Today',
  due_soon:     '⏳ Due Soon',
  valid:        '✓ Valid',
  not_required: '— Not Required',
};

const calStatusMap: Record<CalibrationStatus, string> = {
  scheduled:   'badge-scheduled',
  in_progress: 'badge-in-progress',
  passed:      'badge-passed',
  failed:      'badge-failed',
  overdue:     'badge-overdue',
  cancelled:   'badge-cancelled',
};

const maintStatusMap: Record<MaintenanceStatus, string> = {
  requested:   'badge-requested',
  approved:    'badge-approved',
  scheduled:   'badge-scheduled',
  in_progress: 'badge-in-progress',
  completed:   'badge-completed',
  cancelled:   'badge-cancelled',
};

const priorityMap: Record<MaintenancePriority, string> = {
  low:      'badge-low',
  medium:   'badge-medium',
  high:     'badge-high',
  critical: 'badge-critical',
};

const riskMap: Record<RiskLevel, string> = {
  low:      'badge-low',
  medium:   'badge-medium',
  high:     'badge-high',
  critical: 'badge-critical',
};

const techStatusMap: Record<TechnicianStatus, string> = {
  active:   'badge-active',
  inactive: 'badge-outofservice',
  on_leave: 'badge-maintenance',
};

// ── Badge Components ───────────────────────────────────────────────────────────

export function DeviceStatusBadge({ status }: { status: DeviceStatus }) {
  return (
    <span className={deviceStatusMap[status] ?? 'badge'}>
      {deviceStatusLabel[status] ?? status}
    </span>
  );
}

export function CalibrationDueBadge({ status }: { status: CalibrationDueStatus }) {
  return (
    <span className={calDueMap[status] ?? 'badge'}>
      {calDueLabel[status] ?? status}
    </span>
  );
}

export function CalibrationStatusBadge({ status }: { status: CalibrationStatus }) {
  return (
    <span className={`${calStatusMap[status] ?? 'badge'} capitalize`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export function MaintenanceStatusBadge({ status }: { status: MaintenanceStatus }) {
  return (
    <span className={`${maintStatusMap[status] ?? 'badge'} capitalize`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: MaintenancePriority }) {
  return (
    <span className={`${priorityMap[priority] ?? 'badge'} capitalize`}>
      {priority}
    </span>
  );
}

export function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <span className={`${riskMap[level] ?? 'badge'} capitalize`}>
      {level}
    </span>
  );
}

export function TechStatusBadge({ status }: { status: TechnicianStatus }) {
  return (
    <span className={`${techStatusMap[status] ?? 'badge'} capitalize`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
