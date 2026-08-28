import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const JWT_SECRET = 'dev-secret-key';
const PORT = 3001;

// ─── In-Memory Data Store ─────────────────────────────────────────────────────

const users: any[] = [
  { id: 'u1', email: 'admin@hospital.com', passwordHash: bcrypt.hashSync('Admin@123', 10), firstName: 'Admin', lastName: 'User', role: 'admin', isActive: true, createdAt: new Date().toISOString() },
  { id: 'u2', email: 'tech@hospital.com',  passwordHash: bcrypt.hashSync('Tech@123', 10),  firstName: 'John',  lastName: 'Technician', role: 'technician', isActive: true, createdAt: new Date().toISOString() },
  { id: 'u3', email: 'staff@hospital.com', passwordHash: bcrypt.hashSync('Staff@123', 10), firstName: 'Jane',  lastName: 'Staff', role: 'staff', isActive: true, createdAt: new Date().toISOString() },
  { id: 'u4', email: 'auditor@hospital.com', passwordHash: bcrypt.hashSync('Audit@123', 10), firstName: 'Sam', lastName: 'Auditor', role: 'auditor', isActive: true, createdAt: new Date().toISOString() },
];

const departments: any[] = [
  { id: 'd1', name: 'Cardiology', code: 'CARD', isActive: true, deviceCount: 8, createdAt: new Date().toISOString() },
  { id: 'd2', name: 'Radiology', code: 'RAD', isActive: true, deviceCount: 12, createdAt: new Date().toISOString() },
  { id: 'd3', name: 'ICU', code: 'ICU', isActive: true, deviceCount: 15, createdAt: new Date().toISOString() },
  { id: 'd4', name: 'Laboratory', code: 'LAB', isActive: true, deviceCount: 20, createdAt: new Date().toISOString() },
  { id: 'd5', name: 'Oncology', code: 'ONC', isActive: true, deviceCount: 6, createdAt: new Date().toISOString() },
];

const categories: any[] = [
  { id: 'c1', name: 'Diagnostic Imaging', isActive: true, deviceCount: 10, createdAt: new Date().toISOString() },
  { id: 'c2', name: 'Patient Monitoring', isActive: true, deviceCount: 18, createdAt: new Date().toISOString() },
  { id: 'c3', name: 'Laboratory Instruments', isActive: true, deviceCount: 14, createdAt: new Date().toISOString() },
  { id: 'c4', name: 'Surgical Equipment', isActive: true, deviceCount: 9, createdAt: new Date().toISOString() },
  { id: 'c5', name: 'Life Support', isActive: true, deviceCount: 7, createdAt: new Date().toISOString() },
];

const technicians: any[] = [
  { id: 't1', employeeId: 'EMP001', firstName: 'Michael', lastName: 'Johnson', fullName: 'Michael Johnson', email: 'mjohnson@hospital.com', phone: '555-0101', specialization: 'Biomedical Engineering', departmentId: 'd2', departmentName: 'Radiology', certification: 'CBET', certificationExpiry: '2026-12-31', status: 'active', pendingMaintenance: 3, completedMaintenanceMonth: 12, calibrationWorkload: 8, createdAt: new Date().toISOString() },
  { id: 't2', employeeId: 'EMP002', firstName: 'Sarah', lastName: 'Williams', fullName: 'Sarah Williams', email: 'swilliams@hospital.com', phone: '555-0102', specialization: 'Electronics', departmentId: 'd1', departmentName: 'Cardiology', certification: 'CRES', certificationExpiry: '2027-06-30', status: 'active', pendingMaintenance: 1, completedMaintenanceMonth: 9, calibrationWorkload: 5, createdAt: new Date().toISOString() },
  { id: 't3', employeeId: 'EMP003', firstName: 'David', lastName: 'Brown', fullName: 'David Brown', email: 'dbrown@hospital.com', phone: '555-0103', specialization: 'Medical Imaging', departmentId: 'd3', departmentName: 'ICU', certification: 'CBET', certificationExpiry: '2026-03-15', status: 'active', pendingMaintenance: 5, completedMaintenanceMonth: 15, calibrationWorkload: 11, createdAt: new Date().toISOString() },
];

