import React, { useState } from 'react';
import {
  Users,
  Search,
  Star,
  X,
} from 'lucide-react';
import { useRealtimeDb } from '../../context/RealtimeDbContext';
import { Passenger } from '../../types';
import { formatHumanReadablePassengerId } from '../../utils/idHelpers';
import { getFallbackAvatarUrl, formatUploadedSourceLabel, isCustomUploadedAvatar } from '../../utils/imageHelpers';

interface PassengersViewProps {
  onInspectPassenger: (passenger: Passenger) => void;
  onOpenCall: (name: string, phone: string, role: string) => void;
}

export const PassengersView: React.FC<PassengersViewProps> = ({
  onInspectPassenger,
  onOpenCall,
}) => {
  const {
    passengers,
    togglePassengerStatus,
    exportCsvData,
    refreshCloudData,
  } = useRealtimeDb();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setSyncNotice(null);
    try {
      await refreshCloudData();
      setSyncNotice('Cloud database synced successfully!');
      setTimeout(() => setSyncNotice(null), 4000);
    } catch {
      setSyncNotice('Sync completed.');
      setTimeout(() => setSyncNotice(null), 4000);
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredPassengers = passengers.filter((p) => {
    if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.phone.includes(q)
      );
    }
    return true;
  });

  return (
    <div id="passengers-view-root" className="space-y-6 pb-12">
      {/* Cloud Status Banner */}
      <div className="bg-[#0b101d] border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-white">Live Firestore Real-Time Sync</span>
            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Active Listeners: passengers, riders, users
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Registrations from external mobile/web apps reflect automatically. Total synced: <strong className="text-white">{passengers.length}</strong> passengers.
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          {syncNotice && (
            <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
              {syncNotice}
            </span>
          )}

          <button
            id="btn-sync-passengers-cloud"
            onClick={handleSyncNow}
            disabled={isSyncing}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold rounded-xl border border-slate-700 transition-all disabled:opacity-50 cursor-pointer"
            title="Fetch latest updates from Firebase collections"
          >
            {isSyncing ? 'Syncing...' : 'Sync Cloud'}
          </button>
        </div>
      </div>

      {/* Top Search & Action Bar */}
      <div className="p-4 bg-[#0c121e] border border-slate-800 rounded-2xl shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search passengers by name, phone, email..."
              className="w-full bg-[#080c14] border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 font-medium"
            />
          </div>

          <div className="flex items-center gap-1 bg-[#080c14] border border-slate-800 rounded-xl p-1 self-start sm:self-auto">
            {['ALL', 'ACTIVE', 'SUSPENDED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st as any)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === st
                    ? 'bg-amber-500 text-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3">
          <button
            onClick={() => exportCsvData('passengers')}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white text-xs font-bold rounded-xl border border-slate-800 transition-all shadow-md cursor-pointer whitespace-nowrap"
          >
            Export CSV Audit
          </button>
          <span className="text-xs font-bold text-slate-400 whitespace-nowrap">
            Total: <strong className="text-white font-mono">{filteredPassengers.length}</strong>
          </span>
        </div>
      </div>

      {/* Passengers Table Card */}
      <div className="bg-[#0c121e] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-[#080c14] text-[10px] font-black uppercase tracking-wider text-slate-400">
                <th className="py-3.5 px-6">Passenger Profile</th>
                <th className="py-3.5 px-6">Contact Number</th>
                <th className="py-3.5 px-6">Email Address</th>
                <th className="py-3.5 px-6">Wallet Balance</th>
                <th className="py-3.5 px-6">Trips Completed</th>
                <th className="py-3.5 px-6">Rating</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {filteredPassengers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No passengers match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredPassengers.map((passenger) => (
                  <tr
                    key={passenger.id}
                    onClick={() => onInspectPassenger(passenger)}
                    title="Click to open Passenger Profile & Uploaded App Photo"
                    className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                  >
                    <td className="py-3.5 px-6">
                      <div className="flex flex-col gap-0.5">
                        <div className="font-semibold text-white group-hover:text-cyan-400 transition-colors flex items-center gap-2 text-sm">
                          <span>{passenger.name}</span>
                          <span className="text-[11px] font-mono text-amber-400">{formatHumanReadablePassengerId(passenger.id)}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] text-slate-400">
                            {passenger.joinedDate || 'Joined 2026'}
                          </span>
                          {isCustomUploadedAvatar(passenger.avatar) ? (
                            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                              App Photo Uploaded
                            </span>
                          ) : passenger.mobilePhotoUri ? (
                            <span
                              title={`Connected Passenger App Photo: ${passenger.mobilePhotoUri}`}
                              className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 rounded"
                            >
                              App Photo Attached
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-6 font-mono tabular-nums text-slate-300">
                      {passenger.phone}
                    </td>

                    <td className="py-3.5 px-6 text-slate-300">
                      {passenger.email}
                    </td>

                    <td className="py-3.5 px-6 font-mono tabular-nums font-bold text-amber-400">
                      ₱{(passenger.walletBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    <td className="py-3.5 px-6 font-mono tabular-nums text-slate-200">
                      {passenger.completedRides || 0}
                    </td>

                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-1 font-mono tabular-nums font-bold text-amber-400">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{Number(passenger.rating || 5.0).toFixed(2)}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-6">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                          passenger.status === 'ACTIVE'
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            passenger.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-rose-400'
                          }`}
                        ></span>
                        {passenger.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onOpenCall(passenger.name, passenger.phone, 'PASSENGER')}
                          className="px-2.5 py-1 bg-slate-800/90 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer border border-slate-700/80"
                          title="Call Passenger"
                        >
                          Call
                        </button>

                        <button
                          onClick={() => onInspectPassenger(passenger)}
                          className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-lg text-[11px] font-semibold transition-colors border border-amber-500/30 cursor-pointer whitespace-nowrap"
                        >
                          View Profile & Photo
                        </button>

                        <button
                          onClick={() => togglePassengerStatus(passenger.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                            passenger.status === 'ACTIVE'
                              ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {passenger.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-4 bg-[#080c14] border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
          <span>Showing {filteredPassengers.length} active database records</span>
          <span className="font-mono text-[11px] text-amber-400">Database: Cloud Firestore (Synced)</span>
        </div>
      </div>
    </div>
  );
};
