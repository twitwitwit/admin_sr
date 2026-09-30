import React, { useState } from 'react';
import { Search, Car, Bike } from 'lucide-react';
import { useRealtimeDb } from '../../context/RealtimeDbContext';
import { Booking } from '../../types';
import { calculateTripFareBreakdown, formatHumanReadableTripId } from '../../utils/tripHelpers';
import { fetchOsrmRoute } from '../../utils/osrmRouting';

interface BookingsViewProps {
  onInspectBooking: (booking: Booking) => void;
}

export const BookingsView: React.FC<BookingsViewProps> = ({ onInspectBooking }) => {
  const { bookings, createBooking, exportCsvData, systemSettings } = useRealtimeDb();
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

  const formatBookingId = (id: string) => formatHumanReadableTripId(id);

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
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
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
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 sm:gap-3">
          <div className="relative flex-1 sm:flex-initial min-w-[180px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by booking, route, rider..."
              className="bg-[#080c14] border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 font-medium w-full sm:w-60"
            />
          </div>

          <button
            onClick={() => exportCsvData('bookings')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors cursor-pointer whitespace-nowrap"
          >
            Export
          </button>

          <button
            onClick={async () => {
              const pickupCoords: [number, number] = [14.6533, 121.0332]; // Trinoma Mall
              const dropoffCoords: [number, number] = [14.6398, 121.0784]; // Ateneo de Manila, Katipunan
              const osrm = await fetchOsrmRoute(pickupCoords, dropoffCoords);

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
                  vehicle: 'Toyota Vios (4-Wheel)',
                },
                route: {
                  pickup: 'Trinoma Mall, North EDSA',
                  dropoff: 'Ateneo de Manila, Katipunan',
                  pickupCoords,
                  dropoffCoords,
                  distanceKm: osrm.distanceKm,
                  normalDurationMins: osrm.durationMins,
                  estimatedDurationMins: osrm.durationMins + 20, // +20 mins traffic crawl
                },
                vehicleCategory: '4-WHEEL_TNVS',
                pricingMode: systemSettings.tnvsPricingMode || 'UPFRONT',
                paymentMethod: 'GCash',
                status: 'IN PROGRESS',
              });
            }}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-xs font-black rounded-xl shadow-lg shadow-amber-500/20 transition-all whitespace-nowrap cursor-pointer"
          >
            + New Dispatch
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
                <th className="py-3.5 px-6">Driver & Tariff Class</th>
                <th className="py-3.5 px-6">Route & Traffic Duration</th>
                <th className="py-3.5 px-6">Fare & Matrix</th>
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
                filteredBookings.map((booking, index) => {
                  const breakdown = calculateTripFareBreakdown(booking, systemSettings);
                  const isMC = breakdown.vehicleCategory === '2-WHEEL_MC';

                  return (
                    <tr
                      key={`booking-${booking.id || 'b'}-${index}`}
                      onClick={() => onInspectBooking(booking)}
                      title="Click to inspect trip invoice & route audit"
                      className="hover:bg-slate-900/50 transition-colors group cursor-pointer"
                    >
                      {/* Booking ID & Time */}
                      <td className="py-3.5 px-6">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-mono tabular-nums font-bold text-amber-400 text-xs">
                            {formatBookingId(booking.id)}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                            {booking.time}
                          </span>
                        </div>
                      </td>

                      {/* Passenger */}
                      <td className="py-3.5 px-6">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-white text-xs">
                            {booking.passenger.name}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                            {booking.passenger.phone}
                          </span>
                        </div>
                      </td>

                      {/* Driver & Tariff Class */}
                      <td className="py-3.5 px-6">
                        <div className="flex flex-col gap-1">
                          {booking.driverAssigned ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="font-semibold text-white text-xs">
                                {booking.driverAssigned.name}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                <span className="font-mono text-amber-400 font-semibold">
                                  {booking.driverAssigned.plateNumber}
                                </span>
                                <span className="mx-1.5 text-slate-600" aria-hidden="true">·</span>
                                <span>{booking.driverAssigned.vehicle}</span>
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-500 italic">Unassigned (Searching...)</span>
                          )}
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold ${
                              isMC ? 'text-cyan-400' : 'text-amber-400/90'
                            }`}
                          >
                            {isMC ? <Bike className="w-3 h-3" /> : <Car className="w-3 h-3" />}
                            {isMC ? '2-Wheel MC (Distance Matrix)' : '4-Wheel TNVS (LTFRB Matrix)'}
                          </span>
                        </div>
                      </td>

                      {/* Route & Traffic Duration */}
                      <td className="py-3.5 px-6">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            <span className="font-medium truncate max-w-[180px]">
                              {booking.route.pickup}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                            <span className="font-medium truncate max-w-[180px]">
                              {booking.route.dropoff}
                            </span>
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5 pt-0.5">
                            <span>{breakdown.distanceKm.toFixed(1)} km</span>
                            <span>•</span>
                            <span>{breakdown.estimatedDurationMins} mins</span>
                            {!isMC && breakdown.extraTrafficCrawlMins > 0 && (
                              <span className="text-amber-400 font-semibold">
                                (+₱{breakdown.trafficCrawlSurcharge.toFixed(0)} traffic)
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Fare & Payment */}
                      <td className="py-3.5 px-6">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono tabular-nums font-bold text-white text-xs">
                              ₱{breakdown.finalBilledFare.toFixed(2)}
                            </span>
                            {breakdown.surgeMultiplier > 1.0 && (
                              <span className="text-[10px] font-mono font-bold text-amber-400">
                                {breakdown.surgeMultiplier.toFixed(1)}x
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-medium text-emerald-400">
                            {booking.paymentMethod} • {breakdown.pricingMode === 'UPFRONT' ? 'Upfront' : 'Metered'}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-6">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                            booking.status === 'COMPLETED'
                              ? 'text-emerald-400'
                              : booking.status === 'CANCELLED'
                              ? 'text-rose-400'
                              : booking.status === 'IN PROGRESS'
                              ? 'text-amber-400'
                              : 'text-cyan-400'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              booking.status === 'COMPLETED'
                                ? 'bg-emerald-400'
                                : booking.status === 'CANCELLED'
                                ? 'bg-rose-400'
                                : booking.status === 'IN PROGRESS'
                                ? 'bg-amber-400 animate-pulse'
                                : 'bg-cyan-400'
                            }`}
                          />
                          {booking.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-6 text-right">
                        <button
                          onClick={() => onInspectBooking(booking)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold transition-colors ml-auto text-xs cursor-pointer border border-slate-700/80"
                        >
                          Open Invoice
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#080c14] border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
          <span>Showing {filteredBookings.length} bookings</span>
          <span className="font-mono text-[11px] text-amber-400">
            LTFRB 4-Wheel TNVS (₱{systemSettings.perMinRate}/min + Surge) & MC Taxi TWG Distance Matrix
          </span>
        </div>
      </div>
    </div>
  );
};

