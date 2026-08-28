import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, ToastContainer } from './context/ToastContext';
import MainLayout from './layouts/MainLayout';
import { PageLoader } from './components/ui';
import './index.css';

// ── Lazy-loaded pages — one broken page won't crash the whole app ─────────────
const LoginPage              = lazy(() => import('./pages/Login'));
const DashboardPage          = lazy(() => import('./pages/Dashboard'));
const DevicesPage            = lazy(() => import('./pages/Devices'));
const DeviceDetailPage       = lazy(() => import('./pages/DeviceDetail'));
const DeviceFormPage         = lazy(() => import('./pages/DeviceForm'));
const CalibrationsPage       = lazy(() => import('./pages/Calibrations'));
const CalibrationDetailPage  = lazy(() => import('./pages/CalibrationDetail'));
const CalibrationFormPage    = lazy(() => import('./pages/CalibrationForm'));
const MaintenancePage        = lazy(() => import('./pages/Maintenance'));
const MaintenanceFormPage    = lazy(() => import('./pages/MaintenanceForm'));
const MaintenanceRequestsPage = lazy(() => import('./pages/MaintenanceRequests'));
const TechniciansPage        = lazy(() => import('./pages/Technicians'));
const NotificationsPage      = lazy(() => import('./pages/Notifications'));
const CompliancePage         = lazy(() => import('./pages/Compliance'));
const ReportsPage            = lazy(() => import('./pages/Reports'));
const AuditLogsPage          = lazy(() => import('./pages/AuditLogs'));

// ── Protected Route ───────────────────────────────────────────────────────────
function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

// ── App ───────────────────────────────────────────────────────────────────────
function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              {/* Protected — main layout */}
              <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
                <Route path="/dashboard"            element={<DashboardPage />} />
                <Route path="/devices"              element={<DevicesPage />} />
                <Route path="/devices/new"          element={<ProtectedRoute roles={['admin','technician']}><DeviceFormPage mode="create" /></ProtectedRoute>} />
                <Route path="/devices/:id"          element={<DeviceDetailPage />} />
                <Route path="/devices/:id/edit"     element={<ProtectedRoute roles={['admin','technician']}><DeviceFormPage mode="edit" /></ProtectedRoute>} />
                <Route path="/calibrations"         element={<CalibrationsPage />} />
                <Route path="/calibrations/new"     element={<ProtectedRoute roles={['admin','technician']}><CalibrationFormPage /></ProtectedRoute>} />
                <Route path="/calibrations/:id"     element={<CalibrationDetailPage />} />
                <Route path="/maintenance"          element={<MaintenancePage />} />
                <Route path="/maintenance/new"      element={<ProtectedRoute roles={['admin','technician']}><MaintenanceFormPage /></ProtectedRoute>} />
                <Route path="/maintenance-requests" element={<MaintenanceRequestsPage />} />
                <Route path="/technicians"          element={<ProtectedRoute roles={['admin','auditor']}><TechniciansPage /></ProtectedRoute>} />
                <Route path="/notifications"        element={<NotificationsPage />} />
                <Route path="/compliance"           element={<CompliancePage />} />
                <Route path="/reports"              element={<ReportsPage />} />
                <Route path="/audit-logs"           element={<ProtectedRoute roles={['admin','auditor']}><AuditLogsPage /></ProtectedRoute>} />
              </Route>

              {/* 404 fallback */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
          <ToastContainer />
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

// ── Mount ─────────────────────────────────────────────────────────────────────
const rootEl = document.getElementById('root');
if (!rootEl) {
  document.body.innerHTML = '<div style="padding:20px;color:red">ERROR: #root element not found</div>';
} else {
  try {
    ReactDOM.createRoot(rootEl).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (e) {
    rootEl.innerHTML = `<div style="padding:32px;font-family:monospace;color:#dc2626;background:#fff1f2;min-height:100vh">
      <h1 style="font-size:20px;margin-bottom:12px">⚠️ Startup Error</h1>
      <pre style="font-size:13px;white-space:pre-wrap">${e instanceof Error ? e.message + '\n' + e.stack : String(e)}</pre>
    </div>`;
  }
}
