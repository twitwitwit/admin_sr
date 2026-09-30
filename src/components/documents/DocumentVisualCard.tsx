import React, { useState, useEffect } from 'react';
import { DriverDocumentDetail, Driver } from '../../types';
import { FileText, ImageOff, CheckCircle2 } from 'lucide-react';
import { isValidRequirementImageUrl } from '../../utils/documentHelpers';

interface DocumentVisualCardProps {
  document: DriverDocumentDetail;
  driver: Driver;
  className?: string;
  isThumbnail?: boolean;
}

export const DocumentVisualCard: React.FC<DocumentVisualCardProps> = ({
  document,
  driver,
  className = '',
  isThumbnail = false,
}) => {
  const [imageError, setImageError] = useState(false);

  const resolvedUrl =
    isValidRequirementImageUrl(document.fileUrl) ||
    isValidRequirementImageUrl(document.uploadedFileUrl) ||
    isValidRequirementImageUrl(document.uploadedPhotoUri);

  // Reset error state whenever the URL updates in real-time
  useEffect(() => {
    setImageError(false);
  }, [resolvedUrl]);

  if (resolvedUrl && !imageError) {
    return (
      <div
        className={`relative w-full h-full overflow-hidden bg-[#050811] flex items-center justify-center rounded-xl ${className}`}
      >
        <img
          src={resolvedUrl}
          alt={`${driver.name} - ${document.title}`}
          onError={() => setImageError(true)}
          className={`w-full h-full object-contain ${isThumbnail ? '' : 'max-h-[70vh]'}`}
          draggable={false}
        />
        <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/85 text-[10px] text-emerald-400 font-mono border border-emerald-500/40 shadow-lg flex items-center gap-1 pointer-events-none">
          <CheckCircle2 className="w-3 h-3" />
          <span>{document.requirementType || 'UPLOADED'}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full h-full min-h-[140px] bg-[#070b14] border border-dashed border-slate-700/80 rounded-xl p-4 flex flex-col items-center justify-center text-center select-none ${className}`}
    >
      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 mb-2">
        {resolvedUrl && imageError ? (
          <ImageOff className="w-5 h-5 text-amber-400" />
        ) : (
          <FileText className="w-5 h-5 text-slate-500" />
        )}
      </div>
      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400/90">
        {document.requirementType || document.type}
      </span>
      <span className="text-xs font-bold text-slate-300 mt-0.5">
        {resolvedUrl && imageError ? 'Unable to load image preview' : 'No Photo Uploaded Yet'}
      </span>
      {!isThumbnail && (
        <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
          Waiting for driver to upload this requirement photo ({document.requirementType || document.title}) from the mobile app.
        </p>
      )}
    </div>
  );
};
