import React, { useState } from 'react';
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
  PanelLeftClose,
  Lock,
  Pause,
  X,
} from 'lucide-react';
import { NavTab } from '../types';
import { SwiftRideLogo } from './SwiftRideLogo';
import { useRealtimeDb } from '../context/RealtimeDbContext';
import { checkRolePermission } from '../utils/permissionHelpers';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onLogout: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  onLogout,
  isCollapsed = false,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const { activeCriticalSOSCount, pendingDriversCount, openTicketsCount, unreadNotificationsCount, currentAdminUser, isLivePolling, toggleLivePolling } = useRealtimeDb();
  const [restrictedNotice, setRestrictedNotice] = useState<string | null>(null);

  // On mobile drawer, always display full labels even if desktop is collapsed
  const effectiveCollapsed = isCollapsed && !isMobileOpen;

  const navSections = [
    {
      title: 'Operations',
      items: [
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
          badgeColor: 'text-rose-400 font-mono tabular-nums font-bold',
          dotColor: 'bg-rose-500',
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
      ],
    },
    {
      title: 'Fleet & Directory',
      items: [
        {
          id: 'drivers' as NavTab,
          label: 'Drivers',
          icon: Car,
          badge: pendingDriversCount > 0 ? pendingDriversCount : null,
          badgeColor: 'text-amber-400 font-mono tabular-nums font-bold',
          dotColor: 'bg-amber-400',
        },
        {
          id: 'passengers' as NavTab,
          label: 'Passengers',
          icon: Users,
        },
        {
          id: 'support' as NavTab,
          label: 'Support Desk',
          icon: HelpCircle,
          badge: openTicketsCount > 0 ? openTicketsCount : null,
          badgeColor: 'text-amber-300 font-mono tabular-nums font-bold',
          dotColor: 'bg-amber-400',
        },
      ],
    },
    {
      title: 'Finance & System',
      items: [
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
          id: 'notifications' as NavTab,
          label: 'Notifications',
          icon: Bell,
          badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : null,
          badgeColor: 'text-amber-400 font-mono tabular-nums font-bold',
          dotColor: 'bg-amber-400',
        },
        {
          id: 'settings' as NavTab,
          label: 'Settings',
          icon: Settings,
        },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200"
          aria-hidden="true"
        />
      )}

      <aside
        id="sidebar-container"
        className={`fixed md:relative inset-y-0 left-0 h-screen bg-[#070b13] border-r border-slate-800/80 flex flex-col justify-between select-none z-50 md:z-30 flex-shrink-0 overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          isMobileOpen ? 'translate-x-0 w-64 shadow-2xl' : '-translate-x-full md:translate-x-0'
        } ${effectiveCollapsed ? 'md:w-[72px]' : 'md:w-64'}`}
      >
        {/* Top Brand Banner */}
        <div className="h-16 px-4 border-b border-slate-800/80 flex items-center justify-between overflow-hidden flex-shrink-0">
          <div className="flex items-center min-w-0">
            <button
              id="btn-sidebar-brand"
              onClick={() => {
                if (effectiveCollapsed && onToggleCollapse) {
                  onToggleCollapse();
                } else {
                  onSelectTab('dashboard');
                }
              }}
              title={effectiveCollapsed ? 'Expand sidebar (Ctrl+B)' : 'SwiftRide Dashboard'}
              className="focus:outline-none flex items-center flex-shrink-0 group cursor-pointer"
            >
              <div className="w-10 h-7 flex-shrink-0 flex items-center justify-center">
                <SwiftRideLogo size="md" iconOnly />
              </div>
              <div
                className={`flex items-center ml-2.5 overflow-hidden whitespace-nowrap transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                  effectiveCollapsed ? 'max-w-0 opacity-0 -translate-x-2' : 'max-w-[130px] opacity-100 translate-x-0'
                }`}
              >
                <div className="flex items-center tracking-wider font-display">
                  <span className="italic font-black text-white text-base">SWIFT</span>
                  <span className="italic font-black text-amber-500 text-base ml-0.5">RIDE</span>
                </div>
              </div>
            </button>
          </div>

          {/* Mobile Close Button (< 768px) */}
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              aria-label="Close navigation drawer"
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Desktop Collapse Button (>= 768px) */}
          <div
            className={`hidden md:flex items-center gap-1.5 flex-shrink-0 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden ${
              effectiveCollapsed ? 'max-w-0 opacity-0 pointer-events-none' : 'max-w-[100px] opacity-100'
            }`}
          >
            {onToggleCollapse && (
              <button
                id="btn-toggle-sidebar-collapse"
                onClick={onToggleCollapse}
                title="Collapse sidebar (Ctrl+B)"
                aria-label="Collapse sidebar"
                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800/80 transition-colors focus:outline-none flex-shrink-0 cursor-pointer"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Restricted Role Inline Toast */}
        {restrictedNotice && !effectiveCollapsed && (
          <div className="mx-2.5 mt-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-[11px] text-rose-300 font-medium leading-snug">
            {restrictedNotice}
          </div>
        )}

        {/* Grouped Navigation Rail */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2.5 space-y-5 scrollbar-none">
          {navSections.map((section) => (
            <div key={section.title} className="space-y-1">
              {!effectiveCollapsed ? (
                <div className="px-3 pb-1 text-[11px] font-semibold text-slate-500 tracking-wide">
                  {section.title}
                </div>
              ) : (
                <div className="h-px bg-slate-800/70 mx-2 my-1" />
              )}

              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                const isAllowed = checkRolePermission(currentAdminUser.role, item.id);

                return (
                  <button
                    key={item.id}
                    id={`nav-item-${item.id}`}
                    onClick={() => {
                      if (!isAllowed) {
                        setRestrictedNotice(`'${item.label}' is restricted for ${currentAdminUser.role}.`);
                        setTimeout(() => setRestrictedNotice(null), 3500);
                        return;
                      }
                      onSelectTab(item.id);
                    }}
                    title={effectiveCollapsed ? `${item.label} ${!isAllowed ? `(Restricted for ${currentAdminUser.role})` : ''}` : undefined}
                    className={`w-full relative group flex items-center h-10 px-3 rounded-lg text-xs transition-all duration-150 focus:outline-none overflow-hidden cursor-pointer border-l-[3px] ${
                      isActive
                        ? 'border-amber-400 bg-amber-500/10 text-amber-400 font-bold'
                        : !isAllowed
                        ? 'border-transparent text-slate-600 hover:text-slate-400 hover:bg-slate-900/30 opacity-60 font-medium'
                        : 'border-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-800/40 font-medium'
                    }`}
                  >
                    {/* Fixed Icon Container */}
                    <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center relative">
                      {isAllowed ? (
                        <Icon
                          className={`w-4 h-4 transition-transform duration-150 ${
                            isActive ? 'text-amber-400 stroke-[2.25]' : 'text-slate-400 group-hover:text-slate-200'
                          }`}
                        />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400" />
                      )}

                      {/* Collapsed Indicator Dot */}
                      {item.badge !== null && item.badge !== undefined && (
                        <span
                          className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ring-2 ring-[#070b13] transition-all duration-200 ${
                            effectiveCollapsed ? 'opacity-100 scale-100' : 'opacity-0 scale-50 pointer-events-none'
                          } ${item.dotColor || 'bg-amber-400'}`}
                        />
                      )}
                    </div>

                    {/* Label & Unboxed Monospace Counter */}
                    <div
                      className={`flex items-center justify-between flex-1 min-w-0 ml-3 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] whitespace-nowrap overflow-hidden ${
                        effectiveCollapsed ? 'max-w-0 opacity-0 -translate-x-2' : 'max-w-[180px] opacity-100 translate-x-0'
                      }`}
                    >
                      <span className="truncate text-left text-[13px]">{item.label}</span>
                      {item.badge !== null && item.badge !== undefined && (
                        <span className={`text-xs ml-2 flex items-center gap-1.5 ${item.badgeColor}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${item.dotColor || 'bg-amber-400'}`} />
                          <span>{item.badge}</span>
                        </span>
                      )}
                    </div>

                    {/* Floating Tooltip on Collapsed Hover */}
                    {effectiveCollapsed && (
                      <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-[#0c121e] text-white text-xs font-semibold rounded-lg shadow-2xl border border-slate-800 whitespace-nowrap z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center gap-2">
                        <span>{item.label}</span>
                        {item.badge !== null && item.badge !== undefined && (
                          <span className={`text-xs ${item.badgeColor}`}>
                            ({item.badge})
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Bottom Session & Telemetry Controls */}
        <div className="p-3 border-t border-slate-800/80 bg-[#050810]/70 flex flex-col gap-1.5 flex-shrink-0 overflow-hidden">
          {/* Live Update Polling Toggle Button */}
          <button
            id="btn-sidebar-live-toggle"
            onClick={toggleLivePolling}
            title={
              isLivePolling
                ? 'Real-Time Data Polling Active: Telemetry updates every 4.5s. Click to pause.'
                : 'Real-Time Data Polling Paused: Telemetry frozen for inspection. Click to resume.'
            }
            className={`h-9 px-3 w-full flex items-center justify-between border rounded-lg text-xs font-semibold transition-all duration-200 focus:outline-none cursor-pointer overflow-hidden group relative ${
              isLivePolling
                ? 'bg-emerald-500/5 border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/10'
                : 'bg-amber-500/5 border-amber-500/30 text-amber-400 hover:bg-amber-500/10'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                {isLivePolling ? (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                ) : (
                  <Pause className="w-3.5 h-3.5 text-amber-400" />
                )}
              </div>
              <span
                className={`font-semibold text-xs whitespace-nowrap overflow-hidden transition-all duration-300 ${
                  effectiveCollapsed ? 'max-w-0 opacity-0 -translate-x-2' : 'max-w-[120px] opacity-100'
                }`}
              >
                {isLivePolling ? 'Live Telemetry' : 'Telemetry Paused'}
              </span>
            </div>

            <div
              className={`flex items-center transition-all duration-300 ${
                effectiveCollapsed ? 'max-w-0 opacity-0' : 'max-w-[40px] opacity-100'
              }`}
            >
              <span className="font-mono text-[10px] text-slate-400">
                {isLivePolling ? 'ON' : 'OFF'}
              </span>
            </div>
          </button>

          {/* Exit Session Button */}
          <button
            id="btn-exit-session"
            onClick={onLogout}
            title="Exit Session"
            className="w-full flex items-center h-9 px-3 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors group overflow-hidden focus:outline-none relative cursor-pointer"
          >
            <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
              <LogOut className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div
              className={`ml-3 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] whitespace-nowrap overflow-hidden ${
                effectiveCollapsed ? 'max-w-0 opacity-0 -translate-x-2' : 'max-w-[160px] opacity-100 translate-x-0'
              }`}
            >
              <span>Sign Out</span>
            </div>
          </button>
        </div>
      </aside>
    </>
  );
};
