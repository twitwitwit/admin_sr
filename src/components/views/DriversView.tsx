import React, { useState } from 'react';
import {
  Search,
  Star,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { useRealtimeDb } from '../../context/RealtimeDbContext';
import { Driver, DriverStatus } from '../../types';
import { formatHumanReadableDriverId } from '../../utils/idHelpers';
import { getFallbackAvatarUrl, isCustomUploadedAvatar } from '../../utils/imageHelpers';

interface DriversViewProps {
  onInspectDriver: (driver: Driver) => void;
  onOpenCall: (name: string, phone: string, role: string) => void;
}

export const DriversView: React.FC<DriversViewProps> = ({ onInspectDriver, onOpenCall }) => {
  const { drivers, approveDriver, rejectDriver, exportCsvData, refreshCloudData } = useRealtimeDb();
  const [activeTab, setActiveTab] = useState<'active' | 'pending'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const activeDrivers = drivers.filter((d) => !d.isPendingAudit);
  const pendingDrivers = drivers.filter((d) => d.isPendingAudit);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await refreshCloudData();
    } finally {
      setTimeout(() => setIsSyncing(false), 800);
    }
  };

  const currentList = (activeTab === 'active' ? activeDrivers : pendingDrivers).filter((d) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        d.name.toLowerCase().includes(q) ||
        d.plateNumber.toLowerCase().includes(q) ||
        d.phone.includes(q) ||
        d.vehicleDetails.toLowerCase().includes(q) ||
        d.city.toLowerCase().includes(q) ||
        (d.submittedDate && d.submittedDate.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div id="drivers-view-root" className="space-y-6 pb-12">
      {/* Alert Banner when Requirements are Pending / Resubmitted */}
      {pendingDrivers.length > 0 && (
        <div className="p-4 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-amber-500/5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-amber-400 uppercase tracking-wider">
                Action Required: {pendingDrivers.length} Driver Verification{pendingDrivers.length > 1 ? 's' : ''} Awaiting Administrative Audit
              </span>
              <span className="text-[10px] bg-amber-500 text-black font-black px-2 py-0.5 rounded-full uppercase">
                Live Queue
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Driver partners have submitted or resubmitted credentials (NBI, OR/CR, or license) via the mobile app.
            </p>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={() => setActiveTab('pending')}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black rounded-xl shadow-md shadow-amber-500/20 transition-all whitespace-nowrap cursor-pointer"
            >
              Review Pending Audits ({pendingDrivers.length})
            </button>
          </div>
        </div>
      )}

      {/* Top Controls & Tab Selector */}
      <div className="p-4 bg-[#0c121e] border border-slate-800 rounded-2xl shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Fleet vs Pending Applications Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'active'
                ? 'bg-amber-500 text-black font-extrabold shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <span>Active Fleet</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full ${
                activeTab === 'active' ? 'bg-black text-amber-400 font-black' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {activeDrivers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'pending'
                ? 'bg-amber-500 text-black font-extrabold shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <span>Pending Applications & Audits</span>
            {pendingDrivers.length > 0 && (
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full ${
                  activeTab === 'pending' ? 'bg-black text-amber-400 font-black' : 'bg-amber-500 text-black font-black'
                }`}
              >
                {pendingDrivers.length}
              </span>
            )}
          </button>
        </div>

        {/* Search, Cloud Sync & Export */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 sm:gap-3">
          <div className="relative flex-1 sm:flex-initial min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by driver, plate, vehicle..."
              className="bg-[#080c14] border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 font-medium w-full sm:w-64"
            />
          </div>

          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
            title="Sync latest submissions from Firestore"
          >
            <span>{isSyncing ? 'Syncing...' : 'Sync Cloud'}</span>
          </button>

          <button
            onClick={() => exportCsvData('drivers')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors cursor-pointer whitespace-nowrap"
          >
            Export Fleet
          </button>
        </div>
      </div>

      {/* Drivers Table */}
      <div className="bg-[#0c121e] border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#080c14] text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-6">Driver Partner</th>
                <th className="py-3.5 px-6">Vehicle & Plate</th>
                <th className="py-3.5 px-6">City / Region</th>
                <th className="py-3.5 px-6">Rating & Trips</th>
                <th className="py-3.5 px-6">{activeTab === 'pending' ? 'Submission Status' : 'Acceptance'}</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {currentList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <ShieldCheck className="w-8 h-8 text-slate-600" />
                      <p className="text-sm font-bold text-slate-300">No driver records found in this queue</p>
                      <p className="text-xs text-slate-500">
                        {activeTab === 'pending'
                          ? 'All driver requirements are fully reviewed, or click "Sync Cloud" to fetch recent mobile updates.'
                          : 'Try adjusting your search criteria.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                currentList.map((driver, index) => (
                  <tr
                    key={`driver-${driver.id || 'drv'}-${driver.email || index}-${index}`}
                    onClick={() => onInspectDriver(driver)}
                    title="Click to open Driver Profile & Uploaded App Photos"
                    className="hover:bg-slate-900/60 transition-colors group cursor-pointer"
                  >
                    {/* Driver info */}
                    <td className="py-3.5 px-6">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white group-hover:text-amber-400 transition-colors text-sm block">{driver.name}</span>
                          <span className="text-[11px] font-mono text-amber-400">{formatHumanReadableDriverId(driver.id)}</span>
                          {driver.isResubmission && (
                            <span className="text-[10px] font-semibold text-amber-300">
                              · Resubmitted
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] text-slate-400 font-mono tabular-nums">{driver.phone}</span>
                          {(driver.uploadedRequirementsCount ?? 0) > 0 ? (
                            <span
                              className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                                (driver.uploadedRequirementsCount ?? 0) >= 5
                                  ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                                  : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                              }`}
                            >
                              {driver.uploadedRequirementsCount}/5 Photos Uploaded
                            </span>
                          ) : driver.isPendingAudit ? (
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 border border-slate-700 px-1.5 py-0.5 rounded">
                              0/5 Photos Uploaded
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </td>

                    {/* Vehicle */}
                    <td className="py-3.5 px-6">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-slate-200">{driver.vehicleDetails}</span>
                        <span className="text-xs font-mono font-bold text-amber-400">
                          {driver.plateNumber}
                        </span>
                      </div>
                    </td>

                    {/* City */}
                    <td className="py-3.5 px-6">
                      <span className="text-slate-300 font-medium">{driver.city}</span>
                    </td>

                    {/* Rating & Trips */}
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-1.5 font-mono tabular-nums">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span className="font-bold text-amber-400">{driver.rating.toFixed(2)}</span>
                        <span className="text-slate-600" aria-hidden="true">·</span>
                        <span className="text-xs text-slate-400">{driver.completedTrips} trips</span>
                      </div>
                    </td>

                    {/* Acceptance or Submission info */}
                    <td className="py-3.5 px-6">
                      {activeTab === 'pending' || driver.isPendingAudit ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[11px] font-semibold text-amber-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{driver.submittedDate || 'Pending Audit'}</span>
                          </span>
                          {driver.seminarAppointment?.bookingReference ? (
                            <span className="text-[11px] text-emerald-400 font-mono">
                              Seminar: {driver.seminarAppointment.bookingReference} ({driver.seminarAppointment.date || 'Booked'})
                            </span>
                          ) : (
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                              <span>License</span>
                              <span aria-hidden="true">·</span>
                              <span>OR/CR</span>
                              <span aria-hidden="true">·</span>
                              <span>NBI</span>
                              <span aria-hidden="true">·</span>
                              <span>Vehicle</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="font-mono tabular-nums font-bold text-emerald-400 text-xs">
                          {driver.acceptanceRate}%
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-6">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                          driver.isPendingAudit
                            ? 'text-amber-400'
                            : driver.isVerified && !driver.hasAttendedSeminar
                            ? 'text-emerald-300'
                            : driver.status === 'ONLINE'
                            ? 'text-emerald-400'
                            : driver.status === 'ON TRIP'
                            ? 'text-amber-400'
                            : driver.status === 'OFFLINE'
                            ? 'text-slate-400'
                            : 'text-rose-400'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            driver.isPendingAudit
                              ? 'bg-amber-400 animate-pulse'
                              : driver.status === 'ONLINE'
                              ? 'bg-emerald-400'
                              : driver.status === 'ON TRIP'
                              ? 'bg-amber-400'
                              : driver.status === 'OFFLINE'
                              ? 'bg-slate-500'
                              : 'bg-rose-500'
                          }`}
                        />
                        <span>
                          {driver.isPendingAudit
                            ? driver.isResubmission
                              ? 'Resubmission'
                              : 'Pending Audit'
                            : driver.isVerified && !driver.hasAttendedSeminar
                            ? 'Awaiting Seminar'
                            : driver.status}
                        </span>
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-6 text-right">
                      {driver.isPendingAudit ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onInspectDriver(driver)}
                            className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-all cursor-pointer whitespace-nowrap"
                            title="Open Slide-Over Dossier & Approve"
                          >
                            Inspect & Approve
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onInspectDriver(driver)}
                            className="px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold transition-colors text-xs cursor-pointer border border-slate-700/80 whitespace-nowrap"
                          >
                            Open Dossier
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-4 bg-[#080c14] border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
          <span>Active registered units: 2,315 Fleet Drivers</span>
          <span className="font-mono text-[11px] text-amber-400">Regulatory Compliant Network • Live Firestore Sync Active</span>
        </div>
      </div>
    </div>
  );
};
