import React, { useState, useRef, useEffect } from 'react';
import { doc, collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { Driver, DriverQuickNote } from '../../types';
import {
  X,
  Star,
  CheckCircle2,
  AlertOctagon,
  FileText,
  Car,
  Phone,
  Mail,
  MapPin,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Ban,
  Check,
  ExternalLink,
  Eye,
  Maximize2,
  AlertTriangle,
  ZoomIn,
  RotateCw,
  QrCode,
  Calendar,
  Layers,
  StickyNote,
  MessageSquare,
  Send,
  Trash2,
  Tag,
  Plus,
  ChevronDown,
  ChevronUp,
  Sparkles,
  User,
  Camera,
  Upload,
} from 'lucide-react';
import { useRealtimeDb } from '../../context/RealtimeDbContext';
import { getDriverDocuments, getDriverRequirementUrls } from '../../utils/documentHelpers';
import {
  getFallbackAvatarUrl,
  compressImageFileToBase64,
  isCustomUploadedAvatar,
  formatUploadedSourceLabel,
} from '../../utils/imageHelpers';
import { DocumentVisualCard } from '../documents/DocumentVisualCard';
import { DocumentViewerModal } from './DocumentViewerModal';

interface DriverInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  driver: Driver | null;
  onOpenCall?: (name: string, phone: string) => void;
}

