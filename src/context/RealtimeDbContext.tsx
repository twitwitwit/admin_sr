import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import { db, testConnection } from '../firebase';
import {
  ActivityLog,
  AdminUser,
  Booking,
  BookingStatus,
  Driver,
  DriverStatus,
  VehicleType,
  EmergencyAlert,
  EmergencyStatus,
  EmergencyType,
  GeneratedReport,
  Passenger,
  PlatformSettings,
  SupportTicket,
  SystemNotification,
  SystemSettings,
} from '../types';
import {
  INITIAL_ACTIVITY_LOGS,
  INITIAL_ADMIN_USER,
  INITIAL_BOOKINGS,
  INITIAL_DRIVERS,
  INITIAL_EMERGENCY_ALERTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_PASSENGERS,
  INITIAL_REPORTS,
  INITIAL_SETTINGS,
  INITIAL_SUPPORT_TICKETS,
  INITIAL_SYSTEM_SETTINGS,
} from '../data/initialData';

interface RealtimeDbContextType {
  // Data state
  emergencyAlerts: EmergencyAlert[];
  passengers: Passenger[];
  drivers: Driver[];
  bookings: Booking[];
  tickets: SupportTicket[];
  notifications: SystemNotification[];
  activityLogs: ActivityLog[];
  settings: PlatformSettings;
  systemSettings: SystemSettings;
  reports: GeneratedReport[];
  currentAdminUser: AdminUser;
  setAdminUser: (user: AdminUser) => void;

  // Real-time status & sync
  lastSyncTimestamp: number;
  activeCriticalSOSCount: number;
  pendingDriversCount: number;
  openTicketsCount: number;
  unreadNotificationsCount: number;

  // Real-time Action Methods
  resolveEmergencyAlert: (id: string, resolutionNotes?: string) => void;
  dispatchEmergencyUnit: (id: string, unitName: string) => void;
  togglePassengerStatus: (id: string) => void;
  updatePassengerWallet: (id: string, amountDelta: number) => void;
  approveDriver: (id: string) => void;
  rejectDriver: (id: string, reason?: string) => void;
  toggleDriverStatus: (id: string, newStatus: DriverStatus) => void;
  updateBookingStatus: (id: string, newStatus: BookingStatus) => void;
  acceptBooking: (bookingId: string, driver: Driver) => void;
  declineBooking: (bookingId: string) => void;
  createBooking: (bookingData: Partial<Booking>) => void;
  replyToTicket: (id: string, text: string, newStatus?: 'OPEN' | 'IN PROGRESS' | 'RESOLVED') => void;
  resolveTicket: (id: string) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  updateSettings: (newSettings: any) => void;
  generateReportDownload: (reportId: string) => void;
  exportCsvData: (entity: 'passengers' | 'drivers' | 'bookings' | 'earnings' | 'emergency') => void;
  resetDatabaseToDefault: () => void;
  resetToFactoryDefaults: () => void;
  triggerManualTelemetryPing: () => void;
  refreshCloudData: () => Promise<void>;
  registerPassenger: (data: Partial<Passenger>) => Promise<Passenger>;
}

const RealtimeDbContext = createContext<RealtimeDbContextType | null>(null);

const STORAGE_KEY = 'swiftride_realtime_db_v4';
const SYNC_CHANNEL_NAME = 'swiftride_db_sync_channel';

// Comprehensive normalizer for driver partners & verification submissions
const normalizeDriver = (raw: any, docId: string): Driver => {
  const isPending =
    raw.isPendingAudit === true ||
    raw.isPendingVerification === true ||
    raw.pendingVerification === true ||
    raw.needsAudit === true ||
    raw.resubmitted === true ||
    raw.isVerified === false ||
    ['PENDING', 'PENDING_VERIFICATION', 'PENDING_AUDIT', 'UNVERIFIED', 'SUBMITTED', 'RESUBMITTED', 'UNDER_REVIEW', 'FOR_AUDIT', 'AWAITING_REVIEW'].includes(String(raw.status || '').toUpperCase()) ||
    ['PENDING', 'PENDING_VERIFICATION', 'PENDING_AUDIT', 'UNVERIFIED', 'SUBMITTED', 'RESUBMITTED', 'UNDER_REVIEW', 'FOR_AUDIT', 'AWAITING_REVIEW'].includes(String(raw.verificationStatus || '').toUpperCase()) ||
    ['PENDING', 'PENDING_VERIFICATION', 'SUBMITTED', 'RESUBMITTED'].includes(String(raw.auditStatus || '').toUpperCase()) ||
    ['PENDING', 'SUBMITTED', 'RESUBMITTED'].includes(String(raw.requirementsStatus || '').toUpperCase()) ||
    Boolean((raw.requirements || raw.documents) && raw.verificationStatus !== 'VERIFIED' && raw.status !== 'ONLINE' && raw.status !== 'ON TRIP');

  const isResubmission =
    raw.resubmitted === true ||
    String(raw.verificationStatus || '').toUpperCase() === 'RESUBMITTED' ||
    String(raw.auditStatus || '').toUpperCase() === 'RESUBMITTED' ||
    Boolean(raw.resubmittedAt);

  const docs = raw.documents || raw.requirements || raw.uploadedDocuments || raw.files || {};
  const documents = {
    license: docs.license || docs.licenseUrl || docs.driversLicense || docs.driversLicenseUrl || raw.license || raw.licenseUrl || raw.driversLicense || raw.licenseNumber,
    licenseNumber: docs.licenseNumber || docs.licenseNo || raw.licenseNumber || raw.licenseNo,
    orCr: docs.orCr || docs.orCrUrl || docs.or_cr || docs.orCrFile || raw.orCr || raw.orCrUrl || raw.or_cr,
    nbiClearance: docs.nbiClearance || docs.nbiClearanceUrl || docs.nbi || docs.nbiUrl || raw.nbiClearance || raw.nbiClearanceUrl || raw.nbi || (raw.nbi ? 'VERIFIED' : undefined),
    ltfrbFranchise: docs.ltfrbFranchise || docs.ltfrbUrl || docs.franchise || docs.ltfrb || raw.ltfrbFranchise || raw.ltfrbUrl || raw.franchise,
    drugTest: docs.drugTest || docs.drugTestUrl || docs.drug || raw.drugTest || raw.drugTestUrl,
    vehicleOrCr: docs.vehicleOrCr || docs.vehicleOrCrUrl || raw.vehicleOrCr || raw.vehicleOrCrUrl,
  };

  const rawDate = raw.resubmittedAt || raw.submittedAt || raw.updatedAt || raw.submittedDate;
  let formattedDate: string | undefined = undefined;
  if (rawDate) {
    try {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        formattedDate = (raw.resubmittedAt ? 'Resubmitted: ' : 'Submitted: ') + d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else {
        formattedDate = String(rawDate);
      }
    } catch {
      formattedDate = String(rawDate);
    }
  } else if (isPending) {
    formattedDate = isResubmission ? 'Recently Resubmitted for Audit' : 'Submitted for Audit';
  }

  let finalStatus: DriverStatus = 'ONLINE';
  if (isPending && raw.status !== 'SUSPENDED') {
    finalStatus = 'OFFLINE';
  } else if (raw.status === 'ON TRIP' || raw.status === 'OFFLINE' || raw.status === 'SUSPENDED') {
    finalStatus = raw.status;
  }

  return {
    id: raw.id || raw.driverId || docId,
    name: raw.name || raw.fullName || raw.displayName || 'Driver Partner',
    avatar: raw.avatar || raw.photoUrl || raw.profilePic || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    phone: raw.phone || raw.phoneNumber || raw.mobile || '0917-000-0000',
    email: raw.email || 'driver@swiftride.ph',
    plateNumber: raw.plateNumber || raw.plate || raw.vehiclePlate || 'N/A',
    vehicleDetails: raw.vehicleDetails || raw.vehicle || raw.vehicleModel || raw.carModel || 'Standard Vehicle',
    vehicleType: (raw.vehicleType as VehicleType) || 'Sedan',
    city: raw.city || raw.region || raw.address || 'Metro Manila',
    rating: Number(raw.rating || 4.8),
    completedTrips: Number(raw.completedTrips || raw.totalTrips || 0),
    acceptanceRate: Number(raw.acceptanceRate || 95),
    status: finalStatus,
    isPendingAudit: isPending,
    verificationStatus: raw.verificationStatus || (isPending ? 'PENDING' : 'VERIFIED'),
    isResubmission,
    rejectionReason: raw.rejectionReason,
    submittedDate: formattedDate,
    documents,
    currentLocation: raw.currentLocation || (raw.latitude && raw.longitude ? [raw.latitude, raw.longitude] : undefined),
    heading: raw.heading || 0,
    speedKmh: raw.speedKmh || 0,
  };
};

