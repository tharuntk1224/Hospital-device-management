import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { deviceService, departmentService, categoryService } from '../services';
import { Device, Department, DeviceCategory } from '../types';
import {
  PageLoader, ErrorState, EmptyState, SearchInput, Pagination,
} from '../components/ui';
import { DeviceStatusBadge, CalibrationDueBadge, RiskBadge } from '../components/ui/Badge';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';

export default function DevicesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasRole } = useAuth();

  const [devices, setDevices] = useState<Device[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<DeviceCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const page     = parseInt(searchParams.get('page') || '1', 10);
  const search   = searchParams.get('search') || '';
  const deptId   = searchParams.get('departmentId') || '';
  const catId    = searchParams.get('categoryId') || '';
  const status   = searchParams.get('status') || '';
  const risk     = searchParams.get('riskLevel') || '';
  const calStat  = searchParams.get('calibrationStatus') || '';
  const limit    = 15;

  const setParam = (key: string, value: string) => {
    const p = new URLSearchParams(searchParams);
    if (value) p.set(key, value); else p.delete(key);
    p.set('page', '1');
    setSearchParams(p);
  };

  const fetchDevices = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await deviceService.getAll({
        page, limit, search: search || undefined,
        departmentId: deptId || undefined, categoryId: catId || undefined,
        status: status || undefined, riskLevel: risk || undefined,
        calibrationStatus: calStat || undefined,
      });
      const data = res.data?.data;
      setDevices(data?.items ?? []);
      setTotal(data?.total ?? 0);
      setTotalPages(data?.totalPages ?? 1);
    } catch {
      setError('Failed to load devices');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, deptId, catId, status, risk, calStat]);

  useEffect(() => {
    Promise.all([departmentService.getAll(), categoryService.getAll()])
      .then(([dRes, cRes]) => {
        setDepartments(dRes.data?.data ?? []);
        setCategories(cRes.data?.data ?? []);
      }).catch(() => {});
  }, []);

  useEffect(() => { fetchDevices(); }, [fetchDevices]);

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Biomedical Devices</h1>
          <p className="page-subtitle">{total} device{total !== 1 ? 's' : ''} registered</p>
        </div>
        {hasRole('admin', 'technician') && (
          <button className="btn-primary" onClick={() => navigate('/devices/new')} id="add-device-btn">
            + Add Device
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          <SearchInput
            value={search}
            onChange={(v) => setParam('search', v)}
            placeholder="Search by name, asset#, serial#..."
          />
          <select className="select w-auto" value={deptId} onChange={(e) => setParam('departmentId', e.target.value)} id="filter-dept">
            <option value="">All Departments</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select className="select w-auto" value={catId} onChange={(e) => setParam('categoryId', e.target.value)} id="filter-cat">
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="select w-auto" value={status} onChange={(e) => setParam('status', e.target.value)} id="filter-status">
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="under_maintenance">Under Maintenance</option>
            <option value="out_of_service">Out of Service</option>
            <option value="retired">Retired</option>
            <option value="lost">Lost</option>
          </select>
          <select className="select w-auto" value={calStat} onChange={(e) => setParam('calibrationStatus', e.target.value)} id="filter-cal-status">
            <option value="">Calibration Status</option>
            <option value="overdue">Overdue</option>
            <option value="due_today">Due Today</option>
            <option value="due_soon">Due Soon (&lt;7 days)</option>
            <option value="valid">Valid</option>
            <option value="not_required">Not Required</option>
          </select>
          {(search || deptId || catId || status || risk || calStat) && (
            <button className="btn-ghost btn-sm" onClick={() => setSearchParams({})}>
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <PageLoader />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchDevices} />
        ) : devices.length === 0 ? (
          <EmptyState
            icon="🔬"
            title="No devices found"
            description="Try adjusting your filters or add a new device."
            action={hasRole('admin', 'technician') ? (
              <button className="btn-primary btn-sm" onClick={() => navigate('/devices/new')}>
                Add First Device
              </button>
            ) : undefined}
          />
        ) : (
          <>
            <div className="table-container rounded-none border-0">
              <table className="table">
                <thead>
                  <tr>
                    <th>Device</th>
                    <th>Asset #</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>Risk</th>
                    <th>Calibration</th>
                    <th>Next Cal. Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map((device) => (
                    <tr
                      key={device.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/devices/${device.id}`)}
                    >
                      <td>
                        <div>
                          <p className="font-medium text-slate-900">{device.name}</p>
                          <p className="text-xs text-slate-400">{device.manufacturer} · {device.model}</p>
                        </div>
                      </td>
                      <td className="text-slate-600 font-mono text-xs">{device.assetNumber}</td>
                      <td className="text-slate-600">{device.departmentName}</td>
                      <td><DeviceStatusBadge status={device.status} /></td>
                      <td><RiskBadge level={device.riskLevel} /></td>
                      <td>
                        {device.calibrationRequired
                          ? <CalibrationDueBadge status={device.calibrationDueStatus ?? 'overdue'} />
                          : <span className="text-slate-400 text-xs">Not required</span>
                        }
                      </td>
                      <td className="text-slate-600 text-sm">
                        {device.nextCalibrationDate
                          ? format(new Date(device.nextCalibrationDate), 'dd MMM yyyy')
                          : '—'}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <button
                          className="btn-secondary btn-sm"
                          onClick={() => navigate(`/devices/${device.id}`)}
                          id={`view-device-${device.id}`}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page} totalPages={totalPages} total={total} limit={limit}
              onPageChange={(p) => {
                const params = new URLSearchParams(searchParams);
                params.set('page', String(p));
                setSearchParams(params);
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
