import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pool = new Pool({
  host: process.env['DB_HOST'] || 'localhost',
  port: parseInt(process.env['DB_PORT'] || '5432', 10),
  database: process.env['DB_NAME'] || 'biomedical_db',
  user: process.env['DB_USER'] || 'biomedical_user',
  password: process.env['DB_PASSWORD'] || 'password',
});

async function seed(): Promise<void> {
  const client = await pool.connect();
  try {
    console.log('🌱 Starting database seed...\n');

    // Run base seed SQL (departments, categories, technicians)
    const seedSql = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');
    await client.query(seedSql);
    console.log('✅ Base seed SQL executed');

    // Hash passwords
    const adminHash  = await bcrypt.hash('Admin@123', 12);
    const techHash   = await bcrypt.hash('Tech@123',  12);
    const staffHash  = await bcrypt.hash('Staff@123', 12);
    const auditHash  = await bcrypt.hash('Audit@123', 12);

    // Insert users
    await client.query(`
      INSERT INTO users (id, email, password_hash, first_name, last_name, role, department_id) VALUES
      ('40000000-0000-0000-0000-000000000001', 'admin@hospital.com',   $1, 'System',   'Administrator', 'admin',      '10000000-0000-0000-0000-000000000008'),
      ('40000000-0000-0000-0000-000000000002', 'tech@hospital.com',    $2, 'Rajesh',   'Varma',         'technician', '10000000-0000-0000-0000-000000000008'),
      ('40000000-0000-0000-0000-000000000003', 'staff@hospital.com',   $3, 'Deepa',    'Pillai',        'staff',      '10000000-0000-0000-0000-000000000001'),
      ('40000000-0000-0000-0000-000000000004', 'auditor@hospital.com', $4, 'Compliance','Auditor',      'auditor',    NULL),
      ('40000000-0000-0000-0000-000000000005', 'tech2@hospital.com',   $2, 'Sunita',   'Krishnan',      'technician', '10000000-0000-0000-0000-000000000008'),
      ('40000000-0000-0000-0000-000000000006', 'staff2@hospital.com',  $3, 'Mohan',    'Reddy',         'staff',      '10000000-0000-0000-0000-000000000004')
    `, [adminHash, techHash, staffHash, auditHash]);
    console.log('✅ Users seeded');

    // Link technician user IDs
    await client.query(`UPDATE technicians SET user_id = '40000000-0000-0000-0000-000000000002' WHERE id = '30000000-0000-0000-0000-000000000001'`);
    await client.query(`UPDATE technicians SET user_id = '40000000-0000-0000-0000-000000000005' WHERE id = '30000000-0000-0000-0000-000000000002'`);

    // ─── Devices ──────────────────────────────────────────────────────────────
    await client.query(`
      INSERT INTO devices (id, device_id, asset_number, serial_number, name, category_id, manufacturer, model,
        purchase_date, installation_date, warranty_expiry, department_id, location, technician_id,
        status, risk_level, calibration_required, calibration_frequency_days,
        last_calibration_date, next_calibration_date, last_maintenance_date)
      VALUES
      -- ICU Devices
      ('50000000-0000-0000-0000-000000000001','DEV-001','AST-001','PM500-001',
       'Patient Monitor Pro',          '20000000-0000-0000-0000-000000000001', 'MedTech Solutions',  'PM-500',
       '2022-01-15','2022-02-01','2025-01-15','10000000-0000-0000-0000-000000000001','ICU Bed 1',
       '30000000-0000-0000-0000-000000000001','active','high',true,180,
       '2025-07-01','2026-01-01','2025-06-15'),

      ('50000000-0000-0000-0000-000000000002','DEV-002','AST-002','VNT700-002',
       'Ventilator VN-700',             '20000000-0000-0000-0000-000000000004', 'PneumaTech',         'VN-700',
       '2021-06-01','2021-07-01','2024-06-01','10000000-0000-0000-0000-000000000001','ICU Bed 3',
       '30000000-0000-0000-0000-000000000001','active','critical',true,90,
       '2025-06-01','2025-09-01','2025-05-20'),

      ('50000000-0000-0000-0000-000000000003','DEV-003','AST-003','INF300-003',
       'Infusion Pump IP-300',          '20000000-0000-0000-0000-000000000003', 'FlowMed',            'IP-300',
       '2023-03-10','2023-03-20','2026-03-10','10000000-0000-0000-0000-000000000001','ICU Bed 5',
       '30000000-0000-0000-0000-000000000002','active','high',true,365,
       '2024-12-01','2025-12-01','2025-03-01'),

      -- Emergency Department
      ('50000000-0000-0000-0000-000000000004','DEV-004','AST-004','DEF900-004',
       'Defibrillator DF-900',          '20000000-0000-0000-0000-000000000005', 'CardioLife',         'DF-900',
       '2020-08-01','2020-09-01','2023-08-01','10000000-0000-0000-0000-000000000002','Emergency Bay 1',
       '30000000-0000-0000-0000-000000000001','active','critical',true,90,
       '2025-05-01','2025-08-01','2025-04-15'),

      ('50000000-0000-0000-0000-000000000005','DEV-005','AST-005','ECG12-005',
       'ECG Machine ECG-12',            '20000000-0000-0000-0000-000000000002', 'CardioTech',         'ECG-12',
       '2022-11-01','2022-11-15','2025-11-01','10000000-0000-0000-0000-000000000002','Emergency Bay 2',
       '30000000-0000-0000-0000-000000000002','active','medium',true,365,
       '2025-01-15','2026-01-15','2025-01-10'),

      -- OVERDUE CALIBRATION (for demo)
      ('50000000-0000-0000-0000-000000000006','DEV-006','AST-006','BP200-006',
       'Blood Pressure Monitor BP-200', '20000000-0000-0000-0000-000000000007', 'VitalMed',           'BP-200',
       '2021-05-01','2021-05-15','2024-05-01','10000000-0000-0000-0000-000000000002','Triage Area',
       '30000000-0000-0000-0000-000000000002','active','low',true,180,
       '2024-12-01','2025-06-01','2024-11-20'),

      -- Radiology
      ('50000000-0000-0000-0000-000000000007','DEV-007','AST-007','XRY500-007',
       'X-Ray Machine XR-500',          '20000000-0000-0000-0000-000000000014', 'RadiSys',            'XR-500',
       '2019-12-01','2020-01-01','2022-12-01','10000000-0000-0000-0000-000000000003','X-Ray Room 1',
       '30000000-0000-0000-0000-000000000003','active','high',true,365,
       '2025-04-01','2026-04-01','2025-03-20'),

      ('50000000-0000-0000-0000-000000000008','DEV-008','AST-008','USS800-008',
       'Ultrasound Machine US-800',     '20000000-0000-0000-0000-000000000013', 'SonoTech',           'US-800',
       '2023-01-10','2023-02-01','2026-01-10','10000000-0000-0000-0000-000000000003','Sonography Room',
       '30000000-0000-0000-0000-000000000003','active','medium',true,365,
       '2025-02-01','2026-02-01','2025-01-25'),

      -- Cardiology
      ('50000000-0000-0000-0000-000000000009','DEV-009','AST-009','ECG24-009',
       'Holter Monitor HM-24',          '20000000-0000-0000-0000-000000000002', 'CardioTech',         'HM-24',
       '2022-04-01','2022-04-15','2025-04-01','10000000-0000-0000-0000-000000000004','Cardiology Lab',
       '30000000-0000-0000-0000-000000000001','active','medium',true,365,
       '2025-03-01','2026-03-01','2025-02-20'),

      -- Laboratory
      ('50000000-0000-0000-0000-000000000010','DEV-010','AST-010','CEN500-010',
       'Centrifuge CF-500',             '20000000-0000-0000-0000-000000000008', 'LabTech Solutions',  'CF-500',
       '2021-09-01','2021-09-15','2024-09-01','10000000-0000-0000-0000-000000000005','Lab Room A',
       '30000000-0000-0000-0000-000000000004','active','medium',true,180,
       '2025-05-01','2025-11-01','2025-04-20'),

      ('50000000-0000-0000-0000-000000000011','DEV-011','AST-011','ANA600-011',
       'Hematology Analyzer HA-600',   '20000000-0000-0000-0000-000000000011', 'LabMed',             'HA-600',
       '2022-06-01','2022-06-20','2025-06-01','10000000-0000-0000-0000-000000000005','Lab Room B',
       '30000000-0000-0000-0000-000000000004','active','high',true,90,
       '2025-06-01','2025-09-01','2025-05-15'),

      -- UNDER MAINTENANCE (for demo)
      ('50000000-0000-0000-0000-000000000012','DEV-012','AST-012','AUT300-012',
       'Autoclave AT-300',              '20000000-0000-0000-0000-000000000012', 'SteriMed',           'AT-300',
       '2020-03-01','2020-04-01','2023-03-01','10000000-0000-0000-0000-000000000006','OT Sterilization',
       '30000000-0000-0000-0000-000000000002','under_maintenance','high',true,365,
       '2024-08-01','2025-08-01','2025-01-10'),

      ('50000000-0000-0000-0000-000000000013','DEV-013','AST-013','PM400-013',
       'Patient Monitor Basic',         '20000000-0000-0000-0000-000000000001', 'MedTech Solutions',  'PM-400',
       '2022-07-01','2022-08-01','2025-07-01','10000000-0000-0000-0000-000000000007','Ward B, Bed 12',
       '30000000-0000-0000-0000-000000000002','active','medium',true,365,
       '2025-01-01','2026-01-01','2024-12-15'),

      ('50000000-0000-0000-0000-000000000014','DEV-014','AST-014','POX100-014',
       'Pulse Oximeter PO-100',         '20000000-0000-0000-0000-000000000006', 'OxyMed',             'PO-100',
       '2023-05-01','2023-05-10','2026-05-01','10000000-0000-0000-0000-000000000001','ICU Bed 7',
       '30000000-0000-0000-0000-000000000001','active','medium',true,365,
       '2025-05-01','2026-05-01','2025-04-20'),

      -- DUE SOON (within 7 days)
      ('50000000-0000-0000-0000-000000000015','DEV-015','AST-015','MIC200-015',
       'Microscope MC-200',             '20000000-0000-0000-0000-000000000009', 'OpticsLab',          'MC-200',
       '2021-11-01','2021-12-01','2024-11-01','10000000-0000-0000-0000-000000000005','Lab Room C',
       '30000000-0000-0000-0000-000000000004','active','low',true,365,
       '2024-08-28','2025-08-28','2025-02-10'),

      ('50000000-0000-0000-0000-000000000016','DEV-016','AST-016','SPT400-016',
       'Spectrophotometer SP-400',      '20000000-0000-0000-0000-000000000010', 'SpectraMed',         'SP-400',
       '2022-02-01','2022-03-01','2025-02-01','10000000-0000-0000-0000-000000000005','Lab Room D',
       '30000000-0000-0000-0000-000000000004','active','medium',true,180,
       '2025-02-28','2025-08-28','2025-02-25'),

      ('50000000-0000-0000-0000-000000000017','DEV-017','AST-017','INF350-017',
       'Infusion Pump IP-350',          '20000000-0000-0000-0000-000000000003', 'FlowMed',            'IP-350',
       '2023-08-01','2023-08-15','2026-08-01','10000000-0000-0000-0000-000000000009','Neurology Ward',
       '30000000-0000-0000-0000-000000000001','active','high',true,365,
       '2024-08-27','2025-08-27','2025-01-05'),

      -- NICU devices
      ('50000000-0000-0000-0000-000000000018','DEV-018','AST-018','PM600-018',
       'Neonatal Monitor NM-600',       '20000000-0000-0000-0000-000000000001', 'NeoMed',             'NM-600',
       '2023-09-01','2023-10-01','2026-09-01','10000000-0000-0000-0000-000000000010','NICU Bay 1',
       '30000000-0000-0000-0000-000000000001','active','critical',true,90,
       '2025-06-01','2025-09-01','2025-05-28'),

      ('50000000-0000-0000-0000-000000000019','DEV-019','AST-019','VNT400-019',
       'Neonatal Ventilator NV-400',    '20000000-0000-0000-0000-000000000004', 'PneumaTech',         'NV-400',
       '2023-11-01','2023-12-01','2026-11-01','10000000-0000-0000-0000-000000000010','NICU Bay 2',
       '30000000-0000-0000-0000-000000000001','active','critical',true,90,
       '2025-06-01','2025-09-01','2025-05-20'),

      -- Retired device
      ('50000000-0000-0000-0000-000000000020','DEV-020','AST-020','ECG08-020',
       'ECG Machine ECG-08 (Legacy)',   '20000000-0000-0000-0000-000000000002', 'CardioTech',         'ECG-08',
       '2015-01-01','2015-02-01','2018-01-01','10000000-0000-0000-0000-000000000004','Storage Room',
       NULL,'retired','low',false,NULL,NULL,NULL,NULL)
    `);
    console.log('✅ Devices seeded (20 devices)');

    // ─── Calibrations ─────────────────────────────────────────────────────────
    await client.query(`
      INSERT INTO calibrations (device_id, calibration_date, previous_calibration_date,
        next_calibration_due_date, calibration_frequency_days, technician_id,
        calibration_standard, reference_equipment, accuracy, tolerance,
        certificate_number, result, status, created_by_id)
      VALUES
      -- Patient Monitor Pro - Passed
      ('50000000-0000-0000-0000-000000000001','2025-07-01','2025-01-01','2026-01-01',180,
       '30000000-0000-0000-0000-000000000001','ISO 80601-2-61','Fluke Biomedical ProSim 8',
       99.2,0.5,'CAL-2025-001','All parameters within specification','passed','40000000-0000-0000-0000-000000000002'),

      -- Ventilator - Passed (recent)
      ('50000000-0000-0000-0000-000000000002','2025-06-01','2025-03-01','2025-09-01',90,
       '30000000-0000-0000-0000-000000000001','ISO 10651-3','Fluke VT Plus HF Tester',
       98.8,1.0,'CAL-2025-002','Tidal volume, flow rate, pressure within tolerance','passed','40000000-0000-0000-0000-000000000002'),

      -- Infusion Pump - Passed
      ('50000000-0000-0000-0000-000000000003','2024-12-01','2023-12-01','2025-12-01',365,
       '30000000-0000-0000-0000-000000000002','IEC 60601-2-24','Fluke IV Pump Analyzer',
       99.5,0.5,'CAL-2024-045','Flow rate accuracy verified within ±2%','passed','40000000-0000-0000-0000-000000000002'),

      -- Defibrillator - Due soon (Aug 2025)
      ('50000000-0000-0000-0000-000000000004','2025-05-01','2025-02-01','2025-08-01',90,
       '30000000-0000-0000-0000-000000000001','IEC 60601-2-4','Defibcheck Plus',
       99.0,1.0,'CAL-2025-010','Energy delivery accurate, sync verified','passed','40000000-0000-0000-0000-000000000002'),

      -- BP Monitor - OVERDUE (next was June 2025, now past)
      ('50000000-0000-0000-0000-000000000006','2024-12-01','2024-06-01','2025-06-01',180,
       '30000000-0000-0000-0000-000000000002','AAMI/ISO 81060-2','Calibrated Reference Manometer',
       97.5,2.0,'CAL-2024-089','Systolic/Diastolic within 5mmHg','passed','40000000-0000-0000-0000-000000000002'),

      -- Hematology Analyzer - upcoming
      ('50000000-0000-0000-0000-000000000011','2025-06-01','2025-03-01','2025-09-01',90,
       '30000000-0000-0000-0000-000000000004','CLSI H26-A2','Certified Control Samples',
       98.5,1.5,'CAL-2025-022','CBC parameters within acceptable limits','passed','40000000-0000-0000-0000-000000000002')
    `);
    console.log('✅ Calibrations seeded');

    // ─── Calibration Measurements ─────────────────────────────────────────────
    await client.query(`
      INSERT INTO calibration_measurements
        (calibration_id, parameter_name, nominal_value, measured_value, unit, deviation, within_tolerance)
      SELECT c.id, 'Heart Rate', 80, 80.2, 'bpm', 0.2, true
      FROM calibrations c JOIN devices d ON c.device_id = d.id WHERE d.device_id = 'DEV-001' LIMIT 1;

      INSERT INTO calibration_measurements
        (calibration_id, parameter_name, nominal_value, measured_value, unit, deviation, within_tolerance)
      SELECT c.id, 'SpO2', 98.0, 97.8, '%', -0.2, true
      FROM calibrations c JOIN devices d ON c.device_id = d.id WHERE d.device_id = 'DEV-001' LIMIT 1;

      INSERT INTO calibration_measurements
        (calibration_id, parameter_name, nominal_value, measured_value, unit, deviation, within_tolerance)
      SELECT c.id, 'NIBP Systolic', 120, 119.5, 'mmHg', -0.5, true
      FROM calibrations c JOIN devices d ON c.device_id = d.id WHERE d.device_id = 'DEV-001' LIMIT 1;
    `);
    console.log('✅ Calibration measurements seeded');

    // ─── Maintenance Records ──────────────────────────────────────────────────
    await client.query(`
      INSERT INTO maintenance_records (device_id, maintenance_type, priority,
        request_date, scheduled_date, start_date, completion_date, technician_id,
        problem_description, work_performed, parts_replaced, cost, downtime_hours,
        result, status, created_by_id)
      VALUES
      -- Autoclave - ongoing corrective
      ('50000000-0000-0000-0000-000000000012','corrective','high',
       '2025-08-15','2025-08-20','2025-08-20',NULL,'30000000-0000-0000-0000-000000000002',
       'Steam pressure not reaching required levels during sterilization cycle',
       'Inspecting pressure relief valve and heating element',NULL,NULL,NULL,
       NULL,'in_progress','40000000-0000-0000-0000-000000000002'),

      -- Ventilator - preventive completed
      ('50000000-0000-0000-0000-000000000002','preventive','medium',
       '2025-05-10','2025-05-20','2025-05-20','2025-05-22','30000000-0000-0000-0000-000000000001',
       'Scheduled 90-day preventive maintenance',
       'Cleaned filters, lubricated moving parts, checked sensor calibration, tested all alarms',
       'Air inlet filter set, O2 sensor',12500.00,2.0,
       'All checks passed. Device operational','completed','40000000-0000-0000-0000-000000000002'),

      -- Patient Monitor - preventive completed
      ('50000000-0000-0000-0000-000000000001','preventive','medium',
       '2025-06-10','2025-06-15','2025-06-15','2025-06-16','30000000-0000-0000-0000-000000000001',
       'Scheduled 6-month preventive maintenance',
       'Cleaned display, replaced SpO2 probe, tested all parameters, verified alarm limits',
       'SpO2 finger probe',3500.00,1.5,
       'All parameters verified within spec','completed','40000000-0000-0000-0000-000000000002'),

      -- Defibrillator - inspection completed
      ('50000000-0000-0000-0000-000000000004','inspection','high',
       '2025-04-01','2025-04-10','2025-04-10','2025-04-10','30000000-0000-0000-0000-000000000001',
       'Monthly safety inspection',
       'Tested energy delivery at 50J, 100J, 200J, 360J. Verified pacing output. Battery status check.',
       NULL,1500.00,0.5,
       'Device fully functional, battery at 85%','completed','40000000-0000-0000-0000-000000000002'),

      -- X-Ray - scheduled preventive
      ('50000000-0000-0000-0000-000000000007','preventive','medium',
       '2025-08-01','2025-09-01',NULL,NULL,'30000000-0000-0000-0000-000000000003',
       'Annual preventive maintenance for X-ray unit',
       NULL,NULL,NULL,NULL,NULL,'scheduled','40000000-0000-0000-0000-000000000002'),

      -- Centrifuge - corrective completed
      ('50000000-0000-0000-0000-000000000010','corrective','medium',
       '2025-03-15','2025-03-20','2025-03-20','2025-03-21','30000000-0000-0000-0000-000000000004',
       'Unusual vibration at high RPM. Suspected rotor imbalance.',
       'Inspected and replaced worn rotor bearing. Performed balance test at full speed.',
       'Rotor bearing set',8200.00,4.0,
       'Vibration resolved. Operating within normal parameters','completed','40000000-0000-0000-0000-000000000002')
    `);
    console.log('✅ Maintenance records seeded');

    // ─── Maintenance Requests ─────────────────────────────────────────────────
    await client.query(`
      INSERT INTO maintenance_requests (device_id, requester_id, department_id,
        problem_description, priority, request_date, status)
      VALUES
      ('50000000-0000-0000-0000-000000000006','40000000-0000-0000-0000-000000000003',
       '10000000-0000-0000-0000-000000000002',
       'Blood pressure readings appear inconsistent. Getting different values on repeat measurements.',
       'high', '2025-08-25', 'requested'),

      ('50000000-0000-0000-0000-000000000013','40000000-0000-0000-0000-000000000003',
       '10000000-0000-0000-0000-000000000007',
       'Display flickering on Patient Monitor in Ward B. Intermittent screen blackouts.',
       'medium','2025-08-20','approved'),

      ('50000000-0000-0000-0000-000000000010','40000000-0000-0000-0000-000000000003',
       '10000000-0000-0000-0000-000000000005',
       'Centrifuge making unusual noise again at 3000 RPM.',
       'high','2025-08-22','requested')
    `);
    console.log('✅ Maintenance requests seeded');

    // ─── Notifications ────────────────────────────────────────────────────────
    await client.query(`
      INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, is_read)
      VALUES
      ('40000000-0000-0000-0000-000000000002',
       'calibration_overdue','Calibration Overdue: BP Monitor BP-200',
       'Blood Pressure Monitor BP-200 (AST-006) calibration was due on 2025-06-01 and is now overdue.',
       'device','50000000-0000-0000-0000-000000000006',false),

      ('40000000-0000-0000-0000-000000000002',
       'calibration_due_7','Calibration Due: Defibrillator DF-900',
       'Defibrillator DF-900 (AST-004) calibration is due on 2025-08-01.',
       'device','50000000-0000-0000-0000-000000000004',false),

      ('40000000-0000-0000-0000-000000000001',
       'maintenance_request_assigned','New Maintenance Request',
       'A new maintenance request has been submitted for Blood Pressure Monitor BP-200.',
       'maintenance_request',NULL,false),

      ('40000000-0000-0000-0000-000000000002',
       'calibration_due_30','Calibration Due in 30 Days: Ventilator VN-700',
       'Ventilator VN-700 (AST-002) calibration is due on 2025-09-01.',
       'device','50000000-0000-0000-0000-000000000002',true)
    `);
    console.log('✅ Notifications seeded');

    // ─── Audit Logs ───────────────────────────────────────────────────────────
    await client.query(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
      VALUES
      ('40000000-0000-0000-0000-000000000001','USER_CREATED','user','40000000-0000-0000-0000-000000000002',
       '{"email":"tech@hospital.com","role":"technician"}'),
      ('40000000-0000-0000-0000-000000000001','DEVICE_CREATED','device','50000000-0000-0000-0000-000000000001',
       '{"name":"Patient Monitor Pro","deviceId":"DEV-001"}'),
      ('40000000-0000-0000-0000-000000000002','CALIBRATION_CREATED','calibration',NULL,
       '{"deviceId":"50000000-0000-0000-0000-000000000001","status":"passed"}'),
      ('40000000-0000-0000-0000-000000000001','DEPARTMENT_CREATED','department','10000000-0000-0000-0000-000000000001',
       '{"name":"Intensive Care Unit","code":"ICU"}')
    `);
    console.log('✅ Audit logs seeded');

    console.log('\n🎉 Database seeded successfully!\n');
    console.log('Development Login Credentials:');
    console.log('  Admin:     admin@hospital.com   / Admin@123');
    console.log('  Tech:      tech@hospital.com    / Tech@123');
    console.log('  Staff:     staff@hospital.com   / Staff@123');
    console.log('  Auditor:   auditor@hospital.com / Audit@123\n');
  } catch (err) {
    console.error('❌ Seed failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
