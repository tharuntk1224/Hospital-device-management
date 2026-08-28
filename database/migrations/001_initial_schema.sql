-- =============================================================================
-- Biomedical Device Calibration & Maintenance Management System
-- Initial Schema Migration
-- =============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- DEPARTMENTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS departments (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name          VARCHAR(100) NOT NULL UNIQUE,
    code          VARCHAR(20)  NOT NULL UNIQUE,
    description   TEXT,
    head_name     VARCHAR(100),
    phone         VARCHAR(20),
    is_active     BOOLEAN NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- DEVICE CATEGORIES
-- =============================================================================
CREATE TABLE IF NOT EXISTS device_categories (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name          VARCHAR(100) NOT NULL UNIQUE,
    description   TEXT,
    is_active     BOOLEAN NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- USERS
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    role            VARCHAR(20)  NOT NULL CHECK (role IN ('admin','technician','staff','auditor')),
    department_id   UUID REFERENCES departments(id) ON DELETE SET NULL,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role  ON users(role);

-- =============================================================================
-- TECHNICIANS
-- =============================================================================
CREATE TABLE IF NOT EXISTS technicians (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id              UUID REFERENCES users(id) ON DELETE SET NULL,
    employee_id          VARCHAR(50)  NOT NULL UNIQUE,
    first_name           VARCHAR(100) NOT NULL,
    last_name            VARCHAR(100) NOT NULL,
    email                VARCHAR(255) NOT NULL UNIQUE,
    phone                VARCHAR(20),
    specialization       VARCHAR(200),
    department_id        UUID REFERENCES departments(id) ON DELETE SET NULL,
    certification        VARCHAR(200),
    certification_expiry DATE,
    status               VARCHAR(20) NOT NULL DEFAULT 'active'
                             CHECK (status IN ('active','inactive','on_leave')),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_technicians_status ON technicians(status);

-- =============================================================================
-- DEVICES
-- =============================================================================
CREATE TABLE IF NOT EXISTS devices (
    id                         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id                  VARCHAR(50)  NOT NULL UNIQUE,
    asset_number               VARCHAR(50)  NOT NULL UNIQUE,
    serial_number              VARCHAR(100) NOT NULL,
    name                       VARCHAR(200) NOT NULL,
    category_id                UUID NOT NULL REFERENCES device_categories(id) ON DELETE RESTRICT,
    manufacturer               VARCHAR(100) NOT NULL,
    model                      VARCHAR(100) NOT NULL,
    purchase_date              DATE,
    installation_date          DATE,
    warranty_expiry            DATE,
    department_id              UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    location                   VARCHAR(200),
    technician_id              UUID REFERENCES technicians(id) ON DELETE SET NULL,
    status                     VARCHAR(20) NOT NULL DEFAULT 'active'
                                   CHECK (status IN ('active','under_maintenance','out_of_service','retired','lost')),
    risk_level                 VARCHAR(20) NOT NULL DEFAULT 'medium'
                                   CHECK (risk_level IN ('low','medium','high','critical')),
    calibration_required       BOOLEAN NOT NULL DEFAULT true,
    calibration_frequency_days INTEGER CHECK (calibration_frequency_days > 0),
    last_calibration_date      DATE,
    next_calibration_date      DATE,
    last_maintenance_date      DATE,
    next_maintenance_date      DATE,
    description                TEXT,
    notes                      TEXT,
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_devices_department   ON devices(department_id);
CREATE INDEX IF NOT EXISTS idx_devices_category     ON devices(category_id);
CREATE INDEX IF NOT EXISTS idx_devices_status       ON devices(status);
CREATE INDEX IF NOT EXISTS idx_devices_cal_date     ON devices(next_calibration_date);
CREATE INDEX IF NOT EXISTS idx_devices_technician   ON devices(technician_id);

-- =============================================================================
-- CALIBRATIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS calibrations (
    id                         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id                  UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    calibration_date           DATE,
    previous_calibration_date  DATE,
    next_calibration_due_date  DATE,
    calibration_frequency_days INTEGER,
    technician_id              UUID REFERENCES technicians(id) ON DELETE SET NULL,
    calibration_standard       VARCHAR(200),
    reference_equipment        VARCHAR(200),
    accuracy                   NUMERIC(8,4),
    tolerance                  NUMERIC(8,4),
    result                     VARCHAR(500),
    certificate_number         VARCHAR(100),
    remarks                    TEXT,
    status                     VARCHAR(20) NOT NULL DEFAULT 'scheduled'
                                   CHECK (status IN ('scheduled','in_progress','passed','failed','overdue','cancelled')),
    created_by_id              UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calibrations_device     ON calibrations(device_id);
CREATE INDEX IF NOT EXISTS idx_calibrations_technician ON calibrations(technician_id);
CREATE INDEX IF NOT EXISTS idx_calibrations_status     ON calibrations(status);
CREATE INDEX IF NOT EXISTS idx_calibrations_date       ON calibrations(calibration_date);

-- =============================================================================
-- CALIBRATION MEASUREMENTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS calibration_measurements (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    calibration_id   UUID NOT NULL REFERENCES calibrations(id) ON DELETE CASCADE,
    parameter_name   VARCHAR(200) NOT NULL,
    nominal_value    NUMERIC(12,6),
    measured_value   NUMERIC(12,6) NOT NULL,
    unit             VARCHAR(50),
    deviation        NUMERIC(12,6),
    within_tolerance BOOLEAN NOT NULL DEFAULT true,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cal_measurements_cal ON calibration_measurements(calibration_id);

-- =============================================================================
-- MAINTENANCE RECORDS
-- =============================================================================
CREATE TABLE IF NOT EXISTS maintenance_records (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id           UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    maintenance_type    VARCHAR(20) NOT NULL
                            CHECK (maintenance_type IN ('preventive','corrective','emergency','inspection')),
    priority            VARCHAR(20) NOT NULL DEFAULT 'medium'
                            CHECK (priority IN ('low','medium','high','critical')),
    request_date        DATE,
    scheduled_date      DATE,
    start_date          DATE,
    completion_date     DATE,
    technician_id       UUID REFERENCES technicians(id) ON DELETE SET NULL,
    problem_description TEXT,
    work_performed      TEXT,
    parts_replaced      TEXT,
    cost                NUMERIC(12,2),
    downtime_hours      NUMERIC(6,2),
    result              VARCHAR(500),
    remarks             TEXT,
    status              VARCHAR(20) NOT NULL DEFAULT 'scheduled'
                            CHECK (status IN ('requested','approved','scheduled','in_progress','completed','cancelled')),
    created_by_id       UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maint_device     ON maintenance_records(device_id);
CREATE INDEX IF NOT EXISTS idx_maint_technician ON maintenance_records(technician_id);
CREATE INDEX IF NOT EXISTS idx_maint_status     ON maintenance_records(status);
CREATE INDEX IF NOT EXISTS idx_maint_type       ON maintenance_records(maintenance_type);

-- =============================================================================
-- MAINTENANCE REQUESTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS maintenance_requests (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id            UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    requester_id         UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    department_id        UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    problem_description  TEXT NOT NULL,
    priority             VARCHAR(20) NOT NULL DEFAULT 'medium'
                             CHECK (priority IN ('low','medium','high','critical')),
    request_date         DATE NOT NULL DEFAULT CURRENT_DATE,
    status               VARCHAR(20) NOT NULL DEFAULT 'requested'
                             CHECK (status IN ('requested','approved','scheduled','in_progress','completed','cancelled')),
    maintenance_record_id UUID REFERENCES maintenance_records(id) ON DELETE SET NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maint_req_device ON maintenance_requests(device_id);
CREATE INDEX IF NOT EXISTS idx_maint_req_status ON maintenance_requests(status);

-- =============================================================================
-- NOTIFICATIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS notifications (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        VARCHAR(50) NOT NULL,
    title       VARCHAR(300) NOT NULL,
    message     TEXT NOT NULL,
    entity_type VARCHAR(50),
    entity_id   UUID,
    is_read     BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user   ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);

-- =============================================================================
-- AUDIT LOGS
-- =============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
    action       VARCHAR(100) NOT NULL,
    entity_type  VARCHAR(50)  NOT NULL,
    entity_id    UUID,
    old_values   JSONB,
    new_values   JSONB,
    ip_address   INET,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_user       ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity     ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_action     ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at DESC);

-- =============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['departments','device_categories','users','technicians',
                              'devices','calibrations','maintenance_records',
                              'maintenance_requests']
    LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS set_updated_at ON %I;
             CREATE TRIGGER set_updated_at
             BEFORE UPDATE ON %I
             FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
            t, t
        );
    END LOOP;
END;
$$;
