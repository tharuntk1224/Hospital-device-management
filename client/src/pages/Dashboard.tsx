import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { dashboardService } from '../services';
import { DashboardStats } from '../types';
import { StatCard, PageLoader, ErrorState } from '../components/ui';
import { CalibrationDueBadge } from '../components/ui/Badge';
import { format } from 'date-fns';

const PIE_COLORS = ['#3b82f6','#14b8a6','#f59e0b','#f43f5e','#8b5cf6','#22c55e','#ec4899','#64748b'];

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      const res = await dashboardService.getStats();
      setStats(res.data?.data ?? null);
    } catch {
      setError('Failed to load dashboard statistics');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState message={error} onRetry={fetchStats} />;
  if (!stats) return null;

  const { devices, calibration, maintenance, totalActiveTechnicians, charts, upcomingCalibrations } = stats;

  return (
    <div className="space-y-6">
      {/* ─ Stat Cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Devices"
          value={devices.total}
          icon="🔬"
          iconBg="bg-primary-50 text-primary-600"
          onClick={() => navigate('/devices')}
        />
        <StatCard
          title="Active Devices"
          value={devices.active}
          icon="✅"
          iconBg="bg-success-50 text-success-600"
          accent="text-success-700"
          onClick={() => navigate('/devices?status=active')}
        />
        <StatCard
          title="Overdue Calibrations"
          value={calibration.overdue}
          icon="⚠️"
          iconBg="bg-danger-50 text-danger-600"
          accent={calibration.overdue > 0 ? 'text-danger-600' : 'text-slate-900'}
          onClick={() => navigate('/devices?calibrationStatus=overdue')}
        />
        <StatCard
          title="Due Soon (7 days)"
          value={calibration.dueSoon + calibration.dueToday}
          icon="⏰"
          iconBg="bg-warning-50 text-warning-600"
          accent={calibration.dueSoon + calibration.dueToday > 0 ? 'text-warning-600' : 'text-slate-900'}
          onClick={() => navigate('/devices?calibrationStatus=due_soon')}
        />
        <StatCard
          title="Under Maintenance"
          value={devices.underMaintenance}
          icon="⚙️"
          iconBg="bg-purple-50 text-purple-600"
          onClick={() => navigate('/devices?status=under_maintenance')}
        />
        <StatCard
          title="Completed This Month"
          value={maintenance.completedThisMonth}
          icon="🔧"
          iconBg="bg-success-50 text-success-600"
          onClick={() => navigate('/maintenance?status=completed')}
        />
        <StatCard
          title="Pending Requests"
          value={maintenance.pendingRequests}
          icon="📋"
          iconBg="bg-orange-50 text-orange-600"
          accent={maintenance.pendingRequests > 0 ? 'text-orange-600' : 'text-slate-900'}
          onClick={() => navigate('/maintenance-requests?status=requested')}
        />
        <StatCard
          title="Active Technicians"
          value={totalActiveTechnicians}
          icon="👨‍🔧"
          iconBg="bg-blue-50 text-blue-600"
          onClick={() => navigate('/technicians')}
        />
      </div>

      {/* ─ Compliance Banner ─────────────────────────────────────────────────── */}
      <div className="card p-5 flex flex-col sm:flex-row items-center gap-4">
        <div className="flex-1">
          <p className="text-sm text-slate-500 font-medium">Calibration Compliance</p>
          <p className="text-3xl font-bold text-slate-900 mt-0.5">{calibration.compliancePercent}%</p>
        </div>
        <div className="w-full sm:w-64">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>0%</span>
            <span>100%</span>
          </div>
          <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                calibration.compliancePercent >= 90 ? 'bg-success-500' :
                calibration.compliancePercent >= 70 ? 'bg-warning-500' : 'bg-danger-500'
              }`}
              style={{ width: `${calibration.compliancePercent}%` }}
            />
          </div>
        </div>
        <div className="text-center sm:text-right">
          <p className="text-sm text-slate-500">
            <span className="font-semibold text-success-600">{calibration.valid} valid</span>
            {calibration.overdue > 0 && (
              <span>, <span className="font-semibold text-danger-600">{calibration.overdue} overdue</span></span>
            )}
          </p>
        </div>
      </div>

      {/* ─ Charts Row ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Devices by Department (Pie) */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-slate-800">Devices by Department</h3>
          </div>
          <div className="card-body">
            {charts.devicesByDepartment.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={charts.devicesByDepartment} dataKey="value" nameKey="name"
                       cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) =>
                         `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`
                       } labelLine={false}>
                    {charts.devicesByDepartment.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Devices by Category (Bar) */}
        <div className="card lg:col-span-2">
          <div className="card-header">
            <h3 className="font-semibold text-slate-800">Devices by Category</h3>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={charts.devicesByCategory} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} tickFormatter={(v) => v.split(' ')[0]} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" name="Devices" fill="#3b82f6" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Monthly Maintenance Chart */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-slate-800">Monthly Maintenance Activity (Last 6 Months)</h3>
        </div>
        <div className="card-body">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={charts.monthlyMaintenance} margin={{ top: 0, right: 16, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="total" name="Total" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="completed" name="Completed" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ─ Upcoming Calibrations ────────────────────────────────────────────── */}
      {upcomingCalibrations.length > 0 && (
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">⚠️ Upcoming Calibrations (Next 30 Days)</h3>
            <button className="btn-secondary btn-sm" onClick={() => navigate('/calibrations')}>
              View All
            </button>
          </div>
          <div className="table-container rounded-none border-0">
            <table className="table">
              <thead>
                <tr>
                  <th>Device</th>
                  <th>Asset #</th>
                  <th>Department</th>
                  <th>Due Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {upcomingCalibrations.map((c) => (
                  <tr key={c.id} className="cursor-pointer" onClick={() => navigate(`/devices/${c.id}`)}>
                    <td className="font-medium text-primary-700">{c.name}</td>
                    <td className="text-slate-500">{c.asset_number}</td>
                    <td>{c.department_name}</td>
                    <td>{c.next_calibration_date ? format(new Date(c.next_calibration_date), 'dd MMM yyyy') : '—'}</td>
                    <td><CalibrationDueBadge status={c.dueStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer */}
      <p className="text-xs text-slate-400 text-center pb-2">
        Data refreshed at {stats.generatedAt ? format(new Date(stats.generatedAt), 'dd MMM yyyy, HH:mm') : '—'}
      </p>
    </div>
  );
}
