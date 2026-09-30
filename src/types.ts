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
  mobilePhotoUri?: string;
  joinedDate: string;
  phone: string;
  email: string;
  walletBalance: number;
  completedRides: number;
  rating: number;
  status: 'ACTIVE' | 'SUSPENDED';
  lastActive?: number;
  registeredAt?: string;
}

export type DriverStatus = 'ONLINE' | 'ON TRIP' | 'OFFLINE' | 'SUSPENDED';
export type VehicleType = 'Sedan' | 'Motorcycle' | 'SUV' | 'Van';
export type DocumentVerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'RESUBMITTED';
export type RequirementType = 'LICENSE_FRONT' | 'LICENSE_BACK' | 'NBI' | 'ORCR' | 'VEHICLE_PHOTO';

export interface DriverQuickNote {
  id: string;
  text: string;
  adminName: string;
  adminEmail?: string;
  adminRole?: string;
  adminAvatar?: string;
  createdAt: number;
  tag?: 'PROGRESS' | 'DOCUMENTS' | 'CALL_LOG' | 'SEMINAR' | 'VERIFICATION';
}

export interface DriverDocumentDetail {
  id: string;
  type: 'license' | 'licenseBack' | 'orCr' | 'nbiClearance' | 'drugTest' | 'vehiclePhoto';
  requirementType?: RequirementType;
  title: string;
  subtitle?: string;
  fileUrl?: string;
  uploadedFileName?: string;
  uploadedFileUrl?: string;
  uploadedPhotoUri?: string;
  uploadedDetails?: string;
  submittedAt?: number;
  documentNumber?: string;
  expiryDate?: string;
  issueDate?: string;
  issuingAgency?: string;
  status: DocumentVerificationStatus;
  rejectionReason?: string;
  notes?: string;
}

export interface DriverRequirementItem {
  id?: string;
  type?: string;
  documentType?: string;
  title?: string;
  name?: string;
  fileName?: string;
  url?: string;
  fileUrl?: string;
  photoUri?: string;
  imageUrl?: string;
  photoUrl?: string;
  base64?: string;
  details?: string;
  description?: string;
  status?: string;
  isVerified?: boolean;
  rejectionReason?: string;
  submitted?: boolean;
  submittedAt?: number;
  updatedAt?: number;
}

export interface DriverSeminarAppointment {
  driverId?: string;
  bookingReference?: string;
  venue?: string;
  venueName?: string;
  venueAddress?: string;
  date?: string;
  timeSlot?: string;
  status?: string;
  attended?: boolean;
  isVerified?: boolean;
  bookedAt?: number;
  updatedAt?: number;
}

export interface Driver {
  id: string;
  name: string;
  avatar: string;
  mobilePhotoUri?: string;
  phone: string;
  email: string;
  plateNumber: string;
  vehicleDetails: string;
  vehicleModel?: string;
  vehicleColor?: string;
  vehicleType: VehicleType;
  city: string;
  rating: number;
  completedTrips: number;
  acceptanceRate: number;
  status: DriverStatus;
  isPendingAudit: boolean;
  isVerified: boolean;
  hasAttendedSeminar: boolean;
  verificationStatus?: string;
  stage?: string;
  applicationStatus?: string;
  canAcceptRides?: boolean;
  requirementsVerified?: boolean;
  seminarAppointment?: DriverSeminarAppointment;
  requirementItems?: DriverRequirementItem[];
  requirements?: DriverRequirementItem[];
  requirementsMap?: Record<
    string,
    {
      url?: string;
      photoUri?: string;
      imageUrl?: string;
      fileUrl?: string;
      status?: string;
      [key: string]: any;
    }
  >;
  licenseFrontUrl?: string;
  licenseBackUrl?: string;
  nbiUrl?: string;
  orcrUrl?: string;
  vehiclePhotoUrl?: string;
  uploadedRequirementsCount?: number;
  isResubmission?: boolean;
  rejectionReason?: string;
  submittedDate?: string;
  documents?: {
    license?: string;
    licenseBack?: string;
    licenseNumber?: string;
    orCr?: string;
    nbiClearance?: 'VERIFIED' | 'PENDING' | 'REJECTED' | string;
    drugTest?: 'PASSED' | 'PENDING' | string;
    vehicleOrCr?: 'VERIFIED' | 'PENDING' | string;
    vehiclePhoto?: string;
    details?: DriverDocumentDetail[];
  };
  currentLocation?: [number, number];
  heading?: number;
  speedKmh?: number;
  quickNotes?: DriverQuickNote[];
}

