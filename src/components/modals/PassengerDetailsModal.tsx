import React, { useState, useRef } from 'react';
import { Passenger } from '../../types';
import {
  X,
  User,
  Phone,
  Mail,
  Wallet,
  Star,
  Plus,
  Minus,
  CheckCircle2,
  Ban,
  Car,
  Camera,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Upload,
} from 'lucide-react';
import { useRealtimeDb } from '../../context/RealtimeDbContext';
import {
  getFallbackAvatarUrl,
  formatUploadedSourceLabel,
  compressImageFileToBase64,
  isCustomUploadedAvatar,
} from '../../utils/imageHelpers';

interface PassengerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  passenger: Passenger | null;
  onOpenCall?: (name: string, phone: string) => void;
}

export const PassengerDetailsModal: React.FC<PassengerDetailsModalProps> = ({
  isOpen,
  onClose,
  passenger,
  onOpenCall,
}) => {
  const { passengers, togglePassengerStatus, updatePassengerWallet, updatePassengerPhoto, bookings } = useRealtimeDb();
  const [walletDelta, setWalletDelta] = useState<number>(100);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const [lightboxRotation, setLightboxRotation] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !passenger) return null;

  const livePassenger =
    passengers.find(
      (p) =>
        p.id === passenger.id ||
        (passenger.email && p.email.toLowerCase() === passenger.email.toLowerCase())
    ) || passenger;

  const activePhotoUrl = livePassenger.avatar || getFallbackAvatarUrl(livePassenger.id, 'PASSENGER');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const processFile = async (file: File) => {
    setIsUploadingPhoto(true);
    try {
      const base64DataUrl = await compressImageFileToBase64(file, 720, 720, 0.82);
      updatePassengerPhoto(livePassenger.id, base64DataUrl);
      showToast('Uploaded profile photo saved to Firestore & synced with Passenger App!');
    } catch {
      showToast('Could not process selected image file.');
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const passengerRides = bookings.filter((b) => b.passenger.name === livePassenger.name);

  return (
    <>
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
              <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Passenger Account & Profile Photo</h3>
                <p className="text-xs text-slate-400 font-mono">ID: {passenger.id}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-5 py-4 pr-1">
            {toastMessage && (
              <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{toastMessage}</span>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />

            {/* Prominent Uploaded App Profile Photo Card */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const dropped = e.dataTransfer.files?.[0];
                if (dropped && dropped.type.startsWith('image/')) {
                  processFile(dropped);
                }
              }}
              className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl"
            >
              <div className="px-4 py-2.5 bg-[#080c14] border-b border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Camera className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-[11px] font-black uppercase tracking-wider text-white">
                    Uploaded App Profile Photo
                  </span>
                  <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    {isCustomUploadedAvatar(livePassenger.avatar)
                      ? 'Synced App Photo'
                      : livePassenger.mobilePhotoUri
                      ? formatUploadedSourceLabel(livePassenger.mobilePhotoUri)
                      : 'Verified Profile Photo'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setLightboxZoom(1);
                      setLightboxRotation(0);
                      setIsLightboxOpen(true);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Maximize2 className="w-3 h-3 text-cyan-400" />
                    <span>Enlarge</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingPhoto}
                    className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Upload className="w-3 h-3" />
                    <span>{isUploadingPhoto ? 'Uploading...' : 'Update Photo'}</span>
                  </button>
                </div>
              </div>

              {/* Large Visible Profile Photo Display */}
              <div
                onClick={() => {
                  setLightboxZoom(1);
                  setLightboxRotation(0);
                  setIsLightboxOpen(true);
                }}
                className="relative h-60 w-full bg-[#050811] flex items-center justify-center overflow-hidden cursor-pointer group"
              >
                <img
                  src={activePhotoUrl}
                  alt={livePassenger.name}
                  onError={(e) => {
                    e.currentTarget.src = getFallbackAvatarUrl(livePassenger.id, 'PASSENGER');
                  }}
                  className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                />

                {/* Hover Overlay to Enlarge */}
                <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 text-white">
                  <div className="p-2.5 rounded-full bg-cyan-500 text-black shadow-lg">
                    <ZoomIn className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-black text-cyan-300 uppercase tracking-wider">
                    Click to View Full-Screen Photo
                  </span>
                </div>
              </div>

              {/* Passenger Identity Bar under Photo */}
              <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-slate-800/80">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-base font-black text-white">{livePassenger.name}</h4>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-extrabold uppercase ${
                        livePassenger.status === 'ACTIVE'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}
                    >
                      {livePassenger.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-cyan-400" />
                      {livePassenger.phone}
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-cyan-400" />
                      {livePassenger.email}
                    </span>
                  </div>
                </div>

                {onOpenCall && (
                  <button
                    onClick={() => onOpenCall(livePassenger.name, livePassenger.phone)}
                    className="px-3.5 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-400 text-xs font-bold rounded-xl flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call Passenger</span>
                  </button>
                )}
              </div>
            </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-[#080c14] border border-slate-800/80 rounded-xl text-center">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Rating</span>
              <div className="flex items-center justify-center gap-1 mt-1">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="text-base font-black text-white">{livePassenger.rating.toFixed(1)}</span>
              </div>
            </div>
            <div className="p-3 bg-[#080c14] border border-slate-800/80 rounded-xl text-center">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Completed Rides</span>
              <span className="text-base font-black text-amber-400 mt-1 block font-mono">
                {livePassenger.completedRides}
              </span>
            </div>
            <div className="p-3 bg-[#080c14] border border-slate-800/80 rounded-xl text-center">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Wallet Balance</span>
              <span className="text-base font-black text-cyan-400 mt-1 block font-mono">
                ₱{livePassenger.walletBalance.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Live In-App Wallet Credit / Debit Console */}
          <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-cyan-400" />
                <span>Manage Digital Wallet & Credits</span>
              </h5>
              <span className="text-xs font-mono font-bold text-emerald-400">
                Current: ₱{livePassenger.walletBalance.toFixed(2)}
              </span>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3">
              <div className="relative flex-1 min-w-[120px]">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">₱</span>
                <input
                  type="number"
                  value={walletDelta}
                  onChange={(e) => setWalletDelta(Number(e.target.value))}
                  placeholder="Amount"
                  className="w-full bg-[#080c14] border border-slate-800 rounded-xl pl-7 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
              <button
                onClick={() => {
                  updatePassengerWallet(livePassenger.id, walletDelta);
                  showToast(`Successfully credited ₱${walletDelta.toFixed(2)} to ${livePassenger.name}'s wallet.`);
                }}
                className="px-3.5 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Credit Funds</span>
              </button>
              <button
                onClick={() => {
                  updatePassengerWallet(livePassenger.id, -walletDelta);
                  showToast(`Deducted ₱${walletDelta.toFixed(2)} from ${livePassenger.name}'s wallet.`);
                }}
                className="px-3.5 py-2 bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
              >
                <Minus className="w-3.5 h-3.5" />
                <span>Deduct</span>
              </button>
            </div>
          </div>

          {/* Ride History Sample */}
          <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl">
            <h5 className="text-xs font-black uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
              <Car className="w-4 h-4 text-amber-400" />
              <span>Recent Ride History</span>
            </h5>
            {passengerRides.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No trips recorded in this session.</p>
            ) : (
              <div className="space-y-2">
                {passengerRides.map((ride) => (
                  <div
                    key={ride.id}
                    className="p-3 bg-[#080c14] border border-slate-800/80 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-amber-400">{ride.id}</span>
                        <span className="text-[10px] text-slate-500">{ride.time}</span>
                      </div>
                      <p className="text-slate-300 mt-0.5">
                        {ride.route.pickup} ➔ {ride.route.dropoff}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-white block">₱{ride.fare.toFixed(2)}</span>
                      <span className="text-[10px] text-emerald-400 font-bold">{ride.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            onClick={() => {
              togglePassengerStatus(passenger.id);
              showToast(
                `Passenger account ${
                  passenger.status === 'ACTIVE' ? 'SUSPENDED' : 'RESTORED'
                }`
              );
            }}
            className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-colors ${
              passenger.status === 'ACTIVE'
                ? 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'
            }`}
          >
            {passenger.status === 'ACTIVE' ? (
              <>
                <Ban className="w-4 h-4" />
                <span>Suspend Account</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Re-activate Account</span>
              </>
            )}
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>

    {/* Full-Screen Passenger Profile Photo Lightbox */}
    {isLightboxOpen && (
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget) setIsLightboxOpen(false);
        }}
        className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-150"
      >
        <div className="w-full max-w-3xl bg-[#0a101d] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400 block">
                Passenger App Profile Photo
              </span>
              <h4 className="text-sm sm:text-base font-black text-white">
                {livePassenger.name} ({livePassenger.email})
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLightboxZoom((z) => Math.max(0.5, z - 0.25))}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono font-bold text-cyan-400 px-1">
                {Math.round(lightboxZoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setLightboxZoom((z) => Math.min(3, z + 0.25))}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setLightboxRotation((r) => (r + 90) % 360)}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 cursor-pointer"
                title="Rotate 90°"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-black flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Update Photo</span>
              </button>
              <button
                type="button"
                onClick={() => setIsLightboxOpen(false)}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="relative h-[65vh] bg-[#050811] flex items-center justify-center overflow-hidden p-6">
            <img
              src={activePhotoUrl}
              alt={livePassenger.name}
              onError={(e) => {
                e.currentTarget.src = getFallbackAvatarUrl(livePassenger.id, 'PASSENGER');
              }}
              style={{
                transform: `scale(${lightboxZoom}) rotate(${lightboxRotation}deg)`,
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
