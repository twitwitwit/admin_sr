import React, { useState } from 'react';
import { KeyRound, ShieldAlert, CheckCircle2, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useRealtimeDb } from '../../context/RealtimeDbContext';
import { hashPassword } from '../../utils/cryptoHelpers';

interface ForcePasswordChangeModalProps {
  isOpen: boolean;
  onSuccess: () => void;
}

export const ForcePasswordChangeModal: React.FC<ForcePasswordChangeModalProps> = ({
  isOpen,
  onSuccess,
}) => {
  const { currentAdminUser, updateUserPassword, logAdminAction } = useRealtimeDb();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Password Strength Criteria
  const hasMinLen = newPassword.length >= 8;
  const hasNum = /\d/.test(newPassword);
  const hasUpper = /[A-Z]/.test(newPassword);
  const isMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isFormValid = hasMinLen && hasNum && hasUpper && isMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!isFormValid) {
      setErrorMsg('Please satisfy all password complexity criteria.');
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = await updateUserPassword(currentAdminUser.email, newPassword);
      if (ok) {
        logAdminAction(
          `Admin ${currentAdminUser.name} successfully updated temporary password to a personal hashed credential`,
          'auth',
          'CONFIG_UPDATE',
          currentAdminUser.email,
          'Credential Security Mandatory Vault Update'
        );
        onSuccess();
      } else {
        setErrorMsg('Failed to update password. Please check your credentials.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred while updating your password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#0c121e] border border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative space-y-6">
        {/* Warning Banner */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10">
            <Lock className="w-6 h-6 stroke-[2.5]" />
          </div>
          <h2 className="text-lg font-black text-white tracking-tight">Mandatory Password Update</h2>
          <p className="text-xs text-slate-400">
            You are logging in with a temporary system password. You must set a new secure password before proceeding to the console.
          </p>
        </div>

        {/* User Badge */}
        <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-2xl flex items-center gap-3">
          <img
            src={currentAdminUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
            alt={currentAdminUser.name}
            className="w-10 h-10 rounded-full border border-slate-700 object-cover"
          />
          <div className="min-w-0">
            <div className="text-xs font-bold text-white truncate">{currentAdminUser.name}</div>
            <div className="text-[10px] text-amber-400 font-mono">{currentAdminUser.email} ({currentAdminUser.role})</div>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-medium flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              New Personal Password
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type={showPass ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full bg-[#080c14] border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-3 text-slate-400 hover:text-white"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Confirm New Password
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type={showPass ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full bg-[#080c14] border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          {/* Password Requirements Checklist */}
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1.5 text-[11px]">
            <div className={`flex items-center gap-2 ${hasMinLen ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>At least 8 characters long</span>
            </div>
            <div className={`flex items-center gap-2 ${hasNum ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Contains at least 1 number (0-9)</span>
            </div>
            <div className={`flex items-center gap-2 ${hasUpper ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Contains at least 1 uppercase letter (A-Z)</span>
            </div>
            <div className={`flex items-center gap-2 ${isMatch ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Passwords match</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className={`w-full py-3 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-xl transition-all flex items-center justify-center gap-2 ${
              isFormValid && !isSubmitting
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 shadow-amber-500/20 cursor-pointer'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <span>SAVE HASHED PASSWORD & ENTER CONSOLE</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
