import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, ToastContainer } from './context/ToastContext';
import MainLayout from './layouts/MainLayout';
import { PageLoader } from './components/ui';

// Pages (lazy-loaded for performance)
import LoginPage          from './pages/Login';
import DashboardPage      from './pages/Dashboard';
import DevicesPage        from './pages/Devices';
import DeviceDetailPage   from './pages/DeviceDetail';
import DeviceFormPage     from './pages/DeviceForm';
import CalibrationsPage   from './pages/Calibrations';
import CalibrationDetailPage from './pages/CalibrationDetail';
import CalibrationFormPage from './pages/CalibrationForm';
import MaintenancePage    from './pages/Maintenance';
import MaintenanceFormPage from './pages/MaintenanceForm';
import MaintenanceRequestsPage from './pages/MaintenanceRequests';
import TechniciansPage    from './pages/Technicians';
import NotificationsPage  from './pages/Notifications';
import CompliancePage     from './pages/Compliance';
import ReportsPage        from './pages/Reports';
import AuditLogsPage      from './pages/AuditLogs';

// ─── Protected Route ──────────────────────────────────────────────────────────

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Protected — main layout */}
            <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/devices" element={<DevicesPage />} />
              <Route path="/devices/new" element={
                <ProtectedRoute roles={['admin','technician']}><DeviceFormPage mode="create" /></ProtectedRoute>
              } />
              <Route path="/devices/:id" element={<DeviceDetailPage />} />
              <Route path="/devices/:id/edit" element={
                <ProtectedRoute roles={['admin','technician']}><DeviceFormPage mode="edit" /></ProtectedRoute>
              } />
              <Route path="/calibrations" element={<CalibrationsPage />} />
              <Route path="/calibrations/new" element={
                <ProtectedRoute roles={['admin','technician']}><CalibrationFormPage /></ProtectedRoute>
              } />
              <Route path="/calibrations/:id" element={<CalibrationDetailPage />} />
              <Route path="/maintenance" element={<MaintenancePage />} />
              <Route path="/maintenance/new" element={
                <ProtectedRoute roles={['admin','technician']}><MaintenanceFormPage /></ProtectedRoute>
              } />
              <Route path="/maintenance-requests" element={<MaintenanceRequestsPage />} />
              <Route path="/technicians" element={
                <ProtectedRoute roles={['admin','auditor']}><TechniciansPage /></ProtectedRoute>
              } />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/compliance" element={<CompliancePage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/audit-logs" element={
                <ProtectedRoute roles={['admin','auditor']}><AuditLogsPage /></ProtectedRoute>
              } />
            </Route>

            {/* 404 fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          <ToastContainer />
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