export const DriverInspectionModal: React.FC<DriverInspectionModalProps> = ({
  isOpen,
  onClose,
  driver,
  onOpenCall,
}) => {
  const {
    drivers,
    approveDriver,
    approveSeminar,
    rejectDriver,
    updateDriverPhoto,
    updateDriverDocumentPhoto,
    updateDriverDocumentStatus,
    toggleDriverStatus,
    addDriverQuickNote,
    deleteDriverQuickNote,
    currentAdminUser,
  } = useRealtimeDb();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const docPhotoInputRef = useRef<HTMLInputElement>(null);
  const [pendingUploadDoc, setPendingUploadDoc] = useState<{ id: string; type: string } | null>(null);

  // Real-time Firestore snapshots for drivers/{driverId}, requirements/{driverId}, and subcollections
  const [driverSnapshotData, setDriverSnapshotData] = useState<Record<string, any> | null>(null);
  const [requirementsSnapshotData, setRequirementsSnapshotData] = useState<Record<string, any> | null>(null);
  const [subcollectionReqDocs, setSubcollectionReqDocs] = useState<Record<string, any>[]>([]);
  const [subcollectionDocDocs, setSubcollectionDocDocs] = useState<Record<string, any>[]>([]);
  const [subcollectionAppDocs, setSubcollectionAppDocs] = useState<Record<string, any>[]>([]);

  // Live driver instance from real-time database to ensure immediate cross-admin synchronization
  const liveDriver = (driver ? drivers.find((d) => d.id === driver.id) : null) || driver;

  useEffect(() => {
    if (!isOpen || !driver?.id) {
      setDriverSnapshotData(null);
      setRequirementsSnapshotData(null);
      setSubcollectionReqDocs([]);
      setSubcollectionDocDocs([]);
      setSubcollectionAppDocs([]);
      return;
    }

    const rawId = driver.id;
    const strippedId = rawId.replace(/^#/, '');
    const sanitizedId = rawId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const candidateIds = Array.from(new Set([rawId, strippedId, sanitizedId].filter(Boolean)));

    const unsubs: (() => void)[] = [];

    candidateIds.forEach((docId) => {
      try {
        const unsubDriver = onSnapshot(
          doc(db, 'drivers', docId),
          (snap) => {
            if (snap.exists()) {
              setDriverSnapshotData((prev) => ({ ...(prev || {}), ...(snap.data() as Record<string, any>) }));
            }
          },
          () => {}
        );
        unsubs.push(unsubDriver);
      } catch {}

      try {
        const unsubReq = onSnapshot(
          doc(db, 'requirements', docId),
          (snap) => {
            if (snap.exists()) {
              setRequirementsSnapshotData((prev) => ({ ...(prev || {}), ...(snap.data() as Record<string, any>) }));
            }
          },
          () => {}
        );
        unsubs.push(unsubReq);
      } catch {}

      // Listen to subcollection drivers/{driverId}/requirements
      try {
        const unsubSubReq = onSnapshot(
          collection(db, 'drivers', docId, 'requirements'),
          (snap) => {
            if (!snap.empty) {
              setSubcollectionReqDocs(
                snap.docs.map((d) => ({
                  id: d.id,
                  type: d.data().type || d.data().documentType || d.id,
                  documentType: d.data().documentType || d.data().type || d.id,
                  ...d.data(),
                }))
              );
            }
          },
          () => {}
        );
        unsubs.push(unsubSubReq);
      } catch {}

      // Listen to subcollection drivers/{driverId}/documents
      try {
        const unsubSubDocs = onSnapshot(
          collection(db, 'drivers', docId, 'documents'),
          (snap) => {
            if (!snap.empty) {
              setSubcollectionDocDocs(
                snap.docs.map((d) => ({
                  id: d.id,
                  type: d.data().type || d.data().documentType || d.id,
                  documentType: d.data().documentType || d.data().type || d.id,
                  ...d.data(),
                }))
              );
            }
          },
          () => {}
        );
        unsubs.push(unsubSubDocs);
      } catch {}

      // Listen to subcollection driverApplications/{driverId}/documents
      try {
        const unsubAppDocs = onSnapshot(
          collection(db, 'driverApplications', docId, 'documents'),
          (snap) => {
            if (!snap.empty) {
              setSubcollectionAppDocs(
                snap.docs.map((d) => ({
                  id: d.id,
                  type: d.data().type || d.data().documentType || d.id,
                  documentType: d.data().documentType || d.data().type || d.id,
                  ...d.data(),
                }))
              );
            }
          },
          () => {}
        );
        unsubs.push(unsubAppDocs);
      } catch {}
    });

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [isOpen, driver?.id]);

  // Document Viewer Lightbox State
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [activeDocIndex, setActiveDocIndex] = useState(0);
  const [isAvatarLightboxOpen, setIsAvatarLightboxOpen] = useState(false);
  const [avatarZoom, setAvatarZoom] = useState(1);
  const [avatarRotation, setAvatarRotation] = useState(0);

  // Rejection dialog state
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Per-document status overrides
  const [docStatuses, setDocStatuses] = useState<Record<string, 'VERIFIED' | 'REJECTED'>>({});

  // Quick Notes State
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteTag, setNewNoteTag] = useState<NonNullable<DriverQuickNote['tag']>>('PROGRESS');
  const [isNotesCollapsed, setIsNotesCollapsed] = useState(false);

  if (!isOpen || !driver || !liveDriver) return null;

  const extraSources = [
    subcollectionReqDocs.length > 0 ? { subcollectionRequirements: subcollectionReqDocs } : null,
    subcollectionDocDocs.length > 0 ? { subcollectionDocuments: subcollectionDocDocs } : null,
    subcollectionAppDocs.length > 0 ? { subcollectionDocuments: subcollectionAppDocs } : null,
    requirementsSnapshotData,
    driverSnapshotData,
  ].filter(Boolean);
  const { uploadedRequirementsCount } = getDriverRequirementUrls([...extraSources, liveDriver]);
  const canVerifyRequirements = uploadedRequirementsCount >= 5;
  const documents = getDriverDocuments(liveDriver, extraSources);
  const quickNotes = liveDriver.quickNotes || [];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDriverAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAvatar(true);
    try {
      const base64DataUrl = await compressImageFileToBase64(file, 600, 600, 0.8);
      updateDriverPhoto(liveDriver.id, base64DataUrl);
      showToast('Driver profile photo synced to Firestore!');
    } catch {
      showToast('Failed to process selected image.');
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleDocPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pendingUploadDoc) return;
    try {
      const base64DataUrl = await compressImageFileToBase64(file, 960, 960, 0.82);
      updateDriverDocumentPhoto(liveDriver.id, pendingUploadDoc.id, pendingUploadDoc.type, base64DataUrl, file.name);
      showToast(`Credential image (${file.name}) synced to Firestore!`);
    } catch {
      showToast('Failed to process credential image.');
    } finally {
      setPendingUploadDoc(null);
      if (docPhotoInputRef.current) docPhotoInputRef.current.value = '';
    }
  };

  const handleOpenDocViewer = (index: number) => {
    setActiveDocIndex(index);
    setIsViewerOpen(true);
  };

  const handleUpdateDocStatus = (docId: string, status: 'VERIFIED' | 'REJECTED', reason?: string) => {
    setDocStatuses((prev) => ({ ...prev, [docId]: status }));
    updateDriverDocumentStatus(liveDriver.id, docId, status, reason);
    if (status === 'VERIFIED') {
      showToast('Document marked as verified and synced to Driver App.');
    } else {
      showToast(`Document flagged: ${reason || 'Failed check'}`);
    }
  };

  const handleConfirmRejection = () => {
    const finalReason = rejectionReason.trim() || 'Requirements failed compliance audit. Please re-upload clear credentials.';
    rejectDriver(liveDriver.id, finalReason);
    showToast(`Driver #${liveDriver.id} rejected with feedback sent.`);
    setIsRejectModalOpen(false);
    setTimeout(onClose, 800);
  };

  const handleApproveWithCheck = () => {
    if (uploadedRequirementsCount < 5) {
      showToast(`Cannot verify: only ${uploadedRequirementsCount} of 5 requirement photos have been uploaded.`);
      return;
    }
    approveDriver(liveDriver.id);
    showToast(`Driver credentials verified! Awaiting seminar attendance.`);
    setTimeout(onClose, 1000);
  };

  const handleSeminarComplete = () => {
    approveSeminar(liveDriver.id);
    showToast(`Driver ${liveDriver.name} activated into active fleet!`);
    setTimeout(onClose, 1000);
  };

  const handleAddNote = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newNoteText.trim()) return;
    addDriverQuickNote(liveDriver.id, newNoteText.trim(), newNoteTag);
    setNewNoteText('');
    showToast('Quick remark attached and synced for all admins.');
  };

  const handleDeleteNote = (noteId: string) => {
    deleteDriverQuickNote(liveDriver.id, noteId);
    showToast('Remark removed.');
  };

  const formatNoteTime = (timestamp: number) => {
    try {
      const d = new Date(timestamp);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Recently';
    }
  };

  const getTagBadge = (tag?: DriverQuickNote['tag']) => {
    switch (tag) {
      case 'DOCUMENTS':
        return 'bg-amber-500/15 border-amber-500/30 text-amber-400';
      case 'CALL_LOG':
        return 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400';
      case 'SEMINAR':
        return 'bg-purple-500/15 border-purple-500/30 text-purple-400';
      case 'VERIFICATION':
        return 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400';
      case 'PROGRESS':
      default:
        return 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400';
    }
  };

  const getTagLabel = (tag?: DriverQuickNote['tag']) => {
    switch (tag) {
      case 'DOCUMENTS':
        return 'Document Check';
      case 'CALL_LOG':
        return 'Phone Call';
      case 'SEMINAR':
        return 'Seminar';
      case 'VERIFICATION':
        return 'Background';
      case 'PROGRESS':
      default:
        return 'Progress';
    }
  };

  const verifiedCount = documents.filter((doc) => {
    const status = docStatuses[doc.id] || doc.status;
    return status === 'VERIFIED';
  }).length;

  return (
    <>
      <div
        id="driver-inspection-modal-root"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex justify-end animate-in fade-in duration-150"
      >
        <div className="w-full max-w-2xl h-full bg-[#0a0f1d] border-l border-slate-800 p-5 sm:p-6 shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-right duration-200">
          {/* Top Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-white">
                    Driver Partner Dossier & Document Inspection
                  </h3>
                  {driver.isPendingAudit && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse">
                      AUDIT REQUIRED
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Applicant ID: <span className="text-amber-400 font-bold">{driver.id}</span> • Registered City:{' '}
                  <span className="text-slate-200 font-bold">{driver.city}</span>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close Dossier"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-5 py-4 pr-1">
            {toastMessage && (
              <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4" />
                <span>{toastMessage}</span>
              </div>
            )}

            {/* Pending Audit / Resubmission Notification Alert */}
            {driver.isPendingAudit && (
              <div className="p-4 bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-amber-500/5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500 text-black font-black flex items-center justify-center shadow-md">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-amber-400 uppercase tracking-wide">
                        {driver.isResubmission ? 'Requirements Resubmitted by Driver' : 'Regulatory Onboarding Audit Queue'}
                      </span>
                      {driver.isResubmission && (
                        <span className="px-2 py-0.5 rounded text-[9px] font-black bg-amber-400 text-black uppercase">
                          Updated Files
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-200 block mt-0.5">
                      {driver.rejectionReason ? (
                        <span className="text-amber-300">
                          <strong>Previous Note:</strong> {driver.rejectionReason}
                        </span>
                      ) : (
                        'Verify all credentials below (LTO License, OR/CR, NBI Clearance) before granting requirements approval.'
                      )}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenDocViewer(0)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black rounded-xl shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition-all whitespace-nowrap self-start sm:self-auto"
                >
                  <Eye className="w-4 h-4 stroke-[2.5]" />
                  <span>Inspect All ({documents.length} Docs)</span>
                </button>
              </div>
            )}

            {/* Seminar Appointment & Attendance Verification Banner */}
            {(liveDriver.seminarAppointment || (liveDriver.isVerified && !liveDriver.hasAttendedSeminar)) && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl space-y-3 shadow-lg shadow-emerald-500/5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500 text-black font-black flex items-center justify-center shadow-md">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-black text-emerald-400 uppercase tracking-wide">
                          {liveDriver.hasAttendedSeminar
                            ? 'On-Site Onboarding Seminar Completed'
                            : liveDriver.seminarAppointment
                            ? 'On-Site Seminar Appointment Scheduled'
                            : 'Credentials Verified — Awaiting Seminar'}
                        </span>
                        {liveDriver.seminarAppointment?.bookingReference && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black bg-emerald-400 text-black uppercase">
                            Ref: {liveDriver.seminarAppointment.bookingReference}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-200 block mt-0.5">
                        {liveDriver.hasAttendedSeminar
                          ? 'Driver has attended the training seminar and is authorized to accept rides (`canAcceptRides: true`).'
                          : 'Confirm on-site seminar attendance to activate road dispatch (`canAcceptRides: true`).'}
                      </span>
                    </div>
                  </div>

                  {!liveDriver.hasAttendedSeminar && (
                    <button
                      onClick={handleSeminarComplete}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black rounded-xl shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition-all whitespace-nowrap self-start sm:self-auto cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                      <span>Confirm Seminar & Activate</span>
                    </button>
                  )}
                </div>

                {liveDriver.seminarAppointment && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-emerald-500/20 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Training Hub Venue</span>
                      <span className="font-bold text-white block mt-0.5">
                        {liveDriver.seminarAppointment.venueName || liveDriver.seminarAppointment.venue || 'SwiftRide Training Hub'}
                      </span>
                      {liveDriver.seminarAppointment.venueAddress && (
                        <span className="text-[11px] text-slate-400 block">{liveDriver.seminarAppointment.venueAddress}</span>
                      )}
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Scheduled Date & Slot</span>
                      <span className="font-bold text-white block mt-0.5">
                        {liveDriver.seminarAppointment.date || 'Scheduled'}
                      </span>
                      <span className="text-[11px] text-emerald-400 font-mono block">
                        {liveDriver.seminarAppointment.timeSlot || 'Morning Session'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Onboarding Stage</span>
                      <span className="font-mono font-bold text-amber-400 block mt-0.5">
                        {liveDriver.stage || liveDriver.seminarAppointment.status || 'SEMINAR_SCHEDULED'}
                      </span>
                      <span className="text-[11px] text-slate-400 block">
                        Ride Dispatch: {liveDriver.canAcceptRides ? 'Authorized' : 'Locked until Seminar'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Driver Identity & Vehicle Bar */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <input
                ref={docPhotoInputRef}
                type="file"
                accept="image/*"
                onChange={handleDocPhotoUpload}
                className="hidden"
              />

              <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-base font-black text-white">{liveDriver.name}</h4>
                    <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 font-mono text-xs font-black">
                      {liveDriver.plateNumber}
                    </span>
                    {quickNotes.length > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-bold flex items-center gap-1">
                        <StickyNote className="w-3 h-3" />
                        <span>{quickNotes.length} Notes</span>
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-bold text-slate-200">{liveDriver.vehicleDetails}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-amber-400" />
                      {liveDriver.phone}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3 text-amber-400" />
                      {liveDriver.email}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {onOpenCall && (
                    <button
                      onClick={() => onOpenCall(liveDriver.name, liveDriver.phone)}
                      className="px-3.5 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-400 text-xs font-bold rounded-xl flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call Driver</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* QUICK NOTES & INTERNAL PROGRESS REMARKS SECTION */}
            <div className="bg-[#080d19] border border-slate-800 rounded-2xl overflow-hidden transition-all">
              {/* Section Header */}
              <div className="p-4 bg-slate-900/50 border-b border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                    <StickyNote className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                        Internal Quick Notes & Progress Remarks
                      </h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400">
                        {quickNotes.length} {quickNotes.length === 1 ? 'Remark' : 'Remarks'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Collaborative internal dossier remarks for admins tracking follow-ups, document checks, and applicant status.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsNotesCollapsed((prev) => !prev)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>{isNotesCollapsed ? 'Show Notes' : 'Hide Notes'}</span>
                  {isNotesCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                </button>
              </div>

              {!isNotesCollapsed && (
                <div className="p-4 space-y-4">
                  {/* Add New Note Input Form */}
                  <form onSubmit={handleAddNote} className="space-y-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/90">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Remark Category:</span>
                        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                          {(['PROGRESS', 'DOCUMENTS', 'CALL_LOG', 'SEMINAR', 'VERIFICATION'] as const).map((tagOption) => (
                            <button
                              key={tagOption}
                              type="button"
                              onClick={() => setNewNoteTag(tagOption)}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                                newNoteTag === tagOption
                                  ? 'bg-amber-500 text-black shadow-sm font-extrabold'
                                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                              }`}
                            >
                              {getTagLabel(tagOption)}
                            </button>
                          ))}
                        </div>
                      </div>

                      <span className="text-[10px] text-slate-400 self-end sm:self-auto font-mono">
                        Posting as: <strong className="text-amber-400">{currentAdminUser.name}</strong>
                      </span>
                    </div>

                    <div className="relative">
                      <textarea
                        value={newNoteText}
                        onChange={(e) => setNewNoteText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                            handleAddNote();
                          }
                        }}
                        placeholder="Attach temporary internal note (e.g. 'Driver phoned to confirm they will resubmit NBI clearance tomorrow morning', 'LTO check verified')..."
                        rows={2}
                        className="w-full bg-[#0c121e] border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors resize-none"
                      />
                    </div>

                    {/* Quick Template Chips & Post Button */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                        <span className="text-slate-500 font-bold uppercase tracking-wider">Quick:</span>
                        {[
                          { text: '📞 Called driver - resubmitting photo', tag: 'CALL_LOG' as const },
                          { text: '🔍 Verified with online LTO portal', tag: 'VERIFICATION' as const },
                          { text: '📅 Scheduled for upcoming seminar', tag: 'SEMINAR' as const },
                          { text: '⚠️ Front license image is clear, pending back side', tag: 'DOCUMENTS' as const },
                        ].map((chip) => (
                          <button
                            key={chip.text}
                            type="button"
                            onClick={() => {
                              setNewNoteText((prev) => (prev ? `${prev} • ${chip.text}` : chip.text));
                              setNewNoteTag(chip.tag);
                            }}
                            className="px-2 py-0.5 rounded bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors cursor-pointer"
                          >
                            {chip.text}
                          </button>
                        ))}
                      </div>

                      <button
                        type="submit"
                        disabled={!newNoteText.trim()}
                        className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black rounded-xl shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed self-end sm:self-auto whitespace-nowrap"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Add Remark</span>
                      </button>
                    </div>
                  </form>

                  {/* List of Attached Quick Notes */}
                  {quickNotes.length === 0 ? (
                    <div className="p-4 bg-slate-900/30 border border-slate-800/80 rounded-xl text-center space-y-1">
                      <p className="text-xs font-bold text-slate-300">No internal remarks attached yet</p>
                      <p className="text-[11px] text-slate-400">
                        Leave a progress note or call update above to collaborate with other administrators inspecting this application.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                      {quickNotes.map((note) => (
                        <div
                          key={note.id}
                          className="p-3 bg-slate-900/70 hover:bg-slate-900 border border-slate-800 rounded-xl flex items-start justify-between gap-3 group transition-colors"
                        >
                          <div className="flex items-start gap-2.5 min-w-0 flex-1">
                            {note.adminAvatar ? (
                              <img
                                src={note.adminAvatar}
                                alt={note.adminName}
                                className="w-7 h-7 rounded-lg object-cover ring-1 ring-slate-700 flex-shrink-0 mt-0.5"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                                {note.adminName.slice(0, 2).toUpperCase()}
                              </div>
                            )}

                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                <span className="text-xs font-black text-white">{note.adminName}</span>
                                {note.adminRole && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700 uppercase">
                                    {note.adminRole}
                                  </span>
                                )}
                                <span
                                  className={`text-[9px] font-black px-1.5 py-0.2 rounded border uppercase tracking-wider ${getTagBadge(
                                    note.tag
                                  )}`}
                                >
                                  {getTagLabel(note.tag)}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono ml-auto">
                                  {formatNoteTime(note.createdAt)}
                                </span>
                              </div>
                              <p className="text-xs text-slate-200 leading-relaxed break-words whitespace-pre-wrap">
                                {note.text}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteNote(note.id)}
                            title="Remove remark"
                            className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-60 group-hover:opacity-100 flex-shrink-0 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* DOCUMENT INSPECTION SECTION */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-400" />
                    <h4 className="text-sm font-black uppercase tracking-wider text-white">
                      Submitted Documents For Physical Inspection ({uploadedRequirementsCount} / 5 Uploaded)
                    </h4>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Click any uploaded requirement image to view full size in the lightbox, zoom, rotate, and verify.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-400">
                    Uploaded:{' '}
                    <strong className={uploadedRequirementsCount >= 5 ? 'text-emerald-400' : 'text-amber-400'}>
                      {uploadedRequirementsCount} / 5
                    </strong>{' '}
                    • Verified: <strong className="text-emerald-400">{verifiedCount}</strong> / {documents.length}
                  </span>
                  <button
                    onClick={() => handleOpenDocViewer(0)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Open Lightbox</span>
                  </button>
                </div>
              </div>

              {/* Grid of Documents */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {documents.map((doc, index) => {
                  const status = docStatuses[doc.id] || doc.status;
                  const isVerified = status === 'VERIFIED' && Boolean(doc.fileUrl);
                  const isRejected = status === 'REJECTED';
                  const hasUploadedImage = Boolean(doc.fileUrl);

                  return (
                    <div
                      key={doc.id}
                      className={`p-4 bg-[#080d19] border rounded-2xl flex flex-col justify-between transition-all group hover:border-amber-500/50 ${
                        isVerified
                          ? 'border-emerald-500/40 bg-emerald-950/10'
                          : isRejected
                          ? 'border-red-500/40 bg-red-950/10'
                          : 'border-slate-800/80 hover:bg-slate-900/40'
                      }`}
                    >
                      <div className="space-y-3">
                        {/* Card Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] text-amber-400/90 font-mono uppercase tracking-wider font-bold block">
                              {doc.requirementType || doc.type} • {doc.issuingAgency || 'Regulatory Credential'}
                            </span>
                            <h5 className="text-xs sm:text-sm font-black text-white group-hover:text-amber-400 transition-colors">
                              {doc.title}
                            </h5>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider whitespace-nowrap ${
                              isVerified
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : isRejected
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : hasUploadedImage
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {isVerified
                              ? 'VERIFIED'
                              : isRejected
                              ? 'FLAGGED'
                              : hasUploadedImage
                              ? 'UPLOADED'
                              : 'MISSING'}
                          </span>
                        </div>

                        {/* Interactive Visual Thumbnail Preview */}
                        <div
                          onClick={() => handleOpenDocViewer(index)}
                          className="relative h-44 w-full rounded-xl overflow-hidden border border-slate-700/80 bg-[#050811] cursor-pointer group/thumb shadow-inner flex items-center justify-center"
                        >
                          {doc.fileUrl ? (
                            <img
                              src={doc.fileUrl}
                              alt={`${liveDriver.name} - ${doc.title}`}
                              className="w-full h-full object-contain transition-transform duration-300 group-hover/thumb:scale-105"
                              draggable={false}
                            />
                          ) : (
                            <DocumentVisualCard
                              document={doc}
                              driver={liveDriver}
                              isThumbnail={true}
                              className="w-full h-full pointer-events-none"
                            />
                          )}

                          {/* Hover Magnify Overlay */}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/thumb:opacity-100 backdrop-blur-[2px] transition-opacity flex flex-col items-center justify-center gap-1 text-white">
                            <div className="p-2 rounded-full bg-amber-500 text-black shadow-lg">
                              <ZoomIn className="w-4 h-4" />
                            </div>
                            <span className="text-[11px] font-black text-amber-300 uppercase tracking-wider">
                              {doc.fileUrl ? 'Click to View Full Size' : 'Inspect Requirement Slot'}
                            </span>
                          </div>
                        </div>

                        {/* Key Serial & Expiry Metadata */}
                        <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-800/80 text-[11px] space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Requirement Key</span>
                            <span className="font-mono font-bold text-amber-400 truncate max-w-[170px]">
                              {doc.requirementType || doc.type}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Upload Status</span>
                            <span
                              className={`font-mono font-bold ${
                                hasUploadedImage ? 'text-emerald-400' : 'text-slate-400'
                              }`}
                            >
                              {hasUploadedImage ? 'Photo Attached' : 'Not Uploaded Yet'}
                            </span>
                          </div>
                          {doc.uploadedFileName && (
                            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                              <span className="text-slate-400">Driver App File</span>
                              <span
                                title={doc.uploadedFileName}
                                className="font-mono text-[10px] text-emerald-400 truncate max-w-[175px]"
                              >
                                {doc.uploadedFileName}
                              </span>
                            </div>
                          )}
                          {doc.uploadedDetails && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">Details</span>
                              <span className="text-[10px] text-slate-300 truncate max-w-[175px]">
                                {doc.uploadedDetails}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
                        <button
                          onClick={() => handleOpenDocViewer(index)}
                          className="text-xs font-bold text-slate-300 hover:text-amber-400 flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-amber-400" />
                          <span>{hasUploadedImage ? 'View Full Size' : 'Inspect Slot'}</span>
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setPendingUploadDoc({ id: doc.id, type: doc.type });
                              docPhotoInputRef.current?.click();
                            }}
                            title="Upload / Sync actual credential photo to Firestore"
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] font-bold border border-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Upload className="w-3 h-3 text-amber-400" />
                            <span>Sync Image</span>
                          </button>
                          {isVerified ? (
                            <button
                              onClick={() => handleUpdateDocStatus(doc.id, 'REJECTED', 'Flagged during re-inspection')}
                              className="px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-[10px] font-bold border border-red-500/30 transition-colors cursor-pointer"
                            >
                              Flag
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUpdateDocStatus(doc.id, 'VERIFIED')}
                              disabled={!hasUploadedImage}
                              title={!hasUploadedImage ? 'Upload photo required before verifying' : 'Mark photo as verified'}
                              className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-[10px] font-black border border-emerald-500/40 flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <Check className="w-3 h-3 stroke-[3]" />
                              <span>Verify</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className={`w-4 h-4 ${canVerifyRequirements ? 'text-emerald-400' : 'text-amber-400'}`} />
              <span>
                Uploaded Requirement Photos:{' '}
                <strong className={canVerifyRequirements ? 'text-emerald-400' : 'text-amber-400'}>
                  {uploadedRequirementsCount} of 5
                </strong>
                {!canVerifyRequirements && (
                  <span className="text-slate-500 ml-1">
                    (All 5 photos required to verify)
                  </span>
                )}
              </span>
            </div>

            {liveDriver.isPendingAudit || !liveDriver.isVerified ? (
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={() => setIsRejectModalOpen(true)}
                  className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold rounded-xl border border-red-500/30 transition-colors cursor-pointer"
                >
                  Reject Application
                </button>
                <button
                  onClick={handleApproveWithCheck}
                  disabled={!canVerifyRequirements}
                  title={
                    !canVerifyRequirements
                      ? `All 5 requirement photos must be uploaded (${uploadedRequirementsCount}/5 uploaded) before verifying requirements`
                      : 'Verify all 5 uploaded requirement photos'
                  }
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black text-xs font-black rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>VERIFY REQUIREMENTS ({uploadedRequirementsCount}/5)</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={() => {
                    const next = driver.status === 'SUSPENDED' ? 'ONLINE' : 'SUSPENDED';
                    toggleDriverStatus(driver.id, next);
                    showToast(`Driver status switched to ${next}`);
                  }}
                  className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-colors ${
                    driver.status === 'SUSPENDED'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'
                      : 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20'
                  }`}
                >
                  {driver.status === 'SUSPENDED' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Unsuspend & Restore</span>
                    </>
                  ) : (
                    <>
                      <Ban className="w-4 h-4" />
                      <span>Suspend Driver</span>
                    </>
                  )}
                </button>

                <button
                  onClick={onClose}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors"
                >
                  Close Dossier
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Full Resolution Document Inspection Lightbox Modal */}
      {isViewerOpen && (
        <DocumentViewerModal
          isOpen={isViewerOpen}
          documents={documents}
          initialIndex={activeDocIndex}
          driver={liveDriver}
          onClose={() => setIsViewerOpen(false)}
          onUpdateDocumentStatus={handleUpdateDocStatus}
          onApproveDriver={handleApproveWithCheck}
        />
      )}

      {/* Rejection / Resubmission Prompt Dialog */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#0c1424] border border-red-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="w-5 h-5" />
                <h4 className="text-sm font-black text-white uppercase">Reject Driver Application</h4>
              </div>
              <button
                onClick={() => setIsRejectModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Provide feedback for <strong className="text-white">{driver.name}</strong> so they know what to fix
              or resubmit through their mobile app:
            </p>

            <div className="space-y-1.5">
              <span className="text-[10px] uppercase text-slate-400 font-bold block">Quick Common Feedback</span>
              {[
                'The LTO OR/CR photo is blurry. Please take a clear, well-lit photo of the official registration.',
                'The NBI Clearance certificate has expired. Please submit a valid 2026/2027 clearance.',
                'Driver’s License image is cut off at the edges. Please upload both front and back sides.',
                'Vehicle plate number in photo does not match the registered MV registration details.',
              ].map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setRejectionReason(reason)}
                  className="w-full text-left p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-[11px] text-slate-300 border border-slate-800 transition-colors"
                >
                  • {reason}
                </button>
              ))}
            </div>

            <div>
              <label className="text-[10px] uppercase text-slate-400 font-bold block mb-1">
                Notice Message to Driver Partner
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter specific instructions for the driver..."
                rows={3}
                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:border-red-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsRejectModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRejection}
                className="px-4 py-2 bg-red-500 hover:bg-red-400 text-white text-xs font-black rounded-xl transition-colors"
              >
                Confirm Rejection & Send Feedback
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Driver Profile Photo Lightbox */}
      {isAvatarLightboxOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAvatarLightboxOpen(false);
          }}
          className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="w-full max-w-3xl bg-[#0a101d] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
                  Driver App Profile Photo
                </span>
                <h4 className="text-sm sm:text-base font-black text-white">
                  {liveDriver.name} • {liveDriver.plateNumber}
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAvatarZoom((z) => Math.max(0.5, z - 0.25))}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold cursor-pointer"
                >
                  -
                </button>
                <span className="text-xs font-mono font-bold text-amber-400 px-1">
                  {Math.round(avatarZoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setAvatarZoom((z) => Math.min(3, z + 0.25))}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold cursor-pointer"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => setAvatarRotation((r) => (r + 90) % 360)}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 cursor-pointer"
                  title="Rotate 90°"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black flex items-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Update Photo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAvatarLightboxOpen(false)}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="relative h-[65vh] bg-[#050811] flex items-center justify-center overflow-hidden p-6">
              <img
                src={liveDriver.avatar || getFallbackAvatarUrl(liveDriver.id, 'DRIVER')}
                alt={liveDriver.name}
                onError={(e) => {
                  e.currentTarget.src = getFallbackAvatarUrl(liveDriver.id, 'DRIVER');
                }}
                style={{
                  transform: `scale(${avatarZoom}) rotate(${avatarRotation}deg)`,
                }}
                className="max-w-full max-h-full object-contain rounded-xl transition-transform duration-150 shadow-2xl"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
