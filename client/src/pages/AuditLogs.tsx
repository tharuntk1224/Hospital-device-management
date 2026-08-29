import React, { useEffect, useState, useCallback } from 'react';
import { auditService } from '../services';
import type { AuditLog } from '../types';
import { PageLoader, ErrorState, EmptyState, Pagination } from '../components/ui';
import { format } from 'date-fns';

const actionColors: Record<string, string> = {
  CREATED: 'text-success-700 bg-success-50',
  UPDATED: 'text-blue-700 bg-blue-50',
  DELETED: 'text-danger-700 bg-danger-50',
};

function getActionColor(action: string) {
  if (action.includes('CREATE') || action.includes('REGISTER')) return actionColors.CREATED;
  if (action.includes('UPDATE') || action.includes('CHANGE')) return actionColors.UPDATED;
  if (action.includes('DELETE') || action.includes('REMOVE')) return actionColors.DELETED;
  return 'text-slate-600 bg-slate-100';
}

export default function AuditLogsPage() {
  const [items, setItems] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const limit = 20;

  const fetchData = useCallback(async () => {
    setIsLoading(true); setError('');
    try {
      const res = await auditService.getLogs({ page, limit });
      const data = res.data?.data;
      setItems(data?.items ?? []);
      setTotal(data?.total ?? 0);
      setTotalPages(data?.totalPages ?? 1);
    } catch { setError('Failed to load audit logs'); }
    finally { setIsLoading(false); }
  }, [page, limit]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="space-y-4">
      <div className="page-header">
        <div>
          <h1 className="page-title">Audit Logs</h1>
          <p className="page-subtitle">{total} log entries</p>
        </div>
      </div>
      <div className="card overflow-hidden">
        {isLoading ? <PageLoader /> : error ? <ErrorState message={error} onRetry={fetchData} /> :
          items.length === 0 ? <EmptyState icon="📜" title="No audit logs found" /> : (
          <>
            <div className="table-container rounded-none border-0">
              <table className="table">
                <thead><tr>
                  <th>Timestamp</th><th>User</th><th>Action</th><th>Entity</th><th>Changes</th>
                </tr></thead>
                <tbody>
                  {items.map((log) => (
                    <React.Fragment key={log.id}>
                      <tr className="cursor-pointer" onClick={() => setExpanded(expanded === log.id ? null : log.id)}>
                        <td className="text-xs text-slate-500 whitespace-nowrap">
                          {format(new Date(log.createdAt), 'dd MMM yyyy, HH:mm:ss')}
                        </td>
                        <td>
                          <p className="text-sm font-medium">{log.userName}</p>
                          <p className="text-xs text-slate-400">{log.userEmail}</p>
                        </td>
                        <td>
                          <span className={`badge text-xs font-mono ${getActionColor(log.action)}`}>
                            {log.action}
                          </span>
                        </td>
                        <td>
                          <p className="text-sm capitalize">{log.entityType?.replace(/_/g, ' ')}</p>
                          {log.entityId && <p className="text-xs text-slate-400 font-mono">{log.entityId.substring(0, 8)}...</p>}
                        </td>
                        <td>
                          <button className="btn-ghost btn-sm text-xs">
                            {expanded === log.id ? '▲ Hide' : '▼ Details'}
                          </button>
                        </td>
                      </tr>
                      {expanded === log.id && (
                        <tr className="bg-slate-50">
                          <td colSpan={5} className="px-6 py-3">
                            <div className="grid grid-cols-2 gap-4 text-xs">
                              {log.oldValues && (
                                <div>
                                  <p className="text-slate-500 font-medium mb-1">Before</p>
                                  <pre className="bg-white rounded p-2 text-slate-600 overflow-x-auto text-xs">
                                    {JSON.stringify(log.oldValues, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {log.newValues && (
                                <div>
                                  <p className="text-slate-500 font-medium mb-1">After</p>
                                  <pre className="bg-white rounded p-2 text-slate-600 overflow-x-auto text-xs">
                                    {JSON.stringify(log.newValues, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                            {log.ipAddress && (
                              <p className="text-xs text-slate-400 mt-2">IP: {log.ipAddress}</p>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
