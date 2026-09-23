import React, { useState } from 'react';
import { Booking, BookingStatus } from '../../types';
import {
  X,
  FileText,
  MapPin,
  Clock,
  User,
  Car,
  CreditCard,
  Printer,
  Download,
  CheckCircle2,
} from 'lucide-react';
import { useRealtimeDb } from '../../context/RealtimeDbContext';

interface TripInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
}

export const TripInvoiceModal: React.FC<TripInvoiceModalProps> = ({ isOpen, onClose, booking }) => {
  const { updateBookingStatus } = useRealtimeDb();
  const [selectedStatus, setSelectedStatus] = useState<BookingStatus>(booking?.status || 'COMPLETED');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!isOpen || !booking) return null;

  const baseFare = 45;
  const distanceFare = Math.max(0, booking.fare - baseFare);
  const platformCommission = booking.fare * 0.15;
  const driverPayout = booking.fare * 0.85;

  const handlePrint = () => {
    window.print();
  };

  const handleSaveStatus = () => {
    updateBookingStatus(booking.id, selectedStatus);
    setToastMessage(`Trip ${booking.id} status set to ${selectedStatus}`);
    setTimeout(() => setToastMessage(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-[#0c121e] border border-slate-700/80 rounded-3xl p-6 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Digital Trip Invoice & Route Audit</h3>
              <p className="text-xs text-amber-400 font-mono font-bold">{booking.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto space-y-4 py-4 pr-1">
          {toastMessage && (
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Route Visualizer Card */}
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                {booking.time}
              </span>
              <span className="font-mono text-slate-300">{booking.date}</span>
            </div>

            <div className="space-y-3 relative pl-6">
              {/* Vertical line connecting pickup and dropoff */}
              <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-slate-700"></div>

              <div className="relative">
                <span className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-[#0c121e]"></span>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Pickup Location</span>
                <span className="text-xs font-bold text-white block">{booking.route.pickup}</span>
              </div>

              <div className="relative">
                <span className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-red-500 ring-4 ring-[#0c121e]"></span>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Dropoff Destination</span>
                <span className="text-xs font-bold text-white block">{booking.route.dropoff}</span>
              </div>
            </div>
          </div>

          {/* Parties Involved */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-[#080c14] border border-slate-800 rounded-xl">
              <span className="text-[10px] uppercase text-slate-500 font-bold block flex items-center gap-1 mb-1">
                <User className="w-3 h-3 text-cyan-400" /> Passenger
              </span>
              <span className="font-bold text-white block">{booking.passenger.name}</span>
              <span className="text-[10px] text-slate-400 font-mono">{booking.passenger.phone}</span>
            </div>

            <div className="p-3 bg-[#080c14] border border-slate-800 rounded-xl">
              <span className="text-[10px] uppercase text-slate-500 font-bold block flex items-center gap-1 mb-1">
                <Car className="w-3 h-3 text-amber-400" /> Driver Assigned
              </span>
              <span className="font-bold text-white block">
                {booking.driverAssigned?.name || 'Unassigned / Auto-Dispatch'}
              </span>
              <span className="text-[10px] text-amber-400 font-mono font-bold">
                {booking.driverAssigned?.plateNumber || 'No Plate'}
              </span>
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="p-4 bg-[#080c14] border border-slate-800 rounded-2xl space-y-2 text-xs">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Itemized Fare Breakdown</span>
            <div className="flex justify-between text-slate-300">
              <span>Base Fare & Flagdown</span>
              <span className="font-mono">₱{baseFare.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Distance & Duration Rate</span>
              <span className="font-mono">₱{distanceFare.toFixed(2)}</span>
            </div>
            <div className="pt-2 border-t border-slate-800 flex justify-between font-black text-sm text-white">
              <span>Total Rider Fare</span>
              <span className="font-mono text-amber-400">₱{booking.fare.toFixed(2)}</span>
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <CreditCard className="w-3 h-3 text-emerald-400" /> Payment: {booking.paymentMethod}
              </span>
              <span className="font-mono text-emerald-400">
                Driver Net (85%): ₱{driverPayout.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Dispatch Status Override */}
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Dispatcher Status Override
            </span>
            <div className="flex items-center gap-2">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as BookingStatus)}
                className="flex-1 bg-[#080c14] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
              >
                <option value="REQUESTED">REQUESTED</option>
                <option value="ACCEPTED">ACCEPTED</option>
                <option value="ARRIVING">ARRIVING</option>
                <option value="IN PROGRESS">IN PROGRESS</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
              <button
                onClick={handleSaveStatus}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black rounded-lg transition-colors"
              >
                Update
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Receipt</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