// Comprehensive normalizer for passengers registered across apps & collections
const normalizePassenger = (raw: any, docId: string): Passenger => {
  const name =
    raw.name ||
    raw.fullName ||
    raw.displayName ||
    raw.userName ||
    raw.username ||
    [raw.firstName, raw.lastName].filter(Boolean).join(' ') ||
    (raw.email ? raw.email.split('@')[0] : '') ||
    'Passenger User';

  const avatar =
    raw.avatar ||
    raw.photoURL ||
    raw.photoUrl ||
    raw.profilePic ||
    raw.imageUrl ||
    raw.profileImageUrl ||
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150';

  const phone =
    raw.phone ||
    raw.phoneNumber ||
    raw.mobile ||
    raw.contactNumber ||
    raw.contact ||
    '0917-000-0000';

  const email =
    raw.email ||
    raw.userEmail ||
    'passenger@swiftride.ph';

  const walletBalance = Number(
    raw.walletBalance ??
    raw.wallet ??
    raw.balance ??
    raw.credits ??
    raw.walletAmount ??
    0
  );

  const completedRides = Number(
    raw.completedRides ??
    raw.totalRides ??
    raw.ridesCount ??
    raw.tripsCount ??
    raw.completedTrips ??
    raw.rides ??
    0
  );

  const rating = Number(
    raw.rating ??
    raw.passengerRating ??
    raw.userRating ??
    5.0
  );

  const statusStr = String(raw.status || raw.accountStatus || 'ACTIVE').toUpperCase();
  const status: 'ACTIVE' | 'SUSPENDED' =
    statusStr === 'SUSPENDED' || statusStr === 'BANNED' || statusStr === 'BLOCKED' || statusStr === 'INACTIVE'
      ? 'SUSPENDED'
      : 'ACTIVE';

  let joinedDate = '2026';
  if (raw.joinedDate) {
    joinedDate = String(raw.joinedDate);
  } else if (raw.createdAt) {
    if (typeof raw.createdAt === 'object' && raw.createdAt.seconds) {
      joinedDate = new Date(raw.createdAt.seconds * 1000).toISOString().split('T')[0];
    } else if (typeof raw.createdAt === 'number') {
      joinedDate = new Date(raw.createdAt).toISOString().split('T')[0];
    } else {
      joinedDate = String(raw.createdAt);
    }
  } else if (raw.dateRegistered) {
    joinedDate = String(raw.dateRegistered);
  } else if (raw.timestamp) {
    joinedDate = new Date(Number(raw.timestamp)).toISOString().split('T')[0];
  }

  return {
    id: raw.id || raw.passengerId || raw.uid || raw.userId || docId,
    name,
    avatar,
    phone,
    email,
    walletBalance,
    completedRides,
    rating,
    status,
    joinedDate,
  };
};

