import React, { useState, useRef, useEffect } from 'react';
import {
  AlertTriangle,
  Search,
  Bell,
  ChevronDown,
  Zap,
  LogOut,
  ExternalLink,
  PanelLeftClose,
  PanelLeftOpen,
  Radio,
  Pause,
  Play,
} from 'lucide-react';
import { NavTab } from '../types';
import { useRealtimeDb } from '../context/RealtimeDbContext';

interface HeaderProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenGlobalSearch: () => void;
  onLogout: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

const PAGE_META: Record<NavTab, { category: string; title: string; subtitle: string }> = {
  dashboard: {
    category: 'Operations',
    title: 'Command Deck',
    subtitle: 'Real-time Metro Manila fleet telemetry, demand radar, and triage queue',
  },
  emergency: {
    category: 'Operations',
    title: 'Emergency SOS Desk',
    subtitle: 'Live user safety alerts, responder dispatch, and incident management',
  },
  passengers: {
    category: 'Fleet & Directory',
    title: 'Passenger Directory',
    subtitle: 'Audit and manage registered passenger accounts and digital wallets',
  },
  drivers: {
    category: 'Fleet & Directory',
    title: 'Driver Partners Fleet',
    subtitle: 'Review verified fleet units and pending onboarding applications',
  },
  'live-trips': {
    category: 'Operations',
    title: 'Live Fleet Radar',
    subtitle: 'Real-time GPS telemetry and vehicle positioning across Metro Manila',
  },
  bookings: {
    category: 'Operations',
    title: 'Bookings & Dispatch',
    subtitle: 'Ride orders ledger, itemized fares, and route details',
  },
  earnings: {
    category: 'Finance & System',
    title: 'Revenue & Commission',
    subtitle: 'Financial settlement, gross volume, and partner payouts',
  },
  reports: {
    category: 'Finance & System',
    title: 'Analytics & Heatmaps',
    subtitle: 'Peak hours, route density, and operational growth metrics',
  },
  support: {
    category: 'Fleet & Directory',
    title: 'Support & Safety Desk',
    subtitle: 'Resolve user tickets, safety incidents, and partner inquiries',
  },
  notifications: {
    category: 'Finance & System',
    title: 'System Notifications',
    subtitle: 'Platform broadcasts, regulatory notices, and dispatch alerts',
  },
  settings: {
    category: 'Finance & System',
    title: 'Platform Settings',
    subtitle: 'Base fares, surge multipliers, commissions, and role access',
  },
};

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  onOpenGlobalSearch,
  onLogout,
  isSidebarCollapsed = false,
  onToggleSidebar,
}) => {
  const {
    activeCriticalSOSCount,
    unreadNotificationsCount,
    triggerManualTelemetryPing,
    isLivePolling,
    currentAdminUser,
  } = useRealtimeDb();

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const { notifications, markNotificationAsRead, markAllNotificationsAsRead } = useRealtimeDb();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotificationDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const meta = PAGE_META[currentTab] || {
    category: 'Operations',
    title: 'SwiftRide Admin',
    subtitle: 'Platform Console',
  };

  return (
    <header
      id="main-app-header"
      className="h-16 bg-[#070b13]/95 backdrop-blur-md border-b border-slate-800/80 px-3 sm:px-6 flex items-center justify-between gap-2 sticky top-0 z-20 flex-shrink-0"
    >
      {/* Zone 1: Contextual Breadcrumb & Page Title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        {onToggleSidebar && (
          <button
            id="btn-header-toggle-sidebar"
            onClick={onToggleSidebar}
            title={isSidebarCollapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
            aria-label="Toggle navigation sidebar"
            className="p-2 rounded-lg bg-[#0c121e] border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-amber-400 transition-all focus:outline-none cursor-pointer flex-shrink-0"
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen className="w-4 h-4 text-amber-400" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        )}

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-slate-400 truncate">
            <span className="font-medium text-slate-500 hidden md:inline">{meta.category}</span>
            <span className="text-slate-700 hidden md:inline" aria-hidden="true">/</span>
            <h1 className="text-sm sm:text-base font-bold tracking-tight text-white truncate font-display">
              {meta.title}
            </h1>
            <span className="text-slate-700 hidden sm:inline" aria-hidden="true">·</span>
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400 flex-shrink-0">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isLivePolling ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span className={isLivePolling ? 'text-emerald-400' : 'text-amber-400'}>
                {isLivePolling ? 'Live Updates Active' : 'Updates Paused'}
              </span>
            </span>
          </div>
          <p className="text-[11px] text-slate-400 truncate max-w-xs sm:max-w-md lg:max-w-lg hidden md:block">
            {meta.subtitle}
          </p>
        </div>
      </div>

      {/* Zone 2: Global Command Search */}
      <div className="hidden xl:flex items-center flex-shrink-0">
        <button
          id="btn-header-search"
          onClick={onOpenGlobalSearch}
          className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-lg bg-[#0c121e] border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-xs w-64 2xl:w-72 transition-all group cursor-pointer"
        >
          <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400 transition-colors" />
          <span className="text-slate-400 truncate">Search drivers, plates, trips...</span>
          <kbd className="ml-auto text-[10px] bg-slate-900 border border-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Zone 3: Primary Actions & Operator Profile */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
        {/* Compact Search Trigger (< 1280px) */}
        <button
          onClick={onOpenGlobalSearch}
          className="xl:hidden p-2 rounded-lg bg-[#0c121e] border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
          title="Search (⌘K)"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Emergency SOS Quick Action */}
        <button
          id="btn-quick-sos-header"
          onClick={() => onSelectTab('emergency')}
          className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 whitespace-nowrap cursor-pointer ${
            activeCriticalSOSCount > 0
              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-sm'
              : 'bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-800/50'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="font-mono tabular-nums">
            {activeCriticalSOSCount > 0 ? `${activeCriticalSOSCount} SOS` : 'SOS'}
          </span>
        </button>

        {/* Notification Bell Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            id="btn-header-notifications"
            onClick={() => setNotificationDropdownOpen(!notificationDropdownOpen)}
            className="relative p-2 rounded-lg bg-[#0c121e] border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all focus:outline-none cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-black text-[10px] font-mono font-bold flex items-center justify-center ring-2 ring-[#070b13]">
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </span>
            )}
          </button>

          {notificationDropdownOpen && (
            <div className="fixed sm:absolute right-3 sm:right-0 top-16 sm:top-auto sm:mt-2 w-[calc(100vw-1.5rem)] sm:w-80 max-w-sm bg-[#0c121e] border border-slate-800 rounded-xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 px-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-white">Notifications</span>
                  {unreadNotificationsCount > 0 && (
                    <span className="text-slate-500 font-mono tabular-nums">
                      · {unreadNotificationsCount} unread
                    </span>
                  )}
                </div>
                <button
                  onClick={() => markAllNotificationsAsRead()}
                  className="text-[11px] font-semibold text-amber-400 hover:underline cursor-pointer"
                >
                  Mark all read
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
                {notifications.slice(0, 5).map((n, idx) => (
                  <div
                    key={`header-notif-${n.id || 'notif'}-${idx}`}
                    onClick={() => {
                      markNotificationAsRead(n.id);
                      if (n.actionTab) onSelectTab(n.actionTab);
                      setNotificationDropdownOpen(false);
                    }}
                    className={`p-2.5 rounded-lg text-xs cursor-pointer transition-all ${
                      n.read
                        ? 'bg-slate-900/40 text-slate-400 hover:bg-slate-800/50'
                        : 'bg-amber-500/10 border-l-2 border-amber-400 text-slate-200 hover:bg-amber-500/15'
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold text-[11px] mb-0.5">
                      <span className={n.category === 'EMERGENCY' ? 'text-rose-400' : 'text-amber-400'}>
                        {n.title}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">{n.timeAgo}</span>
                    </div>
                    <p className="line-clamp-2 text-slate-300 text-[11px]">{n.message}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => {
                  onSelectTab('notifications');
                  setNotificationDropdownOpen(false);
                }}
                className="w-full mt-2 py-1.5 text-center text-xs font-semibold text-amber-400 hover:bg-slate-800/60 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>View All Notifications</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Operator Profile Menu */}
        <div className="relative" ref={dropdownRef}>
          <button
            id="btn-admin-profile"
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center gap-2.5 py-1 px-2 rounded-lg hover:bg-slate-800/60 border border-transparent hover:border-slate-800 transition-all focus:outline-none group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-black font-bold font-mono flex items-center justify-center text-xs">
              {currentAdminUser.name
                .split(' ')
                .map((w) => w[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-semibold text-white group-hover:text-amber-400 transition-colors leading-tight">
                {currentAdminUser.name}
              </span>
              <span className="text-[10px] text-slate-400 font-medium leading-tight">
                {currentAdminUser.role}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-transform duration-200" />
          </button>

          {profileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-[#0c121e] border border-slate-800 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-2 border-b border-slate-800 mb-1">
                <span className="text-xs font-semibold text-white block truncate">
                  {currentAdminUser.email}
                </span>
                <span className="text-[11px] text-amber-400 font-mono">
                  {currentAdminUser.role}
                </span>
              </div>

              <button
                onClick={() => {
                  triggerManualTelemetryPing();
                  setProfileDropdownOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800/80 transition-colors cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Refresh Driver Status</span>
              </button>

              <div className="my-1 border-t border-slate-800"></div>

              <button
                onClick={() => {
                  setProfileDropdownOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
