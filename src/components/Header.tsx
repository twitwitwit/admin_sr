import React, { useState, useRef, useEffect } from 'react';
import {
  AlertTriangle,
  Search,
  Bell,
  ChevronDown,
  ShieldCheck,
  RotateCcw,
  Zap,
  Activity,
  Sliders,
  LogOut,
  ExternalLink,
} from 'lucide-react';
import { NavTab } from '../types';
import { useRealtimeDb } from '../context/RealtimeDbContext';

interface HeaderProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenGlobalSearch: () => void;
  onLogout: () => void;
}

const PAGE_META: Record<NavTab, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Dashboard',
    subtitle: "Welcome back, Admin! Here's what's happening with SwiftRide today.",
  },
  emergency: {
    title: 'Emergency SOS Operations Desk',
    subtitle: 'Real-time user safety alerts, dispatch responders, and incident management',
  },
  passengers: {
    title: 'Passenger Management',
    subtitle: 'Audit and manage registered passenger accounts',
  },
  drivers: {
    title: 'Driver Partners Fleet',
    subtitle: 'Review verified fleet and pending onboarding applications',
  },
  'live-trips': {
    title: 'Live Fleet Radar',
    subtitle: 'Real-time GPS telemetry and vehicle positioning',
  },
  bookings: {
    title: 'Bookings & Dispatch',
    subtitle: 'Ride orders log, fares, and route details',
  },
  earnings: {
    title: 'Revenue & Commission',
    subtitle: 'Financial settlement, gross volume, and payouts',
  },
  reports: {
    title: 'Analytics & Heatmaps',
    subtitle: 'Peak hours, route density, and growth reports',
  },
  support: {
    title: 'Support & Safety Desk',
    subtitle: 'Resolve user tickets, safety incidents, and driver inquiries',
  },
  notifications: {
    title: 'System Notifications',
    subtitle: 'Platform broadcasts, LTFRB regulatory notices, and server logs',
  },
  settings: {
    title: 'Platform Settings',
    subtitle: 'Base fares, surge multipliers, commissions, and API configurations',
  },
};

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  onOpenGlobalSearch,
  onLogout,
}) => {
  const {
    activeCriticalSOSCount,
    unreadNotificationsCount,
    resetDatabaseToDefault,
    triggerManualTelemetryPing,
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

  const meta = PAGE_META[currentTab] || { title: 'SwiftRide Admin', subtitle: 'Platform Console' };

  return (
    <header
      id="main-app-header"
      className="h-20 bg-[#070b13]/95 backdrop-blur-md border-b border-slate-800/80 px-8 flex items-center justify-between sticky top-0 z-20"
    >
      {/* Page Title & Subtitle */}
      <div className="flex flex-col">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-black tracking-tight text-white">{meta.title}</h1>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/15 border border-amber-500/40 text-amber-400 tracking-wider">
            SYSTEM LIVE
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-0.5 font-medium">{meta.subtitle}</p>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Emergency SOS Quick Button */}
        <button
          id="btn-quick-sos-header"
          onClick={() => onSelectTab('emergency')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-black transition-all duration-200 shadow-lg ${
            activeCriticalSOSCount > 0
              ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/40 animate-pulse'
              : 'bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-800/50'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 fill-white" />
          <span>{activeCriticalSOSCount > 0 ? `${activeCriticalSOSCount} Emergency SOS` : 'Emergency SOS'}</span>
        </button>

        {/* Global Search Bar */}
        <button
          id="btn-header-search"
          onClick={onOpenGlobalSearch}
          className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-[#0e1524] border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-xs w-64 transition-all group"
        >
          <Search className="w-4 h-4 text-slate-400 group-hover:text-amber-400 transition-colors" />
          <span className="text-slate-400 truncate">Search telemetry, drivers, rides...</span>
          <kbd className="hidden sm:inline-block ml-auto text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
            ⌘K
          </kbd>
        </button>

        {/* Notification Bell Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            id="btn-header-notifications"
            onClick={() => setNotificationDropdownOpen(!notificationDropdownOpen)}
            className="relative p-2.5 rounded-xl bg-[#0e1524] border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all focus:outline-none"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-pink-600 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-[#070b13]">
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </span>
            )}
          </button>

          {notificationDropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-[#0d1422] border border-slate-800 rounded-2xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 px-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-white">Notifications</span>
                  {unreadNotificationsCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded bg-pink-600/30 text-pink-400 text-[10px] font-bold">
                      {unreadNotificationsCount} new
                    </span>
                  )}
                </div>
                <button
                  onClick={() => markAllNotificationsAsRead()}
                  className="text-[11px] font-bold text-amber-400 hover:underline"
                >
                  Mark all read
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
                {notifications.slice(0, 5).map((n) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      markNotificationAsRead(n.id);
                      if (n.actionTab) onSelectTab(n.actionTab);
                      setNotificationDropdownOpen(false);
                    }}
                    className={`p-2.5 rounded-xl text-xs cursor-pointer transition-all ${
                      n.read
                        ? 'bg-slate-900/40 text-slate-400 hover:bg-slate-800/50'
                        : 'bg-amber-500/10 border border-amber-500/20 text-slate-200 hover:bg-amber-500/20'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-[11px] mb-0.5">
                      <span className={n.category === 'EMERGENCY' ? 'text-red-400' : 'text-amber-400'}>
                        {n.title}
                      </span>
                      <span className="text-[10px] text-slate-400">{n.timeAgo}</span>
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
                className="w-full mt-2 py-1.5 text-center text-xs font-bold text-amber-400 hover:bg-slate-800/60 rounded-lg transition-colors flex items-center justify-center gap-1"
              >
                <span>View All Notifications</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Profile Avatar & Menu */}
        <div className="relative" ref={dropdownRef}>
          <button
            id="btn-admin-profile"
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center gap-3 p-1.5 pl-2 rounded-xl hover:bg-slate-800/60 border border-transparent hover:border-slate-800 transition-all focus:outline-none group"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 text-black font-extrabold flex items-center justify-center text-xs shadow-md shadow-amber-500/20">
              AD
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                Admin Master
              </span>
              <span className="text-[10px] text-amber-400/90 font-medium">Super Administrator</span>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-white transition-transform duration-200" />
          </button>

          {profileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-[#0d1422] border border-slate-800 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-2 border-b border-slate-800 mb-1">
                <span className="text-xs font-bold text-white block">francesmargarettpedoche1@gmail.com</span>
                <span className="text-[10px] text-emerald-400 font-mono">ROLE: SYSTEM_SUPERADMIN</span>
              </div>

              {/* Ping Radar */}
              <button
                onClick={() => {
                  triggerManualTelemetryPing();
                  setProfileDropdownOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800/80 transition-colors"
              >
                <Zap className="w-4 h-4 text-cyan-400" />
                <span>Send Fleet Telemetry Ping</span>
              </button>

              {/* Reset Data */}
              <button
                onClick={() => {
                  if (confirm('Reset real-time database to initial seed data?')) {
                    resetDatabaseToDefault();
                    setProfileDropdownOpen(false);
                  }
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800/80 transition-colors"
              >
                <RotateCcw className="w-4 h-4 text-orange-400" />
                <span>Reset Demo Database</span>
              </button>

              <div className="my-1 border-t border-slate-800"></div>

              {/* Exit */}
              <button
                onClick={() => {
                  setProfileDropdownOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
