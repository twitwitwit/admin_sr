import React, { useState } from 'react';
import { Driver } from '../../types';
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
} from 'lucide-react';
import { useRealtimeDb } from '../../context/RealtimeDbContext';
import { getDriverDocuments } from '../../utils/documentHelpers';
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
  const { approveDriver, rejectDriver, toggleDriverStatus } = useRealtimeDb();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Document Viewer Lightbox State
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [activeDocIndex, setActiveDocIndex] = useState(0);

  // Rejection dialog state
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Per-document status overrides
  const [docStatuses, setDocStatuses] = useState<Record<string, 'VERIFIED' | 'REJECTED'>>({});

  if (!isOpen || !driver) return null;

  const documents = getDriverDocuments(driver);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleOpenDocViewer = (index: number) => {
    setActiveDocIndex(index);
    setIsViewerOpen(true);
  };

  const handleUpdateDocStatus = (docId: string, status: 'VERIFIED' | 'REJECTED', reason?: string) => {
    setDocStatuses((prev) => ({ ...prev, [docId]: status }));
    if (status === 'VERIFIED') {
      showToast('Document marked as verified and compliant.');
    } else {
      showToast(`Document flagged: ${reason || 'Failed check'}`);
    }
  };

  const handleConfirmRejection = () => {
    const finalReason = rejectionReason.trim() || 'Requirements failed compliance audit. Please re-upload clear credentials.';
    rejectDriver(driver.id, finalReason);
    showToast(`Driver #${driver.id} rejected with feedback sent.`);
    setIsRejectModalOpen(false);
    setTimeout(onClose, 800);
  };

  const handleApproveWithCheck = () => {
    approveDriver(driver.id);
    showToast(`Driver ${driver.name} verified & granted active fleet access!`);
    setTimeout(onClose, 1000);
  };

  const verifiedCount = documents.filter((doc) => {
    const status = docStatuses[doc.id] || doc.status;
    return status === 'VERIFIED';
  }).length;

  return (
    <>
      <div
        id="driver-inspection-modal-root"
        className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150"
      >
        <div className="w-full max-w-4xl bg-[#0a0f1d] border border-slate-700/90 rounded-3xl p-4 sm:p-6 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
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
          <div className="overflow-y-auto space-y-5 py-4 pr-1">
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
                        'Verify all credentials below (LTO License, OR/CR, NBI Clearance, LTFRB Franchise) before granting active road access.'
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

            {/* Driver Profile & Fleet Vehicle Summary Card */}
            <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img
                    src={driver.avatar}
                    alt={driver.name}
                    className="w-16 h-16 rounded-2xl object-cover ring-2 ring-amber-500/40"
                  />
                  <div className="absolute -bottom-1 -right-1 p-1 bg-black rounded-lg border border-slate-700">
                    <Car className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-black text-white">{driver.name}</h4>
                    <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 font-mono text-xs font-black">
                      {driver.plateNumber}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-bold text-slate-200">{driver.vehicleDetails}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-amber-400" />
                      {driver.phone}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3 text-amber-400" />
                      {driver.email}
                    </span>
                  </div>
                </div>
              </div>

              {onOpenCall && (
                <button
                  onClick={() => onOpenCall(driver.name, driver.phone)}
                  className="px-3.5 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-400 text-xs font-bold rounded-xl flex items-center gap-2 transition-colors whitespace-nowrap self-end sm:self-auto"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call Driver Partner</span>
                </button>
              )}
            </div>

            {/* DOCUMENT INSPECTION SECTION */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-400" />
                    <h4 className="text-sm font-black uppercase tracking-wider text-white">
                      Submitted Documents For Physical Inspection ({documents.length} Files)
                    </h4>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Click any credential or thumbnail to magnify, rotate, inspect official stamps, and verify data.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-400">
                    Verified: <strong className="text-emerald-400">{verifiedCount}</strong> / {documents.length}
                  </span>
                  <button
                    onClick={() => handleOpenDocViewer(0)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors"
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
                  const isVerified = status === 'VERIFIED';
                  const isRejected = status === 'REJECTED';

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
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">
                              {doc.issuingAgency || 'Regulatory Credential'}
                            </span>
                            <h5 className="text-xs sm:text-sm font-black text-white group-hover:text-amber-400 transition-colors">
                              {doc.title}
                            </h5>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                              isVerified
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : isRejected
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            {isVerified ? 'VERIFIED' : isRejected ? 'FLAGGED' : 'FOR AUDIT'}
                          </span>
                        </div>

                        {/* Interactive Visual Thumbnail Preview */}
                        <div
                          onClick={() => handleOpenDocViewer(index)}
                          className="relative h-36 w-full rounded-xl overflow-hidden border border-slate-700/80 bg-slate-950 cursor-pointer group/thumb shadow-inner"
                        >
                          <div className="w-full h-full transform transition-transform duration-300 group-hover/thumb:scale-105">
                            <DocumentVisualCard
                              document={doc}
                              driver={driver}
                              isThumbnail={true}
                              className="w-full h-full scale-[0.6] origin-top sm:origin-center pointer-events-none"
                            />
                          </div>

                          {/* Hover Magnify Overlay */}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/thumb:opacity-100 backdrop-blur-[2px] transition-opacity flex flex-col items-center justify-center gap-1 text-white">
                            <div className="p-2 rounded-full bg-amber-500 text-black shadow-lg">
                              <ZoomIn className="w-4 h-4" />
                            </div>
                            <span className="text-[11px] font-black text-amber-300 uppercase tracking-wider">
                              Click to Magnify & Inspect
                            </span>
                          </div>
                        </div>

                        {/* Key Serial & Expiry Metadata */}
                        <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-800/80 text-[11px] space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Doc / Serial No.</span>
                            <span className="font-mono font-bold text-amber-400 truncate max-w-[170px]">
                              {doc.documentNumber || 'Registered in System'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Validity Window</span>
                            <span className="font-mono text-slate-300">{doc.expiryDate || 'Active 2026-2028'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
                        <button
                          onClick={() => handleOpenDocViewer(index)}
                          className="text-xs font-bold text-slate-300 hover:text-amber-400 flex items-center gap-1.5 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 text-amber-400" />
                          <span>Inspect Detail</span>
                        </button>

                        <div className="flex items-center gap-1">
                          {isVerified ? (
                            <button
                              onClick={() => handleUpdateDocStatus(doc.id, 'REJECTED', 'Flagged during re-inspection')}
                              className="px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-[10px] font-bold border border-red-500/30 transition-colors"
                            >
                              Flag
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUpdateDocStatus(doc.id, 'VERIFIED')}
                              className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-[10px] font-black border border-emerald-500/40 flex items-center gap-1 transition-colors"
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
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>
                Verified Credentials:{' '}
                <strong className="text-white">
                  {verifiedCount} of {documents.length}
                </strong>
              </span>
            </div>

            {driver.isPendingAudit ? (
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={() => setIsRejectModalOpen(true)}
                  className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold rounded-xl border border-red-500/30 transition-colors"
                >
                  Reject Application
                </button>
                <button
                  onClick={handleApproveWithCheck}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black text-xs font-black rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>VERIFY & APPROVE FLEET DRIVER</span>
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
          driver={driver}
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
    </>
  );
};
