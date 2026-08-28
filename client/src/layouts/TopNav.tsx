import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notificationService } from '../services';

interface TopNavProps {
  onMenuClick: () => void;
}

const routeLabels: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/devices': 'Devices',
  '/calibrations': 'Calibration Management',
  '/maintenance': 'Maintenance Records',
  '/maintenance-requests': 'Service Requests',
  '/technicians': 'Technicians',
  '/departments': 'Departments',
  '/compliance': 'Compliance',
  '/reports': 'Reports',
  '/notifications': 'Notifications',
  '/audit-logs': 'Audit Logs',
  '/users': 'User Management',
  '/profile': 'My Profile',
};

export default function TopNav({ onMenuClick }: TopNavProps) {
  const { user } = useAuth();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  const pageLabel = Object.entries(routeLabels).find(([path]) =>
    location.pathname.startsWith(path)
  )?.[1] ?? 'BioMed CMS';

  useEffect(() => {
    notificationService.getUnreadCount()
      .then((res) => setUnreadCount(res.data?.data?.count ?? 0))
      .catch(() => {});
  }, [location.pathname]);

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center px-4 gap-4 sticky top-0 z-30">
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="btn-icon lg:hidden"
        aria-label="Open menu"
      >
        <span className="text-xl">☰</span>
      </button>

      {/* Page title */}
      <div className="flex-1">
        <h1 className="text-lg font-semibold text-slate-900">{pageLabel}</h1>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* Notifications bell */}
        <a href="/notifications" className="relative btn-icon" aria-label="Notifications">
          <span className="text-xl">🔔</span>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-danger-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </a>

        {/* User avatar */}
        <a href="/profile" className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-slate-100 transition-colors">
          <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white font-semibold text-xs">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-slate-900 leading-tight">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
          </div>
        </a>
      </div>
    </header>
  );
}
