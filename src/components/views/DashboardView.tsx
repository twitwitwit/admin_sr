import React, { useState, useEffect, useRef } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  Car,
  DollarSign,
  Percent,
  ShieldAlert,
  FileCheck,
  ChevronRight,
  Activity,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Eye,
  Check,
  X,
  Layers,
  Flame,
  Navigation,
  RefreshCw,
} from 'lucide-react';
import { useRealtimeDb } from '../../context/RealtimeDbContext';
import { Driver, NavTab, VehicleType } from '../../types';
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
  } = useRealtimeDb();

  // Map layer toggle state: 'standard' vs 'heatmap'
  const [mapLayerMode, setMapLayerMode] = useState<'standard' | 'heatmap'>('standard');
  const [selectedHotspot, setSelectedHotspot] = useState<DemandHotspot | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const driverMarkersRef = useRef<Record<string, L.Marker>>({});
  const heatmapLayerGroupRef = useRef<L.LayerGroup | null>(null);

  const pendingDrivers = drivers.filter((d) => d.isPendingAudit);
  const activeOnlineDrivers = drivers.filter((d) => d.status === 'ONLINE' || d.status === 'ON TRIP');

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [14.585, 121.035],
      zoom: 12,
      zoomControl: false,
    });

    // Dark tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    heatmapLayerGroupRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
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
        const icon = createVehicleIcon(drv.vehicleType, drv.status);

        if (driverMarkersRef.current[drv.id]) {
          driverMarkersRef.current[drv.id].setLatLng([lat, lng]);
          driverMarkersRef.current[drv.id].setIcon(icon);
          if (!map.hasLayer(driverMarkersRef.current[drv.id])) {
            driverMarkersRef.current[drv.id].addTo(map);
          }
        } else {
          const marker = L.marker([lat, lng], { icon }).addTo(map);
          marker.bindPopup(`
            <div style="font-family: 'Montserrat', sans-serif; font-size: 12px; color: #fff; background: #0c121e; padding: 4px; border-radius: 8px;">
              <strong style="color: #F59E0B;">${drv.name}</strong><br/>
              <span>${drv.vehicleDetails} (${drv.plateNumber})</span><br/>
              <span style="color: #10B981; font-weight: 700;">Status: ${drv.status}</span>
            </div>
          `);
          driverMarkersRef.current[drv.id] = marker;
        }
      });
    } else {
      // In heatmap mode, hide individual driver markers to spotlight demand density
      Object.values(driverMarkersRef.current).forEach((marker) => {
        if (map.hasLayer(marker)) {
          map.removeLayer(marker);
        }
      });
    }

    // 2. Manage Demand Heat-Map Layer
    if (heatmapLayerGroupRef.current) {
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
            map.flyTo(spot.coords, 14, { duration: 1 });
          });

          outerCircle.addTo(heatmapLayerGroupRef.current!);
          innerCircle.addTo(heatmapLayerGroupRef.current!);
          labelMarker.addTo(heatmapLayerGroupRef.current!);
        });
      }
    }
  }, [mapLayerMode, activeOnlineDrivers]);

  const handleHotspotClick = (spot: DemandHotspot) => {
    setSelectedHotspot(spot);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(spot.coords, 14, { duration: 1 });
    }
  };

  return (
    <div id="dashboard-view-root" className="space-y-6 pb-12 font-['Montserrat',sans-serif]">
      {/* Top Urgent Emergency Alert Banner */}
      {activeCriticalSOSCount > 0 && (
        <div
          id="banner-emergency-alert"
          onClick={() => onNavigate('emergency')}
          className="p-4 bg-gradient-to-r from-red-600 via-red-600 to-rose-700 text-white rounded-2xl shadow-xl shadow-red-950/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:opacity-95 transition-all group border border-red-400/40"
        >
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-black/20 backdrop-blur-md">
              <AlertTriangle className="w-6 h-6 fill-white text-red-600 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black tracking-wide uppercase">
                  {activeCriticalSOSCount} ACTIVE USER EMERGENCY REQUEST(S)
                </span>
                <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
              </div>
              <p className="text-xs text-red-100 mt-0.5">
                Immediate dispatcher attention required. Click to open the live Emergency SOS Operations Desk.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-black/25 hover:bg-black/35 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-white backdrop-blur-md self-start sm:self-auto group-hover:translate-x-1 transition-transform">
            <span>Open Emergency Desk</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      )}

      {/* 6 Key Performance Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Card 1: Total Trips Today */}
        <div
          onClick={() => onNavigate('bookings')}
          className="p-4 bg-[#0c121e] border border-slate-800/80 rounded-2xl hover:border-slate-700 transition-all cursor-pointer group shadow-lg flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Total Trips</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-white">{1429 + bookings.length}</span>
            <div className="flex items-center gap-1 mt-1 text-[11px] font-bold text-emerald-400">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>+12.4% vs yesterday</span>
            </div>
          </div>
        </div>

        {/* Card 2: Active Drivers */}
        <div
          onClick={() => onNavigate('drivers')}
          className="p-4 bg-[#0c121e] border border-slate-800/80 rounded-2xl hover:border-slate-700 transition-all cursor-pointer group shadow-lg flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Active Drivers</span>
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Car className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-white">{438 + activeOnlineDrivers.length}</span>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] font-bold text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Online & En Route</span>
            </div>
          </div>
        </div>

        {/* Card 3: Gross Volume */}
        <div
          onClick={() => onNavigate('earnings')}
          className="p-4 bg-[#0c121e] border border-slate-800/80 rounded-2xl hover:border-slate-700 transition-all cursor-pointer group shadow-lg flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Gross Volume</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-white">₱245.8K</span>
            <div className="flex items-center gap-1 mt-1 text-[11px] font-bold text-emerald-400">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>+8.4% this week</span>
            </div>
          </div>
        </div>

        {/* Card 4: Platform Commission */}
        <div
          onClick={() => onNavigate('earnings')}
          className="p-4 bg-[#0c121e] border border-slate-800/80 rounded-2xl hover:border-slate-700 transition-all cursor-pointer group shadow-lg flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Commission</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-amber-400">₱36.8K</span>
            <div className="flex items-center gap-1 mt-1 text-[11px] font-bold text-slate-400">
              <span>15% Platform Take</span>
            </div>
          </div>
        </div>

        {/* Card 5: Critical SOS Alerts */}
        <div
          onClick={() => onNavigate('emergency')}
          className="p-4 bg-[#0c121e] border border-red-900/40 rounded-2xl hover:border-red-600/60 transition-all cursor-pointer group shadow-lg flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase font-bold text-red-400 tracking-wider">Critical SOS</span>
            <div className="p-1.5 rounded-lg bg-red-600/20 text-red-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-red-400">{emergencyAlerts.length}</span>
            <div className="flex items-center gap-1 mt-1 text-[11px] font-bold text-red-300">
              <span>{activeCriticalSOSCount} Urgent Dispatch</span>
            </div>
          </div>
        </div>

        {/* Card 6: Pending Driver Audits */}
        <div
          onClick={() => onNavigate('drivers')}
          className="p-4 bg-[#0c121e] border border-amber-900/40 rounded-2xl hover:border-amber-600/60 transition-all cursor-pointer group shadow-lg flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase font-bold text-amber-400 tracking-wider">Pending Audits</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-amber-400">{pendingDrivers.length}</span>
            <div className="flex items-center gap-1 mt-1 text-[11px] font-bold text-amber-400/90">
              <span>Awaiting Review</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Map Area with Layer Toggle Button */}
      <div className="bg-[#0c121e] border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        {/* Map Header & Controls */}
        <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <h3 className="text-base font-black text-white">
                Metro Manila Fleet & Demand Radar
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {mapLayerMode === 'standard'
                ? 'Displaying real-time vehicle GPS positions and active fleet assignments'
                : 'Displaying passenger demand density clusters and surge pricing multipliers'}
            </p>
          </div>

          {/* Map Layer Toggle Buttons */}
          <div className="flex items-center gap-2 bg-[#080c14] p-1 rounded-2xl border border-slate-800 self-start sm:self-auto">
            <button
              id="map-toggle-standard"
              onClick={() => setMapLayerMode('standard')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                mapLayerMode === 'standard'
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              <span>Standard View</span>
            </button>

            <button
              id="map-toggle-heatmap"
              onClick={() => setMapLayerMode('heatmap')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                mapLayerMode === 'heatmap'
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Heat-Map Hotspots</span>
            </button>
          </div>
        </div>

        {/* Map Stage */}
        <div className="relative h-96 w-full bg-[#080c14]">
          <div ref={mapContainerRef} className="h-full w-full" />

          {/* Floating Map Legend Overlay */}
          <div className="absolute top-4 left-4 z-[500] bg-[#0c121e]/90 backdrop-blur-md border border-slate-800 rounded-2xl p-3 shadow-2xl text-xs space-y-2 pointer-events-auto">
            <div className="flex items-center justify-between gap-4">
              <span className="font-bold text-white uppercase text-[10px] tracking-wider">
                {mapLayerMode === 'standard' ? 'Fleet Status Legend' : 'Demand Density Legend'}
              </span>
              <button
                onClick={triggerManualTelemetryPing}
                className="text-[10px] text-amber-400 hover:underline flex items-center gap-1 font-bold"
                title="Refresh GPS positions"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Sync</span>
              </button>
            </div>

            {mapLayerMode === 'standard' ? (
              <div className="space-y-1.5 text-[11px] text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                  <span>Online & Available ({activeOnlineDrivers.filter((d) => d.status === 'ONLINE').length})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                  <span>On Active Trip ({activeOnlineDrivers.filter((d) => d.status === 'ON TRIP').length})</span>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5 text-[11px] text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                  <span>Extreme Surge (&gt;2.0x Multiplier)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <span>High Demand (1.5x – 1.9x Surge)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-500"></span>
                  <span>Moderate Inflow (&lt;1.5x)</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Hotspot Jump Pills for Heatmap */}
          {mapLayerMode === 'heatmap' && (
            <div className="absolute bottom-4 left-4 right-16 z-[500] flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pointer-events-auto">
              {DEMAND_HOTSPOTS.map((spot) => (
                <button
                  key={spot.id}
                  onClick={() => handleHotspotClick(spot)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap border transition-all cursor-pointer ${
                    selectedHotspot?.id === spot.id
                      ? 'bg-rose-500 text-white border-rose-400 shadow-lg'
                      : 'bg-[#0c121e]/90 text-slate-300 border-slate-700 hover:border-slate-500 hover:bg-slate-900'
                  }`}
                >
                  <span>{spot.name.split(' ')[0]}</span>
                  <span className="ml-1.5 text-[10px] text-amber-400 font-black">{spot.surgeMultiplier}x</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 4 Bento Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Daily Bookings Volume Area */}
        <div className="p-6 bg-[#0c121e] border border-slate-800/80 rounded-3xl shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Daily Bookings Volume</h3>
              <p className="text-xs text-slate-400 mt-0.5">Peak hour demand curves across Metro Manila</p>
            </div>
            <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold rounded-lg">
              1,429 Total
            </span>
          </div>

          {/* SVG Line / Area Graph */}
          <div className="h-44 w-full flex items-end pt-4">
            <svg viewBox="0 0 500 150" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="yellowArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Grid Lines */}
              <line x1="0" y1="30" x2="500" y2="30" stroke="#1e293b" strokeDasharray="4" />
              <line x1="0" y1="75" x2="500" y2="75" stroke="#1e293b" strokeDasharray="4" />
              <line x1="0" y1="120" x2="500" y2="120" stroke="#1e293b" strokeDasharray="4" />

              {/* Area Fill */}
              <path
                d="M 0 130 C 50 120, 80 90, 130 60 C 180 30, 220 100, 270 45 C 320 10, 380 70, 440 30 C 470 15, 500 40, 500 150 L 0 150 Z"
                fill="url(#yellowArea)"
              />
              {/* Curve Line */}
              <path
                d="M 0 130 C 50 120, 80 90, 130 60 C 180 30, 220 100, 270 45 C 320 10, 380 70, 440 30 C 470 15, 500 40, 500 40"
                fill="none"
                stroke="#F59E0B"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              {/* Data points */}
              <circle cx="130" cy="60" r="4" fill="#F59E0B" stroke="#0c121e" strokeWidth="2" />
              <circle cx="270" cy="45" r="4" fill="#F59E0B" stroke="#0c121e" strokeWidth="2" />
              <circle cx="440" cy="30" r="5" fill="#FEF08A" stroke="#F59E0B" strokeWidth="2" className="animate-pulse" />
            </svg>
          </div>

          <div className="flex justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800 mt-2">
            <span>00:00</span>
            <span>06:00 (Morning Rush)</span>
            <span>12:00</span>
            <span>18:00 (Evening Rush)</span>
            <span>23:59</span>
          </div>
        </div>

        {/* Chart 2: Weekly Gross Revenue Bar Graph */}
        <div className="p-6 bg-[#0c121e] border border-slate-800/80 rounded-3xl shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Weekly Revenue Trends</h3>
              <p className="text-xs text-slate-400 mt-0.5">Daily gross platform GMV in Philippine Peso</p>
            </div>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
              ₱2.45M MTD
            </span>
          </div>

          {/* Bar Chart */}
          <div className="h-44 w-full flex items-end justify-between gap-3 pt-4 px-2">
            {[
              { day: 'Mon', val: 60, amount: '₱210k' },
              { day: 'Tue', val: 70, amount: '₱245k' },
              { day: 'Wed', val: 75, amount: '₱260k' },
              { day: 'Thu', val: 85, amount: '₱310k' },
              { day: 'Fri', val: 100, amount: '₱345k', peak: true },
              { day: 'Sat', val: 95, amount: '₱360k' },
              { day: 'Sun', val: 80, amount: '₱280k' },
            ].map((item) => (
              <div key={item.day} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                <span className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  {item.amount}
                </span>
                <div
                  className={`w-full rounded-t-lg transition-all duration-300 ${
                    item.peak
                      ? 'bg-gradient-to-t from-amber-600 to-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                      : 'bg-slate-800 group-hover:bg-slate-700'
                  }`}
                  style={{ height: `${item.val}%` }}
                ></div>
                <span className={`text-[11px] font-bold ${item.peak ? 'text-amber-400' : 'text-slate-500'}`}>
                  {item.day}
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800 mt-2">
            <span>Peak Demand: Friday Night (₱345,000)</span>
            <span className="text-amber-400 font-bold">15% Net Commission</span>
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Activity Live Stream & Pending Driver Audits */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Recent Activity Feed (1 col) */}
        <div className="p-6 bg-[#0c121e] border border-slate-800/80 rounded-3xl shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Live Activity Stream</h3>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="text-[10px] text-emerald-400 font-bold uppercase">Real-Time</span>
            </div>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {activityLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 bg-slate-900/50 border border-slate-800/60 rounded-xl flex items-start gap-3 text-xs text-slate-300 hover:border-slate-700 transition-colors"
              >
                <div className="p-1.5 rounded-lg bg-slate-800 text-amber-400 mt-0.5">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1">
                  <p className="leading-snug text-slate-200">{log.text}</p>
                  <span className="text-[10px] text-slate-500 mt-1 block">{log.timeAgo}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Pending Driver Partner Audits (2 cols) */}
        <div className="lg:col-span-2 p-6 bg-[#0c121e] border border-slate-800/80 rounded-3xl shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                Driver Partner Audits Requiring Action ({pendingDrivers.length})
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Review LTFRB and NBI clearances before granting road access</p>
            </div>
            <button
              onClick={() => onNavigate('drivers')}
              className="text-xs font-bold text-amber-400 hover:underline flex items-center gap-1"
            >
              <span>View All Fleet</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {pendingDrivers.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/30 rounded-2xl border border-slate-800/60">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-white">All driver applications are verified and cleared.</p>
              <p className="text-xs text-slate-400 mt-1">No pending onboarding audits in queue.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingDrivers.map((driver) => (
                <div
                  key={driver.id}
                  className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-700 transition-all"
                >
                  <div className="flex items-center gap-3.5">
                    <img
                      src={driver.avatar}
                      alt={driver.name}
                      className="w-12 h-12 rounded-xl object-cover ring-2 ring-amber-500/30"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-white">{driver.name}</span>
                        <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                          {driver.plateNumber}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        <span>{driver.vehicleDetails}</span> • <span>{driver.city}</span> •{' '}
                        <span className="text-slate-500">{driver.submittedDate || 'Today'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => onInspectDriver(driver)}
                      className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5"
                      title="Inspect Submitted Documents & Credentials"
                    >
                      <Eye className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Inspect Documents</span>
                    </button>
                    <button
                      onClick={() => rejectDriver(driver.id)}
                      className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold rounded-xl transition-colors flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                    <button
                      onClick={() => approveDriver(driver.id)}
                      className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Approve</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
