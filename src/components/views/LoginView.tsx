import React, { useState } from 'react';
import {
  Mail,
  ShieldCheck,
  Radio,
  KeyRound,
  ArrowRight,
  AlertCircle,
  HelpCircle,
  Shield,
} from 'lucide-react';
import { SwiftRideLogo } from '../SwiftRideLogo';
import { useRealtimeDb } from '../../context/RealtimeDbContext';
import { ForcePasswordChangeModal } from '../modals/ForcePasswordChangeModal';
import { RequestPasswordResetModal } from '../modals/RequestPasswordResetModal';

interface LoginViewProps {
  onLoginSuccess: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const { authenticateUser, logAdminAction } = useRealtimeDb();
  const [email, setEmail] = useState('admin@swiftride.ph');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modals
  const [showForceChangeModal, setShowForceChangeModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const res = await authenticateUser(email, password);
      setIsLoading(false);

      if (res.error) {
        setErrorMsg(res.error);
        return;
      }

      if (res.mustChangePassword) {
        // Must change temporary password first
        setShowForceChangeModal(true);
        return;
      }

      if (res.user) {
        logAdminAction(
          `Admin ${res.user.name} authenticated session via secure Hashed SSO (${res.user.role})`,
          'auth',
          'LOGIN',
          `SES-${Math.floor(1000 + Math.random() * 9000)}`,
          `${email} • Web Console Terminal`
        );
        onLoginSuccess();
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || 'An error occurred during authentication.');
    }
  };

  const handleForceChangeSuccess = () => {
    setShowForceChangeModal(false);
    onLoginSuccess();
  };

  return (
    <div className="min-h-screen bg-[#070b13] flex flex-col justify-center items-center p-4 relative overflow-hidden select-none">
      {/* Background Decorative Radial Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-[#0c121e] border border-slate-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 space-y-6">
        {/* Logo and Branding Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <SwiftRideLogo size="lg" />
          </div>
          <p className="text-xs text-slate-400 font-medium tracking-wide">
            Metro Manila Fleet, Safety & Telemetry Control Center
          </p>
        </div>

        {/* Secure Authentication Header */}
        <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-2xl flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs font-black text-white block">Administrative Portal Login</span>
            <span className="text-[11px] text-slate-400">Multi-Role Executive & Operational Console</span>
          </div>
          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded-full font-bold flex items-center gap-1">
            <Shield className="w-3 h-3" />
            Hashed Auth
          </span>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Authorized Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. admin@swiftride.ph"
                className="w-full bg-[#080c14] border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 font-medium"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Passcode
              </label>
              <button
                type="button"
                onClick={() => setShowResetModal(true)}
                className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
              >
                <HelpCircle className="w-3 h-3" />
                <span>Forgot password?</span>
              </button>
            </div>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter account password"
                className="w-full bg-[#080c14] border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 font-medium font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <span>SECURE LOGIN TO DISPATCH CONSOLE</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </>
            )}
          </button>
        </form>

        {/* Security badges footer */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-center gap-4 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            256-Bit Encrypted
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Radio className="w-3.5 h-3.5 text-amber-400" />
            Live Sync Active
          </span>
        </div>
      </div>

      {/* Force Password Change Modal */}
      <ForcePasswordChangeModal
        isOpen={showForceChangeModal}
        onSuccess={handleForceChangeSuccess}
      />

      {/* Request Password Reset Modal */}
      <RequestPasswordResetModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
      />
    </div>
  );
};
