import React, { useState } from 'react';
import { Siren, X, Check, ShieldAlert, Truck, HeartPulse, Shield, MapPin } from 'lucide-react';
import { useRealtimeDb } from '../../context/RealtimeDbContext';
import { checkRolePermission, getRoleRestrictedMessage } from '../../utils/permissionHelpers';

interface EmergencyDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  sosId: string;
  locationName: string;
  incidentLog: string;
  onConfirmDispatch: (unitName: string) => void;
}

const EMERGENCY_UNITS = [
  {
    id: 'unit-1',
    name: 'Quezon City Emergency Unit & Towing Service',
    type: 'Towing & Mechanical Recovery',
    eta: '6 mins ETA',
    icon: Truck,
  },
  {
    id: 'unit-2',
    name: 'PNP Highway Patrol Group (EDSA Station 10)',
    type: 'Law Enforcement / Security Escort',
    eta: '4 mins ETA',
    icon: Shield,
  },
  {
    id: 'unit-3',
    name: 'Metro Manila Red Cross Medical Ambulance',
    type: 'Paramedic & Emergency First Responder',
    eta: '8 mins ETA',
    icon: HeartPulse,
  },
  {
    id: 'unit-4',
    name: 'SwiftRide Mobile Patrol Dispatch Team #3',
    type: 'Platform Field Support Agent',
    eta: '5 mins ETA',
    icon: Siren,
  },
];

export const EmergencyDispatchModal: React.FC<EmergencyDispatchModalProps> = ({
  isOpen,
  onClose,
  sosId,
  locationName,
  incidentLog,
  onConfirmDispatch,
}) => {
  const { currentAdminUser } = useRealtimeDb();
  const [selectedUnit, setSelectedUnit] = useState(EMERGENCY_UNITS[0].name);
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkRolePermission(currentAdminUser.role, 'emergency_dispatch')) {
      alert(getRoleRestrictedMessage(currentAdminUser.role, 'Emergency Unit Dispatch'));
      return;
    }
    onConfirmDispatch(selectedUnit);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-[#0d1422] border border-slate-700/80 rounded-3xl p-6 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Siren className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Dispatch Emergency Responder Unit</h3>
              <p className="text-xs text-amber-400 font-mono font-bold">Incident #{sosId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Location Info Banner */}
        <div className="my-4 p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1 text-xs">
          <div className="flex items-center gap-1.5 text-slate-300 font-bold">
            <MapPin className="w-3.5 h-3.5 text-amber-400" />
            <span>Target Location: {locationName}</span>
          </div>
          <p className="text-slate-400 text-[11px] line-clamp-2 pl-5">{incidentLog}</p>
        </div>

        {/* Units Selection List */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-2 uppercase tracking-wider">
              Select Authorized Responder
            </label>
            <div className="space-y-2">
              {EMERGENCY_UNITS.map((unit) => {
                const Icon = unit.icon;
                const isSelected = selectedUnit === unit.name;
                return (
                  <div
                    key={unit.id}
                    onClick={() => setSelectedUnit(unit.name)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500 text-white shadow-md shadow-amber-500/10'
                        : 'bg-slate-900/40 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isSelected ? 'bg-amber-500 text-black' : 'bg-slate-800 text-slate-400'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold block text-white">{unit.name}</span>
                        <span className="text-[11px] text-slate-400">{unit.type}</span>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                      {unit.eta}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5 uppercase tracking-wider">
              Dispatcher Priority Dispatch Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Unit instructed to approach via North Ave flyover service road..."
              className="w-full bg-[#080c14] border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-500 min-h-[70px] resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs rounded-xl shadow-lg shadow-amber-500/25 transition-all flex items-center gap-2"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>CONFIRM DISPATCH UNIT</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
