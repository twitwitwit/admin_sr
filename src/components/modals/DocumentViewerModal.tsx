import React, { useState, useRef, useEffect } from 'react';
import { Driver, DriverDocumentDetail } from '../../types';
import { DocumentVisualCard } from '../documents/DocumentVisualCard';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  SlidersHorizontal,
  Contrast,
  RefreshCw,
  Download,
  ExternalLink,
  Eye,
  FileText,
  User,
  Check,
} from 'lucide-react';

interface DocumentViewerModalProps {
  isOpen: boolean;
  documents: DriverDocumentDetail[];
  initialIndex?: number;
  driver: Driver;
  onClose: () => void;
  onUpdateDocumentStatus?: (docId: string, status: 'VERIFIED' | 'REJECTED', reason?: string) => void;
  onApproveDriver?: () => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  isOpen,
  documents,
  initialIndex = 0,
  driver,
  onClose,
  onUpdateDocumentStatus,
  onApproveDriver,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [contrastBoost, setContrastBoost] = useState(false);
  const [invertColors, setInvertColors] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPanMode, setIsPanMode] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Flag/Reject prompt dialog state
  const [isFlagPromptOpen, setIsFlagPromptOpen] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [documentStatuses, setDocumentStatuses] = useState<Record<string, { status: string; reason?: string }>>({});

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  // Reset zoom & rotation when changing documents
  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  }, [currentIndex]);

  // Handle ESC to close or back
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        if (isFlagPromptOpen) {
          setIsFlagPromptOpen(false);
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowRight' && !isFlagPromptOpen) {
        handleNext();
      } else if (e.key === 'ArrowLeft' && !isFlagPromptOpen) {
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isFlagPromptOpen, currentIndex, documents.length]);

  if (!isOpen || documents.length === 0) return null;

  const currentDoc = documents[currentIndex] || documents[0];
  const docStatus = documentStatuses[currentDoc.id]?.status || currentDoc.status;

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % documents.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + documents.length) % documents.length);
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetAdjustments = () => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
    setContrastBoost(false);
    setInvertColors(false);
  };

  const handleRotateRight = () => setRotation((prev) => (prev + 90) % 360);
  const handleRotateLeft = () => setRotation((prev) => (prev - 90 + 360) % 360);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleVerifyCurrentDoc = () => {
    setDocumentStatuses((prev) => ({
      ...prev,
      [currentDoc.id]: { status: 'VERIFIED' },
    }));
    if (onUpdateDocumentStatus) {
      onUpdateDocumentStatus(currentDoc.id, 'VERIFIED');
    }
    // Auto advance to next document if not last
    if (currentIndex < documents.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleConfirmFlag = () => {
    if (!flagReason.trim()) return;
    setDocumentStatuses((prev) => ({
      ...prev,
      [currentDoc.id]: { status: 'REJECTED', reason: flagReason },
    }));
    if (onUpdateDocumentStatus) {
      onUpdateDocumentStatus(currentDoc.id, 'REJECTED', flagReason);
    }
    setIsFlagPromptOpen(false);
    setFlagReason('');
  };

  // Quick preset reasons for flagging
  const presetReasons = [
    'Document photo is blurry or unreadable',
    'Expiration date has lapsed / expired credential',
    'Name does not match LTO or NBI records',
    'Missing back side / reverse of document',
    'Document cut off or glare obstructing serial number',
  ];

  return (
    <div
      id="document-viewer-modal-root"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className={`relative w-full ${
          isFullscreen ? 'h-full max-w-none' : 'max-w-6xl max-h-[95vh]'
        } bg-[#080d1a] border border-slate-700/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200`}
      >
        {/* Top Header Bar */}
        <div className="p-4 bg-[#0a1120] border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none">
          {/* Driver & Doc Info */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-white truncate">
                  {currentDoc.title}
                </h3>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                    docStatus === 'VERIFIED'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : docStatus === 'REJECTED'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                  }`}
                >
                  {docStatus === 'VERIFIED' ? 'VERIFIED' : docStatus === 'REJECTED' ? 'FLAGGED' : 'FOR AUDIT'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 font-mono truncate">
                <span className="text-white font-bold">{driver.name}</span>
                <span>•</span>
                <span className="text-amber-400">{driver.plateNumber}</span>
                <span>•</span>
                <span className="text-slate-400 truncate">{currentDoc.documentNumber || 'No ID'}</span>
              </div>
            </div>
          </div>

          {/* Document Switcher & Window Controls */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Prev / Next Document Switcher */}
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
              <button
                onClick={handlePrev}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                title="Previous Document (Left Arrow)"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-mono text-[11px] text-slate-300 font-bold whitespace-nowrap">
                {currentIndex + 1} / {documents.length}
              </span>
              <button
                onClick={handleNext}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                title="Next Document (Right Arrow)"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors hidden sm:flex"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
              title="Close Viewer (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Inspection Tools Ribbon */}
        <div className="px-4 py-2 bg-[#0c1424] border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Zoom & Rotation Controls */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 hidden sm:inline">
              Inspection Tools:
            </span>

            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
              <button
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 disabled:opacity-40 transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="px-2 font-mono text-[11px] font-black text-amber-400 min-w-[50px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                disabled={zoom >= 3}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 disabled:opacity-40 transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            {/* Rotate */}
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
              <button
                onClick={handleRotateLeft}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 transition-colors"
                title="Rotate 90° Counter-Clockwise"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={handleRotateRight}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 transition-colors"
                title="Rotate 90° Clockwise"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </div>

            {/* Contrast / Invert */}
            <button
              onClick={() => setContrastBoost(!contrastBoost)}
              className={`p-1.5 px-2.5 rounded-xl border flex items-center gap-1.5 transition-colors text-[11px] font-bold ${
                contrastBoost
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
              title="Enhance Contrast for Faint Watermarks & Stamps"
            >
              <Contrast className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Clarity Boost</span>
            </button>

            <button
              onClick={() => setInvertColors(!invertColors)}
              className={`p-1.5 px-2.5 rounded-xl border flex items-center gap-1.5 transition-colors text-[11px] font-bold ${
                invertColors
                  ? 'bg-purple-500/20 text-purple-400 border-purple-500/40'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
              title="Invert Colors (Thermal receipts / Photocopies)"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Invert</span>
            </button>

            {(zoom !== 1 || rotation !== 0 || contrastBoost || invertColors) && (
              <button
                onClick={handleResetAdjustments}
                className="p-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1 transition-colors"
                title="Reset View"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Quick Document Status Checklist Pills */}
          <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-1 sm:pb-0">
            {documents.map((doc, idx) => {
              const status = documentStatuses[doc.id]?.status || doc.status;
              const isCurrent = idx === currentIndex;
              const shortLabel =
                doc.requirementType === 'LICENSE_FRONT' || doc.type === 'license'
                  ? 'License Front'
                  : doc.requirementType === 'LICENSE_BACK' || doc.type === 'licenseBack'
                  ? 'License Back'
                  : doc.requirementType === 'NBI' || doc.type === 'nbiClearance'
                  ? 'NBI'
                  : doc.requirementType === 'ORCR' || doc.type === 'orCr'
                  ? 'OR/CR'
                  : 'Vehicle Photo';
              return (
                <button
                  key={doc.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 whitespace-nowrap ${
                    isCurrent
                      ? 'bg-amber-500 text-black font-black ring-2 ring-amber-400/50'
                      : status === 'VERIFIED'
                      ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                      : status === 'REJECTED'
                      ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  {status === 'VERIFIED' ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  ) : status === 'REJECTED' ? (
                    <AlertTriangle className="w-3 h-3 text-red-400" />
                  ) : doc.fileUrl ? (
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-slate-600"></span>
                  )}
                  <span>{shortLabel}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Split Body: Inspection Stage & Forensic Metadata Panel */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-0 min-h-0 overflow-hidden">
          {/* Left / Center 2 Cols: High-Resolution Canvas */}
          <div
            className={`lg:col-span-2 relative bg-[#050811] flex items-center justify-center p-4 sm:p-8 overflow-hidden select-none ${
              zoom > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
            }`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Subtle Drafting / Scale Grid */}
            <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none"></div>

            {/* Document Canvas with Transformations */}
            <div
              className="relative transition-transform duration-75 flex items-center justify-center max-w-full max-h-full"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                filter: `${contrastBoost ? 'contrast(150%) brightness(105%)' : ''} ${
                  invertColors ? 'invert(100%)' : ''
                }`,
              }}
            >
              <div className="w-full max-w-xl">
                <DocumentVisualCard document={currentDoc} driver={driver} />
              </div>
            </div>

            {/* Zoom helper tag */}
            {zoom > 1 && (
              <div className="absolute bottom-4 left-4 px-2.5 py-1 rounded-xl bg-black/80 backdrop-blur-md border border-slate-700 text-[10px] text-slate-300 font-mono">
                Click and drag to pan magnified document
              </div>
            )}
          </div>

          {/* Right 1 Col: Compliance Dossier & Decision Controls */}
          <div className="p-4 sm:p-6 bg-[#0a1120] border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col justify-between overflow-y-auto space-y-4">
            <div className="space-y-4">
              {/* Document Overview Header */}
              <div>
                <span className="text-[10px] uppercase tracking-wider text-amber-400 font-black block">
                  Regulatory Document Audit
                </span>
                <h4 className="text-base font-black text-white mt-0.5">{currentDoc.title}</h4>
                <p className="text-xs text-slate-400 mt-1">{currentDoc.subtitle}</p>
              </div>

              {/* Metadata Fields Card */}
              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-2.5 text-xs">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-slate-400">Requirement Type</span>
                  <span className="font-mono font-bold text-amber-400 text-right">
                    {currentDoc.requirementType || currentDoc.type}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-slate-400">Issuing Agency</span>
                  <span className="font-bold text-white text-right">{currentDoc.issuingAgency || 'Gov Agency'}</span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-slate-400">Document No. / Serial</span>
                  <span className="font-mono font-bold text-amber-400">{currentDoc.documentNumber || 'N/A'}</span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-slate-400">Photo Status</span>
                  <span className={`font-mono font-bold ${currentDoc.fileUrl ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {currentDoc.fileUrl ? 'Uploaded' : 'Not Uploaded Yet'}
                  </span>
                </div>

                {currentDoc.uploadedFileName && (
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <span className="text-slate-400">Uploaded File Name</span>
                    <span className="font-mono text-emerald-300 font-bold truncate max-w-[180px]" title={currentDoc.uploadedFileName}>
                      {currentDoc.uploadedFileName}
                    </span>
                  </div>
                )}

                {currentDoc.uploadedDetails && (
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <span className="text-slate-400">Driver App Details</span>
                    <span className="font-mono text-amber-300 font-bold truncate max-w-[180px]" title={currentDoc.uploadedDetails}>
                      {currentDoc.uploadedDetails}
                    </span>
                  </div>
                )}

                {currentDoc.notes && (
                  <div className="pt-1">
                    <span className="text-[10px] uppercase text-slate-500 font-bold block">Compliance Notes</span>
                    <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">{currentDoc.notes}</p>
                  </div>
                )}
              </div>

              {/* Forensic Checklist */}
              <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-2">
                <span className="text-[10px] uppercase tracking-wider text-slate-300 font-bold block flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Administrative Verification Checks</span>
                </span>
                <div className="space-y-1.5 text-xs text-slate-300">
                  <label className="flex items-center gap-2 p-1.5 rounded-lg bg-black/30 cursor-pointer hover:bg-black/50">
                    <input type="checkbox" defaultChecked className="rounded text-amber-500 focus:ring-0" />
                    <span>Photo & Identity matches driver applicant profile</span>
                  </label>
                  <label className="flex items-center gap-2 p-1.5 rounded-lg bg-black/30 cursor-pointer hover:bg-black/50">
                    <input type="checkbox" defaultChecked className="rounded text-amber-500 focus:ring-0" />
                    <span>Watermark and official seal clearly legible</span>
                  </label>
                  <label className="flex items-center gap-2 p-1.5 rounded-lg bg-black/30 cursor-pointer hover:bg-black/50">
                    <input type="checkbox" defaultChecked className="rounded text-amber-500 focus:ring-0" />
                    <span>Not expired and satisfies system validity window</span>
                  </label>
                </div>
              </div>

              {/* Flagged Status Feedback if already flagged */}
              {documentStatuses[currentDoc.id]?.reason && (
                <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-xs text-red-300">
                  <span className="font-bold block text-red-400">Flagged for Resubmission:</span>
                  <p className="text-[11px] mt-0.5">{documentStatuses[currentDoc.id].reason}</p>
                </div>
              )}
            </div>

            {/* Document Action Buttons */}
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setIsFlagPromptOpen(true)}
                  className="px-3 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Flag / Reject Doc</span>
                </button>

                <button
                  onClick={handleVerifyCurrentDoc}
                  disabled={!currentDoc.fileUrl}
                  title={!currentDoc.fileUrl ? 'Photo must be uploaded before verifying' : 'Mark requirement photo as valid'}
                  className="px-3 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-xl text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Mark as Valid</span>
                </button>
              </div>

              {/* Next Doc button */}
              {currentIndex < documents.length - 1 ? (
                <button
                  onClick={handleNext}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>Next Document: {documents[currentIndex + 1].title}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <div className="pt-1">
                  {onApproveDriver && (
                    <button
                      onClick={() => {
                        if (documents.filter((d) => Boolean(d.fileUrl)).length < 5) return;
                        onApproveDriver();
                        onClose();
                      }}
                      disabled={documents.filter((d) => Boolean(d.fileUrl)).length < 5}
                      title={
                        documents.filter((d) => Boolean(d.fileUrl)).length < 5
                          ? `All 5 requirement photos must be uploaded (${documents.filter((d) => Boolean(d.fileUrl)).length}/5 uploaded) before verifying requirements`
                          : 'Verify all 5 requirement photos'
                      }
                      className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black font-black rounded-xl text-xs shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                      <span>
                        VERIFY REQUIREMENTS ({documents.filter((d) => Boolean(d.fileUrl)).length}/5)
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Flag / Resubmission Prompt Dialog Modal */}
      {isFlagPromptOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#0c1424] border border-red-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="w-5 h-5" />
                <h4 className="text-sm font-black text-white uppercase">Flag Document for Resubmission</h4>
              </div>
              <button
                onClick={() => setIsFlagPromptOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Specify why <strong className="text-white">{currentDoc.title}</strong> is being rejected so the driver can upload a corrected credential via their mobile app:
            </p>

            {/* Quick preset buttons */}
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase text-slate-400 font-bold block">Preset Common Issues</span>
              <div className="space-y-1">
                {presetReasons.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setFlagReason(reason)}
                    className="w-full text-left p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-[11px] text-slate-200 border border-slate-800 transition-colors"
                  >
                    • {reason}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase text-slate-400 font-bold block mb-1">
                Custom Rejection Notice for Driver App
              </label>
              <textarea
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                placeholder="E.g., The official receipt is cut off at the bottom and the motor number is illegible. Please upload a full-page photo."
                rows={3}
                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:border-red-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsFlagPromptOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmFlag}
                disabled={!flagReason.trim()}
                className="px-4 py-2 bg-red-500 hover:bg-red-400 text-white text-xs font-black rounded-xl transition-colors disabled:opacity-50"
              >
                Flag Document & Notify
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
