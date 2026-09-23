export type NavTab =
  | 'dashboard'
  | 'emergency'
  | 'passengers'
  | 'drivers'
  | 'live-trips'
  | 'bookings'
  | 'earnings'
  | 'reports'
  | 'support'
  | 'notifications'
  | 'settings';

export type EmergencyStatus = 'critical' | 'responding' | 'resolved';
export type EmergencyType = 'Safety SOS' | 'Vehicle Breakdown' | 'Medical Emergency' | 'Route Deviation';

export interface EmergencyAlert {
  id: string; // e.g. "SOS-9021"
  type: EmergencyType;
  status: EmergencyStatus;
  loggedAt: string;
  timestamp: number;
  tripId: string;
  userName: string;
  userRole: 'PASSENGER' | 'DRIVER';
  userPhone: string;
  userAvatar?: string;
  assignedDriver?: {
    name: string;
    phone: string;
    vehicle: string;
    plateNumber: string;
  };
  location: {
    name: string;
    address: string;
    coordinates: [number, number]; // [lat, lng]
  };
  incidentLog: string;
  assignedUnit?: string;
  resolutionNotes?: string;
}

export interface Passenger {
  id: string;
  name: string;
  avatar: string;
  joinedDate: string;
  phone: string;
  email: string;
  walletBalance: number;
  completedRides: number;
  rating: number;
  status: 'ACTIVE' | 'SUSPENDED';
}

export type DriverStatus = 'ONLINE' | 'ON TRIP' | 'OFFLINE' | 'SUSPENDED';
export type VehicleType = 'Sedan' | 'Motorcycle' | 'SUV' | 'Van';
export type DocumentVerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'RESUBMITTED';

export interface DriverDocumentDetail {
  id: string;
  type: 'license' | 'licenseBack' | 'orCr' | 'nbiClearance' | 'ltfrbFranchise' | 'drugTest' | 'vehiclePhoto';
  title: string;
  subtitle?: string;
  fileUrl?: string;
  documentNumber?: string;
  expiryDate?: string;
  issueDate?: string;
  issuingAgency?: string;
  status: DocumentVerificationStatus;
  rejectionReason?: string;
  notes?: string;
}

export interface Driver {
  id: string;
  name: string;
  avatar: string;
  phone: string;
  email: string;
  plateNumber: string;
  vehicleDetails: string;
  vehicleType: VehicleType;
  city: string;
  rating: number;
  completedTrips: number;
  acceptanceRate: number;
  status: DriverStatus;
  isPendingAudit: boolean;
  verificationStatus?: string;
  isResubmission?: boolean;
  rejectionReason?: string;
  submittedDate?: string;
  documents?: {
    license?: string;
    licenseBack?: string;
    licenseNumber?: string;
    orCr?: string;
    nbiClearance?: 'VERIFIED' | 'PENDING' | 'REJECTED' | string;
    ltfrbFranchise?: 'VERIFIED' | 'PENDING' | 'EXPIRED' | string;
    drugTest?: 'PASSED' | 'PENDING' | string;
    vehicleOrCr?: 'VERIFIED' | 'PENDING' | string;
    vehiclePhoto?: string;
    details?: DriverDocumentDetail[];
  };
  currentLocation?: [number, number];
  heading?: number;
  speedKmh?: number;
}

export type BookingStatus =
  | 'REQUESTED'
  | 'ACCEPTED'
  | 'ARRIVING'
  | 'IN PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export interface Booking {
  id: string; // e.g. "#TRIP-1024"
  time: string;
  date: string;
  timestamp: number;
  passenger: {
    id: string;
    name: string;
    phone: string;
  };
  driverAssigned?: {
    id: string;
    name: string;
    plateNumber: string;
    vehicle: string;
  } | null;
  route: {
    pickup: string;
    dropoff: string;
    pickupCoords?: [number, number];
    dropoffCoords?: [number, number];
    distanceKm: number;
  };
  fare: number;
  paymentMethod: 'GCash' | 'Cash' | 'Wallet' | 'Maya';
  status: BookingStatus;
  surgeMultiplier?: number;
}

export interface SupportTicket {
  id: string; // e.g. "#TICK-401"
  userName: string;
  userRole: 'Passenger' | 'Driver';
  userPhone?: string;
  subject: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'OPEN' | 'IN PROGRESS' | 'RESOLVED';
  createdAt: string;
  messages: Array<{
    id: string;
    sender: string;
    isAdmin: boolean;
    text: string;
    timestamp: string;
  }>;
}

export interface SystemNotification {
  id: string;
  title: string;
  category: 'EMERGENCY' | 'SERVER' | 'REGULATORY' | 'ALERT' | 'MAINTENANCE' | 'BACKUP' | 'SYSTEM';
  badgeLabel?: string;
  badgeType?: 'Safety SOS' | 'Vehicle Breakdown' | 'PASSENGER' | 'DRIVER' | 'SYSTEM';
  message: string;
  details?: string;
  timeAgo: string;
  timestamp: number;
  read: boolean;
  actionTab?: NavTab;
  actionId?: string;
}

export interface SystemSettings {
  baseFare: number;
  perKmRate: number;
  perMinRate: number;
  surgeMultiplier: number;
  commissionRate: number;
  autoPayoutThreshold: number;
  emergencyHotlines: string;
  speedAlertThresholdKmh: number;
}

export interface PlatformSettings {
  baseRideFare: number;
  perKilometerRate: number;
  platformCommissionPercent: number;
  surgeMaxMultiplier: number;
  twoFactorAuth: boolean;
  vehicleVerificationProtocol: boolean;
  automaticAccountSuspension: boolean;
  minRatingThreshold: number;
}

export interface AdminUser {
  name: string;
  email: string;
  role: 'Super Admin' | 'Fleet Manager' | 'Safety Dispatcher';
  avatar: string;
}

export interface ActivityLog {
  id: string;
  text: string;
  timeAgo: string;
  timestamp: number;
  iconType: 'trip' | 'wallet' | 'driver' | 'dispatch' | 'sos';
}

export interface GeneratedReport {
  id: string;
  title: string;
  date: string;
  category: 'Financial' | 'Operations' | 'Analytics' | 'Marketing' | 'Compliance';
  fileSize: string;
  downloadUrl?: string;
  recordsCount: number;
}
