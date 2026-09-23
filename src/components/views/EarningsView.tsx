import React from 'react';
import {
  DollarSign,
  TrendingUp,
  Percent,
  Download,
  Wallet,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Car,
} from 'lucide-react';
import { useRealtimeDb } from '../../context/RealtimeDbContext';

export const EarningsView: React.FC = () => {
  const { exportCsvData } = useRealtimeDb();

  const settlements = [
    {
      id: 'PAY-8912',
      driver: 'Juan Dela Cruz',
      plate: 'NDA 1234',
      amount: 8450.0,
      method: 'GCash (0917-888-1234)',
      status: 'PAID',
      date: 'Today, 09:00 AM',
    },
    {
      id: 'PAY-8911',
      driver: 'Mark Reyes',
      plate: 'DEF 5678',
      amount: 6120.0,
      method: 'Maya (0918-222-3344)',
      status: 'PAID',
      date: 'Today, 09:00 AM',
    },
    {
      id: 'PAY-8910',
      driver: 'Ana Garcia',
      plate: 'GHI 9101',
      amount: 11200.0,
      method: 'BDO Unibank',
      status: 'PAID',
      date: 'Yesterday, 05:30 PM',
    },
    {
      id: 'PAY-8909',
      driver: 'Rogelio Cruz',
      plate: 'JKL 2345',
      amount: 4350.0,
      method: 'GCash (0933-111-4455)',
      status: 'PROCESSING',
      date: 'Yesterday, 05:30 PM',
    },
  ];

  return (
    <div id="earnings-view-root" className="space-y-6 pb-12">
      {/* 3 Large KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Gross Volume */}
        <div className="p-6 bg-[#0c121e] border border-slate-800 rounded-3xl shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Gross Platform Volume</span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black text-white font-mono">₱2,450,000.00</span>
            <div className="flex items-center gap-1 mt-1 text-xs font-bold text-emerald-400">
              <ArrowUpRight className="w-4 h-4" />
              <span>+12.8% vs last month</span>
            </div>
          </div>
        </div>

        {/* Platform Commission */}
        <div className="p-6 bg-[#0c121e] border border-slate-800 rounded-3xl shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Platform Commission (15%)</span>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
              <Percent className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black text-amber-400 font-mono">₱367,500.00</span>
            <span className="text-xs font-bold text-slate-400 mt-1 block">
              Net SwiftRide Retained Revenue
            </span>
          </div>
        </div>

        {/* Driver Partner Payouts */}
        <div className="p-6 bg-[#0c121e] border border-slate-800 rounded-3xl shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Driver Partner Payouts (85%)</span>
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black text-cyan-400 font-mono">₱2,082,500.00</span>
            <span className="text-xs font-bold text-slate-400 mt-1 block">
              Settled Direct to GCash / Bank Accounts
            </span>
          </div>
        </div>
      </div>

      {/* Weekly Settlement Graph & Export Header */}
      <div className="p-6 bg-[#0c121e] border border-slate-800 rounded-3xl shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider">Weekly Settlement Breakdown</h3>
            <p className="text-xs text-slate-400 mt-0.5">Automated batch reconciliation logs for Metro Manila fleet</p>
          </div>

          <button
            onClick={() => exportCsvData('earnings')}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-xs font-black rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 self-start sm:self-auto"
          >
            <Download className="w-4 h-4 stroke-[3]" />
            <span>DOWNLOAD FINANCIAL LEDGER</span>
          </button>
        </div>

        {/* Bar Chart Visualization */}
        <div className="h-56 w-full flex items-end justify-between gap-4 pt-4 px-4">
          {[
            { day: 'Monday', vol: '₱210,000', driver: '₱178,500', comm: '₱31,500', h: 60 },
            { day: 'Tuesday', vol: '₱245,000', driver: '₱208,250', comm: '₱36,750', h: 70 },
            { day: 'Wednesday', vol: '₱260,000', driver: '₱221,000', comm: '₱39,000', h: 75 },
            { day: 'Thursday', vol: '₱310,000', driver: '₱263,500', comm: '₱46,500', h: 85 },
            { day: 'Friday', vol: '₱345,000', driver: '₱293,250', comm: '₱51,750', h: 100, peak: true },
            { day: 'Saturday', vol: '₱360,000', driver: '₱306,000', comm: '₱54,000', h: 95 },
            { day: 'Sunday', vol: '₱280,000', driver: '₱238,000', comm: '₱42,000', h: 80 },
          ].map((bar) => (
            <div key={bar.day} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
              <span className="text-[10px] font-mono text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {bar.vol}
              </span>
              <div
                className={`w-full rounded-t-xl transition-all duration-300 ${
                  bar.peak
                    ? 'bg-gradient-to-t from-amber-600 via-amber-500 to-yellow-400 shadow-[0_0_20px_rgba(245,158,11,0.5)]'
                    : 'bg-slate-800 hover:bg-slate-700'
                }`}
                style={{ height: `${bar.h}%` }}
              ></div>
              <span className={`text-[11px] font-bold ${bar.peak ? 'text-amber-400 font-black' : 'text-slate-500'}`}>
                {bar.day.slice(0, 3)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Driver Payout Settlement Table */}
      <div className="bg-[#0c121e] border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-black text-white uppercase tracking-wider">
              Recent Driver Partner Cashout Settlements
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">Automated batch payouts via Bangko Sentral ng Pilipinas rails</p>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
            Next Batch: 02:00 PM PHT
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#080c14] text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-6">Settlement ID</th>
                <th className="py-3.5 px-6">Driver Partner</th>
                <th className="py-3.5 px-6">Disbursement Channel</th>
                <th className="py-3.5 px-6">Net Cashout Amount</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {settlements.map((item) => (
                <tr key={item.id} className="hover:bg-slate-900/50 transition-colors">
                  <td className="py-4 px-6 font-mono font-bold text-amber-400">{item.id}</td>
                  <td className="py-4 px-6">
                    <div>
                      <span className="font-bold text-white block">{item.driver}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{item.plate}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-slate-300 font-medium">{item.method}</td>
                  <td className="py-4 px-6 font-mono font-black text-emerald-400 text-sm">
                    ₱{item.amount.toFixed(2)}
                  </td>
                  <td className="py-4 px-6">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                        item.status === 'PAID'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-slate-400 font-mono text-[11px]">{item.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
