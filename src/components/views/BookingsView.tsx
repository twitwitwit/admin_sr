import React, { useState } from 'react';
import {
  CalendarDays,
  Search,
  Download,
  Plus,
  Eye,
  FileText,
  Clock,
  MapPin,
  Car,
  User,
  CreditCard,
} from 'lucide-react';
import { useRealtimeDb } from '../../context/RealtimeDbContext';
import { Booking, BookingStatus } from '../../types';

interface BookingsViewProps {
  onInspectBooking: (booking: Booking) => void;
}

export const BookingsView: React.FC<BookingsViewProps> = ({ onInspectBooking }) => {
  const { bookings, createBooking, exportCsvData } = useRealtimeDb();
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const statusList = [
    'All',
    'Requested',
    'Accepted',
    'Arriving',
    'In Progress',
    'Completed',
    'Cancelled',
  ];

  const formatBookingId = (id: string) => {
    if (id.startsWith('#TRIP-')) return id;
    if (id.length > 10) return `#BK-${id.slice(-6).toUpperCase()}`;
    return `#${id.toUpperCase()}`;
  };

  const filteredBookings = bookings.filter((b) => {
    if (selectedStatus !== 'All' && b.status.toUpperCase() !== selectedStatus.toUpperCase()) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        b.id.toLowerCase().includes(q) ||
        b.passenger.name.toLowerCase().includes(q) ||
        b.route.pickup.toLowerCase().includes(q) ||
        b.route.dropoff.toLowerCase().includes(q) ||
        (b.driverAssigned && b.driverAssigned.name.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div id="bookings-view-root" className="space-y-6 pb-12">
      {/* Top Controls & Status Tabs */}
      <div className="p-4 bg-[#0c121e] border border-slate-800 rounded-2xl shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          {statusList.map((st) => {
            const count =
              st === 'All'
                ? bookings.length
                : bookings.filter((b) => b.status.toUpperCase() === st.toUpperCase()).length;

            return (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  selectedStatus === st
                    ? 'bg-amber-500 text-black font-extrabold shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span>{st}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    selectedStatus === st
                      ? 'bg-black text-amber-400 font-black'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Tools */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by booking, route, rider..."
              className="bg-[#080c14] border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 font-medium w-60"
            />
          </div>

          <button
            onClick={() => exportCsvData('bookings')}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 border border-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Export</span>
          </button>

          <button
            onClick={() =>
              createBooking({
                passenger: {
                  id: 'PAS-102',
                  name: 'Maria Santos',
                  phone: '0917 123 4567',
                },
                driverAssigned: {
                  id: 'DRV-201',
                  name: 'Juan Dela Cruz',
                  plateNumber: 'NDA 1234',
                  vehicle: 'Toyota Vios',
                },
                route: {
                  pickup: 'Trinoma Mall, North EDSA',
                  dropoff: 'Ateneo de Manila, Katipunan',
                  distanceKm: 8.5,
                },
                fare: 165.0,
                paymentMethod: 'GCash',
                status: 'IN PROGRESS',
              })
            }
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-xs font-black rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ New Dispatch</span>
          </button>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-[#0c121e] border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#080c14] text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-6">Booking ID & Time</th>
                <th className="py-3.5 px-6">Passenger</th>
                <th className="py-3.5 px-6">Driver Assigned</th>
                <th className="py-3.5 px-6">Route Details</th>
                <th className="py-3.5 px-6">Fare & Payment</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No bookings found matching selected filters.
                  </td>
                </tr>
              ) : (
                filteredBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-slate-900/50 transition-colors group">
                    {/* Booking ID & Time */}
                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-mono font-black text-amber-400 text-sm">
                          {formatBookingId(booking.id)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {booking.time}
                        </span>
                      </div>
                    </td>

                    {/* Passenger */}
                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-white text-sm">
                          {booking.passenger.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {booking.passenger.phone}
                        </span>
                      </div>
                    </td>

                    {/* Driver */}
                    <td className="py-4 px-6">
                      {booking.driverAssigned ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-white">
                            {booking.driverAssigned.name}
                          </span>
                          <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded w-fit">
                            {booking.driverAssigned.plateNumber} • {booking.driverAssigned.vehicle}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">Unassigned (Searching...)</span>
                      )}
                    </td>

                    {/* Route Details */}
                    <td className="py-4 px-6">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                          <span className="font-medium truncate max-w-[180px]">
                            {booking.route.pickup}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <span className="w-2 h-2 rounded-full bg-red-400"></span>
                          <span className="font-medium truncate max-w-[180px]">
                            {booking.route.dropoff}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Fare & Payment */}
                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-mono font-black text-white text-sm">
                          ₱{booking.fare.toFixed(2)}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-400">
                          {booking.paymentMethod}
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-6">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          booking.status === 'COMPLETED'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : booking.status === 'CANCELLED'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : booking.status === 'IN PROGRESS'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                            : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                        }`}
                      >
                        {booking.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => onInspectBooking(booking)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold transition-colors flex items-center gap-1.5 ml-auto"
                      >
                        <FileText className="w-3.5 h-3.5 text-amber-400" />
                        <span>Invoice</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#080c14] border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Showing {filteredBookings.length} bookings</span>
          <span className="font-mono text-[11px] text-amber-400">Real-time GPS Fare Metering</span>
        </div>
      </div>
    </div>
  );
};
