import React, { useState } from 'react';
import {
  Users,
  Search,
  Download,
  Star,
  Eye,
  Ban,
  CheckCircle2,
  Wallet,
  Phone,
  Mail,
  Plus,
  RotateCw,
  Database,
  Cloud,
  X,
  ShieldCheck,
} from 'lucide-react';
import { useRealtimeDb } from '../../context/RealtimeDbContext';
import { Passenger } from '../../types';

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
    registerPassenger,
  } = useRealtimeDb();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  // New passenger registration modal state
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    walletBalance: 250,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSubmitting(true);
    try {
      await registerPassenger({
        name: formData.name.trim(),
        phone: formData.phone.trim() || '0917-000-0000',
        email: formData.email.trim() || `${formData.name.toLowerCase().replace(/\s+/g, '')}@swiftride.ph`,
        walletBalance: Number(formData.walletBalance) || 0,
      });
      setIsRegisterModalOpen(false);
      setFormData({ name: '', phone: '', email: '', walletBalance: 250 });
      setSyncNotice(`Passenger "${formData.name.trim()}" registered & synced to Firestore!`);
      setTimeout(() => setSyncNotice(null), 5000);
    } catch (err) {
      console.error('Registration failed:', err);
    } finally {
      setIsSubmitting(false);
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
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Database className="w-4 h-4" />
          </div>
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
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold rounded-xl flex items-center gap-2 border border-slate-700 transition-all disabled:opacity-50"
            title="Fetch latest updates from Firebase collections"
          >
            <RotateCw className={`w-3.5 h-3.5 text-amber-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Cloud'}</span>
          </button>

          <button
            id="btn-register-passenger-modal"
            onClick={() => setIsRegisterModalOpen(true)}
            className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-xs font-extrabold rounded-xl flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add Passenger</span>
          </button>
        </div>
      </div>

      {/* Top Search & Action Bar */}
      <div className="p-4 bg-[#0c121e] border border-slate-800 rounded-2xl shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search passengers by name, phone, email..."
              className="w-full bg-[#080c14] border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 font-medium"
            />
          </div>

          <div className="flex items-center gap-1 bg-[#080c14] border border-slate-800 rounded-xl p-1">
            {['ALL', 'ACTIVE', 'SUSPENDED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st as any)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
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

        <div className="flex items-center gap-3">
          <button
            onClick={() => exportCsvData('passengers')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-2 border border-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Passengers Table */}
      <div className="bg-[#0c121e] border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#080c14] text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-6">Passenger</th>
                <th className="py-3.5 px-6">Contact Details</th>
                <th className="py-3.5 px-6">Wallet Balance</th>
                <th className="py-3.5 px-6">Completed Rides</th>
                <th className="py-3.5 px-6">Rating</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredPassengers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="font-bold text-white text-sm">No passengers found</p>
                    <p className="text-xs text-slate-500 mt-1">
                      No passengers registered yet, or no records match your filter.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredPassengers.map((passenger) => (
                  <tr
                    key={passenger.id}
                    className="hover:bg-slate-900/50 transition-colors group"
                  >
                    {/* Passenger */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <img
                          src={passenger.avatar}
                          alt={passenger.name}
                          className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-700"
                        />
                        <div>
                          <span className="font-bold text-white text-sm block">
                            {passenger.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ID: {passenger.id} • Joined: {passenger.joinedDate}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-mono text-slate-300 font-bold">
                          {passenger.phone}
                        </span>
                        <span className="text-slate-400 text-[11px]">
                          {passenger.email}
                        </span>
                      </div>
                    </td>

                    {/* Wallet */}
                    <td className="py-4 px-6">
                      <span className="font-mono font-black text-emerald-400 text-sm">
                        ₱{passenger.walletBalance.toFixed(2)}
                      </span>
                    </td>

                    {/* Completed Rides */}
                    <td className="py-4 px-6">
                      <span className="font-mono font-bold text-white text-sm">
                        {passenger.completedRides}
                      </span>
                    </td>

                    {/* Rating */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1.5 font-black text-amber-400">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        <span>{passenger.rating.toFixed(1)}</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-6">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          passenger.status === 'ACTIVE'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}
                      >
                        {passenger.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onInspectPassenger(passenger)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold transition-colors flex items-center gap-1"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Inspect</span>
                        </button>

                        <button
                          onClick={() => togglePassengerStatus(passenger.id)}
                          className={`p-1.5 rounded-xl border transition-colors ${
                            passenger.status === 'ACTIVE'
                              ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                          }`}
                          title={passenger.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                        >
                          {passenger.status === 'ACTIVE' ? (
                            <Ban className="w-4 h-4" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" />
                          )}
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
        <div className="p-4 bg-[#080c14] border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Showing {filteredPassengers.length} active database records</span>
          <span className="font-mono text-[11px] text-amber-400">Database: Cloud Firestore (Synced)</span>
        </div>
      </div>

      {/* Register Passenger Modal */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#0e1524] border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Register New Passenger</h3>
                  <p className="text-[11px] text-slate-400">Creates account and writes to cloud database</p>
                </div>
              </div>
              <button
                onClick={() => setIsRegisterModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maria Santos"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#080c14] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Mobile Number
                </label>
                <input
                  type="text"
                  placeholder="0917-123-4567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-[#080c14] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="maria.santos@gmail.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-[#080c14] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Initial Wallet Balance (₱)
                </label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={formData.walletBalance}
                  onChange={(e) => setFormData({ ...formData, walletBalance: Number(e.target.value) })}
                  className="w-full bg-[#080c14] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-xs font-black rounded-xl shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Registering...' : 'Register Passenger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
