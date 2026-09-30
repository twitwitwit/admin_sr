import React from 'react';
import {
  Bell,
  AlertTriangle,
  Server,
  FileCheck2,
  ShieldAlert,
  Clock,
  CheckCheck,
  RotateCw,
  ArrowRight,
  Database,
  Sliders,
} from 'lucide-react';
import { useRealtimeDb } from '../../context/RealtimeDbContext';
import { NavTab } from '../../types';

interface NotificationsViewProps {
  onNavigate: (tab: NavTab, targetId?: string) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({ onNavigate }) => {
  const {
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    activeCriticalSOSCount,
  } = useRealtimeDb();
  const [loadedAllHistory, setLoadedAllHistory] = React.useState(false);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'EMERGENCY':
        return <AlertTriangle className="w-5 h-5 text-red-500 fill-red-500/20" />;
      case 'SERVER':
        return <Server className="w-5 h-5 text-amber-400" />;
      case 'REGULATORY':
        return <FileCheck2 className="w-5 h-5 text-cyan-400" />;
      case 'ALERT':
        return <ShieldAlert className="w-5 h-5 text-orange-400" />;
      case 'MAINTENANCE':
        return <Sliders className="w-5 h-5 text-purple-400" />;
      case 'BACKUP':
        return <Database className="w-5 h-5 text-emerald-400" />;
      default:
        return <Bell className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <div id="notifications-view-root" className="space-y-6 pb-12">
      {/* Top Header Card */}
      <div className="p-6 bg-[#0c121e] border border-slate-800 rounded-3xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-base font-black text-white uppercase tracking-wider">
              System Activity & Emergency Broadcasts
            </h3>
            {activeCriticalSOSCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black uppercase">
                {activeCriticalSOSCount} Emergency Alert
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Broadcast alerts, safety notifications, regulatory compliance notices, and automated backups
          </p>
        </div>

        <button
          onClick={() => markAllNotificationsAsRead()}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 text-xs font-bold rounded-xl border border-slate-700 transition-colors flex items-center gap-2 self-start sm:self-auto"
        >
          <CheckCheck className="w-4 h-4" />
          <span>Mark All as Read</span>
        </button>
      </div>

      {/* Notifications Feed */}
      <div className="space-y-3">
        {notifications.map((notif, index) => {
          const isEmergency = notif.category === 'EMERGENCY';

          return (
            <div
              key={`notif-${notif.id || 'n'}-${index}`}
              onClick={() => {
                markNotificationAsRead(notif.id);
                if (notif.actionTab) onNavigate(notif.actionTab, notif.actionId);
              }}
              className={`p-5 rounded-2xl border transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                isEmergency
                  ? 'bg-red-950/20 border-red-900/50 hover:bg-red-900/30'
                  : notif.read
                  ? 'bg-[#0c121e] border-slate-800/80 hover:bg-slate-900/60'
                  : 'bg-[#0e1626] border-slate-700/80 hover:bg-[#121c30]'
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`p-3 rounded-2xl border mt-0.5 ${
                    isEmergency
                      ? 'bg-red-600/20 border-red-500/40'
                      : 'bg-slate-800/80 border-slate-700'
                  }`}
                >
                  {getCategoryIcon(notif.category)}
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h5 className="text-sm font-black text-white">{notif.title}</h5>
                    {notif.badgeLabel && (
                      <span
                        className={`text-[10px] px-2 py-0.2 rounded font-black uppercase ${
                          notif.badgeType === 'Safety SOS'
                            ? 'bg-red-600 text-white'
                            : 'bg-amber-500 text-black'
                        }`}
                      >
                        {notif.badgeLabel}
                      </span>
                    )}
                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-pink-500"></span>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">{notif.message}</p>
                  {notif.details && (
                    <p className="text-[11px] text-slate-400 mt-0.5 font-mono">{notif.details}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-auto">
                <span className="text-[11px] font-mono text-slate-500 font-bold whitespace-nowrap">
                  {notif.timeAgo}
                </span>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Load Older Button */}
      <div className="text-center pt-2">
        {loadedAllHistory ? (
          <span className="inline-block px-5 py-2.5 bg-[#0c121e] border border-slate-800 text-slate-400 text-xs font-semibold rounded-2xl">
            All historical notifications ({notifications.length}) are currently loaded
          </span>
        ) : (
          <button
            onClick={() => setLoadedAllHistory(true)}
            className="px-5 py-2.5 bg-[#0c121e] hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-bold rounded-2xl transition-colors cursor-pointer"
          >
            LOAD OLDER NOTIFICATIONS
          </button>
        )}
      </div>
    </div>
  );
};