const now = new Date();
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString().split('T')[0];
const daysLater = (d: number) => new Date(now.getTime() + d * 86400000).toISOString().split('T')[0];

const devices: any[] = [
  { id: 'dev1', deviceId: 'BMD-001', assetNumber: 'AST-2021-001', serialNumber: 'SN-ECG-001', name: 'ECG Machine - Cardiology Suite A', categoryId: 'c2', categoryName: 'Patient Monitoring', manufacturer: 'Philips', model: 'PageWriter TC70', departmentId: 'd1', departmentName: 'Cardiology', location: 'Room 101', technicianId: 't2', technicianName: 'Sarah Williams', status: 'active', riskLevel: 'high', calibrationRequired: true, calibrationFrequencyDays: 90, lastCalibrationDate: daysAgo(80), nextCalibrationDate: daysLater(10), lastMaintenanceDate: daysAgo(30), description: 'Primary ECG machine for cardiology ward', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), calibrationDueStatus: 'due_soon' },
  { id: 'dev2', deviceId: 'BMD-002', assetNumber: 'AST-2021-002', serialNumber: 'SN-MRI-001', name: 'MRI Scanner - 3T', categoryId: 'c1', categoryName: 'Diagnostic Imaging', manufacturer: 'Siemens', model: 'MAGNETOM Vida', departmentId: 'd2', departmentName: 'Radiology', location: 'Imaging Suite B', technicianId: 't1', technicianName: 'Michael Johnson', status: 'active', riskLevel: 'critical', calibrationRequired: true, calibrationFrequencyDays: 180, lastCalibrationDate: daysAgo(200), nextCalibrationDate: daysAgo(20), lastMaintenanceDate: daysAgo(60), description: '3 Tesla MRI scanner for advanced imaging', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), calibrationDueStatus: 'overdue' },
  { id: 'dev3', deviceId: 'BMD-003', assetNumber: 'AST-2022-003', serialNumber: 'SN-VENT-001', name: 'Mechanical Ventilator', categoryId: 'c5', categoryName: 'Life Support', manufacturer: 'Medtronic', model: 'Puritan Bennett 980', departmentId: 'd3', departmentName: 'ICU', location: 'ICU Bay 3', technicianId: 't3', technicianName: 'David Brown', status: 'active', riskLevel: 'critical', calibrationRequired: true, calibrationFrequencyDays: 30, lastCalibrationDate: daysAgo(5), nextCalibrationDate: daysLater(25), lastMaintenanceDate: daysAgo(10), description: 'Critical care ventilator', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), calibrationDueStatus: 'valid' },
  { id: 'dev4', deviceId: 'BMD-004', assetNumber: 'AST-2022-004', serialNumber: 'SN-XRAY-001', name: 'Digital X-Ray System', categoryId: 'c1', categoryName: 'Diagnostic Imaging', manufacturer: 'GE Healthcare', model: 'Discovery XR656', departmentId: 'd2', departmentName: 'Radiology', location: 'X-Ray Room 1', technicianId: 't1', technicianName: 'Michael Johnson', status: 'under_maintenance', riskLevel: 'high', calibrationRequired: true, calibrationFrequencyDays: 90, lastCalibrationDate: daysAgo(30), nextCalibrationDate: daysLater(60), lastMaintenanceDate: daysAgo(2), description: 'Primary X-Ray system', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), calibrationDueStatus: 'valid' },
  { id: 'dev5', deviceId: 'BMD-005', assetNumber: 'AST-2023-005', serialNumber: 'SN-ANA-001', name: 'Blood Gas Analyzer', categoryId: 'c3', categoryName: 'Laboratory Instruments', manufacturer: 'Radiometer', model: 'ABL90 FLEX', departmentId: 'd4', departmentName: 'Laboratory', location: 'Lab Station A', technicianId: 't3', technicianName: 'David Brown', status: 'active', riskLevel: 'medium', calibrationRequired: true, calibrationFrequencyDays: 7, lastCalibrationDate: daysAgo(8), nextCalibrationDate: daysAgo(1), lastMaintenanceDate: daysAgo(14), description: 'Blood gas and electrolyte analyzer', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), calibrationDueStatus: 'overdue' },
  { id: 'dev6', deviceId: 'BMD-006', assetNumber: 'AST-2023-006', serialNumber: 'SN-DEFIB-001', name: 'Defibrillator AED', categoryId: 'c4', categoryName: 'Surgical Equipment', manufacturer: 'Zoll', model: 'R Series', departmentId: 'd3', departmentName: 'ICU', location: 'Emergency Cart 1', technicianId: 't2', technicianName: 'Sarah Williams', status: 'active', riskLevel: 'critical', calibrationRequired: true, calibrationFrequencyDays: 30, lastCalibrationDate: daysAgo(1), nextCalibrationDate: daysLater(29), lastMaintenanceDate: daysAgo(5), description: 'Advanced defibrillator with AED capability', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), calibrationDueStatus: 'valid' },
  { id: 'dev7', deviceId: 'BMD-007', assetNumber: 'AST-2020-007', serialNumber: 'SN-INF-001', name: 'Infusion Pump', categoryId: 'c2', categoryName: 'Patient Monitoring', manufacturer: 'Baxter', model: 'SIGMA Spectrum', departmentId: 'd3', departmentName: 'ICU', location: 'ICU Bay 5', technicianId: 't3', technicianName: 'David Brown', status: 'active', riskLevel: 'high', calibrationRequired: false, calibrationFrequencyDays: null, lastCalibrationDate: null, nextCalibrationDate: null, lastMaintenanceDate: daysAgo(45), description: 'Smart infusion pump', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), calibrationDueStatus: 'not_required' },
  { id: 'dev8', deviceId: 'BMD-008', assetNumber: 'AST-2019-008', serialNumber: 'SN-ULT-001', name: 'Ultrasound Machine', categoryId: 'c1', categoryName: 'Diagnostic Imaging', manufacturer: 'GE Healthcare', model: 'LOGIQ E9', departmentId: 'd1', departmentName: 'Cardiology', location: 'Echo Lab', technicianId: 't1', technicianName: 'Michael Johnson', status: 'retired', riskLevel: 'medium', calibrationRequired: true, calibrationFrequencyDays: 180, lastCalibrationDate: daysAgo(400), nextCalibrationDate: daysAgo(220), lastMaintenanceDate: daysAgo(200), description: 'Retired ultrasound unit', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), calibrationDueStatus: 'overdue' },
];

