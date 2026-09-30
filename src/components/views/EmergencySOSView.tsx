import React, { useState } from 'react';
import {
  Phone,
  CheckCircle2,
  Clock,
  MapPin,
  Car,
  Search,
  ExternalLink,
  Loader2,
  Compass,
} from 'lucide-react';
import { useRealtimeDb } from '../../context/RealtimeDbContext';
import { EmergencyAlert, EmergencyStatus, EmergencyType } from '../../types';
import { formatHumanReadableTripId } from '../../utils/tripHelpers';
import { formatHumanReadableSosId } from '../../utils/idHelpers';
import { queryGoogleMapsGrounding, MapsGroundingResult } from '../../utils/mapsGroundingService';

interface EmergencySOSViewProps {
  onOpenCall: (name: string, phone: string, role: string) => void;
  onOpenDispatch: (alert: EmergencyAlert) => void;
}

export const EmergencySOSView: React.FC<EmergencySOSViewProps> = ({
  onOpenCall,
  onOpenDispatch,
}) => {
  const { emergencyAlerts, resolveEmergencyAlert } = useRealtimeDb();
  const [filterTab, setFilterTab] = useState<'all' | 'critical' | 'responding' | 'resolved'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [groundedAlertMap, setGroundedAlertMap] = useState<Record<string, MapsGroundingResult>>({});
  const [loadingAlertId, setLoadingAlertId] = useState<string | null>(null);

  const handleGroundIncidentLocation = async (alert: EmergencyAlert) => {
    setLoadingAlertId(alert.id);
    try {
      const [lat, lng] = alert.location.coordinates || [14.6565, 121.035];
      const prompt = `Find the nearest hospitals, emergency rooms, police stations, and 24/7 roadside assistance near ${alert.location.name} (${alert.location.address}).`;
      const result = await queryGoogleMapsGrounding(prompt, lat, lng);
      setGroundedAlertMap((prev) => ({ ...prev, [alert.id]: result }));
    } catch {
      // handled gracefully by service
    } finally {
      setLoadingAlertId(null);
    }
  };

  const totalSOS = emergencyAlerts.length;
  const criticalCount = emergencyAlerts.filter((a) => a.status === 'critical').length;
  const respondingCount = emergencyAlerts.filter((a) => a.status === 'responding').length;
  const resolvedCount = emergencyAlerts.filter((a) => a.status === 'resolved').length;

  const filteredAlerts = emergencyAlerts.filter((alert) => {
    if (filterTab !== 'all' && alert.status !== filterTab) return false;
    if (typeFilter !== 'all' && alert.type !== typeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        alert.id.toLowerCase().includes(q) ||
        alert.userName.toLowerCase().includes(q) ||
        alert.location.name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div id="emergency-view-root" className="space-y-6 pb-12">
      {/* 4 Stat Cards without unnecessary decorative icons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Total SOS Logged */}
        <div className="p-5 bg-[#0c121e] border border-slate-800 rounded-2xl shadow-xl flex flex-col justify-between">
          <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Total SOS Logged</span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-mono">{totalSOS}</span>
            <span className="text-xs font-bold text-slate-400">All-time</span>
          </div>
        </div>

        {/* Stat 2: Active Critical */}
        <div className="p-5 bg-[#0c121e] border border-red-900/50 rounded-2xl shadow-xl flex flex-col justify-between">
          <span className="text-xs uppercase font-bold text-red-400 tracking-wider">Active Critical</span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-red-500 font-mono">{criticalCount}</span>
            <span className="text-xs font-bold text-red-300">Needs Immediate Action</span>
          </div>
        </div>

        {/* Stat 3: Units Responding */}
        <div className="p-5 bg-[#0c121e] border border-amber-900/40 rounded-2xl shadow-xl flex flex-col justify-between">
          <span className="text-xs uppercase font-bold text-amber-400 tracking-wider">Units Responding</span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-400 font-mono">{respondingCount}</span>
            <span className="text-xs font-bold text-amber-300">En Route to Incidents</span>
          </div>
        </div>

        {/* Stat 4: Incidents Resolved */}
        <div className="p-5 bg-[#0c121e] border border-emerald-900/40 rounded-2xl shadow-xl flex flex-col justify-between">
          <span className="text-xs uppercase font-bold text-emerald-400 tracking-wider">Incidents Resolved</span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-400 font-mono">{resolvedCount}</span>
            <span className="text-xs font-bold text-emerald-300">Cleared Today</span>
          </div>
        </div>
      </div>

      {/* Control Bar: Filters & Simulate Action */}
      <div className="p-4 bg-[#0c121e] border border-slate-800 rounded-2xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'all', label: 'All Incidents', count: totalSOS },
            { id: 'critical', label: 'Critical', count: criticalCount, color: 'text-red-400' },
            { id: 'responding', label: 'Responding', count: respondingCount, color: 'text-amber-400' },
            { id: 'resolved', label: 'Resolved', count: resolvedCount, color: 'text-emerald-400' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                filterTab === tab.id
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  filterTab === tab.id ? 'bg-black text-amber-400 font-black' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Right Tools */}
        <div className="flex items-center gap-3">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-[#080c14] border border-slate-800 text-xs font-bold text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Emergency Types</option>
            <option value="Safety SOS">Safety SOS</option>
            <option value="Vehicle Breakdown">Vehicle Breakdown</option>
            <option value="Medical Emergency">Medical Emergency</option>
            <option value="Route Deviation">Route Deviation</option>
          </select>
        </div>
      </div>

      {/* SOS Incident Cards List */}
      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <div className="p-12 text-center bg-[#0c121e] border border-slate-800 rounded-3xl">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <h4 className="text-base font-black text-white">No active emergency incidents matching filter</h4>
            <p className="text-xs text-slate-400 mt-1">
              All safety parameters and GPS fleet geofences are currently within normal thresholds.
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert, index) => (
            <div
              key={`sos-alert-${alert.id || 'sos'}-${index}`}
              className={`p-6 bg-[#0c121e] rounded-3xl border transition-all shadow-xl ${
                alert.status === 'critical'
                  ? 'border-red-600/80 shadow-red-950/40 ring-1 ring-red-500/20'
                  : alert.status === 'responding'
                  ? 'border-amber-500/60 shadow-amber-950/20'
                  : 'border-slate-800/80'
              }`}
            >
              {/* Card Top Row: Header Badge, SOS ID, Timestamp */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs px-3 py-1 rounded-full font-black uppercase tracking-wider ${
                      alert.type === 'Safety SOS'
                        ? 'bg-red-600 text-white'
                        : alert.type === 'Vehicle Breakdown'
                        ? 'bg-amber-500 text-black'
                        : 'bg-rose-600 text-white'
                    }`}
                  >
                    {alert.type}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black text-white font-mono">{formatHumanReadableSosId(alert.id)}</span>
                    <span className="text-xs text-slate-400 font-mono">
                      Trip: <strong className="text-amber-400">{formatHumanReadableTripId(alert.tripId)}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    {alert.loggedAt}
                  </span>

                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-extrabold uppercase ${
                      alert.status === 'critical'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'
                        : alert.status === 'responding'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {alert.status}
                  </span>
                </div>
              </div>

              {/* Main Information Grid: Involved Parties, Location, Telemetry */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 my-5">
                {/* User Info */}
                <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2">
                    Distressed Caller ({alert.userRole})
                  </span>
                  <div>
                    <h5 className="text-sm font-black text-white">{alert.userName}</h5>
                    <span className="text-xs font-mono font-bold text-amber-400">{alert.userPhone}</span>
                  </div>
                  <button
                    onClick={() => onOpenCall(alert.userName, alert.userPhone, alert.userRole)}
                    className="mt-3 w-full py-2 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-xs font-black rounded-xl flex items-center justify-center gap-2 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call Caller</span>
                  </button>
                </div>

                {/* Assigned Driver (if any) */}
                <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2">
                    Assigned Driver Partner
                  </span>
                  {alert.assignedDriver ? (
                    <>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-black text-white">{alert.assignedDriver.name}</span>
                          <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                            {alert.assignedDriver.plateNumber}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400 block">{alert.assignedDriver.vehicle}</span>
                        <span className="text-xs font-mono text-slate-400 block">
                          {alert.assignedDriver.phone}
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          onOpenCall(alert.assignedDriver!.name, alert.assignedDriver!.phone, 'DRIVER')
                        }
                        className="mt-3 w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5 text-amber-400" />
                        <span>Call Driver</span>
                      </button>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <Car className="w-6 h-6 text-slate-500 mx-auto mb-1" />
                      <span className="text-xs text-slate-400">Driver unassigned</span>
                    </div>
                  )}
                </div>

                {/* Incident Location & Telemetry */}
                <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    GPS Coordinates & Landmark
                  </span>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                      <MapPin className="w-4 h-4 text-red-500" />
                      <span>{alert.location.name}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 pl-5">{alert.location.address}</p>
                    <span className="text-[10px] font-mono text-slate-500 pl-5 block">
                      Lat: {alert.location.coordinates[0]}, Lng: {alert.location.coordinates[1]}
                    </span>
                  </div>

                  {alert.assignedUnit && (
                    <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[11px] font-bold text-amber-400">
                      <span className="truncate">Unit: {alert.assignedUnit}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Incident Telemetry Log */}
              <div className="p-3.5 bg-[#080c14] border border-slate-800/80 rounded-2xl text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                  Incident Log & Field Telemetry Notes:
                </span>
                <p className="text-slate-300 leading-relaxed">{alert.incidentLog}</p>
                {alert.resolutionNotes && (
                  <p className="text-emerald-400 font-bold mt-1">
                    Resolution: {alert.resolutionNotes}
                  </p>
                )}
              </div>

              {/* Google Maps Grounding Emergency Facilities Output */}
              {groundedAlertMap[alert.id] && (
                <div className="mt-4 p-4 bg-[#080c14] border border-amber-500/30 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5" />
                      Nearby Emergency Facilities (Google Maps Grounding • {groundedAlertMap[alert.id].model})
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400">
                      {groundedAlertMap[alert.id].places.length} Map Links
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {groundedAlertMap[alert.id].text}
                  </p>
                  {groundedAlertMap[alert.id].places.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {groundedAlertMap[alert.id].places.map((place, pIdx) => (
                        <div
                          key={`sos-place-${alert.id}-${pIdx}`}
                          className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1"
                        >
                          <a
                            href={place.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between gap-2 text-xs font-bold text-amber-400 hover:text-amber-300 underline"
                          >
                            <span className="truncate">{place.title}</span>
                            <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                          </a>
                          {place.reviewSnippets && place.reviewSnippets.length > 0 && (
                            <p className="text-[10px] text-slate-400 italic line-clamp-2">
                              "{place.reviewSnippets[0]}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Bottom Action Buttons */}
              <div className="pt-4 mt-4 border-t border-slate-800 flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => handleGroundIncidentLocation(alert)}
                  disabled={loadingAlertId === alert.id}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-400 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loadingAlertId === alert.id ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Locating on Google Maps...</span>
                    </>
                  ) : (
                    <>
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Locate Nearest Hospitals & Police (Google Maps)</span>
                    </>
                  )}
                </button>
                {alert.status !== 'resolved' && (
                  <>
                    <button
                      onClick={() => onOpenDispatch(alert)}
                      className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                    >
                      {alert.assignedUnit ? 'Re-assign Dispatch Unit' : 'Dispatch Emergency Unit'}
                    </button>

                    <button
                      onClick={() => resolveEmergencyAlert(alert.id)}
                      className="px-5 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-400 text-xs font-black rounded-xl transition-all cursor-pointer"
                    >
                      Mark Incident as Resolved
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
