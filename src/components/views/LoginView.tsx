import React, { useState } from 'react';
import {
  Lock,
  Mail,
  ShieldCheck,
  Radio,
  Car,
  KeyRound,
  ArrowRight,
  Shield,
  Zap,
} from 'lucide-react';
import { SwiftRideLogo } from '../SwiftRideLogo';
import { useRealtimeDb } from '../../context/RealtimeDbContext';

interface LoginViewProps {
  onLoginSuccess: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const { currentAdminUser, setAdminUser } = useRealtimeDb();
  const [email, setEmail] = useState(currentAdminUser.email);
  const [password, setPassword] = useState('swiftride2026');
  const [selectedRole, setSelectedRole] = useState(currentAdminUser.role);
  const [isLoading, setIsLoading] = useState(false);

  const handleQuickRole = (role: 'Super Admin' | 'Fleet Manager' | 'Safety Dispatcher', em: string, name: string) => {
    setSelectedRole(role);
    setEmail(em);
    setAdminUser({
      name,
      email: em,
      role,
      avatar: currentAdminUser.avatar,
    });
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess();
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#070b13] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Decorative Radial Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-[#0c121e] border border-slate-800/90 rounded-3xl p-8 shadow-2xl relative z-10 space-y-6">
        {/* Logo and Branding Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <SwiftRideLogo size="lg" />
          </div>
          <p className="text-xs text-slate-400 font-medium tracking-wide">
            Metro Manila Fleet, Safety & Telemetry Control Center
          </p>
        </div>

        {/* Quick Role Selection Preset Pills */}
        <div className="space-y-1.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider text-center">
            Select Admin Role Preset
          </span>
          <div className="grid grid-cols-3 gap-2">
            {[
              { role: 'Super Admin', email: 'admin@swiftride.ph', name: 'Frances Margaret' },
              { role: 'Safety Dispatcher', email: 'sos.dispatch@swiftride.ph', name: 'Dispatch Unit 9' },
              { role: 'Fleet Manager', email: 'fleet.audit@swiftride.ph', name: 'Fleet Controller' },
            ].map((preset) => (
              <button
                key={preset.role}
                type="button"
                onClick={() =>
                  handleQuickRole(
                    preset.role as any,
                    preset.email,
                    preset.name
                  )
                }
                className={`py-2 px-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all text-center ${
                  selectedRole === preset.role
                    ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20 ring-1 ring-amber-400'
                    : 'bg-slate-900/80 text-slate-400 border border-slate-800 hover:text-white'
                }`}
              >
                {preset.role.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

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
                placeholder="admin@swiftride.ph"
                className="w-full bg-[#080c14] border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Passcode
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
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
    </div>
  );
};
