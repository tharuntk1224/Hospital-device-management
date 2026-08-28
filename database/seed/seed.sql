-- =============================================================================
-- Seed Data for Biomedical Device Management System
-- Development use only — fictional data
-- =============================================================================

-- Truncate all tables (cascade)
TRUNCATE TABLE audit_logs, notifications, maintenance_requests, maintenance_records,
               calibration_measurements, calibrations, devices, technicians, users,
               device_categories, departments RESTART IDENTITY CASCADE;

-- =============================================================================
-- DEPARTMENTS
-- =============================================================================
INSERT INTO departments (id, name, code, description, head_name, phone) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Intensive Care Unit',       'ICU',    'Critical care for severely ill patients',           'Dr. Priya Sharma',    '040-2345-1001'),
  ('10000000-0000-0000-0000-000000000002', 'Emergency Department',      'ED',     'Emergency and trauma services',                     'Dr. Ravi Kumar',      '040-2345-1002'),
  ('10000000-0000-0000-0000-000000000003', 'Radiology',                 'RAD',    'Medical imaging and diagnostic radiology',          'Dr. Anita Singh',     '040-2345-1003'),
  ('10000000-0000-0000-0000-000000000004', 'Cardiology',                'CARD',   'Heart and cardiovascular diseases',                 'Dr. Suresh Patel',    '040-2345-1004'),
  ('10000000-0000-0000-0000-000000000005', 'Laboratory',                'LAB',    'Clinical laboratory and diagnostics',               'Dr. Meena Iyer',      '040-2345-1005'),
  ('10000000-0000-0000-0000-000000000006', 'Operation Theatre',         'OT',     'Surgical procedures and operations',                'Dr. Arun Nair',       '040-2345-1006'),
  ('10000000-0000-0000-0000-000000000007', 'General Ward',              'GW',     'General patient admission and care',                'Sister Lakshmi Devi', '040-2345-1007'),
  ('10000000-0000-0000-0000-000000000008', 'Biomedical Engineering',    'BME',    'Biomedical equipment management and maintenance',   'Eng. Kiran Reddy',    '040-2345-1008'),
  ('10000000-0000-0000-0000-000000000009', 'Neurology',                 'NEURO',  'Nervous system disorders and treatment',            'Dr. Deepa Menon',     '040-2345-1009'),
  ('10000000-0000-0000-0000-000000000010', 'Neonatology',               'NICU',   'Newborn intensive care',                            'Dr. Harish Babu',     '040-2345-1010');

-- =============================================================================
-- DEVICE CATEGORIES
-- =============================================================================
INSERT INTO device_categories (id, name, description) VALUES
  ('20000000-0000-0000-0000-000000000001', 'Patient Monitor',         'Multi-parameter patient monitoring systems'),
  ('20000000-0000-0000-0000-000000000002', 'ECG Machine',             'Electrocardiograph for cardiac monitoring'),
  ('20000000-0000-0000-0000-000000000003', 'Infusion Pump',           'Controlled intravenous fluid delivery'),
  ('20000000-0000-0000-0000-000000000004', 'Ventilator',              'Mechanical respiratory support devices'),
  ('20000000-0000-0000-0000-000000000005', 'Defibrillator',           'Cardiac defibrillation and pacing'),
  ('20000000-0000-0000-0000-000000000006', 'Pulse Oximeter',          'Blood oxygen saturation monitoring'),
  ('20000000-0000-0000-0000-000000000007', 'Blood Pressure Monitor',  'Non-invasive blood pressure measurement'),
  ('20000000-0000-0000-0000-000000000008', 'Centrifuge',              'Laboratory sample centrifugation'),
  ('20000000-0000-0000-0000-000000000009', 'Microscope',              'Biological and clinical microscopy'),
  ('20000000-0000-0000-0000-000000000010', 'Spectrophotometer',       'Quantitative analysis using light absorbance'),
  ('20000000-0000-0000-0000-000000000011', 'Analyzer',                'Clinical chemistry and hematology analyzers'),
  ('20000000-0000-0000-0000-000000000012', 'Autoclave',               'Steam sterilization equipment'),
  ('20000000-0000-0000-0000-000000000013', 'Ultrasound Machine',      'Diagnostic ultrasound imaging'),
  ('20000000-0000-0000-0000-000000000014', 'X-Ray Machine',           'Diagnostic X-ray radiography'),
  ('20000000-0000-0000-0000-000000000015', 'Other',                   'Miscellaneous biomedical equipment');

-- =============================================================================
-- USERS (passwords pre-hashed with bcrypt rounds=12)
-- Admin@123  → $2b$12$...
-- Tech@123   → $2b$12$...
-- Staff@123  → $2b$12$...
-- Audit@123  → $2b$12$...
-- All hashes generated at seed time by the run_seed.ts script
-- =============================================================================

-- =============================================================================
-- TECHNICIANS
-- =============================================================================
INSERT INTO technicians (id, employee_id, first_name, last_name, email, phone,
                         specialization, department_id, certification, certification_expiry, status)
VALUES
  ('30000000-0000-0000-0000-000000000001', 'EMP-T001', 'Rajesh',   'Varma',    'rajesh.varma@hospital.com',  '9876543210',
   'Biomedical Equipment Calibration', '10000000-0000-0000-0000-000000000008',
   'ISO 17025 Calibration Technician', '2027-06-30', 'active'),

  ('30000000-0000-0000-0000-000000000002', 'EMP-T002', 'Sunita',   'Krishnan', 'sunita.k@hospital.com',      '9876543211',
   'Biomedical Maintenance & Repair',  '10000000-0000-0000-0000-000000000008',
   'CBET Certified Biomedical Tech',   '2026-12-31', 'active'),

  ('30000000-0000-0000-0000-000000000003', 'EMP-T003', 'Mohan',    'Das',      'mohan.das@hospital.com',     '9876543212',
   'Imaging Equipment Specialist',     '10000000-0000-0000-0000-000000000003',
   'Radiology Equipment Technician',   '2027-03-31', 'active'),

  ('30000000-0000-0000-0000-000000000004', 'EMP-T004', 'Preethi',  'Nair',     'preethi.n@hospital.com',     '9876543213',
   'Laboratory Equipment Calibration', '10000000-0000-0000-0000-000000000005',
   'Lab Equipment Specialist',         '2026-09-30', 'on_leave');
