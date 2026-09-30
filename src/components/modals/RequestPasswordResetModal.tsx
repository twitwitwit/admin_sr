import React, { useState } from 'react';
import { HelpCircle, Mail, User, FileText, CheckCircle2, AlertCircle, X, ArrowRight } from 'lucide-react';
import { useRealtimeDb } from '../../context/RealtimeDbContext';

interface RequestPasswordResetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RequestPasswordResetModal: React.FC<RequestPasswordResetModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { submitPasswordResetReport } = useRealtimeDb();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email.trim() || !reason.trim()) {
      setErrorMsg('Please enter your email and explain the reason for the password reset.');
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = await submitPasswordResetReport(email.trim().toLowerCase(), reason.trim(), name.trim());
      if (ok) {
        setSubmittedSuccess(true);
      } else {
        setErrorMsg('Failed to submit report. Please check your email address.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while submitting your reset report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#0c121e] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative space-y-6">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white tracking-tight">Forgot Password / Reset Report</h2>
            <p className="text-xs text-slate-400">
              Submit an official credential verification report to the Super Admin.
            </p>
          </div>
        </div>

        {submittedSuccess ? (
          <div className="space-y-4 p-5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">Reset Report Submitted!</h3>
              <p className="text-xs text-slate-300">
                Your report has been sent to the Super Admin console for verification. Once approved, a new temporary password will be issued to your account.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl uppercase tracking-wider"
            >
              Return to Login Portal
            </button>
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
                Authorized Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. sos.dispatch@swiftride.ph"
                  className="w-full bg-[#080c14] border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Account Holder Name (Optional)
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dispatch Unit 9"
                  className="w-full bg-[#080c14] border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Reason / Details for Reset Report
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <textarea
                  required
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain why you are requesting a password reset (e.g. Forgot password, lost device, or locked account)..."
                  className="w-full bg-[#080c14] border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 font-medium resize-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>SUBMIT RESET REPORT TO SUPER ADMIN</span>
                  <ArrowRight className="w-4 h-4 stroke-[3]" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