export const RealtimeDbProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load initial data from localStorage if exists
  const [emergencyAlerts, setEmergencyAlerts] = useState<EmergencyAlert[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_emergency`);
      return saved ? JSON.parse(saved) : INITIAL_EMERGENCY_ALERTS;
    } catch {
      return INITIAL_EMERGENCY_ALERTS;
    }
  });

  const [passengers, setPassengers] = useState<Passenger[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_passengers`);
      return saved ? JSON.parse(saved) : INITIAL_PASSENGERS;
    } catch {
      return INITIAL_PASSENGERS;
    }
  });

  const [drivers, setDrivers] = useState<Driver[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_drivers`);
      return saved ? JSON.parse(saved) : INITIAL_DRIVERS;
    } catch {
      return INITIAL_DRIVERS;
    }
  });

  const [bookings, setBookings] = useState<Booking[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_bookings`);
      return saved ? JSON.parse(saved) : INITIAL_BOOKINGS;
    } catch {
      return INITIAL_BOOKINGS;
    }
  });

  const [tickets, setTickets] = useState<SupportTicket[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_tickets`);
      return saved ? JSON.parse(saved) : INITIAL_SUPPORT_TICKETS;
    } catch {
      return INITIAL_SUPPORT_TICKETS;
    }
  });

  const [notifications, setNotifications] = useState<SystemNotification[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_notifications`);
      return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
    } catch {
      return INITIAL_NOTIFICATIONS;
    }
  });

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_activityLogs`);
      return saved ? JSON.parse(saved) : INITIAL_ACTIVITY_LOGS;
    } catch {
      return INITIAL_ACTIVITY_LOGS;
    }
  });

  const [settings, setSettings] = useState<PlatformSettings>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_settings`);
      return saved ? JSON.parse(saved) : INITIAL_SETTINGS;
    } catch {
      return INITIAL_SETTINGS;
    }
  });

  const [systemSettings, setSystemSettings] = useState<SystemSettings>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_sys_settings`);
      return saved ? JSON.parse(saved) : INITIAL_SYSTEM_SETTINGS;
    } catch {
      return INITIAL_SYSTEM_SETTINGS;
    }
  });

  const [currentAdminUser, setAdminUser] = useState<AdminUser>(INITIAL_ADMIN_USER);
  const [reports] = useState<GeneratedReport[]>(INITIAL_REPORTS);
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<number>(Date.now());

  const channelRef = useRef<BroadcastChannel | null>(null);

  // Broadcast change helper
  const broadcastSync = useCallback((payload: { type: string; data?: any }) => {
    setLastSyncTimestamp(Date.now());
    if (channelRef.current) {
      try {
        channelRef.current.postMessage({ ...payload, timestamp: Date.now() });
      } catch (err) {
        console.warn('BroadcastChannel error:', err);
      }
    }
  }, []);

  // Multi-tab BroadcastChannel listener
  useEffect(() => {
    try {
      const channel = new BroadcastChannel(SYNC_CHANNEL_NAME);
      channelRef.current = channel;

      channel.onmessage = (event) => {
        if (!event.data) return;
        const { type } = event.data;
        setLastSyncTimestamp(Date.now());

        if (type === 'EMERGENCY_UPDATE') {
          const saved = localStorage.getItem(`${STORAGE_KEY}_emergency`);
          if (saved) setEmergencyAlerts(JSON.parse(saved));
        } else if (type === 'PASSENGERS_UPDATE') {
          const saved = localStorage.getItem(`${STORAGE_KEY}_passengers`);
          if (saved) setPassengers(JSON.parse(saved));
        } else if (type === 'DRIVERS_UPDATE') {
          const saved = localStorage.getItem(`${STORAGE_KEY}_drivers`);
          if (saved) setDrivers(JSON.parse(saved));
        } else if (type === 'BOOKINGS_UPDATE') {
          const saved = localStorage.getItem(`${STORAGE_KEY}_bookings`);
          if (saved) setBookings(JSON.parse(saved));
        } else if (type === 'TICKETS_UPDATE') {
          const saved = localStorage.getItem(`${STORAGE_KEY}_tickets`);
          if (saved) setTickets(JSON.parse(saved));
        } else if (type === 'NOTIFICATIONS_UPDATE') {
          const saved = localStorage.getItem(`${STORAGE_KEY}_notifications`);
          if (saved) setNotifications(JSON.parse(saved));
        } else if (type === 'SETTINGS_UPDATE') {
          const saved = localStorage.getItem(`${STORAGE_KEY}_settings`);
          if (saved) setSettings(JSON.parse(saved));
        } else if (type === 'FULL_RESET') {
          setEmergencyAlerts(INITIAL_EMERGENCY_ALERTS);
          setPassengers(INITIAL_PASSENGERS);
          setDrivers(INITIAL_DRIVERS);
          setBookings(INITIAL_BOOKINGS);
          setTickets(INITIAL_SUPPORT_TICKETS);
          setNotifications(INITIAL_NOTIFICATIONS);
          setActivityLogs(INITIAL_ACTIVITY_LOGS);
          setSettings(INITIAL_SETTINGS);
        }
      };

      return () => {
        channel.close();
      };
    } catch {
      // BroadcastChannel might not be supported in older envs
    }
  }, []);

  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_emergency`, JSON.stringify(emergencyAlerts));
  }, [emergencyAlerts]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_passengers`, JSON.stringify(passengers));
  }, [passengers]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_drivers`, JSON.stringify(drivers));
  }, [drivers]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_bookings`, JSON.stringify(bookings));
  }, [bookings]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_tickets`, JSON.stringify(tickets));
  }, [tickets]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_notifications`, JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_activityLogs`, JSON.stringify(activityLogs));
  }, [activityLogs]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_settings`, JSON.stringify(settings));
  }, [settings]);

  // Cloud Firestore Real-time Snapshot Synchronization & Bootstrap
  useEffect(() => {
    // 1. Check & verify connectivity
    testConnection();

    // 2. Setup real-time listeners across core collections
    const unsubs: (() => void)[] = [];
    const sanitizeId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, '_');

    // Emergency Alerts collection listener
    try {
      const emergencyCol = collection(db, 'emergencyAlerts');
      const unsub = onSnapshot(
        emergencyCol,
        (snapshot) => {
          if (!snapshot.empty) {
            const list: EmergencyAlert[] = [];
            snapshot.forEach((d) => {
              const raw = d.data() as any;
              const coords: [number, number] = raw.location?.coordinates || raw.coords || (raw.latitude && raw.longitude ? [raw.latitude, raw.longitude] : [14.5547, 121.0244]);
              list.push({
                id: raw.id || d.id,
                type: raw.type || 'Safety SOS',
                status: raw.status || 'critical',
                loggedAt: raw.loggedAt || raw.time || 'Just now',
                timestamp: raw.timestamp || Date.now(),
                tripId: raw.tripId || raw.bookingId || '#TRIP-LIVE',
                userName: raw.userName || raw.passengerName || raw.driverName || 'User in Distress',
                userRole: (raw.userRole || 'PASSENGER').toUpperCase() === 'DRIVER' ? 'DRIVER' : 'PASSENGER',
                userPhone: raw.userPhone || raw.phone || '0917-911-0000',
                userAvatar: raw.userAvatar,
                assignedDriver: raw.assignedDriver,
                location: {
                  name: raw.location?.name || raw.location || 'Metro Manila',
                  address: raw.location?.address || raw.address || 'Metro Manila Corridor',
                  coordinates: coords,
                },
                incidentLog: raw.incidentLog || raw.notes || raw.description || 'Emergency SOS triggered from mobile app.',
                assignedUnit: raw.assignedUnit,
                resolutionNotes: raw.resolutionNotes,
              });
            });
            setEmergencyAlerts(list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
          } else {
            // Seed initial data to cloud
            INITIAL_EMERGENCY_ALERTS.forEach((item) => {
              setDoc(doc(db, 'emergencyAlerts', sanitizeId(item.id)), item).catch(() => {});
            });
          }
        },
        (err) => {
          console.warn('Firestore SOS listener offline fallback:', err);
        }
      );
      unsubs.push(unsub);
    } catch {}

    // Helper to merge or insert verification records
    const mergeVerificationRecord = (raw: any, docId: string) => {
      const driverId = raw.driverId || raw.id || docId;
      setDrivers((prev) => {
        const existingIdx = prev.findIndex(
          (d) => d.id === driverId || (raw.phone && d.phone === raw.phone) || (raw.email && d.email === raw.email)
        );
        const normalized = normalizeDriver({ ...raw, isPendingAudit: true }, driverId);
        if (existingIdx >= 0) {
          const updated = [...prev];
          const curr = updated[existingIdx];
          updated[existingIdx] = {
            ...curr,
            isPendingAudit: true,
            isResubmission: true,
            verificationStatus: raw.verificationStatus || 'PENDING',
            status: curr.status === 'SUSPENDED' ? 'SUSPENDED' : 'OFFLINE',
            submittedDate: normalized.submittedDate || 'Resubmitted for Audit',
            documents: {
              ...curr.documents,
              ...normalized.documents,
            },
          };
          return updated;
        } else {
          return [normalized, ...prev];
        }
      });
    };

    // Drivers collection listener
    try {
      const driversCol = collection(db, 'drivers');
      const unsub = onSnapshot(
        driversCol,
        (snapshot) => {
          if (!snapshot.empty) {
            const list: Driver[] = [];
            snapshot.forEach((d) => {
              const raw = d.data() as any;
              list.push(normalizeDriver(raw, d.id));
            });
            setDrivers(list);
          } else {
            INITIAL_DRIVERS.forEach((item) => {
              setDoc(doc(db, 'drivers', sanitizeId(item.id)), item).catch(() => {});
            });
          }
        },
        (err) => {
          console.warn('Firestore Drivers listener offline fallback:', err);
        }
      );
      unsubs.push(unsub);
    } catch {}

    // Driver Applications & Requirements collections listeners (catches all app verification flows)
    const verificationCollections = ['driverApplications', 'verifications', 'driverVerifications', 'driverRequirements', 'requirements'];
    verificationCollections.forEach((colName) => {
      try {
        const colRef = collection(db, colName);
        const unsub = onSnapshot(
          colRef,
          (snapshot) => {
            if (!snapshot.empty) {
              snapshot.forEach((d) => {
                const raw = d.data() as any;
                mergeVerificationRecord(raw, d.id);
              });
            }
          },
          () => {}
        );
        unsubs.push(unsub);
      } catch {}
    });

    // Passengers real-time listeners across collections ('passengers', 'users', and 'riders')
    const cloudPassengersMap = new Map<string, Passenger>();
    const cloudUsersMap = new Map<string, Passenger>();
    const cloudRidersMap = new Map<string, Passenger>();

    const syncCombinedPassengers = () => {
      const merged = new Map<string, Passenger>();

      // 1. Primary 'passengers' collection
      cloudPassengersMap.forEach((p, id) => merged.set(id, p));

      // 2. 'riders' collection
      cloudRidersMap.forEach((p, id) => {
        if (!merged.has(id)) {
          merged.set(id, p);
        }
      });

      // 3. 'users' collection (filtered to non-drivers)
      cloudUsersMap.forEach((p, id) => {
        if (!merged.has(id)) {
          merged.set(id, p);
        }
      });

      if (merged.size > 0) {
        setPassengers(Array.from(merged.values()));
      }
    };

    // 1. Listen to 'passengers' collection
    try {
      const passCol = collection(db, 'passengers');
      const unsub = onSnapshot(
        passCol,
        (snapshot) => {
          console.log('Passengers listener triggered, size:', snapshot.size);
          cloudPassengersMap.clear();
          if (!snapshot.empty) {
            snapshot.forEach((d) => {
              const raw = d.data() as any;
              cloudPassengersMap.set(d.id, normalizePassenger(raw, d.id));
            });
          }
          syncCombinedPassengers();
        },
        (err) => {
          console.warn('Firestore Passengers listener notice:', err);
        }
      );
      unsubs.push(unsub);
    } catch {}

    // 2. Listen to 'users' collection
    try {
      const usersCol = collection(db, 'users');
      const unsub = onSnapshot(
        usersCol,
        (snapshot) => {
          cloudUsersMap.clear();
          if (!snapshot.empty) {
            snapshot.forEach((d) => {
              const raw = d.data() as any;
              const role = String(raw.role || raw.userType || raw.type || '').toUpperCase();
              const isDriver = role.includes('DRIVER') || d.id.startsWith('SWD-') || d.id.startsWith('DRV-');
              if (!isDriver) {
                cloudUsersMap.set(d.id, normalizePassenger(raw, d.id));
              }
            });
          }
          syncCombinedPassengers();
        },
        (err) => {
          console.warn('Firestore Users listener notice:', err);
        }
      );
      unsubs.push(unsub);
    } catch {}

    // 3. Listen to 'riders' collection
    try {
      const ridersCol = collection(db, 'riders');
      const unsub = onSnapshot(
        ridersCol,
        (snapshot) => {
          cloudRidersMap.clear();
          if (!snapshot.empty) {
            snapshot.forEach((d) => {
              const raw = d.data() as any;
              cloudRidersMap.set(d.id, normalizePassenger(raw, d.id));
            });
          }
          syncCombinedPassengers();
        },
        (err) => {
          console.warn('Firestore Riders listener notice:', err);
        }
      );
      unsubs.push(unsub);
    } catch {}

    // Bookings collection listener
    try {
      const bookingsCol = collection(db, 'bookings');
      const unsub = onSnapshot(
        bookingsCol,
        (snapshot) => {
          if (!snapshot.empty) {
            const list: Booking[] = [];
            snapshot.forEach((d) => {
              const raw = d.data() as any;
              const booking: Booking = {
                id: raw.id || d.id,
                time: raw.time || new Date(raw.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                date: raw.date || new Date(raw.timestamp || Date.now()).toISOString().split('T')[0],
                timestamp: raw.timestamp || Date.now(),
                passenger: {
                  id: raw.passenger?.id || raw.passengerId || 'P-GUEST',
                  name: raw.passenger?.name || raw.passengerName || 'Passenger',
                  phone: raw.passenger?.phone || raw.passengerPhone || '0917-000-0000',
                },
                driverAssigned: raw.driverAssigned
                  ? {
                      id: raw.driverAssigned.id || raw.driverId || '',
                      name: raw.driverAssigned.name || raw.driverName || 'Assigned Driver',
                      plateNumber: raw.driverAssigned.plateNumber || raw.plateNumber || 'N/A',
                      vehicle: raw.driverAssigned.vehicle || raw.vehicle || 'Standard Vehicle',
                    }
                  : raw.driverName
                  ? {
                      id: raw.driverId || '',
                      name: raw.driverName,
                      plateNumber: raw.plateNumber || 'N/A',
                      vehicle: raw.vehicle || 'Standard Vehicle',
                    }
                  : null,
                route: {
                  pickup: raw.route?.pickup || raw.pickupAddress || raw.pickup || 'Pickup Point',
                  dropoff: raw.route?.dropoff || raw.dropoffAddress || raw.dropoff || 'Dropoff Point',
                  pickupCoords: raw.route?.pickupCoords || raw.pickupCoords || [14.5547, 121.0244],
                  dropoffCoords: raw.route?.dropoffCoords || raw.dropoffCoords || [14.5866, 121.061],
                  distanceKm: Number(raw.route?.distanceKm || raw.distanceKm || raw.distance || 3.5),
                },
                fare: Number(raw.fare || raw.amount || 0),
                paymentMethod: raw.paymentMethod || 'GCash',
                status: (raw.status || 'REQUESTED').toUpperCase() as BookingStatus,
                surgeMultiplier: Number(raw.surgeMultiplier || 1.0),
              };
              list.push(booking);
            });
            setBookings(list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
          } else {
            INITIAL_BOOKINGS.forEach((item) => {
              setDoc(doc(db, 'bookings', sanitizeId(item.id)), item).catch(() => {});
            });
          }
        },
        (err) => {
          console.warn('Firestore Bookings listener offline fallback:', err);
        }
      );
      unsubs.push(unsub);
    } catch {}

    // Tickets collection listener
    try {
      const ticketsCol = collection(db, 'supportTickets');
      const unsub = onSnapshot(
        ticketsCol,
        (snapshot) => {
          if (!snapshot.empty) {
            const list: SupportTicket[] = [];
            snapshot.forEach((d) => list.push(d.data() as SupportTicket));
            setTickets(list);
          } else {
            INITIAL_SUPPORT_TICKETS.forEach((item) => {
              setDoc(doc(db, 'supportTickets', sanitizeId(item.id)), item).catch(() => {});
            });
          }
        },
        (err) => {
          console.warn('Firestore Support Tickets listener offline fallback:', err);
        }
      );
      unsubs.push(unsub);
    } catch {}

    return () => {
      unsubs.forEach((u) => u());
    };
  }, []);

  // Derived counts
  const activeCriticalSOSCount = emergencyAlerts.filter((a) => a.status === 'critical').length;
  const pendingDriversCount = drivers.filter((d) => d.isPendingAudit).length;
  const openTicketsCount = tickets.filter((t) => t.status === 'OPEN').length;
  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  // Helper to append activity log
  const addActivityLog = (text: string, iconType: ActivityLog['iconType'] = 'trip') => {
    const newLog: ActivityLog = {
      id: 'act-' + Date.now() + Math.random().toString(36).substr(2, 4),
      text,
      timeAgo: 'Just now',
      timestamp: Date.now(),
      iconType,
    };
    setActivityLogs((prev) => [newLog, ...prev.slice(0, 15)]);
  };

  // 1. Resolve Emergency Alert
  const resolveEmergencyAlert = useCallback((id: string, resolutionNotes?: string) => {
    const sanitizeId = (k: string) => k.replace(/[^a-zA-Z0-9_-]/g, '_');
    const notes = resolutionNotes || 'Incident resolved and cleared by Operations Desk.';

    setEmergencyAlerts((prev) =>
      prev.map((alert) => {
        if (alert.id === id) {
          const updated = {
            ...alert,
            status: 'resolved' as EmergencyStatus,
            resolutionNotes: notes,
          };
          setDoc(doc(db, 'emergencyAlerts', sanitizeId(id)), updated, { merge: true }).catch(() => {});
          return updated;
        }
        return alert;
      })
    );

    addActivityLog(`Emergency SOS #${id} was marked as RESOLVED by Admin`, 'sos');

    setNotifications((prev) => [
      {
        id: 'NOTIF-' + Date.now(),
        title: `Resolved SOS #${id}`,
        category: 'EMERGENCY',
        message: `Incident #${id} has been marked as fully resolved. Responders cleared.`,
        timeAgo: 'Just now',
        timestamp: Date.now(),
        read: false,
        actionTab: 'emergency',
        actionId: id,
      },
      ...prev,
    ]);

    broadcastSync({ type: 'EMERGENCY_UPDATE' });
  }, [broadcastSync]);

  // 2. Dispatch Emergency Unit
  const dispatchEmergencyUnit = useCallback((id: string, unitName: string) => {
    const sanitizeId = (k: string) => k.replace(/[^a-zA-Z0-9_-]/g, '_');
    setEmergencyAlerts((prev) =>
      prev.map((alert) => {
        if (alert.id === id) {
          const updated = {
            ...alert,
            status: 'responding' as EmergencyStatus,
            assignedUnit: unitName,
          };
          setDoc(doc(db, 'emergencyAlerts', sanitizeId(id)), updated, { merge: true }).catch(() => {});
          return updated;
        }
        return alert;
      })
    );

    addActivityLog(`Emergency Unit "${unitName}" dispatched to SOS #${id}`, 'sos');

    setNotifications((prev) => [
      {
        id: 'NOTIF-' + Date.now(),
        title: `Unit Dispatched to #${id}`,
        category: 'EMERGENCY',
        badgeLabel: 'Dispatch Responding',
        message: `${unitName} has been assigned and is en route to incident #${id}.`,
        timeAgo: 'Just now',
        timestamp: Date.now(),
        read: false,
        actionTab: 'emergency',
        actionId: id,
      },
      ...prev,
    ]);

    broadcastSync({ type: 'EMERGENCY_UPDATE' });
  }, [broadcastSync]);

  // 4. Passenger Status & Wallet
  const togglePassengerStatus = useCallback((id: string) => {
    const sanitizeId = (k: string) => k.replace(/[^a-zA-Z0-9_-]/g, '_');
    setPassengers((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const nextStatus: 'ACTIVE' | 'SUSPENDED' = p.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
          const updated: Passenger = { ...p, status: nextStatus };
          setDoc(doc(db, 'passengers', sanitizeId(p.id)), updated, { merge: true }).catch(() => {});
          addActivityLog(`Passenger ${p.name} status changed to ${nextStatus}`, 'wallet');
          return updated;
        }
        return p;
      })
    );
    broadcastSync({ type: 'PASSENGERS_UPDATE' });
  }, [broadcastSync]);

  const updatePassengerWallet = useCallback((id: string, amountDelta: number) => {
    const sanitizeId = (k: string) => k.replace(/[^a-zA-Z0-9_-]/g, '_');
    setPassengers((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const newBal = Math.max(0, p.walletBalance + amountDelta);
          const updated = { ...p, walletBalance: newBal };
          setDoc(doc(db, 'passengers', sanitizeId(p.id)), updated, { merge: true }).catch(() => {});
          addActivityLog(`Passenger ${p.name} wallet adjusted by ₱${amountDelta > 0 ? '+' : ''}${amountDelta.toFixed(2)} (New: ₱${newBal.toFixed(2)})`, 'wallet');
          return updated;
        }
        return p;
      })
    );
    broadcastSync({ type: 'PASSENGERS_UPDATE' });
  }, [broadcastSync]);

  const registerPassenger = useCallback(async (data: Partial<Passenger>) => {
    const sanitizeId = (k: string) => k.replace(/[^a-zA-Z0-9_-]/g, '_');
    const newId = data.id || `P-${Date.now().toString().slice(-4)}`;
    const newPassenger: Passenger = {
      id: newId,
      name: data.name || 'New Passenger',
      avatar: data.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      phone: data.phone || '0917-000-0000',
      email: data.email || `${newId.toLowerCase()}@swiftride.ph`,
      walletBalance: data.walletBalance ?? 250,
      completedRides: data.completedRides ?? 0,
      rating: data.rating ?? 5.0,
      status: data.status || 'ACTIVE',
      joinedDate: data.joinedDate || new Date().toISOString().split('T')[0],
    };

    await setDoc(doc(db, 'passengers', sanitizeId(newId)), newPassenger, { merge: true }).catch((err) => {
      console.warn('Error saving new passenger to cloud:', err);
    });

    addActivityLog(`Passenger ${newPassenger.name} (#${newId}) registered and synced to cloud`, 'dispatch');
    setNotifications((prev) => [
      {
        id: 'NOTIF-' + Date.now(),
        title: 'New Passenger Registered',
        category: 'ALERT',
        message: `${newPassenger.name} (#${newId}) registered successfully.`,
        timeAgo: 'Just now',
        timestamp: Date.now(),
        read: false,
        actionTab: 'passengers',
      },
      ...prev,
    ]);
    broadcastSync({ type: 'PASSENGERS_UPDATE' });
    return newPassenger;
  }, [broadcastSync]);

  // 5. Driver Verification / Actions
  const approveDriver = useCallback((id: string) => {
    const sanitizeId = (k: string) => k.replace(/[^a-zA-Z0-9_-]/g, '_');
    setDrivers((prev) =>
      prev.map((d) => {
        if (d.id === id) {
          const updated: Driver = {
            ...d,
            isPendingAudit: false,
            verificationStatus: 'VERIFIED',
            status: 'ONLINE',
          };
          const cloudPayload = {
            ...updated,
            isPendingAudit: false,
            isPendingVerification: false,
            pendingVerification: false,
            verificationStatus: 'VERIFIED',
            auditStatus: 'APPROVED',
            requirementsStatus: 'VERIFIED',
            status: 'ONLINE',
            isVerified: true,
            resubmitted: false,
            verifiedAt: Date.now(),
          };
          setDoc(doc(db, 'drivers', sanitizeId(d.id)), cloudPayload, { merge: true }).catch(() => {});
          setDoc(doc(db, 'driverApplications', sanitizeId(d.id)), { status: 'APPROVED', verifiedAt: Date.now() }, { merge: true }).catch(() => {});
          setDoc(doc(db, 'verifications', sanitizeId(d.id)), { status: 'APPROVED', verifiedAt: Date.now() }, { merge: true }).catch(() => {});
          setDoc(doc(db, 'driverVerifications', sanitizeId(d.id)), { status: 'APPROVED', verifiedAt: Date.now() }, { merge: true }).catch(() => {});
          
          addActivityLog(`Driver application #${d.id} (${d.name}) verified & approved into active fleet`, 'driver');
          return updated;
        }
        return d;
      })
    );

    setNotifications((prev) => [
      {
        id: 'NOTIF-' + Date.now(),
        title: `Driver Partner Approved`,
        category: 'ALERT',
        message: `Driver partner applicant was verified and granted active platform fleet access.`,
        timeAgo: 'Just now',
        timestamp: Date.now(),
        read: false,
        actionTab: 'drivers',
      },
      ...prev,
    ]);

    broadcastSync({ type: 'DRIVERS_UPDATE' });
  }, [broadcastSync]);

  const rejectDriver = useCallback((id: string, reason?: string) => {
    const sanitizeId = (k: string) => k.replace(/[^a-zA-Z0-9_-]/g, '_');
    const finalReason = reason || 'Requirements failed compliance audit';
    setDrivers((prev) =>
      prev.map((d) => {
        if (d.id === id) {
          const updated: Driver = {
            ...d,
            isPendingAudit: false,
            verificationStatus: 'REJECTED',
            rejectionReason: finalReason,
            status: 'SUSPENDED',
          };
          const cloudPayload = {
            ...updated,
            isPendingAudit: false,
            isPendingVerification: false,
            pendingVerification: false,
            verificationStatus: 'REJECTED',
            auditStatus: 'REJECTED',
            requirementsStatus: 'REJECTED',
            rejectionReason: finalReason,
            status: 'SUSPENDED',
            rejectedAt: Date.now(),
          };
          setDoc(doc(db, 'drivers', sanitizeId(d.id)), cloudPayload, { merge: true }).catch(() => {});
          setDoc(doc(db, 'driverApplications', sanitizeId(d.id)), { status: 'REJECTED', rejectionReason: finalReason, rejectedAt: Date.now() }, { merge: true }).catch(() => {});
          setDoc(doc(db, 'verifications', sanitizeId(d.id)), { status: 'REJECTED', rejectionReason: finalReason, rejectedAt: Date.now() }, { merge: true }).catch(() => {});
          setDoc(doc(db, 'driverVerifications', sanitizeId(d.id)), { status: 'REJECTED', rejectionReason: finalReason, rejectedAt: Date.now() }, { merge: true }).catch(() => {});
          
          addActivityLog(`Driver audit #${d.id} (${d.name}) rejected: ${finalReason}`, 'driver');
          return updated;
        }
        return d;
      })
    );

    setNotifications((prev) => [
      {
        id: 'NOTIF-' + Date.now(),
        title: `Driver Audit Rejected`,
        category: 'ALERT',
        message: `Driver application #${id} was flagged: ${finalReason}.`,
        timeAgo: 'Just now',
        timestamp: Date.now(),
        read: false,
        actionTab: 'drivers',
      },
      ...prev,
    ]);

    broadcastSync({ type: 'DRIVERS_UPDATE' });
  }, [broadcastSync]);

  const toggleDriverStatus = useCallback((id: string, newStatus: DriverStatus) => {
    const sanitizeId = (k: string) => k.replace(/[^a-zA-Z0-9_-]/g, '_');
    setDrivers((prev) =>
      prev.map((d) => {
        if (d.id === id) {
          const updated = { ...d, status: newStatus };
          setDoc(doc(db, 'drivers', sanitizeId(d.id)), updated, { merge: true }).catch(() => {});
          addActivityLog(`Driver ${d.name} (${d.plateNumber}) status updated to ${newStatus}`, 'driver');
          return updated;
        }
        return d;
      })
    );
    broadcastSync({ type: 'DRIVERS_UPDATE' });
  }, [broadcastSync]);

  // 6. Bookings
  const updateBookingStatus = useCallback((id: string, newStatus: BookingStatus) => {
    const sanitizeId = (k: string) => k.replace(/[^a-zA-Z0-9_-]/g, '_');
    setBookings((prev) =>
      prev.map((b) => {
        if (b.id === id) {
          const updated = { ...b, status: newStatus };
          setDoc(doc(db, 'bookings', sanitizeId(b.id)), updated, { merge: true }).catch(() => {});
          addActivityLog(`Trip ${b.id} status updated to ${newStatus}`, 'trip');
          return updated;
        }
        return b;
      })
    );
    broadcastSync({ type: 'BOOKINGS_UPDATE' });
  }, [broadcastSync]);

  const createBooking = useCallback((bookingData: Partial<Booking>) => {
    const sanitizeId = (k: string) => k.replace(/[^a-zA-Z0-9_-]/g, '_');
    const newId = '#TRIP-' + Math.floor(1000 + Math.random() * 9000);
    const newBooking: Booking = {
      id: newId,
      time: 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: 'Today',
      timestamp: Date.now(),
      passenger: bookingData.passenger || {
        id: 'PAS-101',
        name: 'John Michael Nabung',
        phone: '0912 345 6789',
      },
      driverAssigned: bookingData.driverAssigned || null,
      route: bookingData.route || {
        pickup: 'SM North EDSA',
        dropoff: 'Ayala Malls Vertis North',
        distanceKm: 2.5,
      },
      fare: bookingData.fare || 140.0,
      paymentMethod: bookingData.paymentMethod || 'GCash',
      status: bookingData.status || 'REQUESTED',
    };

    setBookings((prev) => [newBooking, ...prev]);
    setDoc(doc(db, 'bookings', sanitizeId(newBooking.id)), newBooking).catch(() => {});
    addActivityLog(`New passenger ride request created ${newId}`, 'dispatch');
    broadcastSync({ type: 'BOOKINGS_UPDATE' });
  }, [broadcastSync]);

  const acceptBooking = useCallback((bookingId: string, driver: Driver) => {
    const sanitizeId = (k: string) => k.replace(/[^a-zA-Z0-9_-]/g, '_');
    setBookings((prev) =>
      prev.map((b) => {
        if (b.id === bookingId) {
          const updated: Booking = {
            ...b,
            status: 'ACCEPTED',
            driverAssigned: {
              id: driver.id,
              name: driver.name,
              plateNumber: driver.plateNumber,
              vehicle: driver.vehicleDetails,
            },
          };
          setDoc(doc(db, 'bookings', sanitizeId(b.id)), updated, { merge: true }).catch(() => {});
          addActivityLog(`Driver ${driver.name} accepted ride request ${b.id}`, 'trip');
          return updated;
        }
        return b;
      })
    );
    toggleDriverStatus(driver.id, 'ON TRIP');
    broadcastSync({ type: 'BOOKINGS_UPDATE' });
  }, [broadcastSync, toggleDriverStatus]);

  const declineBooking = useCallback((bookingId: string) => {
    const sanitizeId = (k: string) => k.replace(/[^a-zA-Z0-9_-]/g, '_');
    setBookings((prev) =>
      prev.map((b) => {
        if (b.id === bookingId) {
          const updated: Booking = {
            ...b,
            status: 'CANCELLED',
          };
          setDoc(doc(db, 'bookings', sanitizeId(b.id)), updated, { merge: true }).catch(() => {});
          addActivityLog(`Ride request ${b.id} declined by driver`, 'trip');
          return updated;
        }
        return b;
      })
    );
    broadcastSync({ type: 'BOOKINGS_UPDATE' });
  }, [broadcastSync]);

  // 7. Support Tickets
  const replyToTicket = useCallback((id: string, text: string, newStatus?: 'OPEN' | 'IN PROGRESS' | 'RESOLVED') => {
    const sanitizeId = (k: string) => k.replace(/[^a-zA-Z0-9_-]/g, '_');
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const newMsg = {
            id: 'msg-' + Date.now(),
            sender: 'Admin Master',
            isAdmin: true,
            text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          const updated = {
            ...t,
            status: newStatus || 'IN PROGRESS',
            messages: [...t.messages, newMsg],
          };
          setDoc(doc(db, 'supportTickets', sanitizeId(t.id)), updated, { merge: true }).catch(() => {});
          addActivityLog(`Admin replied to Support Ticket ${t.id}`, 'sos');
          return updated;
        }
        return t;
      })
    );
    broadcastSync({ type: 'TICKETS_UPDATE' });
  }, [broadcastSync]);

  const resolveTicket = useCallback((id: string) => {
    const sanitizeId = (k: string) => k.replace(/[^a-zA-Z0-9_-]/g, '_');
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const updated = { ...t, status: 'RESOLVED' as const };
          setDoc(doc(db, 'supportTickets', sanitizeId(t.id)), updated, { merge: true }).catch(() => {});
          return updated;
        }
        return t;
      })
    );
    addActivityLog(`Support Ticket ${id} marked as RESOLVED`, 'sos');
    broadcastSync({ type: 'TICKETS_UPDATE' });
  }, [broadcastSync]);

  // 8. Notifications
  const markNotificationAsRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    broadcastSync({ type: 'NOTIFICATIONS_UPDATE' });
  }, [broadcastSync]);

  const markAllNotificationsAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    broadcastSync({ type: 'NOTIFICATIONS_UPDATE' });
  }, [broadcastSync]);

  // 9. Settings
  const updateSettings = useCallback((newSettings: any) => {
    if ('baseFare' in newSettings) {
      setSystemSettings(newSettings);
      try {
        localStorage.setItem(`${STORAGE_KEY}_sys_settings`, JSON.stringify(newSettings));
      } catch {}
    } else {
      setSettings(newSettings);
      try {
        localStorage.setItem(`${STORAGE_KEY}_settings`, JSON.stringify(newSettings));
      } catch {}
    }
    addActivityLog('System settings & fare configurations updated successfully', 'driver');
    broadcastSync({ type: 'SETTINGS_UPDATE' });
  }, [broadcastSync]);

  // 10. Reports & Downloads
  const generateReportDownload = useCallback((reportId: string) => {
    const report = reports.find((r) => r.id === reportId);
    if (!report) return;

    const dataContent = `SWIFTRIDE ENTERPRISE REPORT\nTitle: ${report.title}\nCategory: ${report.category}\nGenerated At: ${new Date().toISOString()}\nTotal Records Processed: ${report.recordsCount}\nFile Integrity: Verified SHA-256 Checksum\n\n--- EXECUTIVE SUMMARY ---\nPlatform: SwiftRide Metro Manila Network\nFleet Volume: Operational\nServer Status: Healthy\n`;

    const blob = new Blob([dataContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${report.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    addActivityLog(`Downloaded report: ${report.title}`, 'dispatch');
  }, [reports]);

  // 11. CSV Exporter
  const exportCsvData = useCallback((entity: 'passengers' | 'drivers' | 'bookings' | 'earnings' | 'emergency') => {
    let csvContent = '';
    let filename = `swiftride_${entity}_${Date.now()}.csv`;

    if (entity === 'passengers') {
      csvContent = 'ID,Name,Phone,Email,Wallet Balance (PHP),Completed Rides,Rating,Status\n';
      passengers.forEach((p) => {
        csvContent += `"${p.id}","${p.name}","${p.phone}","${p.email}","${p.walletBalance}","${p.completedRides}","${p.rating}","${p.status}"\n`;
      });
    } else if (entity === 'drivers') {
      csvContent = 'ID,Name,Phone,Email,Vehicle,Plate Number,Rating,Completed Trips,Acceptance Rate,Status\n';
      drivers.forEach((d) => {
        csvContent += `"${d.id}","${d.name}","${d.phone}","${d.email}","${d.vehicleDetails}","${d.plateNumber}","${d.rating}","${d.completedTrips}","${d.acceptanceRate}%","${d.status}"\n`;
      });
    } else if (entity === 'bookings') {
      csvContent = 'Booking ID,Time,Passenger,Driver,Pickup,Dropoff,Fare (PHP),Payment Method,Status\n';
      bookings.forEach((b) => {
        csvContent += `"${b.id}","${b.time}","${b.passenger.name}","${b.driverAssigned?.name || 'Unassigned'}","${b.route.pickup}","${b.route.dropoff}","${b.fare}","${b.paymentMethod}","${b.status}"\n`;
      });
    } else if (entity === 'emergency') {
      csvContent = 'SOS ID,Type,Status,User,Role,Phone,Location,Incident Log\n';
      emergencyAlerts.forEach((e) => {
        csvContent += `"${e.id}","${e.type}","${e.status}","${e.userName}","${e.userRole}","${e.userPhone}","${e.location.name}","${e.incidentLog.replace(/"/g, '""')}"\n`;
      });
    } else if (entity === 'earnings') {
      csvContent = 'Day,Gross Volume (PHP),Driver Net 85% (PHP),Platform Commission 15% (PHP)\n';
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const volumes = [210000, 245000, 260000, 310000, 345000, 360000, 280000];
      days.forEach((day, idx) => {
        const vol = volumes[idx];
        const driverNet = vol * 0.85;
        const comm = vol * 0.15;
        csvContent += `"${day}","${vol}","${driverNet}","${comm}"\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    addActivityLog(`Exported ${entity.toUpperCase()} dataset to CSV file`, 'dispatch');
  }, [passengers, drivers, bookings, emergencyAlerts]);

  // 12. Reset to default
  const resetDatabaseToDefault = useCallback(() => {
    localStorage.clear();
    setEmergencyAlerts(INITIAL_EMERGENCY_ALERTS);
    setPassengers(INITIAL_PASSENGERS);
    setDrivers(INITIAL_DRIVERS);
    setBookings(INITIAL_BOOKINGS);
    setTickets(INITIAL_SUPPORT_TICKETS);
    setNotifications(INITIAL_NOTIFICATIONS);
    setActivityLogs(INITIAL_ACTIVITY_LOGS);
    setSettings(INITIAL_SETTINGS);
    broadcastSync({ type: 'FULL_RESET' });
    addActivityLog('System database reset to initial production seeds', 'dispatch');
  }, [broadcastSync]);

  // 13. Manual telemetry ping
  const triggerManualTelemetryPing = useCallback(() => {
    setLastSyncTimestamp(Date.now());
    addActivityLog('Manual telemetry radar ping dispatched to 2,315 fleet units', 'dispatch');
  }, []);

  // 14. Manual Refresh & Cloud Sync
  const refreshCloudData = useCallback(async () => {
    try {
      addActivityLog('Syncing latest driver verifications, fleet records, and passenger accounts from cloud...', 'dispatch');
      
      // 1. Sync Drivers
      const dSnap = await getDocs(collection(db, 'drivers'));
      if (!dSnap.empty) {
        const list: Driver[] = [];
        dSnap.forEach((d) => {
          list.push(normalizeDriver(d.data(), d.id));
        });
        setDrivers(list);
      }

      // 2. Sync Passengers across collections
      const pMerged = new Map<string, Passenger>();
      try {
        const pSnap = await getDocs(collection(db, 'passengers'));
        pSnap.forEach((d) => {
          pMerged.set(d.id, normalizePassenger(d.data(), d.id));
        });
      } catch {}

      try {
        const rSnap = await getDocs(collection(db, 'riders'));
        rSnap.forEach((d) => {
          if (!pMerged.has(d.id)) {
            pMerged.set(d.id, normalizePassenger(d.data(), d.id));
          }
        });
      } catch {}

      try {
        const uSnap = await getDocs(collection(db, 'users'));
        uSnap.forEach((d) => {
          const raw = d.data() as any;
          const role = String(raw.role || raw.userType || raw.type || '').toUpperCase();
          const isDriver = role.includes('DRIVER') || d.id.startsWith('SWD-') || d.id.startsWith('DRV-');
          if (!isDriver && !pMerged.has(d.id)) {
            pMerged.set(d.id, normalizePassenger(raw, d.id));
          }
        });
      } catch {}

      if (pMerged.size > 0) {
        setPassengers(Array.from(pMerged.values()));
      }

      // Check verification collections
      const verifCols = ['driverApplications', 'verifications', 'driverVerifications', 'driverRequirements', 'requirements'];
      for (const colName of verifCols) {
        try {
          const s = await getDocs(collection(db, colName));
          if (!s.empty) {
            s.forEach((d) => {
              const raw = d.data() as any;
              const driverId = raw.driverId || raw.id || d.id;
              setDrivers((prev) => {
                const existingIdx = prev.findIndex(
                  (dr) => dr.id === driverId || (raw.phone && dr.phone === raw.phone) || (raw.email && dr.email === raw.email)
                );
                const normalized = normalizeDriver({ ...raw, isPendingAudit: true }, driverId);
                if (existingIdx >= 0) {
                  const updated = [...prev];
                  const curr = updated[existingIdx];
                  updated[existingIdx] = {
                    ...curr,
                    isPendingAudit: true,
                    isResubmission: true,
                    verificationStatus: raw.verificationStatus || 'PENDING',
                    status: curr.status === 'SUSPENDED' ? 'SUSPENDED' : 'OFFLINE',
                    submittedDate: normalized.submittedDate || 'Resubmitted for Audit',
                    documents: {
                      ...curr.documents,
                      ...normalized.documents,
                    },
                  };
                  return updated;
                } else {
                  return [normalized, ...prev];
                }
              });
            });
          }
        } catch {}
      }

      setLastSyncTimestamp(Date.now());
      addActivityLog('Cloud database sync complete. Driver requirements verified.', 'dispatch');
    } catch (err) {
      console.warn('Manual cloud sync notice:', err);
    }
  }, []);

  return (
    <RealtimeDbContext.Provider
      value={{
        emergencyAlerts,
        passengers,
        drivers,
        bookings,
        tickets,
        notifications,
        activityLogs,
        settings,
        systemSettings,
        reports,
        currentAdminUser,
        setAdminUser,
        lastSyncTimestamp,
        activeCriticalSOSCount,
        pendingDriversCount,
        openTicketsCount,
        unreadNotificationsCount,
        resolveEmergencyAlert,
        dispatchEmergencyUnit,
        togglePassengerStatus,
        updatePassengerWallet,
        approveDriver,
        rejectDriver,
        toggleDriverStatus,
        updateBookingStatus,
        acceptBooking,
        declineBooking,
        createBooking,
        replyToTicket,
        resolveTicket,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        updateSettings,
        generateReportDownload,
        exportCsvData,
        resetDatabaseToDefault,
        resetToFactoryDefaults: resetDatabaseToDefault,
        triggerManualTelemetryPing,
        refreshCloudData,
        registerPassenger,
      }}
    >
      {children}
    </RealtimeDbContext.Provider>
  );
};

export const useRealtimeDb = () => {
  const context = useContext(RealtimeDbContext);
  if (!context) {
    throw new Error('useRealtimeDb must be used within a RealtimeDbProvider');
  }
  return context;
};