const calibrations: any[] = [
  { id: 'cal1', deviceId: 'dev1', deviceName: 'ECG Machine - Cardiology Suite A', deviceAssetNumber: 'AST-2021-001', calibrationDate: daysAgo(80), nextCalibrationDueDate: daysLater(10), technicianId: 't2', technicianName: 'Sarah Williams', calibrationStandard: 'ISO 14971', referenceEquipment: 'Fluke ProSim 8', accuracy: 98.5, tolerance: 2.0, result: 'passed', certificateNumber: 'CERT-2024-001', status: 'passed', remarks: 'All parameters within tolerance', createdAt: new Date().toISOString() },
  { id: 'cal2', deviceId: 'dev2', deviceName: 'MRI Scanner - 3T', deviceAssetNumber: 'AST-2021-002', calibrationDate: daysAgo(200), nextCalibrationDueDate: daysAgo(20), technicianId: 't1', technicianName: 'Michael Johnson', calibrationStandard: 'IEC 60601-2-33', referenceEquipment: 'MR QA Phantom Kit', accuracy: 99.1, tolerance: 1.0, result: 'passed', certificateNumber: 'CERT-2024-002', status: 'overdue', remarks: 'Due for recalibration - URGENT', createdAt: new Date().toISOString() },
  { id: 'cal3', deviceId: 'dev3', deviceName: 'Mechanical Ventilator', deviceAssetNumber: 'AST-2022-003', calibrationDate: daysAgo(5), nextCalibrationDueDate: daysLater(25), technicianId: 't3', technicianName: 'David Brown', calibrationStandard: 'ISO 80601-2-12', referenceEquipment: 'VT900 Gas Flow Analyzer', accuracy: 99.8, tolerance: 0.5, result: 'passed', certificateNumber: 'CERT-2025-003', status: 'passed', remarks: 'Excellent performance', createdAt: new Date().toISOString() },
  { id: 'cal4', deviceId: 'dev5', deviceName: 'Blood Gas Analyzer', deviceAssetNumber: 'AST-2023-005', calibrationDate: daysAgo(8), nextCalibrationDueDate: daysAgo(1), technicianId: 't3', technicianName: 'David Brown', calibrationStandard: 'CLSI EP5-A3', referenceEquipment: 'Control Material Set', accuracy: 97.2, tolerance: 3.0, result: 'failed', certificateNumber: null, status: 'overdue', remarks: 'pH sensor drift detected - requires service', createdAt: new Date().toISOString() },
  { id: 'cal5', deviceId: 'dev6', deviceName: 'Defibrillator AED', deviceAssetNumber: 'AST-2023-006', calibrationDate: daysAgo(1), nextCalibrationDueDate: daysLater(29), technicianId: 't2', technicianName: 'Sarah Williams', calibrationStandard: 'IEC 60601-2-4', referenceEquipment: 'Impulse 6000D Analyzer', accuracy: 100.0, tolerance: 1.0, result: 'passed', certificateNumber: 'CERT-2025-005', status: 'passed', remarks: 'All energy levels verified', createdAt: new Date().toISOString() },
];

