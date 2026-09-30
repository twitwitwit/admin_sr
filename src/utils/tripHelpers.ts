import { Booking, PricingAdjustmentMode, SystemSettings, TariffVehicleCategory } from '../types';

/**
 * Trip identification & regulatory LTFRB / MC Taxi TWG fare calculation helpers
 */

export const formatHumanReadableTripId = (id: string | null | undefined): string => {
  if (!id) return '#TRIP-0000';
  const str = String(id).trim();

  // If already standard format: e.g. #TRIP-1024 or #TRIP-8842
  if (/^#TRIP-[A-Z0-9]+$/i.test(str)) {
    return str.toUpperCase();
  }

  // If starts with TRIP- or TRIP_ or TRIP (e.g. TRIP-1024)
  if (/^TRIP[-_]?[A-Z0-9]+$/i.test(str)) {
    const code = str.replace(/^TRIP[-_]?/i, '').toUpperCase();
    return `#TRIP-${code}`;
  }

  // If starts with #BK- or BK- (e.g. #BK-1024, BK-501)
  if (/^#?BK[-_]?([A-Z0-9]+)$/i.test(str)) {
    const code = str.replace(/^#?BK[-_]?/i, '').toUpperCase();
    return `#TRIP-${code}`;
  }

  // If it's a numeric timestamp or large epoch number like 1727249872194
  if (/^\d{6,}$/.test(str)) {
    return `#TRIP-${str.slice(-5)}`;
  }

  // If it's a small sequential number like 1024 or 55
  if (/^\d{1,5}$/.test(str)) {
    return `#TRIP-${str.padStart(4, '0')}`;
  }

  // If it's a Firestore document ID or UUID like f713e2f4-8a4a-4648-9c1a-28952f41c305
  const alphanumeric = str.replace(/[^a-zA-Z0-9]/g, '');
  if (alphanumeric.length >= 4) {
    return `#TRIP-${alphanumeric.slice(-5).toUpperCase()}`;
  }

  return str.startsWith('#') ? str.toUpperCase() : `#TRIP-${str.toUpperCase()}`;
};

const MC_KEYWORDS = [
  'motorcycle',
  'honda click',
  'yamaha nmax',
  'nmax',
  'aerox',
  'pcx',
  'adv 160',
  'adv160',
  'mio',
  'raider',
  'sniper',
  'burgman',
  'tmx',
  'mc taxi',
];

export const detectVehicleTariffCategory = (booking: Booking): TariffVehicleCategory => {
  if (booking.vehicleCategory) {
    const vc = String(booking.vehicleCategory).toUpperCase();
    if (vc === '2-WHEEL_MC' || vc.includes('MOTOR') || vc.includes('MC')) {
      return '2-WHEEL_MC';
    }
    return '4-WHEEL_TNVS';
  }
  const vehicleStr = (booking.driverAssigned?.vehicle || '').toLowerCase();
  const plateStr = (booking.driverAssigned?.plateNumber || '').toLowerCase();
  if (
    MC_KEYWORDS.some((kw) => vehicleStr.includes(kw)) ||
    plateStr.startsWith('mc ') ||
    plateStr.startsWith('mc-')
  ) {
    return '2-WHEEL_MC';
  }
  return '4-WHEEL_TNVS';
};

export interface RegulatoryFareBreakdown {
  vehicleCategory: TariffVehicleCategory;
  categoryLabel: string;
  regulatoryBodyLabel: string;
  pricingMode: PricingAdjustmentMode;
  pricingModeLabel: string;
  distanceKm: number;
  normalDurationMins: number;
  estimatedDurationMins: number;
  extraTrafficCrawlMins: number;
  baseFare: number;
  perKmRate: number;
  perMinRate: number;
  distanceCharge: number;
  durationCharge: number;
  trafficCrawlSurcharge: number;
  subtotalBeforeSurge: number;
  surgeMultiplier: number;
  surgeCharge: number;
  computedTotalFare: number;
  finalBilledFare: number;
  commissionRatePercent: number;
  platformCommission: number;
  driverNetPayout: number;
}

export const calculateTripFareBreakdown = (
  booking: Booking,
  settings?: Partial<SystemSettings>
): RegulatoryFareBreakdown => {
  const vehicleCategory = detectVehicleTariffCategory(booking);
  const isMC = vehicleCategory === '2-WHEEL_MC';
  const fb = booking.fareBreakdown;

  const distanceKm = Math.max(0.5, Number(fb?.distanceKm ?? booking.route?.distanceKm ?? 5));
  // Standard free-flow travel time in Metro Manila (~2.2 mins per km)
  const normalDurationMins =
    booking.route?.normalDurationMins ?? Math.max(8, Math.round(distanceKm * 2.2));
  // Actual / Upfront traffic-estimated duration
  const estimatedDurationMins =
    fb?.durationMins ??
    booking.route?.estimatedDurationMins ??
    (isMC ? Math.max(10, Math.round(distanceKm * 2.4)) : Math.max(15, Math.round(distanceKm * 3.4)));

  const extraTrafficCrawlMins = Math.max(0, estimatedDurationMins - normalDurationMins);

  // Tariff Rates from connected app fareBreakdown snapshot or SystemSettings
  const baseFare = Number(
    fb?.baseFare ?? (isMC ? (settings?.mcBaseFare ?? 50) : (settings?.baseFare ?? 45))
  );
  const perKmRate = Number(
    fb?.perKmRate ?? (isMC ? (settings?.mcPerKmRate ?? 10) : (settings?.perKmRate ?? 15))
  );
  const perMinRate = Number(
    fb?.perMinRate ?? (isMC ? (settings?.mcPerMinRate ?? 0) : (settings?.perMinRate ?? 2))
  );

  const defaultSurge = isMC
    ? Number(settings?.mcSurgeMultiplier ?? 1.0)
    : Number(settings?.surgeMultiplier ?? 1.2);
  const surgeMultiplier = Math.max(
    1.0,
    Number(fb?.surgeMultiplier ?? booking.surgeMultiplier ?? defaultSurge)
  );

  const rawPricingMode = String(booking.pricingMode || settings?.tnvsPricingMode || 'UPFRONT').toUpperCase();
  const pricingMode: PricingAdjustmentMode = rawPricingMode === 'METERED' ? 'METERED' : 'UPFRONT';

  const distanceCharge = distanceKm * perKmRate;
  const durationCharge = estimatedDurationMins * perMinRate;
  const trafficCrawlSurcharge = extraTrafficCrawlMins * perMinRate;

  const subtotalBeforeSurge = baseFare + distanceCharge + durationCharge;
  const surgeCharge = subtotalBeforeSurge * (surgeMultiplier - 1);
  const computedTotalFare = Math.round(subtotalBeforeSurge * surgeMultiplier);

  // Use booking.fare or connected app totalFare if explicitly stored
  const finalBilledFare =
    booking.fare > 0 ? booking.fare : fb?.totalFare ? Math.round(fb.totalFare) : computedTotalFare;

  const commissionRatePercent = Number(fb?.commissionRate ?? settings?.commissionRate ?? 15);
  const platformCommission =
    fb?.platformFee !== undefined
      ? Number(fb.platformFee)
      : finalBilledFare * (commissionRatePercent / 100);
  const driverNetPayout =
    fb?.driverNetPayout !== undefined
      ? Number(fb.driverNetPayout)
      : finalBilledFare - platformCommission;

  return {
    vehicleCategory,
    categoryLabel: isMC ? '2-Wheel Motorcycle' : '4-Wheel Vehicle',
    regulatoryBodyLabel: isMC
      ? 'Distance-Based Tariff (No Traffic Time Fee)'
      : 'Distance + Per-Minute Travel Duration Tariff',
    pricingMode,
    pricingModeLabel:
      pricingMode === 'UPFRONT'
        ? 'Upfront Fare (Locked at Booking)'
        : 'Live Metered (Distance + Waiting Time)',
    distanceKm,
    normalDurationMins,
    estimatedDurationMins,
    extraTrafficCrawlMins,
    baseFare,
    perKmRate,
    perMinRate,
    distanceCharge,
    durationCharge,
    trafficCrawlSurcharge,
    subtotalBeforeSurge,
    surgeMultiplier,
    surgeCharge,
    computedTotalFare,
    finalBilledFare,
    commissionRatePercent,
    platformCommission,
    driverNetPayout,
  };
};

