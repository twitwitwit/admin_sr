import React, { useState } from 'react';
import { UserPlus, KeyRound, Copy, Check, ShieldCheck, Mail, User, X, AlertCircle } from 'lucide-react';
import { useRealtimeDb } from '../../context/RealtimeDbContext';
import { generateTempPassword } from '../../utils/cryptoHelpers';

interface CreateAdminAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateAdminAccountModal: React.FC<CreateAdminAccountModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { createAdminAccount } = useRealtimeDb();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'Super Admin' | 'Fleet Manager' | 'Safety Dispatcher'>('Fleet Manager');
  const [tempPassword, setTempPassword] = useState(() => generateTempPassword());
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState<{ email: string; pwd: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRegeneratePassword = () => {
    const newPwd = generateTempPassword();
    setTempPassword(newPwd);
    setCopied(false);
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim() || !email.trim()) {
      setErrorMsg('Please complete all required account fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createAdminAccount({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role,
        tempPassword,
      });

      if (res.success) {
        setSuccessResult({
          email: email.trim().toLowerCase(),
          pwd: tempPassword,
        });
      } else {
        setErrorMsg(res.message || 'Failed to create account.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#0c121e] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative space-y-6">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <UserPlus className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white tracking-tight">Provision New Admin Account</h2>
            <p className="text-xs text-slate-400">
              Create an operational profile with temporary credentials & mandatory first-time password reset.
            </p>
          </div>
        </div>

        {successResult ? (
          <div className="space-y-4 p-5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <ShieldCheck className="w-5 h-5" />
              <span>Account Provisioned Successfully!</span>
            </div>
            <p className="text-xs text-slate-300">
              Provide these temporary credentials to the newly hired administrator. When they log in for the first time, they will be required to change this password.
            </p>

            <div className="p-3.5 bg-black/60 rounded-xl space-y-2 font-mono text-xs">
              <div className="flex justify-between items-center text-slate-400">
                <span>Account Email:</span>
                <span className="text-white font-bold">{successResult.email}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400 border-t border-slate-800 pt-2">
                <span>Temporary Password:</span>
                <span className="text-amber-400 font-bold">{successResult.pwd}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(`Email: ${successResult.email}\nTemp Pass: ${successResult.pwd}`);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied Credentials!' : 'Copy Full Credentials'}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Administrator Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Maria Clara Santos"
                  className="w-full bg-[#080c14] border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Authorized Work Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. clara.fleet@swiftride.ph"
                  className="w-full bg-[#080c14] border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Assigned Operational Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full bg-[#080c14] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-medium cursor-pointer"
              >
                <option value="Fleet Manager">Fleet Manager (Audits, Drivers, Passengers, Reports)</option>
                <option value="Safety Dispatcher">Safety Dispatcher (Emergency SOS, Telemetry, Live Trips)</option>
                <option value="Super Admin">Super Admin (Full Executive Control & System Resets)</option>
              </select>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Generated Temporary Password
                </label>
                <button
                  type="button"
                  onClick={handleRegeneratePassword}
                  className="text-[10px] text-amber-400 hover:underline font-semibold"
                >
                  Generate New
                </button>
              </div>
              <div className="relative flex items-center">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5" />
                <input
                  type="text"
                  readOnly
                  value={tempPassword}
                  className="w-full bg-[#080c14] border border-slate-800 rounded-xl pl-10 pr-24 py-2.5 text-xs text-amber-400 font-mono font-bold"
                />
                <button
                  type="button"
                  onClick={handleCopyPassword}
                  className="absolute right-2 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Password is required to be changed by the user on their initial login.
              </p>
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <span>PROVISION ACCOUNT</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
