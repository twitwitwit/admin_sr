import React from 'react';
import {
  LayoutDashboard,
  ShieldAlert,
  Users,
  Car,
  Compass,
  CalendarDays,
  DollarSign,
  BarChart3,
  HelpCircle,
  Bell,
  Settings,
  LogOut,
  Radio,
} from 'lucide-react';
import { NavTab } from '../types';
import { SwiftRideLogo } from './SwiftRideLogo';
import { useRealtimeDb } from '../context/RealtimeDbContext';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab, onLogout }) => {
  const { activeCriticalSOSCount, pendingDriversCount, openTicketsCount, unreadNotificationsCount } = useRealtimeDb();

  const navItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'emergency' as NavTab,
      label: 'Emergency SOS',
      icon: ShieldAlert,
      badge: activeCriticalSOSCount > 0 ? activeCriticalSOSCount : null,
      badgeColor: 'bg-red-500 text-white',
    },
    {
      id: 'passengers' as NavTab,
      label: 'Passengers',
      icon: Users,
    },
    {
      id: 'drivers' as NavTab,
      label: 'Drivers',
      icon: Car,
      badge: pendingDriversCount > 0 ? pendingDriversCount : null,
      badgeColor: 'bg-amber-500 text-black font-bold',
    },
    {
      id: 'live-trips' as NavTab,
      label: 'Live Trips',
      icon: Compass,
    },
    {
      id: 'bookings' as NavTab,
      label: 'Bookings',
      icon: CalendarDays,
    },
    {
      id: 'earnings' as NavTab,
      label: 'Earnings',
      icon: DollarSign,
    },
    {
      id: 'reports' as NavTab,
      label: 'Reports',
      icon: BarChart3,
    },
    {
      id: 'support' as NavTab,
      label: 'Support',
      icon: HelpCircle,
      badge: openTicketsCount > 0 ? openTicketsCount : null,
      badgeColor: 'bg-pink-600 text-white',
    },
    {
      id: 'notifications' as NavTab,
      label: 'Notifications',
      icon: Bell,
      badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : null,
      badgeColor: 'bg-pink-600 text-white',
    },
    {
      id: 'settings' as NavTab,
      label: 'Settings',
      icon: Settings,
    },
  ];

  return (
    <aside
      id="sidebar-container"
      className="w-64 min-w-[16rem] h-screen bg-[#070b13] border-r border-slate-800/80 flex flex-col justify-between select-none z-30 shadow-2xl relative"
    >
      {/* Top Brand Banner */}
      <div className="pt-5 pb-4 px-5 border-b border-slate-800/60 flex items-center justify-between">
        <button
          id="btn-sidebar-brand"
          onClick={() => onSelectTab('dashboard')}
          className="focus:outline-none hover:opacity-90 transition-opacity flex items-center"
        >
          <SwiftRideLogo size="md" />
        </button>
        <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Live</span>
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-none">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              id={`nav-item-${item.id}`}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                isActive
                  ? 'bg-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.35)] font-bold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-black stroke-[2.5]' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>

              {item.badge !== null && item.badge !== undefined && (
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full flex items-center justify-center min-w-[20px] h-5 ${
                    isActive ? 'bg-black text-amber-400 font-extrabold' : item.badgeColor
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Session & Server Status */}
      <div className="p-4 border-t border-slate-800/80 space-y-3 bg-[#050810]/70">
        <div className="p-3 bg-[#0c121e] border border-slate-800 rounded-xl flex items-center justify-between shadow-inner">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Server Status</span>
            <span className="text-xs font-bold text-emerald-400 tracking-wide flex items-center gap-1.5 mt-0.5">
              OPERATIONAL
            </span>
          </div>
          <div className="w-3 h-3 rounded-full bg-emerald-500/30 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></div>
          </div>
        </div>

        <button
          id="btn-exit-session"
          onClick={onLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors group"
        >
          <LogOut className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          <span>Exit Session</span>
        </button>

        <div className="text-center">
          <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">
            SWIFTRIDE V4.0.2 BENTO
          </span>
        </div>
      </div>
    </aside>
  );
};
