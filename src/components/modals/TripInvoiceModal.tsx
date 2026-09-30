import React, { useState } from 'react';
import { Booking, BookingStatus } from '../../types';
import {
  X,
  FileText,
  Clock,
  User,
  Car,
  Bike,
  CreditCard,
  Printer,
  CheckCircle2,
  Zap,
  MapPin,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { useRealtimeDb } from '../../context/RealtimeDbContext';
import { calculateTripFareBreakdown, formatHumanReadableTripId } from '../../utils/tripHelpers';
import { queryGoogleMapsGrounding, MapsGroundingResult } from '../../utils/mapsGroundingService';

interface TripInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
}

export const TripInvoiceModal: React.FC<TripInvoiceModalProps> = ({ isOpen, onClose, booking }) => {
  const { updateBookingStatus, systemSettings } = useRealtimeDb();
  const [selectedStatus, setSelectedStatus] = useState<BookingStatus>(booking?.status || 'COMPLETED');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [groundedRoute, setGroundedRoute] = useState<MapsGroundingResult | null>(null);
  const [isGroundingRoute, setIsGroundingRoute] = useState(false);

  React.useEffect(() => {
    if (booking?.status) {
      setSelectedStatus(booking.status);
    }
    setGroundedRoute(null);
  }, [booking?.id, booking?.status]);

  if (!isOpen || !booking) return null;

  const breakdown = calculateTripFareBreakdown(booking, systemSettings);
  const isMC = breakdown.vehicleCategory === '2-WHEEL_MC';

  const handlePrint = () => {
    window.print();
  };

  const handleSaveStatus = () => {
    updateBookingStatus(booking.id, selectedStatus);
    setToastMessage(`Trip ${booking.id} status set to ${selectedStatus}`);
    setTimeout(() => setToastMessage(null), 2500);
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex justify-end animate-in fade-in duration-150"
    >
      <div className="w-full max-w-lg h-full bg-[#0a0f1d] border-l border-slate-800 p-6 shadow-2xl overflow-hidden flex flex-col justify-between animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Digital Trip Invoice & Route Audit</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-amber-400 font-mono font-bold">
                  {formatHumanReadableTripId(booking.id)}
                </span>
                {booking.id !== formatHumanReadableTripId(booking.id) && (
                  <span className="text-[10px] text-slate-500 font-mono">
                    (Ref: {booking.id.length > 10 ? `${booking.id.slice(0, 8)}...` : booking.id})
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 py-4 pr-1">
          {toastMessage && (
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Tariff Class & Pricing Mode Banner */}
          <div
            className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
              isMC
                ? 'bg-cyan-500/5 border-cyan-500/30'
                : 'bg-amber-500/5 border-amber-500/30'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`p-2 rounded-xl border flex-shrink-0 ${
                  isMC
                    ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                }`}
              >
                {isMC ? <Bike className="w-4 h-4" /> : <Car className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <span className="text-xs font-black text-white block truncate">
                  {breakdown.categoryLabel}
                </span>
                <span className="text-[11px] text-slate-400 block truncate">
                  {breakdown.regulatoryBodyLabel}
                </span>
              </div>
            </div>
            <span
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold whitespace-nowrap border ${
                isMC
                  ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              }`}
            >
              {breakdown.pricingMode === 'UPFRONT' ? 'UPFRONT LOCKED' : 'METERED TAXI'}
            </span>
          </div>

          {/* Route Visualizer Card */}
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                {booking.time}
              </span>
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="text-white font-bold">{breakdown.distanceKm.toFixed(1)} km</span>
                <span className="text-slate-600">•</span>
                <span className="text-amber-400 font-bold">{breakdown.estimatedDurationMins} mins</span>
              </div>
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

            {/* Traffic Telemetry Bar */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <span className="text-slate-400">
                Free-Flow Est: <strong className="text-slate-200 font-mono">{breakdown.normalDurationMins}m</strong> → Actual: <strong className="text-white font-mono">{breakdown.estimatedDurationMins}m</strong>
              </span>
              {breakdown.extraTrafficCrawlMins > 0 && (
                <span
                  className={`font-mono font-semibold ${
                    isMC ? 'text-cyan-400' : 'text-amber-400'
                  }`}
                >
                  {isMC
                    ? `+${breakdown.extraTrafficCrawlMins}m Traffic (₱0 MC Idle Fee)`
                    : `+${breakdown.extraTrafficCrawlMins}m Crawl (+₱${breakdown.trafficCrawlSurcharge.toFixed(2)})`}
                </span>
              )}
            </div>

            {/* Verify Route Landmarks on Google Maps */}
            <div className="pt-2 border-t border-slate-800/80 space-y-2">
              <button
                type="button"
                disabled={isGroundingRoute}
                onClick={async () => {
                  setIsGroundingRoute(true);
                  try {
                    const [lat, lng] = booking.route.pickupCoords || [14.6565, 121.035];
                    const res = await queryGoogleMapsGrounding(
                      `Verify pickup landmark "${booking.route.pickup}" and dropoff destination "${booking.route.dropoff}" in Metro Manila with nearby drop-off bays`,
                      lat,
                      lng
                    );
                    setGroundedRoute(res);
                  } finally {
                    setIsGroundingRoute(false);
                  }
                }}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-400 text-[11px] font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isGroundingRoute ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying Route on Google Maps...</span>
                  </>
                ) : (
                  <>
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Verify Route Landmarks (Google Maps Grounding)</span>
                  </>
                )}
              </button>

              {groundedRoute && (
                <div className="p-3 bg-[#080c14] border border-slate-800 rounded-xl space-y-2 text-[11px]">
                  <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {groundedRoute.text}
                  </p>
                  {groundedRoute.places.length > 0 && (
                    <div className="space-y-1.5 pt-1 border-t border-slate-800">
                      {groundedRoute.places.map((pl, idx) => (
                        <div key={`inv-place-${idx}`} className="space-y-0.5">
                          <a
                            href={pl.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between text-amber-400 hover:text-amber-300 font-bold underline"
                          >
                            <span className="truncate">{pl.title}</span>
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          </a>
                          {pl.reviewSnippets && pl.reviewSnippets[0] && (
                            <p className="text-[10px] text-slate-400 italic">
                              "{pl.reviewSnippets[0]}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Parties Involved */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-[#080c14] border border-slate-800 rounded-xl">
              <span className="text-[10px] uppercase text-slate-500 font-bold block flex items-center gap-1 mb-1">
                <User className="w-3 h-3 text-cyan-400" /> Passenger
              </span>
              <span className="font-bold text-white block truncate">{booking.passenger.name}</span>
              <span className="text-[10px] text-slate-400 font-mono">{booking.passenger.phone}</span>
            </div>

            <div className="p-3 bg-[#080c14] border border-slate-800 rounded-xl">
              <span className="text-[10px] uppercase text-slate-500 font-bold block flex items-center gap-1 mb-1">
                {isMC ? <Bike className="w-3 h-3 text-cyan-400" /> : <Car className="w-3 h-3 text-amber-400" />}{' '}
                Driver Assigned
              </span>
              <span className="font-bold text-white block truncate">
                {booking.driverAssigned?.name || 'Unassigned / Auto-Dispatch'}
              </span>
              <span className="text-[10px] text-amber-400 font-mono font-bold">
                {booking.driverAssigned?.plateNumber || 'No Plate'}
              </span>
            </div>
          </div>

          {/* Regulatory Itemized Financial Breakdown */}
          <div className="p-4 bg-[#080c14] border border-slate-800 rounded-2xl space-y-2.5 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="text-[10px] uppercase font-bold text-slate-400">
                Itemized Regulatory Fare Breakdown
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                {breakdown.pricingModeLabel.split(' (')[0]}
              </span>
            </div>

            {/* 1. Base Flagdown */}
            <div className="flex justify-between text-slate-300">
              <span>{isMC ? 'MC Fixed Base Rate' : 'LTFRB Base Flagdown Fare'}</span>
              <span className="font-mono tabular-nums">₱{breakdown.baseFare.toFixed(2)}</span>
            </div>

            {/* 2. Per-Km Distance Charge */}
            <div className="flex justify-between text-slate-300">
              <span>
                Distance Charge ({breakdown.distanceKm.toFixed(1)} km × ₱{breakdown.perKmRate.toFixed(2)}/km)
              </span>
              <span className="font-mono tabular-nums">₱{breakdown.distanceCharge.toFixed(2)}</span>
            </div>

            {/* 3. Travel Duration / Traffic Charge */}
            <div className="flex justify-between items-start text-slate-300">
              <div>
                <span className="block">
                  {isMC
                    ? 'Travel Duration / Standstill Traffic'
                    : `LTFRB Travel Duration (${breakdown.estimatedDurationMins} mins × ₱${breakdown.perMinRate.toFixed(2)}/min)`}
                </span>
                {!isMC && breakdown.extraTrafficCrawlMins > 0 && (
                  <span className="text-[10px] text-amber-400/90 font-mono block">
                    Includes +₱{breakdown.trafficCrawlSurcharge.toFixed(2)} from +{breakdown.extraTrafficCrawlMins}m heavy traffic crawl
                  </span>
                )}
                {isMC && (
                  <span className="text-[10px] text-cyan-400/90 font-mono block">
                    Distance-primary MC tariff (insensitive to standstill traffic)
                  </span>
                )}
              </div>
              <span className="font-mono tabular-nums">
                {breakdown.durationCharge > 0 ? `₱${breakdown.durationCharge.toFixed(2)}` : '₱0.00'}
              </span>
            </div>

            {/* 4. Dynamic Surge Multiplier */}
            {breakdown.surgeMultiplier > 1.0 && (
              <div className="flex justify-between text-amber-300 pt-1 border-t border-slate-800/60">
                <span className="flex items-center gap-1 font-semibold">
                  <Zap className="w-3 h-3 text-amber-400" />
                  Dynamic Surge Multiplier ({breakdown.surgeMultiplier.toFixed(1)}x Peak Demand)
                </span>
                <span className="font-mono tabular-nums font-bold">
                  +₱{breakdown.surgeCharge.toFixed(2)}
                </span>
              </div>
            )}

            {/* Total Rider Fare */}
            <div className="pt-2.5 border-t border-slate-800 flex justify-between font-black text-sm text-white">
              <span>Total Rider Fare</span>
              <span className="font-mono tabular-nums text-amber-400">
                ₱{breakdown.finalBilledFare.toFixed(2)}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <CreditCard className="w-3 h-3 text-emerald-400" /> Payment: {booking.paymentMethod}
              </span>
              <div className="flex items-center gap-2 font-mono">
                <span className="text-slate-500">
                  Platform ({breakdown.commissionRatePercent}%): ₱{breakdown.platformCommission.toFixed(2)}
                </span>
                <span className="text-emerald-400 font-bold">
                  Driver Net ({100 - breakdown.commissionRatePercent}%): ₱{breakdown.driverNetPayout.toFixed(2)}
                </span>
              </div>
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
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black rounded-lg transition-colors cursor-pointer"
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
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Receipt</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