const maintenanceRecords: any[] = [
  { id: 'mnt1', deviceId: 'dev4', deviceName: 'Digital X-Ray System', deviceAssetNumber: 'AST-2022-004', maintenanceType: 'corrective', priority: 'high', requestDate: daysAgo(5), scheduledDate: daysAgo(2), startDate: daysAgo(2), completionDate: null, technicianId: 't1', technicianName: 'Michael Johnson', problemDescription: 'Image quality degradation - artifacts on left side', workPerformed: 'Replaced X-ray tube and recalibrated detector', partsReplaced: 'X-ray tube assembly', cost: 12500, downtimeHours: 48, status: 'in_progress', remarks: 'Parts ordered, awaiting delivery', createdAt: new Date().toISOString() },
  { id: 'mnt2', deviceId: 'dev1', deviceName: 'ECG Machine - Cardiology Suite A', deviceAssetNumber: 'AST-2021-001', maintenanceType: 'preventive', priority: 'medium', requestDate: daysAgo(35), scheduledDate: daysAgo(30), startDate: daysAgo(30), completionDate: daysAgo(30), technicianId: 't2', technicianName: 'Sarah Williams', problemDescription: 'Scheduled preventive maintenance', workPerformed: 'Cleaned leads, tested all channels, updated firmware', partsReplaced: 'Electrode pads', cost: 450, downtimeHours: 2, result: 'satisfactory', status: 'completed', remarks: 'Device in excellent condition', createdAt: new Date().toISOString() },
  { id: 'mnt3', deviceId: 'dev3', deviceName: 'Mechanical Ventilator', deviceAssetNumber: 'AST-2022-003', maintenanceType: 'preventive', priority: 'critical', requestDate: daysAgo(12), scheduledDate: daysAgo(10), startDate: daysAgo(10), completionDate: daysAgo(10), technicianId: 't3', technicianName: 'David Brown', problemDescription: 'Monthly preventive maintenance', workPerformed: 'Replaced filters, tested alarms, verified flow accuracy', partsReplaced: 'HEPA filter, bacteria filter', cost: 800, downtimeHours: 3, result: 'satisfactory', status: 'completed', remarks: 'All safety checks passed', createdAt: new Date().toISOString() },
];

const maintenanceRequests: any[] = [
  { id: 'req1', deviceId: 'dev5', deviceName: 'Blood Gas Analyzer', assetNumber: 'AST-2023-005', requesterId: 'u3', requesterName: 'Jane Staff', departmentId: 'd4', departmentName: 'Laboratory', problemDescription: 'pH readings inconsistent with control values. Results differ by >0.05 units.', priority: 'high', requestDate: daysAgo(2), status: 'approved', maintenanceRecordId: null, createdAt: new Date().toISOString() },
  { id: 'req2', deviceId: 'dev7', deviceName: 'Infusion Pump', assetNumber: 'AST-2020-007', requesterId: 'u3', requesterName: 'Jane Staff', departmentId: 'd3', departmentName: 'ICU', problemDescription: 'Alarm sounds intermittently without clear cause. Possible sensor issue.', priority: 'medium', requestDate: daysAgo(1), status: 'requested', maintenanceRecordId: null, createdAt: new Date().toISOString() },
];

