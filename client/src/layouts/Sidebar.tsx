import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  roles?: string[];
}

const navItems: NavItem[] = [
  { path: '/dashboard',            label: 'Dashboard',          icon: '📊' },
  { path: '/devices',              label: 'Devices',            icon: '🔬' },
  { path: '/calibrations',         label: 'Calibration',        icon: '📐' },
  { path: '/maintenance',          label: 'Maintenance',        icon: '🔧' },
  { path: '/maintenance-requests', label: 'Service Requests',   icon: '📋' },
  { path: '/technicians',          label: 'Technicians',        icon: '👨‍🔧', roles: ['admin', 'auditor'] },
  { path: '/departments',          label: 'Departments',        icon: '🏥', roles: ['admin', 'auditor'] },
  { path: '/compliance',           label: 'Compliance',         icon: '✅' },
  { path: '/reports',              label: 'Reports',            icon: '📈' },
  { path: '/notifications',        label: 'Notifications',      icon: '🔔' },
  { path: '/audit-logs',           label: 'Audit Logs',         icon: '📜', roles: ['admin', 'auditor'] },
  { path: '/users',                label: 'User Management',    icon: '👥', roles: ['admin'] },
];

interface SidebarProps {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const visibleItems = navItems.filter((item) => {
    if (!item.roles) return true;
    return hasRole(...(item.roles as ('admin' | 'technician' | 'staff' | 'auditor')[]));
  });

  return (
    <aside className="flex flex-col h-full bg-surface-900 w-64 shadow-sidebar">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div className="w-9 h-9 rounded-xl bg-primary-500 flex items-center justify-center text-white font-bold text-lg">
          ⚕
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-tight">BioMed CMS</p>
          <p className="text-slate-400 text-xs">Device Management</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="ml-auto text-slate-400 hover:text-white lg:hidden">
            ✕
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-thin">
        {visibleItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onClose}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
            }
          >
            <span className="text-base">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User info + logout */}
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center text-white font-semibold text-sm">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-slate-400 text-xs capitalize">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full sidebar-link text-danger-400 hover:text-danger-300 hover:bg-danger-900/30 justify-center"
        >
          <span>🚪</span>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
