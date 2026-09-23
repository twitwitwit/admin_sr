import React, { useState } from 'react';
import { Passenger } from '../../types';
import {
  X,
  User,
  Phone,
  Mail,
  Wallet,
  Star,
  Plus,
  Minus,
  CheckCircle2,
  Ban,
  Clock,
  Car,
} from 'lucide-react';
import { useRealtimeDb } from '../../context/RealtimeDbContext';

interface PassengerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  passenger: Passenger | null;
  onOpenCall?: (name: string, phone: string) => void;
}

export const PassengerDetailsModal: React.FC<PassengerDetailsModalProps> = ({
  isOpen,
  onClose,
  passenger,
  onOpenCall,
}) => {
  const { togglePassengerStatus, updatePassengerWallet, bookings } = useRealtimeDb();
  const [walletDelta, setWalletDelta] = useState<number>(100);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!isOpen || !passenger) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const passengerRides = bookings.filter((b) => b.passenger.name === passenger.name);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-[#0c121e] border border-slate-700/80 rounded-3xl p-6 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Passenger Account Details</h3>
              <p className="text-xs text-slate-400 font-mono">ID: {passenger.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="overflow-y-auto space-y-5 py-4 pr-1">
          {toastMessage && (
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Profile Overview */}
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img
                src={passenger.avatar}
                alt={passenger.name}
                className="w-16 h-16 rounded-2xl object-cover ring-2 ring-cyan-500/40"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-black text-white">{passenger.name}</h4>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-extrabold uppercase ${
                      passenger.status === 'ACTIVE'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}
                  >
                    {passenger.status}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 mt-1 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-cyan-400" />
                    {passenger.phone}
                  </span>
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-cyan-400" />
                    {passenger.email}
                  </span>
                </div>
              </div>
            </div>

            {onOpenCall && (
              <button
                onClick={() => onOpenCall(passenger.name, passenger.phone)}
                className="px-3.5 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-400 text-xs font-bold rounded-xl flex items-center gap-2 transition-colors whitespace-nowrap"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call Passenger</span>
              </button>
            )}
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-[#080c14] border border-slate-800/80 rounded-xl text-center">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Rating</span>
              <div className="flex items-center justify-center gap-1 mt-1">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="text-base font-black text-white">{passenger.rating.toFixed(1)}</span>
              </div>
            </div>
            <div className="p-3 bg-[#080c14] border border-slate-800/80 rounded-xl text-center">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Completed Rides</span>
              <span className="text-base font-black text-amber-400 mt-1 block font-mono">
                {passenger.completedRides}
              </span>
            </div>
            <div className="p-3 bg-[#080c14] border border-slate-800/80 rounded-xl text-center">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Wallet Balance</span>
              <span className="text-base font-black text-cyan-400 mt-1 block font-mono">
                ₱{passenger.walletBalance.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Live In-App Wallet Credit / Debit Console */}
          <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-cyan-400" />
                <span>Manage Digital Wallet & Credits</span>
              </h5>
              <span className="text-xs font-mono font-bold text-emerald-400">
                Current: ₱{passenger.walletBalance.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">₱</span>
                <input
                  type="number"
                  value={walletDelta}
                  onChange={(e) => setWalletDelta(Number(e.target.value))}
                  placeholder="Amount"
                  className="w-full bg-[#080c14] border border-slate-800 rounded-xl pl-7 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
              <button
                onClick={() => {
                  updatePassengerWallet(passenger.id, walletDelta);
                  showToast(`Successfully credited ₱${walletDelta.toFixed(2)} to ${passenger.name}'s wallet.`);
                }}
                className="px-3.5 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Credit Funds</span>
              </button>
              <button
                onClick={() => {
                  updatePassengerWallet(passenger.id, -walletDelta);
                  showToast(`Deducted ₱${walletDelta.toFixed(2)} from ${passenger.name}'s wallet.`);
                }}
                className="px-3.5 py-2 bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <Minus className="w-3.5 h-3.5" />
                <span>Deduct</span>
              </button>
            </div>
          </div>

          {/* Ride History Sample */}
          <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl">
            <h5 className="text-xs font-black uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
              <Car className="w-4 h-4 text-amber-400" />
              <span>Recent Ride History</span>
            </h5>
            {passengerRides.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No trips recorded in this session.</p>
            ) : (
              <div className="space-y-2">
                {passengerRides.map((ride) => (
                  <div
                    key={ride.id}
                    className="p-3 bg-[#080c14] border border-slate-800/80 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-amber-400">{ride.id}</span>
                        <span className="text-[10px] text-slate-500">{ride.time}</span>
                      </div>
                      <p className="text-slate-300 mt-0.5">
                        {ride.route.pickup} ➔ {ride.route.dropoff}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-white block">₱{ride.fare.toFixed(2)}</span>
                      <span className="text-[10px] text-emerald-400 font-bold">{ride.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            onClick={() => {
              togglePassengerStatus(passenger.id);
              showToast(
                `Passenger account ${
                  passenger.status === 'ACTIVE' ? 'SUSPENDED' : 'RESTORED'
                }`
              );
            }}
            className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-colors ${
              passenger.status === 'ACTIVE'
                ? 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'
            }`}
          >
            {passenger.status === 'ACTIVE' ? (
              <>
                <Ban className="w-4 h-4" />
                <span>Suspend Account</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Re-activate Account</span>
              </>
            )}
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