const notifications: any[] = [
  { id: 'notif1', type: 'calibration_overdue', title: 'Calibration Overdue', message: 'MRI Scanner - 3T is 20 days overdue for calibration', entityType: 'device', entityId: 'dev2', isRead: false, createdAt: new Date().toISOString() },
  { id: 'notif2', type: 'calibration_due_soon', title: 'Calibration Due Soon', message: 'ECG Machine calibration due in 10 days', entityType: 'device', entityId: 'dev1', isRead: false, createdAt: new Date().toISOString() },
  { id: 'notif3', type: 'maintenance_request', title: 'New Service Request', message: 'Blood Gas Analyzer reported for pH inconsistency', entityType: 'device', entityId: 'dev5', isRead: true, createdAt: daysAgo(2) + 'T10:00:00.000Z' },
  { id: 'notif4', type: 'calibration_overdue', title: 'Calibration Overdue', message: 'Blood Gas Analyzer calibration is overdue', entityType: 'device', entityId: 'dev5', isRead: false, createdAt: new Date().toISOString() },
];

const auditLogs: any[] = [
  { id: 'aud1', userId: 'u1', userName: 'Admin User', userEmail: 'admin@hospital.com', action: 'DEVICE_CREATED', entityType: 'device', entityId: 'dev6', oldValues: null, newValues: { name: 'Defibrillator AED', status: 'active' }, ipAddress: '127.0.0.1', createdAt: daysAgo(10) + 'T09:00:00.000Z' },
  { id: 'aud2', userId: 'u2', userName: 'John Technician', userEmail: 'tech@hospital.com', action: 'CALIBRATION_CREATED', entityType: 'calibration', entityId: 'cal5', oldValues: null, newValues: { deviceId: 'dev6', result: 'passed' }, ipAddress: '127.0.0.1', createdAt: daysAgo(1) + 'T14:00:00.000Z' },
  { id: 'aud3', userId: 'u1', userName: 'Admin User', userEmail: 'admin@hospital.com', action: 'DEVICE_UPDATED', entityType: 'device', entityId: 'dev4', oldValues: { status: 'active' }, newValues: { status: 'under_maintenance' }, ipAddress: '127.0.0.1', createdAt: daysAgo(2) + 'T11:00:00.000Z' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function paginate(arr: any[], page = 1, limit = 10) {
  const p = Number(page), l = Number(limit);
  const start = (p - 1) * l;
  const items = arr.slice(start, start + l);
  return { items, total: arr.length, page: p, limit: l, totalPages: Math.ceil(arr.length / l) };
}

function ok(res: any, data: any, message = 'Success') {
  res.json({ success: true, data, message });
}

function verifyToken(req: any): any {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return null;
  try { return jwt.verify(h.slice(7), JWT_SECRET) as any; } catch { return null; }
}

function auth(req: any, res: any, next: any) {
  const user = verifyToken(req);
  if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
  req.user = user;
  next();
}

// ─── Auth Routes ──────────────────────────────────────────────────────────────

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  if (!user || !bcrypt.compareSync(password, user.passwordHash))
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  const { passwordHash, ...safeUser } = user;
  const accessToken = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
  ok(res, { user: safeUser, accessToken, refreshToken });
});

app.get('/api/auth/me', auth, (req: any, res) => {
  const user = users.find(u => u.id === req.user.userId);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  const { passwordHash, ...safeUser } = user;
  ok(res, safeUser);
});

app.post('/api/auth/logout', (_req, res) => ok(res, null, 'Logged out'));
app.post('/api/auth/refresh', (req, res) => {
  const { refreshToken } = req.body;
  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET) as any;
    const user = users.find(u => u.id === decoded.userId);
    if (!user) return res.status(401).json({ success: false });
    const accessToken = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '15m' });
    ok(res, { accessToken });
  } catch { res.status(401).json({ success: false }); }
});

// ─── Dashboard ────────────────────────────────────────────────────────────────