export type BookingStatus =
  | 'REQUESTED'
  | 'ACCEPTED'
  | 'ARRIVING'
  | 'IN PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type TariffVehicleCategory = '4-WHEEL_TNVS' | '2-WHEEL_MC';
export type PricingAdjustmentMode = 'UPFRONT' | 'METERED';

export interface Booking {
  id: string; // e.g. "#TRIP-1024"
  time: string;
  date: string;
  timestamp: number;
  passenger: {
    id: string;
    name: string;
    phone: string;
    avatar?: string;
  };
  driverAssigned?: {
    id: string;
    name: string;
    plateNumber: string;
    vehicle: string;
    avatar?: string;
  } | null;
  route: {
    pickup: string;
    dropoff: string;
    pickupCoords?: [number, number];
    dropoffCoords?: [number, number];
    distanceKm: number;
    estimatedDurationMins?: number;
    normalDurationMins?: number;
  };
  fare: number;
  paymentMethod: 'GCash' | 'Cash' | 'Wallet' | 'Maya';
  status: BookingStatus;
  surgeMultiplier?: number;
  vehicleCategory?: TariffVehicleCategory;
  pricingMode?: PricingAdjustmentMode;
  fareBreakdown?: {
    baseFare?: number;
    perKmRate?: number;
    perMinRate?: number;
    durationMins?: number;
    distanceKm?: number;
    surgeMultiplier?: number;
    totalFare?: number;
    platformFee?: number;
    driverNetPayout?: number;
    commissionRate?: number;
  };
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
  // 1. 4-Wheel Vehicles (Car / SUV Fare Matrix)
  baseFare: number;
  perKmRate: number;
  perMinRate: number;
  surgeMultiplier: number;
  tnvsPricingMode?: PricingAdjustmentMode;

  // 2. 2-Wheel Motorcycles (Distance-Based Matrix)
  mcBaseFare?: number;
  mcPerKmRate?: number;
  mcPerMinRate?: number;
  mcSurgeMultiplier?: number;

  // Platform Commission & Safety
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
  id?: string;
  name: string;
  email: string;
  role: 'Super Admin' | 'Fleet Manager' | 'Safety Dispatcher';
  avatar: string;
  mustChangePassword?: boolean;
  status?: 'ACTIVE' | 'SUSPENDED';
}

export interface AdminAccount {
  id: string;
  name: string;
  email: string;
  role: 'Super Admin' | 'Fleet Manager' | 'Safety Dispatcher';
  avatar: string;
  passwordHash: string;
  mustChangePassword: boolean;
  createdAt: number;
  createdBy?: string;
  status: 'ACTIVE' | 'SUSPENDED';
}

export interface PasswordResetReport {
  id: string;
  userEmail: string;
  userName?: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedAt: number;
  resolvedAt?: number;
  tempPasswordGenerated?: string;
}

export type ActivityActionType =
  | 'APPROVAL'
  | 'REJECTION'
  | 'DISPATCH'
  | 'RESOLUTION'
  | 'LOGIN'
  | 'LOGOUT'
  | 'CONFIG_UPDATE'
  | 'POLLING_TOGGLE'
  | 'GENERAL';

export type ActivityCategory = 'driver' | 'sos' | 'auth' | 'system' | 'trip' | 'wallet';

export interface ActivityLogAdmin {
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

export interface ActivityLog {
  id: string;
  text: string;
  timeAgo: string;
  timestamp: number;
  iconType: 'trip' | 'wallet' | 'driver' | 'dispatch' | 'sos' | 'auth' | 'settings';
  admin?: ActivityLogAdmin;
  category?: ActivityCategory;
  actionType?: ActivityActionType;
  targetDetails?: string;
  targetId?: string;
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
