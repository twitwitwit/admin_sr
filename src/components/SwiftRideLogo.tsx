import React from 'react';

interface SwiftRideLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'hero';
  showSubtitle?: boolean;
  iconOnly?: boolean;
}

export const SwiftRideLogo: React.FC<SwiftRideLogoProps> = ({ size = 'md', showSubtitle = false, iconOnly = false }) => {
  return (
    <div className="flex flex-col items-center select-none">
      <div className="flex items-center gap-2.5">
        {/* Vector representation of the racing yellow car & motorcycle silhouette */}
        <div className={`relative flex items-center justify-center ${size === 'hero' ? 'w-24 h-14' : size === 'lg' ? 'w-12 h-8' : size === 'sm' ? 'w-8 h-5' : 'w-10 h-7'}`}>
          <svg viewBox="0 0 100 50" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_0_12px_rgba(245,158,11,0.6)]">
            {/* Speed trails */}
            <path d="M5 25C15 15 35 12 55 14C35 17 20 22 10 32C8 30 6 27 5 25Z" fill="#F59E0B" fillOpacity="0.7"/>
            <path d="M12 28C28 16 52 14 78 17C55 20 35 27 20 36C17 33 14 30 12 28Z" fill="#FBBF24"/>
            {/* Sports Car Streamline */}
            <path d="M22 36C26 31 34 26 44 24L58 24C68 24 74 27 80 32C83 34 88 35 92 37C84 39 72 40 55 40C38 40 28 39 22 36Z" fill="#F59E0B"/>
            {/* Sleek roof & windshield */}
            <path d="M38 25L46 17H62L70 25H38Z" fill="#111827" stroke="#FBBF24" strokeWidth="1.5"/>
            {/* Headlights & neon glow */}
            <circle cx="84" cy="35" r="2.5" fill="#FEF08A" className="animate-pulse" />
            <circle cx="30" cy="38" r="4" fill="#1E293B" stroke="#F59E0B" strokeWidth="1.5"/>
            <circle cx="72" cy="38" r="4" fill="#1E293B" stroke="#F59E0B" strokeWidth="1.5"/>
            {/* Motorcycle Silhouette on Right */}
            <path d="M68 22L76 12L82 14L78 22" stroke="#FDE047" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="78" cy="18" r="3" fill="#F59E0B"/>
          </svg>
        </div>

        {/* SwiftRide Text */}
        {!iconOnly && (
          <div className="flex flex-col">
            <div className="flex items-center tracking-wider">
              <span className={`italic font-black text-white ${size === 'hero' ? 'text-3xl' : size === 'lg' ? 'text-xl' : size === 'sm' ? 'text-sm' : 'text-base'}`}>
                SWIFT
              </span>
              <span className={`italic font-black text-amber-500 ml-0.5 ${size === 'hero' ? 'text-3xl' : size === 'lg' ? 'text-xl' : size === 'sm' ? 'text-sm' : 'text-base'}`}>
                RIDE
              </span>
            </div>
          </div>
        )}
      </div>

      {!iconOnly && showSubtitle && (
        <div className="mt-1 text-[10px] uppercase font-bold tracking-[0.25em] text-amber-500/90 flex items-center gap-1.5">
          <span>SAFE</span>
          <span className="text-white/40">•</span>
          <span>RELIABLE</span>
          <span className="text-white/40">•</span>
          <span>CONVENIENT</span>
        </div>
      )}
    </div>
  );
};