app.get('/api/dashboard/statistics', auth, (_req, res) => {
  const overdue = devices.filter(d => d.calibrationDueStatus === 'overdue').length;
  const dueSoon = devices.filter(d => d.calibrationDueStatus === 'due_soon').length;
  const valid = devices.filter(d => d.calibrationDueStatus === 'valid').length;
  const calRequired = devices.filter(d => d.calibrationRequired).length;
  ok(res, {
    devices: { total: devices.length, active: devices.filter(d => d.status === 'active').length, underMaintenance: devices.filter(d => d.status === 'under_maintenance').length, outOfService: devices.filter(d => d.status === 'out_of_service').length, retired: devices.filter(d => d.status === 'retired').length },
    calibration: { overdue, dueSoon, dueToday: 0, valid, compliancePercent: calRequired > 0 ? Math.round(valid / calRequired * 100) : 100 },
    maintenance: { pendingRequests: maintenanceRequests.filter(r => r.status === 'requested').length, inProgress: maintenanceRecords.filter(m => m.status === 'in_progress').length, completedThisMonth: maintenanceRecords.filter(m => m.status === 'completed').length },
    totalActiveTechnicians: technicians.filter(t => t.status === 'active').length,
    charts: {
      devicesByDepartment: departments.map(d => ({ name: d.name, value: d.deviceCount })),
      devicesByCategory: categories.map(c => ({ name: c.name, value: c.deviceCount })),
      monthlyMaintenance: [
        { month: 'Apr', total: 8, completed: 6 }, { month: 'May', total: 12, completed: 10 },
        { month: 'Jun', total: 9, completed: 8 }, { month: 'Jul', total: 15, completed: 12 },
        { month: 'Aug', total: 7, completed: 5 },
      ],
    },
    upcomingCalibrations: devices.filter(d => d.calibrationDueStatus === 'due_soon' || d.calibrationDueStatus === 'overdue').map(d => ({ id: d.id, name: d.name, asset_number: d.assetNumber, next_calibration_date: d.nextCalibrationDate, department_name: d.departmentName, dueStatus: d.calibrationDueStatus })),
    generatedAt: new Date().toISOString(),
  });
});

app.get('/api/dashboard/compliance', auth, (_req, res) => {
  const calRequired = devices.filter(d => d.calibrationRequired);
  const compliant = calRequired.filter(d => d.calibrationDueStatus === 'valid');
  ok(res, { compliancePercent: calRequired.length > 0 ? Math.round(compliant.length / calRequired.length * 100) : 100, compliant: compliant.length, nonCompliant: calRequired.length - compliant.length, total: calRequired.length, byRisk: [{ riskLevel: 'critical', total: 3, compliant: 2 }, { riskLevel: 'high', total: 2, compliant: 1 }, { riskLevel: 'medium', total: 2, compliant: 1 }, { riskLevel: 'low', total: 0, compliant: 0 }] });
});

app.get('/api/dashboard/calibration-alerts', auth, (_req, res) => {
  ok(res, { overdue: devices.filter(d => d.calibrationDueStatus === 'overdue'), dueSoon: devices.filter(d => d.calibrationDueStatus === 'due_soon') });
});

// ─── Devices ──────────────────────────────────────────────────────────────────

app.get('/api/devices', auth, (req, res) => {
  let result = [...devices];
  const { search, status, departmentId, categoryId, riskLevel } = req.query as any;
  if (search) result = result.filter(d => d.name.toLowerCase().includes(search.toLowerCase()) || d.deviceId.includes(search) || d.assetNumber.includes(search));
  if (status) result = result.filter(d => d.status === status);
  if (departmentId) result = result.filter(d => d.departmentId === departmentId);
  if (categoryId) result = result.filter(d => d.categoryId === categoryId);
  if (riskLevel) result = result.filter(d => d.riskLevel === riskLevel);
  ok(res, paginate(result, req.query.page as any, req.query.limit as any));
});

app.get('/api/devices/:id', auth, (req, res) => {
  const d = devices.find(d => d.id === req.params.id);
  if (!d) return res.status(404).json({ success: false, message: 'Device not found' });
  ok(res, d);
});

app.post('/api/devices', auth, (req, res) => {
  const newDevice = { id: uuidv4(), ...req.body, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), calibrationDueStatus: 'valid' };
  devices.push(newDevice);
  ok(res, newDevice, 'Device created');
});

