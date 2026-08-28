// ─── User & Auth ─────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'technician' | 'staff' | 'auditor';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  departmentId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  departmentId: string | null;
}

// ─── Department ───────────────────────────────────────────────────────────────

export interface Department {
  id: string;
  name: string;
  code: string;
  description: string | null;
  headName: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Device Category ─────────────────────────────────────────────────────────

export interface DeviceCategory {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Device ───────────────────────────────────────────────────────────────────

export type DeviceStatus = 'active' | 'under_maintenance' | 'out_of_service' | 'retired' | 'lost';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type CalibrationDueStatus = 'valid' | 'due_soon' | 'due_today' | 'overdue' | 'not_required';

export interface Device {
  id: string;
  deviceId: string;
  assetNumber: string;
  serialNumber: string;
  name: string;
  categoryId: string;
  categoryName?: string;
  manufacturer: string;
  model: string;
  purchaseDate: Date | null;
  installationDate: Date | null;
  warrantyExpiry: Date | null;
  departmentId: string;
  departmentName?: string;
  location: string | null;
  technicianId: string | null;
  technicianName?: string;
  status: DeviceStatus;
  riskLevel: RiskLevel;
  calibrationRequired: boolean;
  calibrationFrequencyDays: number | null;
  lastCalibrationDate: Date | null;
  nextCalibrationDate: Date | null;
  lastMaintenanceDate: Date | null;
  nextMaintenanceDate: Date | null;
  description: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  // computed
  calibrationDueStatus?: CalibrationDueStatus;
}

// ─── Technician ───────────────────────────────────────────────────────────────

export type TechnicianStatus = 'active' | 'inactive' | 'on_leave';

export interface Technician {
  id: string;
  userId: string | null;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  specialization: string | null;
  departmentId: string | null;
  departmentName?: string;
  certification: string | null;
  certificationExpiry: Date | null;
  status: TechnicianStatus;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Calibration ──────────────────────────────────────────────────────────────

export type CalibrationStatus = 'scheduled' | 'in_progress' | 'passed' | 'failed' | 'overdue' | 'cancelled';

export interface Calibration {
  id: string;
  deviceId: string;
  deviceName?: string;
  deviceAssetNumber?: string;
  calibrationDate: Date | null;
  previousCalibrationDate: Date | null;
  nextCalibrationDueDate: Date | null;
  calibrationFrequencyDays: number | null;
  technicianId: string | null;
  technicianName?: string;
  calibrationStandard: string | null;
  referenceEquipment: string | null;
  accuracy: number | null;
  tolerance: number | null;
  result: string | null;
  certificateNumber: string | null;
  remarks: string | null;
  status: CalibrationStatus;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  measurements?: CalibrationMeasurement[];
}

export interface CalibrationMeasurement {
  id: string;
  calibrationId: string;
  parameterName: string;
  nominalValue: number | null;
  measuredValue: number;
  unit: string | null;
  deviation: number | null;
  withinTolerance: boolean;
  createdAt: Date;
}

// ─── Maintenance ─────────────────────────────────────────────────────────────

export type MaintenanceType = 'preventive' | 'corrective' | 'emergency' | 'inspection';
export type MaintenanceStatus = 'requested' | 'approved' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type MaintenancePriority = 'low' | 'medium' | 'high' | 'critical';

export interface MaintenanceRecord {
  id: string;
  deviceId: string;
  deviceName?: string;
  deviceAssetNumber?: string;
  maintenanceType: MaintenanceType;
  requestDate: Date | null;
  scheduledDate: Date | null;
  startDate: Date | null;
  completionDate: Date | null;
  technicianId: string | null;
  technicianName?: string;
  problemDescription: string | null;
  workPerformed: string | null;
  partsReplaced: string | null;
  cost: number | null;
  downtimeHours: number | null;
  result: string | null;
  remarks: string | null;
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MaintenanceRequest {
  id: string;
  deviceId: string;
  deviceName?: string;
  requesterId: string;
  requesterName?: string;
  departmentId: string;
  departmentName?: string;
  problemDescription: string;
  priority: MaintenancePriority;
  requestDate: Date;
  status: MaintenanceStatus;
  maintenanceRecordId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Notification ─────────────────────────────────────────────────────────────

export type NotificationType =
  | 'calibration_due_30'
  | 'calibration_due_7'
  | 'calibration_due_today'
  | 'calibration_overdue'
  | 'calibration_failed'
  | 'maintenance_scheduled'
  | 'maintenance_overdue'
  | 'maintenance_request_assigned'
  | 'maintenance_completed';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  isRead: boolean;
  createdAt: Date;
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string;
  userId: string;
  userEmail?: string;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: Date;
}

// ─── API Response ─────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalDevices: number;
  activeDevices: number;
  devicesDueForCalibration: number;
  overdueCalibrations: number;
  devicesUnderMaintenance: number;
  completedMaintenanceThisMonth: number;
  pendingServiceRequests: number;
  totalTechnicians: number;
  calibrationCompliancePercent: number;
  maintenanceCompliancePercent: number;
}

export interface CalibrationAlert {
  deviceId: string;
  deviceName: string;
  assetNumber: string;
  departmentName: string;
  nextCalibrationDate: Date;
  status: CalibrationDueStatus;
  daysUntilDue: number;
}
