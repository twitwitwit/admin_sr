import React, { useState, useEffect } from 'react';
import { PhoneCall, PhoneOff, Mic, MicOff, Volume2, ShieldCheck, User } from 'lucide-react';

interface CallUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  userPhone: string;
  userRole: string;
}

export const CallUserModal: React.FC<CallUserModalProps> = ({
  isOpen,
  onClose,
  userName,
  userPhone,
  userRole,
}) => {
  const [callDuration, setCallDuration] = useState(0);
  const [callStatus, setCallStatus] = useState<'connecting' | 'connected' | 'ended'>('connecting');
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setCallDuration(0);
      setCallStatus('connecting');
      return;
    }

    const connectTimer = setTimeout(() => {
      setCallStatus('connected');
    }, 1500);

    return () => clearTimeout(connectTimer);
  }, [isOpen]);

  useEffect(() => {
    if (callStatus !== 'connected') return;
    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [callStatus]);

  if (!isOpen) return null;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[#0d1422] border border-slate-700/80 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none"></div>

        {/* Security / Dispatch badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold uppercase tracking-wider mb-6">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Encrypted VoIP Hotline</span>
        </div>

        {/* User Avatar with ringing pulse */}
        <div className="relative mb-4">
          <div className={`w-24 h-24 rounded-full bg-slate-800 border-2 border-emerald-500/60 flex items-center justify-center overflow-hidden ${callStatus === 'connecting' ? 'animate-pulse' : ''}`}>
            <User className="w-12 h-12 text-slate-300" />
          </div>
          {callStatus === 'connected' && (
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-[#0d1422] flex items-center justify-center">
              <PhoneCall className="w-3 h-3 text-black" />
            </div>
          )}
        </div>

        {/* User Info */}
        <h3 className="text-lg font-black text-white">{userName}</h3>
        <p className="text-xs text-amber-400 font-mono font-bold mt-0.5">{userPhone}</p>
        <span className="text-[10px] uppercase font-bold text-slate-400 mt-1">
          Role: {userRole}
        </span>

        {/* Call Status & Timer */}
        <div className="my-6">
          {callStatus === 'connecting' ? (
            <span className="text-xs font-bold text-amber-400 animate-pulse tracking-wide">
              DIALING DIRECT ENCRYPTED LINE...
            </span>
          ) : callStatus === 'connected' ? (
            <div className="flex flex-col items-center">
              <span className="text-2xl font-black font-mono text-emerald-400 tracking-wider">
                {formatTime(callDuration)}
              </span>
              {/* Simulated Audio Waveform */}
              <div className="flex items-center gap-1 mt-3 h-6">
                {[4, 12, 8, 20, 14, 22, 10, 18, 6, 16, 8, 12].map((h, i) => (
                  <span
                    key={i}
                    className="w-1 bg-emerald-400/80 rounded-full animate-pulse"
                    style={{
                      height: `${h}px`,
                      animationDelay: `${i * 100}ms`,
                      animationDuration: '800ms',
                    }}
                  ></span>
                ))}
              </div>
            </div>
          ) : (
            <span className="text-xs font-bold text-red-400">CALL ENDED</span>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 mt-2">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-3.5 rounded-full border transition-all ${
              isMuted
                ? 'bg-amber-500 text-black border-amber-400'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <button
            onClick={() => {
              setCallStatus('ended');
              setTimeout(onClose, 500);
            }}
            className="p-4 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/40 transition-all hover:scale-105 active:scale-95"
            title="End Call"
          >
            <PhoneOff className="w-6 h-6" />
          </button>

          <button
            className="p-3.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-all"
            title="Speaker"
          >
            <Volume2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
