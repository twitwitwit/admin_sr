import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Check,
  X,
  Lock,
  RotateCcw,
  AlertTriangle,
  Copy,
  Clock,
  ShieldAlert,
  Key,
  Car,
  Bike,
  Database,
} from 'lucide-react';
import { useRealtimeDb } from '../../context/RealtimeDbContext';
import { SystemSettings } from '../../types';
import { CreateAdminAccountModal } from '../modals/CreateAdminAccountModal';
import { FirestoreDatabaseInspector } from '../database/FirestoreDatabaseInspector';

export const SettingsView: React.FC = () => {
  const {
    systemSettings,
    updateSettings,
    currentAdminUser,
    adminAccounts,
    passwordResetReports,
    approvePasswordResetReport,
    rejectPasswordResetReport,
    toggleAdminAccountStatus,
  } = useRealtimeDb();

  const [activeTab, setActiveTab] = useState<'system' | 'users' | 'reset-requests' | 'database'>('system');
  const [selectedVehicleTier, setSelectedVehicleTier] = useState<'4wheel' | '2wheel'>('4wheel');
  const [formData, setFormData] = useState<SystemSettings>({
    ...systemSettings,
    tnvsPricingMode: systemSettings.tnvsPricingMode || 'UPFRONT',
    mcBaseFare: systemSettings.mcBaseFare ?? 50,
    mcPerKmRate: systemSettings.mcPerKmRate ?? 10,
    mcPerMinRate: systemSettings.mcPerMinRate ?? 0,
    mcSurgeMultiplier: systemSettings.mcSurgeMultiplier ?? 1.0,
  });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Password Reset Approval State
  const [approvedResult, setApprovedResult] = useState<{ id: string; email: string; tempPwd: string } | null>(null);
  const [copiedPwd, setCopiedPwd] = useState(false);

  const handleSubmitSystem = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Sample trip preview (8.5 km, 45 mins in traffic)
  const sampleKm = 8.5;
  const sampleMins = 45;
  const sample4WheelFare =
    (Number(formData.baseFare || 45) +
      sampleKm * Number(formData.perKmRate || 15) +
      sampleMins * Number(formData.perMinRate || 2)) *
    Number(formData.surgeMultiplier || 1.0);
  const sample2WheelFare =
    (Number(formData.mcBaseFare ?? 50) +
      sampleKm * Number(formData.mcPerKmRate ?? 10) +
      sampleMins * Number(formData.mcPerMinRate ?? 0)) *
    Number(formData.mcSurgeMultiplier ?? 1.0);

  const handleApproveReset = async (requestId: string, userEmail: string) => {
    const res = await approvePasswordResetReport(requestId);
    if (res.success) {
      setApprovedResult({
        id: requestId,
        email: userEmail,
        tempPwd: res.tempPassword,
      });
    }
  };

  const handleRejectReset = async (requestId: string) => {
    await rejectPasswordResetReport(requestId);
  };

  const pendingReportsCount = passwordResetReports.filter((r) => r.status === 'PENDING').length;

  return (
    <div id="settings-view-root" className="space-y-6 pb-12 select-none">
      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 p-1.5 bg-[#0c121e] border border-slate-800 rounded-2xl w-full sm:w-fit">
        <button
          onClick={() => setActiveTab('system')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'system'
              ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <span>System & Metering Rules</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'users'
              ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Admin User Roster</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-amber-400 font-mono">
            {adminAccounts.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('reset-requests')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer relative ${
            activeTab === 'reset-requests'
              ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          <span>Password Reset Reports</span>
          {pendingReportsCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-500 text-white font-black animate-pulse">
              {pendingReportsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('database')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'database'
              ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Firestore Database</span>
        </button>
      </div>

      {activeTab === 'system' && (
        <form onSubmit={handleSubmitSystem} className="space-y-6">
          {/* Top Header Card */}
          <div className="p-6 bg-[#0c121e] border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white font-display">
                System & Fare Configuration
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Manage fare calculation rates for 4-wheel vehicles and 2-wheel motorcycles, platform commission, and dispatch hotlines.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {savedSuccess && (
                <span className="text-xs text-emerald-400 font-semibold">
                  Settings saved
                </span>
              )}

              <button
                type="submit"
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-xl transition-colors cursor-pointer whitespace-nowrap"
              >
                Save Configuration
              </button>
            </div>
          </div>

          {/* Clean 2-Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Left Column: Fare Calculation & Metering */}
            <div className="p-6 bg-[#0c121e] border border-slate-800 rounded-2xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <h4 className="text-sm font-bold text-white">Fare Calculation Rules</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Select a vehicle type to adjust its base rate, distance, and traffic rules
                  </p>
                </div>

                {/* Clean Vehicle Type Switcher */}
                <div className="flex items-center gap-1 p-1 bg-[#080c14] border border-slate-800 rounded-xl self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setSelectedVehicleTier('4wheel')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      selectedVehicleTier === '4wheel'
                        ? 'bg-amber-500 text-black font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Car className="w-3.5 h-3.5" />
                    <span>4-Wheel Car</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedVehicleTier('2wheel')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      selectedVehicleTier === '2wheel'
                        ? 'bg-amber-500 text-black font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Bike className="w-3.5 h-3.5" />
                    <span>2-Wheel Motorcycle</span>
                  </button>
                </div>
              </div>

              {selectedVehicleTier === '4wheel' ? (
                /* 4-Wheel Vehicle Controls */
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        Base Flagdown (₱)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={formData.baseFare}
                        onChange={(e) => setFormData({ ...formData, baseFare: Number(e.target.value) })}
                        className="w-full bg-[#080c14] border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        Distance Rate (₱/km)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={formData.perKmRate}
                        onChange={(e) => setFormData({ ...formData, perKmRate: Number(e.target.value) })}
                        className="w-full bg-[#080c14] border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        Travel Time Rate (₱/min)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={formData.perMinRate}
                        onChange={(e) => setFormData({ ...formData, perMinRate: Number(e.target.value) })}
                        className="w-full bg-[#080c14] border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    4-wheel vehicles charge <strong className="text-slate-200 font-mono">₱{(formData.perMinRate || 2).toFixed(2)}/min</strong> for travel duration. An extra 30 minutes in heavy traffic adds <strong className="text-amber-400 font-mono">₱{(30 * (formData.perMinRate || 2)).toFixed(2)}</strong> to the trip fare.
                  </p>

                  {/* Fare Adjustment Mode */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-2">
                      Traffic Fare Calculation Mode
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, tnvsPricingMode: 'UPFRONT' })}
                        className={`p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                          (formData.tnvsPricingMode || 'UPFRONT') === 'UPFRONT'
                            ? 'bg-amber-500/10 border-amber-500/50 text-white'
                            : 'bg-[#080c14] border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">Upfront Fixed Price</span>
                          {(formData.tnvsPricingMode || 'UPFRONT') === 'UPFRONT' && (
                            <Check className="w-3.5 h-3.5 text-amber-400" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Estimates traffic time at booking request and locks in the total price upfront.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, tnvsPricingMode: 'METERED' })}
                        className={`p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                          formData.tnvsPricingMode === 'METERED'
                            ? 'bg-amber-500/10 border-amber-500/50 text-white'
                            : 'bg-[#080c14] border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">Live Metered Fare</span>
                          {formData.tnvsPricingMode === 'METERED' && (
                            <Check className="w-3.5 h-3.5 text-amber-400" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Calculates distance plus live waiting and stop time during the trip.
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Surge Multiplier */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-slate-300">
                        4-Wheel Surge Multiplier (Peak Rush Hour)
                      </label>
                      <span className="font-mono font-bold text-amber-400 text-sm">
                        {formData.surgeMultiplier.toFixed(1)}x
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="2.0"
                      step="0.1"
                      value={formData.surgeMultiplier}
                      onChange={(e) => setFormData({ ...formData, surgeMultiplier: Number(e.target.value) })}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[11px] text-slate-500 font-mono mt-1">
                      <span>1.0x (Standard)</span>
                      <span>1.5x (Moderate Traffic)</span>
                      <span>2.0x (Max Cap)</span>
                    </div>
                  </div>
                </div>
              ) : (
                /* 2-Wheel Motorcycle Controls */
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        Base Fare (₱)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={formData.mcBaseFare ?? 50}
                        onChange={(e) => setFormData({ ...formData, mcBaseFare: Number(e.target.value) })}
                        className="w-full bg-[#080c14] border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        Distance Rate (₱/km)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={formData.mcPerKmRate ?? 10}
                        onChange={(e) => setFormData({ ...formData, mcPerKmRate: Number(e.target.value) })}
                        className="w-full bg-[#080c14] border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">
                        Traffic Time Fee (₱/min)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={formData.mcPerMinRate ?? 0}
                        onChange={(e) => setFormData({ ...formData, mcPerMinRate: Number(e.target.value) })}
                        className="w-full bg-[#080c14] border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-300 font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    2-wheel motorcycle fares are primarily calculated by <strong className="text-slate-200">distance rather than travel time</strong> (<strong className="text-emerald-400 font-mono">₱{(formData.mcPerMinRate ?? 0).toFixed(2)}/min</strong> waiting fee), keeping fares stable even during standstill traffic.
                  </p>

                  {/* Surge Multiplier */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-slate-300">
                        2-Wheel Surge Multiplier (Peak Demand / Rain)
                      </label>
                      <span className="font-mono font-bold text-amber-400 text-sm">
                        {(formData.mcSurgeMultiplier ?? 1.0).toFixed(1)}x
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="2.0"
                      step="0.1"
                      value={formData.mcSurgeMultiplier ?? 1.0}
                      onChange={(e) => setFormData({ ...formData, mcSurgeMultiplier: Number(e.target.value) })}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[11px] text-slate-500 font-mono mt-1">
                      <span>1.0x (Normal)</span>
                      <span>1.5x (Peak Rush)</span>
                      <span>2.0x (Heavy Rain / High Demand)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Simple Sample Trip Preview Bar */}
              <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <span className="text-slate-400">
                  Sample Trip Estimate ({sampleKm} km · {sampleMins} mins in traffic):
                </span>
                <div className="flex items-center gap-4 font-mono">
                  <span className="text-slate-300">
                    4-Wheel: <strong className="text-amber-400">₱{sample4WheelFare.toFixed(2)}</strong>
                  </span>
                  <span className="text-slate-600">·</span>
                  <span className="text-slate-300">
                    2-Wheel: <strong className="text-cyan-400">₱{sample2WheelFare.toFixed(2)}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Platform Commission & Payouts */}
            <div className="p-6 bg-[#0c121e] border border-slate-800 rounded-2xl space-y-5">
              <div className="border-b border-slate-800 pb-4">
                <h4 className="text-sm font-bold text-white">
                  Platform Commission & Dispatch
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Driver earnings split, payout threshold, and emergency contact numbers
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Platform Commission Rate (%)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={formData.commissionRate}
                      onChange={(e) => setFormData({ ...formData, commissionRate: Number(e.target.value) })}
                      className="w-full bg-[#080c14] border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                    />
                    <span className="font-mono text-slate-400 text-xs whitespace-nowrap">
                      Driver keeps: {100 - formData.commissionRate}%
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Auto-Payout Batch Threshold (₱)
                  </label>
                  <input
                    type="number"
                    value={formData.autoPayoutThreshold}
                    onChange={(e) => setFormData({ ...formData, autoPayoutThreshold: Number(e.target.value) })}
                    className="w-full bg-[#080c14] border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Emergency Dispatch Hotlines
                  </label>
                  <input
                    type="text"
                    value={formData.emergencyHotlines}
                    onChange={(e) => setFormData({ ...formData, emergencyHotlines: e.target.value })}
                    className="w-full bg-[#080c14] border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Top Banner */}
          <div className="p-6 bg-[#0c121e] border border-slate-800 rounded-3xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-wider">
                Administrative Accounts & Role Access
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Provision new operational staff (Fleet Managers, Safety Dispatchers) with hashed credentials & temporary passwords.
              </p>
            </div>

            {currentAdminUser.role === 'Super Admin' && (
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-xs font-black rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto"
              >
                <UserPlus className="w-4 h-4" />
                <span>CREATE NEW ADMIN ACCOUNT</span>
              </button>
            )}
          </div>

          {/* Admin Roster Table */}
          <div className="bg-[#0c121e] border border-slate-800 rounded-3xl shadow-xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Active Operational Accounts ({adminAccounts.length})
              </span>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full font-bold">
                • Hashed Password Security Enabled
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#080c14] text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                  <tr>
                    <th className="p-4">Administrator</th>
                    <th className="p-4">Assigned Role</th>
                    <th className="p-4">Security Status</th>
                    <th className="p-4">Created Date</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {adminAccounts.map((account) => (
                    <tr key={account.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={account.avatar}
                            alt={account.name}
                            className="w-9 h-9 rounded-full object-cover border border-slate-700"
                          />
                          <div>
                            <div className="font-bold text-white flex items-center gap-2">
                              <span>{account.name}</span>
                              <span className="text-[10px] font-mono text-slate-500">#{account.id}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">{account.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            account.role === 'Super Admin'
                              ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400'
                              : account.role === 'Fleet Manager'
                              ? 'bg-blue-500/15 border border-blue-500/30 text-blue-400'
                              : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                          }`}
                        >
                          {account.role}
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="space-y-1">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              account.status === 'ACTIVE'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}
                          >
                            {account.status}
                          </span>

                          {account.mustChangePassword && (
                            <div className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                              <Lock className="w-3 h-3" />
                              <span>Temp Password (Reset Required)</span>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="p-4 text-slate-400 font-mono text-[11px]">
                        {new Date(account.createdAt).toLocaleDateString()}
                      </td>

                      <td className="p-4 text-right">
                        {currentAdminUser.role === 'Super Admin' && account.role !== 'Super Admin' && (
                          <button
                            type="button"
                            onClick={() => toggleAdminAccountStatus(account.id)}
                            className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                              account.status === 'ACTIVE'
                                ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                            }`}
                          >
                            {account.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'reset-requests' && (
        <div className="space-y-6">
          {/* Top Banner */}
          <div className="p-6 bg-[#0c121e] border border-slate-800 rounded-3xl shadow-xl">
            <h3 className="text-base font-black text-white uppercase tracking-wider">
              Password Reset Reports & Verification
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              When administrators forget their password, their reports appear here for Super Admin verification and temp credential issuance.
            </p>
          </div>

          {approvedResult && (
            <div className="p-5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <ShieldCheck className="w-5 h-5" />
                <span>Password Reset Approved & Temporary Password Issued!</span>
              </div>
              <div className="p-3 bg-black/60 rounded-xl font-mono text-xs flex justify-between items-center">
                <span>
                  Target Email: <strong className="text-white">{approvedResult.email}</strong>
                </span>
                <span>
                  Issued Temp Pass: <strong className="text-amber-400">{approvedResult.tempPwd}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(`Temp Password for ${approvedResult.email}: ${approvedResult.tempPwd}`);
                  setCopiedPwd(true);
                  setTimeout(() => setCopiedPwd(false), 2000);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center gap-2"
              >
                {copiedPwd ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedPwd ? 'Copied to Clipboard!' : 'Copy Temporary Password'}</span>
              </button>
            </div>
          )}

          {/* Reset Reports Table */}
          <div className="bg-[#0c121e] border border-slate-800 rounded-3xl shadow-xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Reset Reports Queue ({passwordResetReports.length})
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#080c14] text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                  <tr>
                    <th className="p-4">Report ID</th>
                    <th className="p-4">User Email</th>
                    <th className="p-4">Report Reason / Details</th>
                    <th className="p-4">Submitted At</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Verification Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {passwordResetReports.map((report) => (
                    <tr key={report.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="p-4 font-mono text-amber-400 font-bold">{report.id}</td>
                      <td className="p-4 font-bold text-white">{report.userEmail}</td>
                      <td className="p-4 text-slate-300 max-w-xs">{report.reason}</td>
                      <td className="p-4 text-slate-400 font-mono text-[11px]">
                        {new Date(report.requestedAt).toLocaleString()}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            report.status === 'PENDING'
                              ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400 animate-pulse'
                              : report.status === 'APPROVED'
                              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                              : 'bg-red-500/15 border border-red-500/30 text-red-400'
                          }`}
                        >
                          {report.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {report.status === 'PENDING' && currentAdminUser.role === 'Super Admin' && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleApproveReset(report.id, report.userEmail)}
                              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-[10px] rounded-lg flex items-center gap-1 uppercase tracking-wider cursor-pointer"
                            >
                              <Check className="w-3 h-3 stroke-[3]" />
                              <span>Verify & Issue Temp Pass</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectReset(report.id)}
                              className="px-3 py-1.5 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 font-bold text-[10px] rounded-lg flex items-center gap-1 uppercase tracking-wider cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                              <span>Reject</span>
                            </button>
                          </div>
                        )}
                        {report.status === 'APPROVED' && report.tempPasswordGenerated && (
                          <span className="font-mono text-amber-400 font-bold text-[11px]">
                            Temp: {report.tempPasswordGenerated}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'database' && <FirestoreDatabaseInspector />}

      {/* Create Admin Account Modal */}
      <CreateAdminAccountModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
};
