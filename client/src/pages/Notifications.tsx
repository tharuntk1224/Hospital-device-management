import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { notificationService } from '../services';
import type { Notification } from '../types';
import { PageLoader, ErrorState, EmptyState } from '../components/ui';
import { format } from 'date-fns';
import { useToast } from '../context/ToastContext';

const typeIcon: Record<string, string> = {
  calibration_overdue: '🔴',
  calibration_due_7:   '🟠',
  calibration_due_30:  '🟡',
  maintenance_request_assigned: '🔵',
  maintenance_completed: '🟢',
  default: '🔔',
};

export default function NotificationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [items, setItems] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const unreadOnly = searchParams.get('unread') === 'true';

  const fetchData = useCallback(async () => {
    setIsLoading(true); setError('');
    try {
      const res = await notificationService.getAll({ unread: unreadOnly || undefined });
      setItems(res.data?.data?.items ?? []);
    } catch { setError('Failed to load notifications'); }
    finally { setIsLoading(false); }
  }, [unreadOnly]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const markRead = async (id: string) => {
    await notificationService.markRead(id);
    setItems((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
  };

  const markAllRead = async () => {
    await notificationService.markAllRead();
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    showToast('All notifications marked as read', 'success');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">{items.filter((n) => !n.isRead).length} unread</p>
        </div>
        <div className="flex gap-2">
          <button className={`btn-sm ${unreadOnly ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => {
              const p = new URLSearchParams(searchParams);
              if (unreadOnly) p.delete('unread'); else p.set('unread', 'true');
              setSearchParams(p);
            }}>
            {unreadOnly ? 'Show All' : 'Unread Only'}
          </button>
          <button className="btn-ghost btn-sm" onClick={markAllRead}>Mark All Read</button>
        </div>
      </div>

      {isLoading ? <PageLoader /> : error ? <ErrorState message={error} onRetry={fetchData} /> :
        items.length === 0 ? <EmptyState icon="🔔" title="No notifications" description="You're all caught up!" /> : (
        <div className="space-y-2">
          {items.map((n) => (
            <div
              key={n.id}
              className={`card p-4 flex items-start gap-3 cursor-pointer hover:shadow-card-hover transition-shadow ${!n.isRead ? 'border-l-4 border-l-primary-500' : ''}`}
              onClick={() => {
                if (!n.isRead) markRead(n.id);
                if (n.entityType === 'device' && n.entityId) navigate(`/devices/${n.entityId}`);
              }}
            >
              <span className="text-xl shrink-0 mt-0.5">{typeIcon[n.type] ?? typeIcon.default}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${!n.isRead ? 'text-slate-900' : 'text-slate-600'}`}>{n.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>
                <p className="text-xs text-slate-400 mt-1">{format(new Date(n.createdAt), 'dd MMM yyyy, HH:mm')}</p>
              </div>
              {!n.isRead && (
                <button
                  className="btn-ghost btn-sm shrink-0"
                  onClick={(e) => { e.stopPropagation(); markRead(n.id); }}
                >
                  ✓
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
