// ─── Auth ─────────────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'technician' | 'staff' | 'auditor';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  departmentId: string | null;
  departmentName?: string;
  isActive: boolean;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
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
  deviceCount?: number;
  createdAt: string;
}

// ─── Category ─────────────────────────────────────────────────────────────────

export interface DeviceCategory {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  deviceCount?: number;
  createdAt: string;
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
  purchaseDate: string | null;
  installationDate: string | null;
  warrantyExpiry: string | null;
  departmentId: string;
  departmentName?: string;
  location: string | null;
  technicianId: string | null;
  technicianName?: string;
  status: DeviceStatus;
  riskLevel: RiskLevel;
  calibrationRequired: boolean;
  calibrationFrequencyDays: number | null;
  lastCalibrationDate: string | null;
  nextCalibrationDate: string | null;
  lastMaintenanceDate: string | null;
  nextMaintenanceDate: string | null;
  description: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  calibrationDueStatus?: CalibrationDueStatus;
}

// ─── Technician ───────────────────────────────────────────────────────────────

export type TechnicianStatus = 'active' | 'inactive' | 'on_leave';

export interface Technician {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  email: string;
  phone: string | null;
  specialization: string | null;
  departmentId: string | null;
  departmentName?: string;
  certification: string | null;
  certificationExpiry: string | null;
  status: TechnicianStatus;
  createdAt: string;
  pendingMaintenance?: number;
  completedMaintenanceMonth?: number;
  calibrationWorkload?: number;
  assignedDevices?: Device[];
}

// ─── Calibration ──────────────────────────────────────────────────────────────

export type CalibrationStatus = 'scheduled' | 'in_progress' | 'passed' | 'failed' | 'overdue' | 'cancelled';

export interface CalibrationMeasurement {
  id: string;
  parameterName: string;
  nominalValue: number | null;
  measuredValue: number;
  unit: string | null;
  deviation: number | null;
  withinTolerance: boolean;
}

export interface Calibration {
  id: string;
  deviceId: string;
  deviceName?: string;
  deviceAssetNumber?: string;
  calibrationDate: string | null;
  previousCalibrationDate: string | null;
  nextCalibrationDueDate: string | null;
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
  createdAt: string;
  measurements?: CalibrationMeasurement[];
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
  priority: MaintenancePriority;
  requestDate: string | null;
  scheduledDate: string | null;
  startDate: string | null;
  completionDate: string | null;
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
  createdAt: string;
}

export interface MaintenanceRequest {
  id: string;
  deviceId: string;
  deviceName?: string;
  assetNumber?: string;
  requesterId: string;
  requesterName?: string;
  departmentId: string;
  departmentName?: string;
  problemDescription: string;
  priority: MaintenancePriority;
  requestDate: string;
  status: MaintenanceStatus;
  maintenanceRecordId: string | null;
  createdAt: string;
}

// ─── Notification ─────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  isRead: boolean;
  createdAt: string;
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValues: unknown;
  newValues: unknown;
  ipAddress: string | null;
  createdAt: string;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardStats {
  devices: {
    total: number;
    active: number;
    underMaintenance: number;
    outOfService: number;
    retired: number;
  };
  calibration: {
    overdue: number;
    dueToday: number;
    dueSoon: number;
    valid: number;
    compliancePercent: number;
  };
  maintenance: {
    pendingRequests: number;
    inProgress: number;
    completedThisMonth: number;
  };
  totalActiveTechnicians: number;
  charts: {
    devicesByDepartment: { name: string; value: number }[];
    devicesByCategory: { name: string; value: number }[];
    monthlyMaintenance: { month: string; total: number; completed: number }[];
  };
  upcomingCalibrations: {
    id: string;
    name: string;
    asset_number: string;
    next_calibration_date: string;
    department_name: string;
    dueStatus: CalibrationDueStatus;
  }[];
  generatedAt: string;
}

// ─── API Helpers ──────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  [key: string]: string | number | undefined;
}
