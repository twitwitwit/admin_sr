import React, { useState } from 'react';
import { DriverDocumentDetail, Driver } from '../../types';
import { ShieldCheck, FileText, CheckCircle2, Car, QrCode, AlertCircle, Fingerprint } from 'lucide-react';

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

  // If driver uploaded an image and it loads without error, display that image!
  if (document.fileUrl && !imageError) {
    return (
      <div className={`relative overflow-hidden bg-slate-950 flex items-center justify-center rounded-xl ${className}`}>
        <img
          src={document.fileUrl}
          alt={document.title}
          onError={() => setImageError(true)}
          className="w-full h-full object-contain max-h-[500px]"
          draggable={false}
        />
        {isThumbnail && (
          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 text-[10px] text-amber-400 font-mono border border-slate-700">
            Uploaded Image
          </div>
        )}
      </div>
    );
  }

  // Authentic, high-detail Philippine regulatory document render
  switch (document.type) {
    case 'license':
      return (
        <div
          className={`relative bg-gradient-to-br from-sky-950 via-[#0b192e] to-slate-900 border-2 border-sky-600/40 rounded-2xl p-4 sm:p-6 text-white shadow-2xl overflow-hidden select-none ${className}`}
        >
          {/* Security Guilloche Pattern Overlay */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:12px_12px] pointer-events-none"></div>

          {/* Official Card Header */}
          <div className="flex items-center justify-between border-b border-sky-500/30 pb-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 via-sky-500 to-blue-600 flex items-center justify-center text-white font-black text-xs shadow-md">
                🇵🇭
              </div>
              <div>
                <span className="text-[10px] font-bold text-sky-300 uppercase tracking-wider block">
                  REPUBLIKA NG PILIPINAS • REPUBLIC OF THE PHILIPPINES
                </span>
                <span className="text-[11px] sm:text-xs font-black text-white tracking-wide block uppercase">
                  LAND TRANSPORTATION OFFICE (LTO)
                </span>
                <span className="text-[9px] text-amber-400 font-bold block uppercase tracking-widest">
                  DRIVER'S LICENSE (NON-PROFESSIONAL / PROFESSIONAL)
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[9px] text-slate-400 block font-mono">AGENCY: N03</span>
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[9px] font-black uppercase">
                PROFESSIONAL
              </span>
            </div>
          </div>

          {/* Card Body with Driver Photo, Details & Microprint */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 items-center">
            {/* Driver Photo & Hologram */}
            <div className="col-span-1 flex flex-col items-center gap-1.5">
              <div className="relative w-24 h-28 sm:w-28 sm:h-32 rounded-xl overflow-hidden border-2 border-amber-400/50 shadow-lg bg-slate-900">
                <img
                  src={driver.avatar}
                  alt={driver.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-sky-500/20 to-transparent pointer-events-none"></div>
                <div className="absolute bottom-1 left-1 right-1 px-1 py-0.5 bg-black/70 text-[8px] font-mono text-center text-amber-300 rounded">
                  LTO BIOMETRICS
                </div>
              </div>
              <div className="w-full flex items-center justify-center gap-1 text-[8px] font-mono text-slate-400">
                <Fingerprint className="w-3 h-3 text-sky-400" />
                <span>VERIFIED</span>
              </div>
            </div>

            {/* Credential Data */}
            <div className="col-span-2 sm:col-span-3 space-y-2 text-xs">
              <div>
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">License Number</span>
                <span className="font-mono text-sm sm:text-base font-black text-amber-400 tracking-wider">
                  {document.documentNumber || 'DL-N03-24-098841'}
                </span>
              </div>

              <div>
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Full Name</span>
                <span className="font-bold text-white text-sm uppercase block tracking-wide">
                  {driver.name}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                <div>
                  <span className="text-[8px] uppercase text-slate-400 block font-bold">Nationality</span>
                  <span className="font-bold text-slate-200">FILIPINO</span>
                </div>
                <div>
                  <span className="text-[8px] uppercase text-slate-400 block font-bold">Sex / Blood</span>
                  <span className="font-bold text-slate-200">M / O+</span>
                </div>
                <div>
                  <span className="text-[8px] uppercase text-slate-400 block font-bold">Restrictions</span>
                  <span className="font-black text-amber-400">1, 2</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-800">
                <div>
                  <span className="text-[8px] uppercase text-slate-400 block font-bold">Issued</span>
                  <span className="font-mono text-slate-300">{document.issueDate || '2024-10-24'}</span>
                </div>
                <div>
                  <span className="text-[8px] uppercase text-slate-400 block font-bold">Expires</span>
                  <span className="font-mono font-bold text-emerald-400">{document.expiryDate || '2029-10-24'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Barcode & Security Strip Footer */}
          <div className="mt-4 pt-3 border-t border-sky-500/20 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-slate-400">
            <div className="font-mono tracking-[0.25em] text-[9px] text-sky-300">
              ||| | |||| || | ||||| |||| | ||| |||| || |
            </div>
            <span className="font-mono text-[9px] text-amber-400/80">
              SECURE TNVS ACCREDITED CREDENTIAL • REPUBLIC OF THE PHILIPPINES
            </span>
          </div>
        </div>
      );

    case 'licenseBack':
      return (
        <div
          className={`relative bg-gradient-to-br from-slate-900 via-[#0b192e] to-slate-950 border-2 border-sky-600/30 rounded-2xl p-4 sm:p-6 text-white shadow-2xl overflow-hidden select-none ${className}`}
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
            <span className="text-xs font-black text-sky-400 uppercase tracking-wide">
              Conditions & Driving Restrictions
            </span>
            <span className="text-[9px] text-slate-400 font-mono">BACK REVERSE SIDE</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-[#080c14] border border-slate-800 rounded-xl space-y-1">
              <span className="text-[10px] text-amber-400 font-bold uppercase block">Authorized Vehicle Categories</span>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                <span className="font-bold text-white">Restriction 1:</span> Motorcycles / Motor Tricycles.
                <br />
                <span className="font-bold text-white">Restriction 2:</span> Motor vehicles up to 4,500 kgs Gross Vehicle Weight (GVW) including Sedans, SUVs, and MPVs.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-[#080c14] border border-slate-800 rounded-xl">
                <span className="text-[9px] text-slate-400 uppercase font-bold block">Conditions</span>
                <span className="font-bold text-emerald-400 text-xs">NONE (Normal Vision & Hearing)</span>
              </div>
              <div className="p-3 bg-[#080c14] border border-slate-800 rounded-xl">
                <span className="text-[9px] text-slate-400 uppercase font-bold block">Organ Donor Statement</span>
                <span className="font-bold text-amber-400 text-xs">YES - ALL ORGANS</span>
              </div>
            </div>

            <div className="p-3 bg-sky-950/40 border border-sky-500/20 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[9px] text-slate-400 uppercase font-bold block">Emergency Contact</span>
                <span className="font-bold text-white text-xs">{driver.phone} (Primary Mobile)</span>
              </div>
              <QrCode className="w-8 h-8 text-sky-400 opacity-80" />
            </div>
          </div>
        </div>
      );

    case 'orCr':
      return (
        <div
          className={`relative bg-gradient-to-br from-slate-950 via-[#0a121f] to-slate-900 border-2 border-emerald-600/40 rounded-2xl p-4 sm:p-6 text-white shadow-2xl overflow-hidden select-none ${className}`}
        >
          {/* Official Stamp Watermark */}
          <div className="absolute right-4 top-12 w-28 h-28 rounded-full border-4 border-dashed border-emerald-500/20 flex items-center justify-center -rotate-12 pointer-events-none">
            <span className="text-[9px] font-black text-emerald-500/30 uppercase text-center leading-tight">
              OFFICIAL RECEIPT
              <br />
              LTO REGISTERED
              <br />
              2026-2027
            </span>
          </div>

          {/* LTO Header */}
          <div className="border-b border-emerald-500/30 pb-3 mb-3 flex items-center justify-between">
            <div>
              <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest block">
                LAND TRANSPORTATION OFFICE (LTO)
              </span>
              <span className="text-xs sm:text-sm font-black text-white uppercase block">
                Certificate of Registration (CR) & Official Receipt (OR)
              </span>
              <span className="text-[9px] text-slate-400 font-mono">FORM NO. LTO-MV-101 • NCR CENTRAL DISTRICT</span>
            </div>
            <div className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-black uppercase">
              REGISTERED
            </div>
          </div>

          {/* Details Grid */}
          <div className="space-y-2.5 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-[#080c14] border border-slate-800 rounded-xl">
              <div>
                <span className="text-[8px] text-slate-400 uppercase font-bold block">Assigned Plate</span>
                <span className="font-mono text-sm font-black text-amber-400">{driver.plateNumber}</span>
              </div>
              <div>
                <span className="text-[8px] text-slate-400 uppercase font-bold block">MV File No.</span>
                <span className="font-mono text-xs font-bold text-white">1382-0004921</span>
              </div>
              <div>
                <span className="text-[8px] text-slate-400 uppercase font-bold block">Engine No.</span>
                <span className="font-mono text-xs font-bold text-slate-200">1NZ-FE99481</span>
              </div>
              <div>
                <span className="text-[8px] text-slate-400 uppercase font-bold block">Chassis / VIN</span>
                <span className="font-mono text-xs font-bold text-slate-200">JTD1234912</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="p-3 bg-[#080c14] border border-slate-800 rounded-xl">
                <span className="text-[8px] text-slate-400 uppercase font-bold block">Vehicle Make / Series</span>
                <span className="font-bold text-white text-xs block truncate">{driver.vehicleDetails}</span>
              </div>
              <div className="p-3 bg-[#080c14] border border-slate-800 rounded-xl">
                <span className="text-[8px] text-slate-400 uppercase font-bold block">Registered Owner</span>
                <span className="font-bold text-white text-xs block uppercase">{driver.name}</span>
              </div>
              <div className="p-3 bg-[#080c14] border border-slate-800 rounded-xl">
                <span className="text-[8px] text-slate-400 uppercase font-bold block">Validity</span>
                <span className="font-bold text-emerald-400 text-xs block">ANNUAL 2026-2027 CLEARED</span>
              </div>
            </div>

            <div className="p-2.5 bg-emerald-950/20 border border-emerald-500/20 rounded-xl flex items-center justify-between text-[10px]">
              <span className="text-slate-300">
                Official Receipt No: <span className="font-mono font-bold text-white">{document.documentNumber}</span>
              </span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>LTO Physical Inspection Passed</span>
              </span>
            </div>
          </div>
        </div>
      );

    case 'nbiClearance':
      return (
        <div
          className={`relative bg-gradient-to-br from-slate-950 via-[#101b17] to-slate-900 border-2 border-emerald-500/40 rounded-2xl p-4 sm:p-6 text-white shadow-2xl overflow-hidden select-none ${className}`}
        >
          {/* NBI Crest Header */}
          <div className="border-b border-emerald-500/30 pb-3 mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center text-black font-black text-xs shadow-lg">
                <ShieldCheck className="w-5 h-5 text-slate-950" />
              </div>
              <div>
                <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider block">
                  DEPARTMENT OF JUSTICE • NATIONAL BUREAU OF INVESTIGATION
                </span>
                <span className="text-xs sm:text-sm font-black text-white uppercase block">
                  NBI RECORD CLEARANCE CERTIFICATE
                </span>
                <span className="text-[9px] text-slate-400 font-mono">TAXPAYER & CITIZEN IDENTIFICATION DIVISION</span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[9px] font-black uppercase">
              CLEARED
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 items-center">
            {/* Thumbprint & Seal */}
            <div className="col-span-1 flex flex-col items-center gap-2 p-2 bg-[#080c14] border border-slate-800 rounded-xl">
              <Fingerprint className="w-14 h-14 text-emerald-400 opacity-90" />
              <span className="text-[8px] font-mono text-center text-slate-400 uppercase">
                BIOMETRIC RECORD PASSED
              </span>
            </div>

            {/* Clearance Findings */}
            <div className="col-span-2 sm:col-span-3 space-y-2 text-xs">
              <div>
                <span className="text-[8px] text-slate-400 uppercase font-bold block">Clearance Certificate No.</span>
                <span className="font-mono text-sm font-black text-emerald-400">{document.documentNumber}</span>
              </div>

              <div>
                <span className="text-[8px] text-slate-400 uppercase font-bold block">Subject Full Name</span>
                <span className="font-bold text-white text-sm uppercase">{driver.name}</span>
              </div>

              <div className="p-2.5 bg-emerald-950/30 border border-emerald-500/30 rounded-xl">
                <span className="text-[9px] text-emerald-400 uppercase font-black block">NBI System Findings</span>
                <span className="text-xs font-black text-white tracking-wide block">
                  NO DEROGATORY RECORD ON FILE (NO HIT)
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Purpose: Travel / TNVS Commercial Transport Driver Accreditation
                </span>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                <span>Issued: <strong className="text-slate-200">{document.issueDate || '2026-01-10'}</strong></span>
                <span>Valid Until: <strong className="text-emerald-400">{document.expiryDate || '2027-12-31'}</strong></span>
              </div>
            </div>
          </div>
        </div>
      );

    case 'ltfrbFranchise':
      return (
        <div
          className={`relative bg-gradient-to-br from-slate-950 via-[#181126] to-slate-900 border-2 border-purple-500/40 rounded-2xl p-4 sm:p-6 text-white shadow-2xl overflow-hidden select-none ${className}`}
        >
          <div className="border-b border-purple-500/30 pb-3 mb-3 flex items-center justify-between">
            <div>
              <span className="text-[9px] font-bold text-purple-400 uppercase tracking-widest block">
                DEPARTMENT OF TRANSPORTATION (DOTr)
              </span>
              <span className="text-xs sm:text-sm font-black text-white uppercase block">
                LTFRB Certificate of Public Convenience (CPC)
              </span>
              <span className="text-[9px] text-slate-400 font-mono">TRANSPORT NETWORK VEHICLE SERVICE (TNVS)</span>
            </div>
            <span className="px-2.5 py-1 rounded bg-purple-500/20 text-purple-400 border border-purple-500/40 text-[9px] font-black uppercase">
              ACCREDITED
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="p-3 bg-[#080c14] border border-slate-800 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <span className="text-[8px] text-slate-400 uppercase font-bold block">Case Tracking Number</span>
                <span className="font-mono text-sm font-black text-amber-400">{document.documentNumber}</span>
              </div>
              <div>
                <span className="text-[8px] text-slate-400 uppercase font-bold block">Accredited TNC Platform</span>
                <span className="font-bold text-purple-300 text-xs">Swiftride Philippines Network</span>
              </div>
            </div>

            <div className="p-3 bg-[#080c14] border border-slate-800 rounded-xl space-y-1">
              <span className="text-[8px] text-slate-400 uppercase font-bold block">Authorized Unit & Route</span>
              <p className="text-xs text-slate-200">
                <span className="font-bold text-white">{driver.vehicleDetails}</span> (Plate #{driver.plateNumber})
                authorized for intra-city commercial passenger dispatch within Metro Manila and Region IV-A.
              </p>
            </div>

            <div className="p-2.5 bg-purple-950/20 border border-purple-500/20 rounded-xl flex items-center justify-between text-[10px]">
              <span className="text-slate-300">Regulatory Status: <strong className="text-emerald-400">Valid CPC Franchise</strong></span>
              <span className="text-slate-400 font-mono">{document.expiryDate || 'Valid until Sep 2028'}</span>
            </div>
          </div>
        </div>
      );

    case 'vehiclePhoto':
    default:
      return (
        <div
          className={`relative bg-gradient-to-br from-slate-950 to-slate-900 border-2 border-slate-800 rounded-2xl overflow-hidden shadow-2xl select-none ${className}`}
        >
          <div className="relative h-64 sm:h-80 w-full overflow-hidden bg-slate-950">
            <img
              src={document.fileUrl || 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=900&auto=format&fit=crop&q=80'}
              alt={document.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40 pointer-events-none"></div>

            {/* Plate Tag Overlay */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
              <div className="px-3 py-1.5 rounded-xl bg-black/80 backdrop-blur-md border border-amber-500/40 text-amber-400 font-mono text-sm font-black flex items-center gap-2">
                <Car className="w-4 h-4" />
                <span>{driver.plateNumber}</span>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/90 text-black text-[10px] font-black uppercase tracking-wider">
                Inspection Passed
              </span>
            </div>
          </div>
          <div className="p-4 bg-[#080c14] border-t border-slate-800 flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-white block">{driver.vehicleDetails}</span>
              <span className="text-[10px] text-slate-400 font-mono">{driver.city} Fleet Operations</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-bold">Exterior & Interior Clear</span>
          </div>
        </div>
      );
  }
};
