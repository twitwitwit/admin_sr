import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ShieldAlert, Car, Users, CalendarDays, HelpCircle, ArrowRight } from 'lucide-react';
import { useRealtimeDb } from '../context/RealtimeDbContext';
import { NavTab } from '../types';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: NavTab, targetId?: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose, onNavigate }) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { passengers, drivers, bookings, emergencyAlerts, tickets } = useRealtimeDb();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Trigger open via document event or props
        }
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.toLowerCase().trim();

  // Search Results
  const matchedSOS = emergencyAlerts.filter(
    (e) =>
      e.id.toLowerCase().includes(q) ||
      e.userName.toLowerCase().includes(q) ||
      e.location.name.toLowerCase().includes(q) ||
      e.type.toLowerCase().includes(q)
  );

  const matchedDrivers = drivers.filter(
    (d) =>
      d.name.toLowerCase().includes(q) ||
      d.plateNumber.toLowerCase().includes(q) ||
      d.phone.includes(q) ||
      d.vehicleDetails.toLowerCase().includes(q)
  );

  const matchedPassengers = passengers.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      p.phone.includes(q)
  );

  const matchedBookings = bookings.filter(
    (b) =>
      b.id.toLowerCase().includes(q) ||
      b.passenger.name.toLowerCase().includes(q) ||
      b.route.pickup.toLowerCase().includes(q) ||
      b.route.dropoff.toLowerCase().includes(q)
  );

  const matchedTickets = tickets.filter(
    (t) =>
      t.id.toLowerCase().includes(q) ||
      t.subject.toLowerCase().includes(q) ||
      t.userName.toLowerCase().includes(q)
  );

  const totalResults =
    matchedSOS.length +
    matchedDrivers.length +
    matchedPassengers.length +
    matchedBookings.length +
    matchedTickets.length;

  return (
    <div
      id="global-search-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center pt-20 px-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="global-search-dialog"
        className="w-full max-w-2xl bg-[#0c121e] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-800 flex items-center gap-3 bg-[#080c14]">
          <Search className="w-5 h-5 text-amber-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search telemetry, driver plate, passenger, booking #, or SOS ID..."
            className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder:text-slate-500 font-medium"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="text-[11px] bg-slate-800 border border-slate-700 text-slate-400 px-2 py-0.5 rounded font-mono">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-4 space-y-4">
          {q === '' ? (
            <div className="text-center py-8">
              <p className="text-xs text-slate-400 font-medium">Quick suggestions to explore:</p>
              <div className="flex flex-wrap gap-2 justify-center mt-3">
                {['SOS-9021', 'Juan Dela Cruz', 'SM North EDSA', 'NDA 1234', '#TRIP-1024'].map((sug) => (
                  <button
                    key={sug}
                    onClick={() => setQuery(sug)}
                    className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>
          ) : totalResults === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm font-bold text-slate-400">No records found matching "{query}"</p>
              <p className="text-xs text-slate-500 mt-1">Try searching by plate number, passenger name, or SOS ID.</p>
            </div>
          ) : (
            <>
              {/* Emergency Alerts */}
              {matchedSOS.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 flex items-center gap-1 mb-2">
                    <ShieldAlert className="w-3 h-3" /> Emergency Alerts ({matchedSOS.length})
                  </span>
                  <div className="space-y-1.5">
                    {matchedSOS.map((sos) => (
                      <div
                        key={sos.id}
                        onClick={() => {
                          onNavigate('emergency', sos.id);
                          onClose();
                        }}
                        className="p-3 bg-red-950/30 border border-red-900/40 rounded-xl hover:bg-red-900/30 cursor-pointer flex items-center justify-between transition-colors group"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-red-300">{sos.id}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 font-bold">
                              {sos.type}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 mt-0.5">
                            {sos.userName} • {sos.location.name}
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Drivers */}
              {matchedDrivers.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1 mb-2">
                    <Car className="w-3 h-3" /> Drivers ({matchedDrivers.length})
                  </span>
                  <div className="space-y-1.5">
                    {matchedDrivers.map((drv) => (
                      <div
                        key={drv.id}
                        onClick={() => {
                          onNavigate('drivers', drv.id);
                          onClose();
                        }}
                        className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl hover:bg-slate-800/80 cursor-pointer flex items-center justify-between transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <img src={drv.avatar} alt={drv.name} className="w-8 h-8 rounded-full object-cover" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white">{drv.name}</span>
                              <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                                {drv.plateNumber}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {drv.vehicleDetails} • {drv.status}
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Passengers */}
              {matchedPassengers.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1 mb-2">
                    <Users className="w-3 h-3" /> Passengers ({matchedPassengers.length})
                  </span>
                  <div className="space-y-1.5">
                    {matchedPassengers.map((pas) => (
                      <div
                        key={pas.id}
                        onClick={() => {
                          onNavigate('passengers', pas.id);
                          onClose();
                        }}
                        className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl hover:bg-slate-800/80 cursor-pointer flex items-center justify-between transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <img src={pas.avatar} alt={pas.name} className="w-8 h-8 rounded-full object-cover" />
                          <div>
                            <span className="text-xs font-bold text-white block">{pas.name}</span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              {pas.phone} • {pas.email}
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bookings */}
              {matchedBookings.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1 mb-2">
                    <CalendarDays className="w-3 h-3" /> Bookings & Trips ({matchedBookings.length})
                  </span>
                  <div className="space-y-1.5">
                    {matchedBookings.map((b) => (
                      <div
                        key={b.id}
                        onClick={() => {
                          onNavigate('bookings', b.id);
                          onClose();
                        }}
                        className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl hover:bg-slate-800/80 cursor-pointer flex items-center justify-between transition-colors group"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-amber-400 font-mono">{b.id}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">
                              {b.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 mt-0.5">
                            {b.route.pickup} ➔ {b.route.dropoff} (₱{b.fare})
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tickets */}
              {matchedTickets.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-pink-400 flex items-center gap-1 mb-2">
                    <HelpCircle className="w-3 h-3" /> Support Tickets ({matchedTickets.length})
                  </span>
                  <div className="space-y-1.5">
                    {matchedTickets.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => {
                          onNavigate('support', t.id);
                          onClose();
                        }}
                        className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl hover:bg-slate-800/80 cursor-pointer flex items-center justify-between transition-colors group"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-pink-400 font-mono">{t.id}</span>
                            <span className="text-xs font-bold text-white">{t.subject}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            From {t.userName} ({t.userRole}) • {t.status}
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-pink-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
