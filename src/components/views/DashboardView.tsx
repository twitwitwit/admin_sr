import React, { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  ChevronRight,
  Activity,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';
import { useRealtimeDb } from '../../context/RealtimeDbContext';
import { Driver, NavTab, VehicleType } from '../../types';
import { ActivityLogs } from '../dashboard/ActivityLogs';
import L from 'leaflet';

interface DashboardViewProps {
  onNavigate: (tab: NavTab) => void;
  onInspectDriver: (driver: Driver) => void;
}

interface DemandHotspot {
  id: string;
  name: string;
  coords: [number, number];
  intensity: 'EXTREME' | 'HIGH' | 'MODERATE';
  surgeMultiplier: number;
  activeRequests: number;
  radiusMeters: number;
}

const DEMAND_HOTSPOTS: DemandHotspot[] = [
  {
    id: 'bgc',
    name: 'BGC High Street & Uptown',
    coords: [14.5547, 121.0494],
    intensity: 'EXTREME',
    surgeMultiplier: 2.4,
    activeRequests: 184,
    radiusMeters: 1400,
  },
  {
    id: 'makati',
    name: 'Makati CBD (Ayala / Legazpi)',
    coords: [14.5547, 121.0244],
    intensity: 'EXTREME',
    surgeMultiplier: 2.1,
    activeRequests: 156,
    radiusMeters: 1300,
  },
  {
    id: 'naia',
    name: 'NAIA Terminals Corridor',
    coords: [14.5126, 121.0194],
    intensity: 'EXTREME',
    surgeMultiplier: 2.2,
    activeRequests: 142,
    radiusMeters: 1600,
  },
  {
    id: 'ortigas',
    name: 'Ortigas Business Center',
    coords: [14.5866, 121.061],
    intensity: 'HIGH',
    surgeMultiplier: 1.8,
    activeRequests: 98,
    radiusMeters: 1200,
  },
  {
    id: 'qc-diliman',
    name: 'Quezon City (Diliman / Morato)',
    coords: [14.6385, 121.0336],
    intensity: 'HIGH',
    surgeMultiplier: 1.6,
    activeRequests: 87,
    radiusMeters: 1500,
  },
  {
    id: 'moa-bay',
    name: 'SM Mall of Asia / Bay Area',
    coords: [14.5352, 120.9826],
    intensity: 'HIGH',
    surgeMultiplier: 1.9,
    activeRequests: 112,
    radiusMeters: 1400,
  },
  {
    id: 'eastwood',
    name: 'Eastwood City Cyberpark',
    coords: [14.6105, 121.0805],
    intensity: 'MODERATE',
    surgeMultiplier: 1.4,
    activeRequests: 64,
    radiusMeters: 1000,
  },
];

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate, onInspectDriver }) => {
  const {
    emergencyAlerts,
    drivers,
    bookings,
    activityLogs,
    approveDriver,
    rejectDriver,
    activeCriticalSOSCount,
    triggerManualTelemetryPing,
    isLivePolling,
    currentAdminUser,
  } = useRealtimeDb();

  // Map layer toggle state: 'standard' vs 'heatmap'
  const [mapLayerMode, setMapLayerMode] = useState<'standard' | 'heatmap'>('standard');
  const [selectedHotspot, setSelectedHotspot] = useState<DemandHotspot | null>(null);
  const [rightRailTab, setRightRailTab] = useState<'audits' | 'dispatch'>('audits');

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const driverMarkersRef = useRef<Record<string, L.Marker>>({});
  const driverMarkerMetaRef = useRef<Record<string, string>>({});
  const heatmapLayerGroupRef = useRef<L.LayerGroup | null>(null);

  const pendingDrivers = drivers.filter((d) => d.isPendingAudit);
  const activeOnlineDrivers = drivers.filter((d) => d.status === 'ONLINE' || d.status === 'ON TRIP');

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    driverMarkersRef.current = {};
    driverMarkerMetaRef.current = {};

    const map = L.map(mapContainerRef.current, {
      center: [14.585, 121.035],
      zoom: 12,
      zoomControl: false,
      zoomAnimation: false,
      fadeAnimation: false,
      markerZoomAnimation: false,
    });

    // Standard Free Leaflet OpenStreetMap tile layer (light mode)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    heatmapLayerGroupRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    const safeInvalidateSize = () => {
      if (!mapInstanceRef.current) return;
      try {
        mapInstanceRef.current.invalidateSize({ animate: false });
      } catch {
        // ignore if container is unmounting
      }
    };

    window.addEventListener('resize', safeInvalidateSize);
    const resizeTimer = setTimeout(safeInvalidateSize, 150);

    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', safeInvalidateSize);
      try {
        map.stop();
        map.remove();
      } catch {
        // ignore cleanup errors
      }
      driverMarkersRef.current = {};
      driverMarkerMetaRef.current = {};
      heatmapLayerGroupRef.current = null;
      mapInstanceRef.current = null;
    };
  }, []);

  // Render & Update Map Layers based on mapLayerMode & Drivers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Helper: Vehicle icon generator
    const createVehicleIcon = (vehicleType: VehicleType, status: string) => {
      const isTrip = status === 'ON TRIP';
      const color = isTrip ? '#F59E0B' : '#10B981';

      return L.divIcon({
        className: 'custom-vehicle-marker',
        html: `
          <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; inset: 0; border-radius: 50%; background: ${color}; opacity: 0.25;"></div>
            <div style="position: relative; width: 26px; height: 26px; border-radius: 50%; background: #0c121e; border: 2px solid ${color}; display: flex; align-items: center; justify-content: center; color: ${color}; font-weight: 800; font-size: 10px;">
              ${vehicleType === 'Motorcycle' ? 'MC' : vehicleType === 'SUV' ? 'SUV' : 'SED'}
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
    };

    // 1. Manage Standard Driver Fleet Markers
    if (mapLayerMode === 'standard') {
      activeOnlineDrivers.forEach((drv) => {
        if (!drv.currentLocation) return;
        const [lat, lng] = drv.currentLocation;
        const metaKey = `${drv.vehicleType}:${drv.status}`;
        const existingMarker = driverMarkersRef.current[drv.id];

        try {
          if (existingMarker && map.hasLayer(existingMarker)) {
            existingMarker.setLatLng([lat, lng]);
            if (driverMarkerMetaRef.current[drv.id] !== metaKey) {
              existingMarker.setIcon(createVehicleIcon(drv.vehicleType, drv.status));
              driverMarkerMetaRef.current[drv.id] = metaKey;
            }
          } else {
            if (existingMarker) {
              try {
                existingMarker.remove();
              } catch {}
            }
            const icon = createVehicleIcon(drv.vehicleType, drv.status);
            const marker = L.marker([lat, lng], { icon }).addTo(map);
            marker.bindPopup(`
              <div style="font-family: 'Montserrat', sans-serif; font-size: 12px; color: #fff; background: #0c121e; padding: 4px; border-radius: 8px;">
                <strong style="color: #F59E0B;">${drv.name}</strong><br/>
                <span>${drv.vehicleDetails} (${drv.plateNumber})</span><br/>
                <span style="color: #10B981; font-weight: 700;">Status: ${drv.status}</span>
              </div>
            `);
            driverMarkersRef.current[drv.id] = marker;
            driverMarkerMetaRef.current[drv.id] = metaKey;
          }
        } catch {
          // ignore transient Leaflet DOM errors
        }
      });

      // Clean up markers for drivers no longer online
      Object.keys(driverMarkersRef.current).forEach((id) => {
        if (!activeOnlineDrivers.find((d) => d.id === id)) {
          try {
            driverMarkersRef.current[id].remove();
          } catch {}
          delete driverMarkersRef.current[id];
          delete driverMarkerMetaRef.current[id];
        }
      });
    } else {
      // In heatmap mode, hide individual driver markers to spotlight demand density
      Object.values(driverMarkersRef.current).forEach((marker) => {
        try {
          if (map.hasLayer(marker)) {
            map.removeLayer(marker);
          }
        } catch {}
      });
    }

    // 2. Manage Demand Heat-Map Layer
    if (heatmapLayerGroupRef.current) {
      try {
        heatmapLayerGroupRef.current.clearLayers();

        if (mapLayerMode === 'heatmap') {
          DEMAND_HOTSPOTS.forEach((spot) => {
            const isExtreme = spot.intensity === 'EXTREME';
            const isHigh = spot.intensity === 'HIGH';

            const primaryColor = isExtreme ? '#EF4444' : isHigh ? '#F59E0B' : '#06B6D4';
            const outerColor = isExtreme ? '#DC2626' : isHigh ? '#D97706' : '#0891B2';

            // Outer Heat halo
            const outerCircle = L.circle(spot.coords, {
              radius: spot.radiusMeters,
              color: outerColor,
              fillColor: primaryColor,
              fillOpacity: isExtreme ? 0.28 : 0.2,
              weight: 1.5,
              dashArray: '4, 4',
            });

            // Inner high-density core
            const innerCircle = L.circle(spot.coords, {
              radius: spot.radiusMeters * 0.45,
              color: primaryColor,
              fillColor: primaryColor,
              fillOpacity: isExtreme ? 0.45 : 0.35,
              weight: 2,
            });

            // Hotspot Surge Tag Label
            const labelIcon = L.divIcon({
              className: 'hotspot-label-marker',
              html: `
              <div style="transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; pointer-events: auto; cursor: pointer;">
                <div style="background: rgba(12, 18, 30, 0.92); border: 1.5px solid ${primaryColor}; color: #fff; padding: 4px 8px; border-radius: 9999px; font-size: 11px; font-weight: 800; font-family: 'Montserrat', sans-serif; box-shadow: 0 4px 14px rgba(0,0,0,0.6); display: flex; align-items: center; gap: 4px; white-space: nowrap;">
                  <span style="color: ${primaryColor}; font-weight: 900;">${spot.surgeMultiplier}x</span>
                  <span>${spot.name.split(' ')[0]}</span>
                  <span style="background: ${primaryColor}22; color: ${primaryColor}; font-size: 9px; padding: 1px 4px; border-radius: 4px; font-weight: 700;">${spot.activeRequests} reqs</span>
                </div>
              </div>
            `,
              iconSize: [0, 0],
            });

            const labelMarker = L.marker(spot.coords, { icon: labelIcon });
            labelMarker.on('click', () => {
              setSelectedHotspot(spot);
              try {
                map.setView(spot.coords, 14, { animate: false });
              } catch {}
            });

            outerCircle.addTo(heatmapLayerGroupRef.current!);
            innerCircle.addTo(heatmapLayerGroupRef.current!);
            labelMarker.addTo(heatmapLayerGroupRef.current!);
          });
        }
      } catch {
        // ignore if map unmounted
      }
    }
  }, [mapLayerMode, activeOnlineDrivers]);

  const handleHotspotClick = (spot: DemandHotspot) => {
    setSelectedHotspot(spot);
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.setView(spot.coords, 14, { animate: false });
      } catch {}
    }
  };

  return (
    <div id="dashboard-view-root" className="space-y-6 pb-12">
      {/* Top Urgent Emergency Alert Banner */}
      {activeCriticalSOSCount > 0 && (
        <div
          id="banner-emergency-alert"
          onClick={() => onNavigate('emergency')}
          className="px-5 py-3.5 bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 text-white rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:opacity-95 transition-all group border border-rose-400/40"
        >
          <div className="flex items-center gap-3.5">
            <div className="p-2 rounded-lg bg-black/20">
              <AlertTriangle className="w-5 h-5 fill-white text-rose-600 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-wide uppercase font-display">
                  {activeCriticalSOSCount} Active Emergency SOS Alert{activeCriticalSOSCount > 1 ? 's' : ''}
                </span>
                <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
              </div>
              <p className="text-xs text-rose-100 mt-0.5">
                Immediate dispatcher triage required. Click to open the Emergency SOS Operations Desk.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-black/25 hover:bg-black/35 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white self-start sm:self-auto group-hover:translate-x-0.5 transition-transform">
            <span>Open SOS Desk</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      )}

      {/* Role Context Header Bar */}
      <div className="bg-[#0c121e] border border-slate-800/90 rounded-xl px-4 sm:px-5 py-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div
            className={`p-2 rounded-lg border flex-shrink-0 ${
              currentAdminUser.role === 'Super Admin'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : currentAdminUser.role === 'Safety Dispatcher'
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
            }`}
          >
            <Activity className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs">
              <h2 className="text-sm font-bold text-white font-display">
                {currentAdminUser.role === 'Super Admin'
                  ? 'Executive Financial & Operational Command'
                  : currentAdminUser.role === 'Safety Dispatcher'
                  ? 'Fleet Health & Emergency Incident Triage'
                  : 'Driver Audit & Partner Compliance Hub'}
              </h2>
              <span className="text-slate-600 hidden sm:inline" aria-hidden="true">·</span>
              <span
                className={`font-semibold ${
                  currentAdminUser.role === 'Super Admin'
                    ? 'text-amber-400'
                    : currentAdminUser.role === 'Safety Dispatcher'
                    ? 'text-rose-400'
                    : 'text-cyan-400'
                }`}
              >
                {currentAdminUser.role}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              {currentAdminUser.role === 'Super Admin'
                ? 'Displaying platform settlement volume, active fleet density, and global system telemetry.'
                : currentAdminUser.role === 'Safety Dispatcher'
                ? 'Spotlighting fleet health metrics, live response times, and active SOS emergency queues.'
                : 'Spotlighting pending driver verification audits, compliance scores, and partner approvals.'}
            </p>
          </div>
        </div>

        <div className="text-xs font-mono text-slate-400 flex flex-wrap items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <span>Operator:</span>
          <strong className="text-slate-200">{currentAdminUser.name}</strong>
          <span className="text-slate-600">·</span>
          <span className="text-amber-400 break-all">{currentAdminUser.email}</span>
        </div>
      </div>

      {/* UPGRADE 1: Unified Architectural Stat Strip */}
      {currentAdminUser.role === 'Super Admin' && (
        <div className="bg-slate-800/80 border border-slate-800/90 rounded-xl grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-px overflow-hidden">
          <button
            onClick={() => onNavigate('bookings')}
            className="p-3.5 sm:p-4 text-left bg-[#0c121e] hover:bg-slate-900/90 transition-colors group relative cursor-pointer"
          >
            <div className="absolute top-0 inset-x-0 h-0.5 bg-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="text-xs font-medium text-slate-400 block">Total Trips</span>
            <span className="text-xl sm:text-2xl font-bold text-white font-mono tabular-nums mt-1.5 block">
              {(1429 + bookings.length).toLocaleString()}
            </span>
            <div className="flex items-center gap-1 mt-1 text-[11px] font-medium text-emerald-400 font-mono">
              <ArrowUpRight className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">+12.4% vs yesterday</span>
            </div>
          </button>

          <button
            onClick={() => onNavigate('drivers')}
            className="p-3.5 sm:p-4 text-left bg-[#0c121e] hover:bg-slate-900/90 transition-colors group relative cursor-pointer"
          >
            <div className="absolute top-0 inset-x-0 h-0.5 bg-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="text-xs font-medium text-slate-400 block">Active Drivers</span>
            <span className="text-xl sm:text-2xl font-bold text-white font-mono tabular-nums mt-1.5 block">
              {438 + activeOnlineDrivers.length}
            </span>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] font-medium text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0"></span>
              <span className="truncate">Online & En Route</span>
            </div>
          </button>

          <button
            onClick={() => onNavigate('earnings')}
            className="p-3.5 sm:p-4 text-left bg-[#0e1525] hover:bg-slate-900/90 transition-colors group relative cursor-pointer"
          >
            <div className="absolute top-0 inset-x-0 h-0.5 bg-amber-400 opacity-70 group-hover:opacity-100 transition-opacity" />
            <span className="text-xs font-semibold text-amber-400 block">Gross Volume</span>
            <span className="text-xl sm:text-2xl font-bold text-amber-400 font-mono tabular-nums mt-1.5 block">
              ₱245.8K
            </span>
            <div className="flex items-center gap-1 mt-1 text-[11px] font-medium text-emerald-400 font-mono">
              <ArrowUpRight className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">+8.4% this week</span>
            </div>
          </button>

          <button
            onClick={() => onNavigate('earnings')}
            className="p-3.5 sm:p-4 text-left bg-[#0e1525] hover:bg-slate-900/90 transition-colors group relative cursor-pointer"
          >
            <div className="absolute top-0 inset-x-0 h-0.5 bg-amber-400 opacity-70 group-hover:opacity-100 transition-opacity" />
            <span className="text-xs font-semibold text-amber-400 block">Commission</span>
            <span className="text-xl sm:text-2xl font-bold text-amber-400 font-mono tabular-nums mt-1.5 block">
              ₱36.8K
            </span>
            <div className="flex items-center gap-1 mt-1 text-[11px] font-medium text-slate-400">
              <span className="truncate">15% Platform Take</span>
            </div>
          </button>

          <button
            onClick={() => onNavigate('emergency')}
            className="p-3.5 sm:p-4 text-left bg-[#0c121e] hover:bg-slate-900/90 transition-colors group relative cursor-pointer"
          >
            <div className="absolute top-0 inset-x-0 h-0.5 bg-rose-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="text-xs font-medium text-rose-400 block">Critical SOS</span>
            <span className="text-xl sm:text-2xl font-bold text-rose-400 font-mono tabular-nums mt-1.5 block">
              {emergencyAlerts.length}
            </span>
            <div className="flex items-center gap-1 mt-1 text-[11px] font-medium text-rose-300">
              <span className="truncate">{activeCriticalSOSCount} Urgent Dispatch</span>
            </div>
          </button>

          <button
            onClick={() => onNavigate('drivers')}
            className="p-3.5 sm:p-4 text-left bg-[#0c121e] hover:bg-slate-900/90 transition-colors group relative cursor-pointer"
          >
            <div className="absolute top-0 inset-x-0 h-0.5 bg-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="text-xs font-medium text-slate-400 block">Pending Audits</span>
            <span className="text-xl sm:text-2xl font-bold text-amber-400 font-mono tabular-nums mt-1.5 block">
              {pendingDrivers.length}
            </span>
            <div className="flex items-center gap-1 mt-1 text-[11px] font-medium text-slate-400">
              <span className="truncate">Awaiting Review</span>
            </div>
          </button>
        </div>
      )}

      {currentAdminUser.role === 'Safety Dispatcher' && (
        <div className="bg-slate-800/80 border border-slate-800/90 rounded-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px overflow-hidden">
          <button
            onClick={() => onNavigate('emergency')}
            className="p-4 text-left bg-[#14111e] hover:bg-slate-900/90 transition-colors group relative cursor-pointer"
          >
            <div className="absolute top-0 inset-x-0 h-0.5 bg-rose-500" />
            <span className="text-xs font-semibold text-rose-400 block">Active SOS Incidents</span>
            <span className="text-2xl font-bold text-rose-400 font-mono tabular-nums mt-1.5 block">
              {emergencyAlerts.length}
            </span>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] font-medium text-rose-300">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
              <span>{activeCriticalSOSCount} Requiring Immediate Dispatch</span>
            </div>
          </button>

          <div className="p-4 text-left bg-[#0c121e]">
            <span className="text-xs font-medium text-slate-400 block">Fleet Health & Utilization</span>
            <span className="text-2xl font-bold text-emerald-400 font-mono tabular-nums mt-1.5 block">
              92.4%
            </span>
            <div className="flex items-center gap-1 mt-1 text-[11px] font-medium text-emerald-400">
              <span>Online & Signal Stable</span>
            </div>
          </div>

          <div className="p-4 text-left bg-[#0c121e]">
            <span className="text-xs font-medium text-slate-400 block">Avg Response Time</span>
            <span className="text-2xl font-bold text-white font-mono tabular-nums mt-1.5 block">
              3.4 min
            </span>
            <div className="flex items-center gap-1 mt-1 text-[11px] font-medium text-emerald-400 font-mono">
              <ArrowUpRight className="w-3 h-3" />
              <span>-18s faster than avg</span>
            </div>
          </div>

          <button
            onClick={() => onNavigate('bookings')}
            className="p-4 text-left bg-[#0c121e] hover:bg-slate-900/90 transition-colors group relative cursor-pointer"
          >
            <div className="absolute top-0 inset-x-0 h-0.5 bg-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="text-xs font-medium text-slate-400 block">Active En-Route Trips</span>
            <span className="text-2xl font-bold text-white font-mono tabular-nums mt-1.5 block">
              {activeOnlineDrivers.length}
            </span>
            <div className="flex items-center gap-1 mt-1 text-[11px] font-medium text-slate-400">
              <span>Live GPS Polling Active</span>
            </div>
          </button>
        </div>
      )}

      {currentAdminUser.role === 'Fleet Manager' && (
        <div className="bg-slate-800/80 border border-slate-800/90 rounded-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px overflow-hidden">
          <button
            onClick={() => onNavigate('drivers')}
            className="p-4 text-left bg-[#14161e] hover:bg-slate-900/90 transition-colors group relative cursor-pointer"
          >
            <div className="absolute top-0 inset-x-0 h-0.5 bg-amber-400" />
            <span className="text-xs font-semibold text-amber-400 block">Pending Driver Audits</span>
            <span className="text-2xl font-bold text-amber-400 font-mono tabular-nums mt-1.5 block">
              {pendingDrivers.length}
            </span>
            <div className="flex items-center gap-1 mt-1 text-[11px] font-medium text-amber-300">
              <span>Awaiting LTO / OR-CR Review</span>
            </div>
          </button>

          <button
            onClick={() => onNavigate('drivers')}
            className="p-4 text-left bg-[#0c121e] hover:bg-slate-900/90 transition-colors group relative cursor-pointer"
          >
            <div className="absolute top-0 inset-x-0 h-0.5 bg-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="text-xs font-medium text-slate-400 block">Total Verified Fleet</span>
            <span className="text-2xl font-bold text-emerald-400 font-mono tabular-nums mt-1.5 block">
              {drivers.length - pendingDrivers.length}
            </span>
            <div className="flex items-center gap-1 mt-1 text-[11px] font-medium text-emerald-400">
              <span>100% LTO Compliant</span>
            </div>
          </button>

          <div className="p-4 text-left bg-[#0c121e]">
            <span className="text-xs font-medium text-slate-400 block">Fleet Compliance Score</span>
            <span className="text-2xl font-bold text-white font-mono tabular-nums mt-1.5 block">
              98.9%
            </span>
            <div className="flex items-center gap-1 mt-1 text-[11px] font-medium text-emerald-400">
              <span>All documents verified</span>
            </div>
          </div>

          <button
            onClick={() => onNavigate('passengers')}
            className="p-4 text-left bg-[#0c121e] hover:bg-slate-900/90 transition-colors group relative cursor-pointer"
          >
            <div className="absolute top-0 inset-x-0 h-0.5 bg-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="text-xs font-medium text-slate-400 block">Partner Driver Rating</span>
            <span className="text-2xl font-bold text-amber-400 font-mono tabular-nums mt-1.5 block">
              4.89 ★
            </span>
            <div className="flex items-center gap-1 mt-1 text-[11px] font-medium text-slate-400">
              <span>Based on 14.2K trips</span>
            </div>
          </button>
        </div>
      )}

      {/* UPGRADE 2: Split-Screen Command Deck (65% Radar Map + 35% Docked Triage & Audit Rail) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        {/* Left 65%: Metro Manila Fleet & Demand Radar with Floating Glassmorphic Controls */}
        <div className="xl:col-span-8 bg-[#0c121e] border border-slate-800/90 rounded-2xl overflow-hidden flex flex-col h-[400px] sm:h-[480px] xl:h-[540px]">
          {/* Compact Top Bar */}
          <div className="px-4 sm:px-5 py-3.5 border-b border-slate-800/80 flex items-center justify-between gap-3 flex-shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  isLivePolling ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <h3 className="text-xs sm:text-sm font-bold text-white truncate font-display">
                Metro Manila Fleet & Demand Radar
              </h3>
              <span className="text-slate-600 hidden sm:inline" aria-hidden="true">·</span>
              <span className="text-xs text-slate-400 truncate hidden sm:inline">
                {mapLayerMode === 'standard'
                  ? `${activeOnlineDrivers.length} active units tracked`
                  : `${DEMAND_HOTSPOTS.length} surge clusters active`}
              </span>
            </div>

            <button
              onClick={triggerManualTelemetryPing}
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1.5 font-semibold cursor-pointer whitespace-nowrap flex-shrink-0"
              title="Refresh GPS positions"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sync GPS</span>
            </button>
          </div>

          {/* Map Canvas with Floating Glassmorphic Overlays */}
          <div className="relative flex-1 w-full bg-[#080c14]">
            <div ref={mapContainerRef} className="h-full w-full" />

            {/* Floating Top-Right Layer Switcher (Glassmorphic) */}
            <div className="absolute top-3 right-3 z-[500] flex items-center gap-1 bg-[#070b13]/90 backdrop-blur-md p-1 rounded-xl border border-slate-800/90 shadow-xl pointer-events-auto">
              <button
                id="map-toggle-standard"
                onClick={() => setMapLayerMode('standard')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  mapLayerMode === 'standard'
                    ? 'bg-amber-500 text-black font-bold shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Standard View
              </button>
              <button
                id="map-toggle-heatmap"
                onClick={() => setMapLayerMode('heatmap')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  mapLayerMode === 'heatmap'
                    ? 'bg-amber-500 text-black font-bold shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Surge Heatmap
              </button>
            </div>

            {/* Floating Telemetry Legend (Bottom-Left on mobile, Top-Left on sm+) */}
            <div className="absolute bottom-3 sm:bottom-auto sm:top-3 left-3 z-[500] bg-[#070b13]/90 backdrop-blur-md border border-slate-800/90 rounded-xl p-2.5 sm:p-3 shadow-xl text-xs space-y-1.5 sm:space-y-2 pointer-events-auto max-w-[180px] sm:max-w-none">
              <span className="font-semibold text-slate-300 text-[11px] block">
                {mapLayerMode === 'standard' ? 'Fleet Telemetry' : 'Demand Density'}
              </span>

              {mapLayerMode === 'standard' ? (
                <div className="space-y-1.5 text-[11px] text-slate-300">
                  <div className="flex items-center justify-between gap-4">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      <span>Available</span>
                    </span>
                    <span className="font-mono tabular-nums font-bold text-emerald-400">
                      {activeOnlineDrivers.filter((d) => d.status === 'ONLINE').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                      <span>On Active Trip</span>
                    </span>
                    <span className="font-mono tabular-nums font-bold text-amber-400">
                      {activeOnlineDrivers.filter((d) => d.status === 'ON TRIP').length}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5 text-[11px] text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    <span>Extreme (&gt;2.0x)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span>High (1.5x – 1.9x)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                    <span>Moderate (&lt;1.5x)</span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Hotspot Jump Controls for Heatmap */}
            {mapLayerMode === 'heatmap' && (
              <div className="absolute bottom-3.5 left-3.5 right-14 z-[500] flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pointer-events-auto">
                {DEMAND_HOTSPOTS.map((spot) => (
                  <button
                    key={spot.id}
                    onClick={() => handleHotspotClick(spot)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap border transition-all cursor-pointer ${
                      selectedHotspot?.id === spot.id
                        ? 'bg-amber-500 text-black border-amber-400 font-bold shadow-lg'
                        : 'bg-[#070b13]/90 text-slate-300 border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <span>{spot.name.split(' ')[0]}</span>
                    <span className="ml-1.5 font-mono text-[11px] opacity-90">{spot.surgeMultiplier}x</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 35%: Docked Live Triage & Partner Audit Rail */}
        <div className="xl:col-span-4 bg-[#0c121e] border border-slate-800/90 rounded-2xl flex flex-col h-[540px] overflow-hidden">
          {/* Rail Header & Segmented Switcher */}
          <div className="p-3.5 border-b border-slate-800/80 flex items-center justify-between gap-2 flex-shrink-0">
            <div className="flex items-center gap-1 bg-[#070b13] p-1 rounded-lg border border-slate-800/80 w-full">
              <button
                onClick={() => setRightRailTab('audits')}
                className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  rightRailTab === 'audits'
                    ? 'bg-amber-500 text-black font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Pending Audits</span>
                <span className="font-mono tabular-nums text-[11px]">
                  ({pendingDrivers.length})
                </span>
              </button>
              <button
                onClick={() => setRightRailTab('dispatch')}
                className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  rightRailTab === 'dispatch'
                    ? 'bg-amber-500 text-black font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Live Trips</span>
                <span className="font-mono tabular-nums text-[11px]">
                  ({bookings.length})
                </span>
              </button>
            </div>
          </div>

          {/* Rail Body Content */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
            {rightRailTab === 'audits' ? (
              pendingDrivers.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                  <p className="text-sm font-semibold text-white">All Partner Audits Cleared</p>
                  <p className="text-xs text-slate-400 mt-1">
                    No pending driver applications awaiting verification.
                  </p>
                </div>
              ) : (
                pendingDrivers.map((driver, index) => (
                  <div
                    key={`dash-pending-driver-${driver.id || 'drv'}-${driver.email || index}-${index}`}
                    className="p-4 hover:bg-slate-900/40 transition-colors space-y-3"
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={driver.avatar}
                        alt={driver.name}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-lg object-cover ring-1 ring-amber-500/30 flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-white truncate">{driver.name}</span>
                          <span className="text-[11px] font-mono font-bold text-amber-400 flex-shrink-0">
                            {driver.plateNumber}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                          <span>{driver.city}</span>
                          <span className="mx-1.5 text-slate-600" aria-hidden="true">·</span>
                          <span>{driver.vehicleDetails}</span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                          ID: {driver.id} · {driver.submittedDate || 'Submitted Today'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => onInspectDriver(driver)}
                        className="flex-1 py-1.5 px-3 bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold rounded-lg border border-slate-700/80 transition-colors cursor-pointer"
                      >
                        Inspect Dossier
                      </button>
                      <button
                        onClick={() => rejectDriver(driver.id)}
                        className="py-1.5 px-3 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => approveDriver(driver.id)}
                        className="py-1.5 px-3 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        Approve
                      </button>
                    </div>
                  </div>
                ))
              )
            ) : (
              bookings.slice(0, 8).map((booking, idx) => (
                <div
                  key={`rail-booking-${booking.id}-${idx}`}
                  onClick={() => onNavigate('bookings')}
                  className="p-3.5 hover:bg-slate-900/40 transition-colors cursor-pointer space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-amber-400">{booking.id}</span>
                    <span className="font-mono tabular-nums font-bold text-white">
                      ₱{booking.fare.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-xs text-slate-200 font-medium truncate">
                    {booking.route.pickup} → {booking.route.dropoff}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="truncate">
                      {booking.passenger.name} · {booking.paymentMethod}
                    </span>
                    <span
                      className={`font-mono text-[10px] font-semibold ${
                        booking.status === 'COMPLETED'
                          ? 'text-emerald-400'
                          : booking.status === 'CANCELLED'
                          ? 'text-rose-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {booking.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Rail Footer Action */}
          <div className="p-3 border-t border-slate-800/80 bg-[#080c14] flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-mono">
              {rightRailTab === 'audits'
                ? `${drivers.length} total fleet records`
                : `${bookings.length} active dispatch logs`}
            </span>
            <button
              onClick={() => onNavigate(rightRailTab === 'audits' ? 'drivers' : 'bookings')}
              className="text-xs font-semibold text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>{rightRailTab === 'audits' ? 'Open Fleet Directory' : 'Open Dispatch Ledger'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Management Audit Trail & Activity Logs Component */}
      <ActivityLogs onNavigate={onNavigate} />
    </div>
  );
};
