import React, { useState } from 'react';
import {
  Settings,
  Save,
  CheckCircle2,
  DollarSign,
  Percent,
  ShieldAlert,
  Sliders,
  Database,
  RefreshCcw,
  Sparkles,
} from 'lucide-react';
import { useRealtimeDb } from '../../context/RealtimeDbContext';
import { SystemSettings } from '../../types';

export const SettingsView: React.FC = () => {
  const { systemSettings, updateSettings, resetToFactoryDefaults } = useRealtimeDb();
  const [formData, setFormData] = useState<SystemSettings>(systemSettings);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div id="settings-view-root" className="space-y-6 pb-12">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Top Header Card */}
        <div className="p-6 bg-[#0c121e] border border-slate-800 rounded-3xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-black text-white uppercase tracking-wider">
              System & Dispatch Configuration
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Fare calculation rules, commission rates, and safety telemetry parameters
            </p>
          </div>

          <div className="flex items-center gap-3">
            {savedSuccess && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/30 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4" />
                <span>Configuration Saved</span>
              </span>
            )}

            <button
              type="submit"
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-xs font-black rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4 stroke-[3]" />
              <span>SAVE CONFIGURATION</span>
            </button>
          </div>
        </div>

        {/* Form Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Section 1: Fare Calculation Rules */}
          <div className="p-6 bg-[#0c121e] border border-slate-800 rounded-3xl shadow-xl space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white uppercase tracking-wider">
                  Fare Calculation & Dynamic Metering
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">Philippine Peso base parameters</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Base Flagdown Fare (₱)
                </label>
                <input
                  type="number"
                  value={formData.baseFare}
                  onChange={(e) =>
                    setFormData({ ...formData, baseFare: Number(e.target.value) })
                  }
                  className="w-full bg-[#080c14] border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Per Km Rate (₱)
                  </label>
                  <input
                    type="number"
                    value={formData.perKmRate}
                    onChange={(e) =>
                      setFormData({ ...formData, perKmRate: Number(e.target.value) })
                    }
                    className="w-full bg-[#080c14] border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Per Minute Rate (₱)
                  </label>
                  <input
                    type="number"
                    value={formData.perMinRate}
                    onChange={(e) =>
                      setFormData({ ...formData, perMinRate: Number(e.target.value) })
                    }
                    className="w-full bg-[#080c14] border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Current Surge Multiplier
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.1"
                    value={formData.surgeMultiplier}
                    onChange={(e) =>
                      setFormData({ ...formData, surgeMultiplier: Number(e.target.value) })
                    }
                    className="flex-1 accent-amber-500 cursor-pointer"
                  />
                  <span className="font-mono font-black text-amber-400 text-sm bg-amber-500/10 px-3 py-1 rounded-xl border border-amber-500/30">
                    {formData.surgeMultiplier.toFixed(1)}x
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Platform Commission & Payouts */}
          <div className="p-6 bg-[#0c121e] border border-slate-800 rounded-3xl shadow-xl space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                <Percent className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white uppercase tracking-wider">
                  Platform Commission & Split
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">Automated batch ledger split rules</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Platform Take Rate (%)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={formData.commissionRate}
                    onChange={(e) =>
                      setFormData({ ...formData, commissionRate: Number(e.target.value) })
                    }
                    className="w-full bg-[#080c14] border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                  <span className="font-mono text-slate-400 text-xs whitespace-nowrap">
                    Driver keeps: {100 - formData.commissionRate}%
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Auto-Payout Batch Threshold (₱)
                </label>
                <input
                  type="number"
                  value={formData.autoPayoutThreshold}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      autoPayoutThreshold: Number(e.target.value),
                    })
                  }
                  className="w-full bg-[#080c14] border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Emergency Dispatch Hotlines
                </label>
                <input
                  type="text"
                  value={formData.emergencyHotlines}
                  onChange={(e) =>
                    setFormData({ ...formData, emergencyHotlines: e.target.value })
                  }
                  className="w-full bg-[#080c14] border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Realtime Engine & Factory Reset */}
        <div className="p-6 bg-[#0c121e] border border-slate-800 rounded-3xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-black text-white uppercase tracking-wider">
                Real-Time Multi-Tab Synchronization & Local Database
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Powered by BroadcastChannel & LocalStorage persistence with GPS telemetry drift
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (confirm('Reset database to clean initial state?')) {
                resetToFactoryDefaults();
                alert('Database restored to initial state.');
              }
            }}
            className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold rounded-xl transition-colors flex items-center gap-2 self-start sm:self-auto"
          >
            <RefreshCcw className="w-4 h-4" />
            <span>Reset Database Defaults</span>
          </button>
        </div>
      </form>
    </div>
  );
};
