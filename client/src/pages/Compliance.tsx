import React, { useEffect, useState, useCallback } from 'react';
import { dashboardService } from '../services';
import { PageLoader, ErrorState, StatCard } from '../components/ui';
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface ComplianceData {
  calibration: {
    totalRequiring: number; valid: number; overdue: number;
    expiringSoon: number; compliancePercent: number;
  };
  maintenance: { completedThisYear: number };
  failedCalibrationsLast90Days: number;
  devicesWithNoCalibrationThisYear: number;
}

export default function CompliancePage() {
  const [data, setData] = useState<ComplianceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setIsLoading(true); setError('');
    try {
      const res = await dashboardService.getCompliance();
      setData(res.data?.data ?? null);
    } catch { setError('Failed to load compliance data'); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (isLoading) return <PageLoader />;
  if (error || !data) return <ErrorState message={error} onRetry={fetchData} />;

  const { calibration, maintenance } = data;
  const complianceColor = calibration.compliancePercent >= 90 ? '#22c55e' : calibration.compliancePercent >= 70 ? '#f59e0b' : '#f43f5e';

  const radialData = [{ value: calibration.compliancePercent, fill: complianceColor }];

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Compliance Dashboard</h1>
          <p className="page-subtitle">Regulatory compliance overview for calibration and maintenance</p>
        </div>
      </div>

      {/* Compliance Gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-6 flex flex-col items-center">
          <h3 className="font-semibold text-slate-800 mb-4">Calibration Compliance</h3>
          <ResponsiveContainer width="100%" height={160}>
            <RadialBarChart cx="50%" cy="80%" innerRadius="60%" outerRadius="90%"
              startAngle={180} endAngle={0} data={radialData}>
              <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
              <RadialBar background dataKey="value" cornerRadius={8} />
              <Tooltip />
            </RadialBarChart>
          </ResponsiveContainer>
          <p className={`text-4xl font-bold mt-2`} style={{ color: complianceColor }}>
            {calibration.compliancePercent}%
          </p>
          <p className="text-slate-500 text-sm mt-1">
            {calibration.valid} of {calibration.totalRequiring} devices calibrated
          </p>
        </div>

        {/* Stats */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          <StatCard title="Valid Calibrations" value={calibration.valid} icon="✅" iconBg="bg-success-50 text-success-600" accent="text-success-700" />
          <StatCard title="Overdue Calibrations" value={calibration.overdue} icon="⚠️" iconBg="bg-danger-50 text-danger-600" accent={calibration.overdue > 0 ? 'text-danger-600' : ''} />
          <StatCard title="Expiring in 30 Days" value={calibration.expiringSoon} icon="⏳" iconBg="bg-warning-50 text-warning-600" accent={calibration.expiringSoon > 0 ? 'text-warning-600' : ''} />
          <StatCard title="Maintenance (This Year)" value={maintenance.completedThisYear} icon="🔧" iconBg="bg-blue-50 text-blue-600" />
        </div>
      </div>

      {/* Risk Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-3">⚠️ Compliance Risks</h3>
          <div className="space-y-3">
            <div className={`alert-${data.failedCalibrationsLast90Days > 0 ? 'warning' : 'success'}`}>
              <span>{data.failedCalibrationsLast90Days > 0 ? '⚠️' : '✅'}</span>
              <div>
                <p className="font-medium">{data.failedCalibrationsLast90Days} Failed Calibrations (Last 90 Days)</p>
                <p className="text-xs mt-0.5">Devices requiring re-calibration or investigation</p>
              </div>
            </div>
            <div className={`alert-${data.devicesWithNoCalibrationThisYear > 0 ? 'danger' : 'success'}`}>
              <span>{data.devicesWithNoCalibrationThisYear > 0 ? '🔴' : '✅'}</span>
              <div>
                <p className="font-medium">{data.devicesWithNoCalibrationThisYear} Devices With No Calibration This Year</p>
                <p className="text-xs mt-0.5">Active devices requiring calibration that haven't been calibrated</p>
              </div>
            </div>
            {calibration.overdue > 0 && (
              <div className="alert-danger">
                <span>🔴</span>
                <div>
                  <p className="font-medium">{calibration.overdue} Overdue Calibrations</p>
                  <p className="text-xs mt-0.5">Immediate action required for regulatory compliance</p>
                </div>
              </div>
            )}
            {calibration.overdue === 0 && data.failedCalibrationsLast90Days === 0 && data.devicesWithNoCalibrationThisYear === 0 && (
              <div className="alert-success">
                <span>✅</span>
                <p className="font-medium">All compliance indicators are within acceptable limits</p>
              </div>
            )}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-3">📋 Compliance Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b border-slate-50">
              <span className="text-slate-600">Total Devices Requiring Calibration</span>
              <span className="font-semibold">{calibration.totalRequiring}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-50">
              <span className="text-slate-600">Calibration Compliance Rate</span>
              <span className="font-semibold" style={{ color: complianceColor }}>{calibration.compliancePercent}%</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-50">
              <span className="text-slate-600">Expiring in 30 Days</span>
              <span className="font-semibold text-warning-600">{calibration.expiringSoon}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-50">
              <span className="text-slate-600">Failed Cals (90 days)</span>
              <span className="font-semibold">{data.failedCalibrationsLast90Days}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-600">Maintenance Completed YTD</span>
              <span className="font-semibold text-success-700">{maintenance.completedThisYear}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
