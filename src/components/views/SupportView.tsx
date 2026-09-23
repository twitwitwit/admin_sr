import React, { useState } from 'react';
import {
  HelpCircle,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Clock,
  Send,
  User,
  X,
  Phone,
  DollarSign,
  ShieldAlert,
} from 'lucide-react';
import { useRealtimeDb } from '../../context/RealtimeDbContext';
import { SupportTicket } from '../../types';

interface SupportViewProps {
  onOpenCall: (name: string, phone: string, role: string) => void;
}

export const SupportView: React.FC<SupportViewProps> = ({ onOpenCall }) => {
  const { tickets, replyToTicket, resolveTicket, updatePassengerWallet } = useRealtimeDb();
  const [filterTab, setFilterTab] = useState<'ALL' | 'OPEN' | 'IN PROGRESS' | 'RESOLVED'>('ALL');
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [refundAmount, setRefundAmount] = useState('50');

  const filteredTickets = tickets.filter((t) => {
    if (filterTab === 'ALL') return true;
    return t.status === filterTab;
  });

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket || !replyText.trim()) return;

    replyToTicket(activeTicket.id, replyText);
    setReplyText('');

    // Update active modal ticket instance
    const updated = tickets.find((t) => t.id === activeTicket.id);
    if (updated) setActiveTicket(updated);
  };

  const handleIssueRefund = () => {
    if (!activeTicket) return;
    const amount = Number(refundAmount) || 50;
    replyToTicket(
      activeTicket.id,
      `[ADMIN ACTION] Customer courtesy refund of ₱${amount.toFixed(2)} has been credited to wallet.`,
      'RESOLVED'
    );
    resolveTicket(activeTicket.id);
  };

  return (
    <div id="support-view-root" className="space-y-6 pb-12">
      {/* Filter Tabs */}
      <div className="p-4 bg-[#0c121e] border border-slate-800 rounded-2xl shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          {['ALL', 'OPEN', 'IN PROGRESS', 'RESOLVED'].map((tab) => {
            const count =
              tab === 'ALL' ? tickets.length : tickets.filter((t) => t.status === tab).length;
            return (
              <button
                key={tab}
                onClick={() => setFilterTab(tab as any)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  filterTab === tab
                    ? 'bg-amber-500 text-black font-extrabold shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span>{tab}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    filterTab === tab ? 'bg-black text-amber-400 font-black' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tickets List */}
      <div className="space-y-4">
        {filteredTickets.map((ticket) => (
          <div
            key={ticket.id}
            className={`p-6 bg-[#0c121e] rounded-3xl border transition-all shadow-xl ${
              ticket.status === 'OPEN'
                ? 'border-amber-500/50 shadow-amber-950/10'
                : 'border-slate-800/80'
            }`}
          >
            {/* Top row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-mono font-black text-amber-400">{ticket.id}</span>
                <span
                  className={`text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase ${
                    ticket.priority === 'HIGH'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : ticket.priority === 'MEDIUM'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {ticket.priority} PRIORITY
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase ${
                    ticket.status === 'OPEN'
                      ? 'bg-pink-600/20 text-pink-400 border border-pink-500/30'
                      : ticket.status === 'RESOLVED'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {ticket.status}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>{ticket.createdAt}</span>
              </div>
            </div>

            {/* Subject & User */}
            <div className="my-3">
              <h4 className="text-base font-bold text-white">{ticket.subject}</h4>
              <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                <span className="text-amber-400 font-bold">{ticket.userName}</span>
                <span>({ticket.userRole})</span>
                {ticket.userPhone && (
                  <>
                    <span>•</span>
                    <span className="font-mono">{ticket.userPhone}</span>
                  </>
                )}
              </div>
            </div>

            {/* Initial Message Preview */}
            <div className="p-3.5 bg-[#080c14] border border-slate-800/80 rounded-2xl text-xs text-slate-300">
              <p>{ticket.messages[0]?.text}</p>
            </div>

            {/* Footer action */}
            <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {ticket.messages.length} message(s) in thread
              </span>

              <button
                onClick={() => setActiveTicket(ticket)}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-xs font-black rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Review & Reply</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Ticket Conversation & Resolution Modal */}
      {activeTicket && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-[#0c121e] border border-slate-700/80 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono font-black text-amber-400">
                    {activeTicket.id}
                  </span>
                  <span className="text-sm font-black text-white">{activeTicket.subject}</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Raised by {activeTicket.userName} ({activeTicket.userRole})
                </p>
              </div>
              <button
                onClick={() => setActiveTicket(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages Thread */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1 max-h-80">
              {activeTicket.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3.5 rounded-2xl text-xs max-w-[85%] ${
                    msg.isAdmin
                      ? 'ml-auto bg-amber-500/15 border border-amber-500/30 text-white'
                      : 'mr-auto bg-slate-900/80 border border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-[10px] mb-1 gap-4">
                    <span className={msg.isAdmin ? 'text-amber-400' : 'text-slate-400'}>
                      {msg.sender}
                    </span>
                    <span className="text-slate-500 font-mono">{msg.timestamp}</span>
                  </div>
                  <p className="leading-relaxed">{msg.text}</p>
                </div>
              ))}
            </div>

            {/* Admin Response Box */}
            <form onSubmit={handleSendReply} className="pt-3 border-t border-slate-800 space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type an official admin reply..."
                  className="flex-1 bg-[#080c14] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-medium"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </div>

              {/* Resolution & Quick Refund Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-bold">Courtesy Refund:</span>
                  <div className="relative w-24">
                    <span className="absolute left-2 top-1.5 text-xs text-slate-400 font-bold">₱</span>
                    <input
                      type="number"
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      className="w-full bg-[#080c14] border border-slate-800 rounded-lg pl-5 pr-2 py-1 text-xs text-white font-mono"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleIssueRefund}
                    className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-400 text-xs font-bold rounded-lg transition-colors"
                  >
                    Issue & Resolve
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    resolveTicket(activeTicket.id);
                    setActiveTicket(null);
                  }}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition-colors"
                >
                  Mark as Resolved
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