app.put('/api/devices/:id', auth, (req, res) => {
  const idx = devices.findIndex(d => d.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Device not found' });
  devices[idx] = { ...devices[idx], ...req.body, updatedAt: new Date().toISOString() };
  ok(res, devices[idx], 'Device updated');
});

app.delete('/api/devices/:id', auth, (req, res) => {
  const idx = devices.findIndex(d => d.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Device not found' });
  devices.splice(idx, 1);
  ok(res, null, 'Device deleted');
});

// ─── Calibrations ─────────────────────────────────────────────────────────────

app.get('/api/calibrations', auth, (req, res) => {
  let result = [...calibrations];
  const { deviceId, status, search } = req.query as any;
  if (deviceId) result = result.filter(c => c.deviceId === deviceId);
  if (status) result = result.filter(c => c.status === status);
  if (search) result = result.filter(c => c.deviceName?.toLowerCase().includes(search.toLowerCase()));
  ok(res, paginate(result, req.query.page as any, req.query.limit as any));
});

app.get('/api/calibrations/:id', auth, (req, res) => {
  const c = calibrations.find(c => c.id === req.params.id);
  if (!c) return res.status(404).json({ success: false, message: 'Not found' });
  ok(res, { ...c, measurements: [{ id: 'm1', parameterName: 'Voltage', nominalValue: 5.0, measuredValue: 4.98, unit: 'V', deviation: -0.02, withinTolerance: true }] });
});

app.post('/api/calibrations', auth, (req, res) => {
  const newCal = { id: uuidv4(), ...req.body, createdAt: new Date().toISOString() };
  calibrations.push(newCal);
  ok(res, newCal, 'Calibration created');
});

app.put('/api/calibrations/:id', auth, (req, res) => {
  const idx = calibrations.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Not found' });
  calibrations[idx] = { ...calibrations[idx], ...req.body };
  ok(res, calibrations[idx], 'Calibration updated');
});

// ─── Maintenance ──────────────────────────────────────────────────────────────

app.get('/api/maintenance', auth, (req, res) => {
  let result = [...maintenanceRecords];
  const { deviceId, status } = req.query as any;
  if (deviceId) result = result.filter(m => m.deviceId === deviceId);
  if (status) result = result.filter(m => m.status === status);
  ok(res, paginate(result, req.query.page as any, req.query.limit as any));
});

app.get('/api/maintenance/:id', auth, (req, res) => {
  const m = maintenanceRecords.find(m => m.id === req.params.id);
  if (!m) return res.status(404).json({ success: false, message: 'Not found' });
  ok(res, m);
});

app.post('/api/maintenance', auth, (req, res) => {
  const newM = { id: uuidv4(), ...req.body, createdAt: new Date().toISOString() };
  maintenanceRecords.push(newM);
  ok(res, newM, 'Maintenance record created');
});

app.put('/api/maintenance/:id', auth, (req, res) => {
  const idx = maintenanceRecords.findIndex(m => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Not found' });
  maintenanceRecords[idx] = { ...maintenanceRecords[idx], ...req.body };
  ok(res, maintenanceRecords[idx], 'Updated');
});

// ─── Maintenance Requests ─────────────────────────────────────────────────────

app.get('/api/maintenance-requests', auth, (req, res) => ok(res, paginate(maintenanceRequests, req.query.page as any, req.query.limit as any)));
app.post('/api/maintenance-requests', auth, (req, res) => {
  const r = { id: uuidv4(), ...req.body, requestDate: new Date().toISOString(), status: 'requested', createdAt: new Date().toISOString() };
  maintenanceRequests.push(r);
  ok(res, r, 'Request submitted');
});
app.put('/api/maintenance-requests/:id', auth, (req, res) => {
  const idx = maintenanceRequests.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Not found' });
  maintenanceRequests[idx] = { ...maintenanceRequests[idx], ...req.body };
  ok(res, maintenanceRequests[idx]);
});

// ─── Technicians ──────────────────────────────────────────────────────────────

app.get('/api/technicians', auth, (req, res) => ok(res, paginate(technicians, req.query.page as any, req.query.limit as any)));
app.get('/api/technicians/:id', auth, (req, res) => {
  const t = technicians.find(t => t.id === req.params.id);
  if (!t) return res.status(404).json({ success: false, message: 'Not found' });
  ok(res, t);
});
app.post('/api/technicians', auth, (req, res) => { const t = { id: uuidv4(), ...req.body, createdAt: new Date().toISOString() }; technicians.push(t); ok(res, t); });
app.put('/api/technicians/:id', auth, (req, res) => { const idx = technicians.findIndex(t => t.id === req.params.id); if (idx === -1) return res.status(404).json({ success: false }); technicians[idx] = { ...technicians[idx], ...req.body }; ok(res, technicians[idx]); });

// ─── Departments & Categories ─────────────────────────────────────────────────

app.get('/api/departments', auth, (_req, res) => ok(res, { items: departments, total: departments.length }));
app.post('/api/departments', auth, (req, res) => { const d = { id: uuidv4(), ...req.body, createdAt: new Date().toISOString() }; departments.push(d); ok(res, d); });
app.put('/api/departments/:id', auth, (req, res) => { const idx = departments.findIndex(d => d.id === req.params.id); if (idx === -1) return res.status(404).json({ success: false }); departments[idx] = { ...departments[idx], ...req.body }; ok(res, departments[idx]); });
app.delete('/api/departments/:id', auth, (req, res) => { const idx = departments.findIndex(d => d.id === req.params.id); if (idx !== -1) departments.splice(idx, 1); ok(res, null); });

app.get('/api/categories', auth, (_req, res) => ok(res, { items: categories, total: categories.length }));
app.post('/api/categories', auth, (req, res) => { const c = { id: uuidv4(), ...req.body, createdAt: new Date().toISOString() }; categories.push(c); ok(res, c); });

// ─── Notifications ────────────────────────────────────────────────────────────

app.get('/api/notifications', auth, (req, res) => {
  let result = [...notifications];
  if (req.query.unread === 'true') result = result.filter(n => !n.isRead);
  ok(res, paginate(result, req.query.page as any, req.query.limit as any));
});
app.get('/api/notifications/unread-count', auth, (_req, res) => ok(res, { count: notifications.filter(n => !n.isRead).length }));
app.put('/api/notifications/:id/read', auth, (req, res) => {
  const n = notifications.find(n => n.id === req.params.id);
  if (n) n.isRead = true;
  ok(res, n);
});
app.put('/api/notifications/mark-all-read', auth, (_req, res) => {
  notifications.forEach(n => n.isRead = true);
  ok(res, null, 'All marked as read');
});

// ─── Users ────────────────────────────────────────────────────────────────────

app.get('/api/users', auth, (req, res) => {
  const safeUsers = users.map(({ passwordHash, ...u }) => u);
  ok(res, paginate(safeUsers, req.query.page as any, req.query.limit as any));
});
app.post('/api/users', auth, (req, res) => {
  const newUser = { id: uuidv4(), ...req.body, passwordHash: bcrypt.hashSync(req.body.password || 'Password@123', 10), isActive: true, createdAt: new Date().toISOString() };
  users.push(newUser);
  const { passwordHash, ...safe } = newUser;
  ok(res, safe, 'User created');
});

// ─── Reports ──────────────────────────────────────────────────────────────────

app.get('/api/reports/devices', auth, (_req, res) => ok(res, { items: devices, total: devices.length, generatedAt: new Date().toISOString() }));
app.get('/api/reports/calibration', auth, (_req, res) => ok(res, { items: calibrations, total: calibrations.length, generatedAt: new Date().toISOString() }));
app.get('/api/reports/maintenance', auth, (_req, res) => ok(res, { items: maintenanceRecords, total: maintenanceRecords.length, generatedAt: new Date().toISOString() }));

// ─── Audit Logs ───────────────────────────────────────────────────────────────

app.get('/api/audit-logs', auth, (req, res) => ok(res, paginate(auditLogs, req.query.page as any, req.query.limit as any)));

// ─── Health ───────────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString(), database: 'in-memory', mode: 'development-mock' }));

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🚀 BioMed CMS Mock Server`);
  console.log(`   API:  http://localhost:${PORT}/api`);
  console.log(`   Mode: In-Memory (no database required)\n`);
  console.log(`   Demo logins:`);
  console.log(`   admin@hospital.com / Admin@123`);
  console.log(`   tech@hospital.com  / Tech@123\n`);
});
