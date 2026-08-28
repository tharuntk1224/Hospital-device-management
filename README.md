# 🏥 Biomedical Device Calibration & Maintenance Management System

A production-quality full-stack web application for hospitals and medical laboratories to manage biomedical devices, calibration schedules, maintenance records, technicians, and compliance documentation.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Backend | Node.js + Express.js + TypeScript |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| API | REST |
| Containerization | Docker + Docker Compose |

---

## Quick Start

### Option 1: Docker (Recommended)

```bash
# Start all services (PostgreSQL, Redis, API, Frontend)
docker compose up -d

# View logs
docker compose logs -f

# Open app
open http://localhost
open http://localhost:3001/api/docs  # Swagger API docs
```

### Option 2: Local Development

**Prerequisites:** Node.js 20+, PostgreSQL 16, Redis 7

```bash
# 1. Install all dependencies
npm run install:all

# 2. Configure environment
cp .env.example .env
# Edit .env with your database and Redis credentials

# 3. Start PostgreSQL + Redis (via Docker)
docker compose up postgres redis -d

# 4. Run database migration
npm run db:migrate

# 5. Seed with demo data
npm run db:seed

# 6. Start both servers simultaneously
npm run dev
```

The app will be available at:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001/api
- **Swagger Docs:** http://localhost:3001/api/docs

---

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@hospital.com | Admin@123 |
| **Technician** | tech@hospital.com | Tech@123 |
| **Staff** | staff@hospital.com | Staff@123 |
| **Auditor** | auditor@hospital.com | Audit@123 |

---

## Project Structure

```
tkd-project/
├── client/               # React frontend
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── context/      # Auth & Toast context
│   │   ├── layouts/      # Sidebar, TopNav, MainLayout
│   │   ├── pages/        # All page components
│   │   ├── services/     # API service modules
│   │   └── types/        # TypeScript type definitions
│   └── Dockerfile
├── server/               # Node.js backend
│   ├── src/
│   │   ├── config/       # DB, Redis, env configuration
│   │   ├── controllers/  # Route handler logic
│   │   ├── middleware/   # Auth, RBAC, error handling, rate limiting
│   │   ├── routes/       # Express route definitions
│   │   ├── types/        # TypeScript interfaces
│   │   ├── utils/        # Helpers (response, pagination, calibration status)
│   │   └── validators/   # Zod request validators
│   └── Dockerfile
├── database/
│   ├── migrations/       # SQL schema migrations
│   └── seed/             # Demo data seed scripts
├── docker-compose.yml
└── .env
```

---

## Features

### 🔬 Device Management
- Register biomedical devices with full specifications
- Track device status (Active / Under Maintenance / Out of Service / Retired)
- Risk level classification (Low / Medium / High / Critical)
- Device assignment to departments and technicians

### 📐 Calibration Management
- Schedule and record calibrations with measurement data
- Dynamic calibration due status (Valid / Due Soon / Due Today / Overdue)
- Certificate number tracking
- Calibration compliance dashboard

### 🔧 Maintenance Management
- Preventive, corrective, emergency, and inspection maintenance
- Maintenance request workflow (Request → Approve → Schedule → Complete)
- Cost and downtime tracking
- Automatic device status synchronization

### 📊 Dashboard & Analytics
- Real-time compliance percentage gauge
- Recharts visualizations (pie, bar, line charts)
- Upcoming calibration alerts
- Maintenance activity trends

### 📋 Compliance & Reports
- Calibration compliance rate monitoring
- Device inventory, calibration, and maintenance CSV exports
- Regulatory risk indicators

### 🔐 Security
- JWT-based authentication (access + refresh tokens)
- Role-Based Access Control (Admin / Technician / Staff / Auditor)
- Redis-backed rate limiting
- Helmet + CORS security headers
- Comprehensive audit logging

---

## API Documentation

Interactive Swagger UI is available at: **http://localhost:3001/api/docs**

Key API endpoints:

```
POST   /api/auth/login              Login
GET    /api/auth/me                 Current user
GET    /api/dashboard/statistics    Dashboard stats (cached)
GET    /api/dashboard/compliance    Compliance data (cached)
GET    /api/devices                 List devices (filterable)
POST   /api/devices                 Create device
GET    /api/calibrations            List calibrations
POST   /api/calibrations            Create calibration
GET    /api/maintenance             List maintenance records
GET    /api/reports/devices         Device inventory report
GET    /api/reports/calibration     Calibration report
GET    /api/audit-logs              Audit logs (admin/auditor)
```
