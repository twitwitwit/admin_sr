import React, { useEffect, useRef, useState } from 'react';
import {
  Compass,
  Radio,
  Car,
  Navigation,
  RefreshCw,
  Eye,
  Phone,
  Layers,
  MapPin,
  Maximize2,
} from 'lucide-react';
import { useRealtimeDb } from '../../context/RealtimeDbContext';
import { Driver, VehicleType } from '../../types';
import L from 'leaflet';

interface LiveTripsViewProps {
  onInspectDriver: (driver: Driver) => void;
  onOpenCall: (name: string, phone: string, role: string) => void;
}

export const LiveTripsView: React.FC<LiveTripsViewProps> = ({ onInspectDriver, onOpenCall }) => {
  const { drivers, triggerManualTelemetryPing } = useRealtimeDb();
  const [selectedVehicleType, setSelectedVehicleType] = useState<string>('All');
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});

  const activeFleet = drivers.filter(
    (d) => !d.isPendingAudit && (d.status === 'ONLINE' || d.status === 'ON TRIP')
  );

  const filteredFleet = activeFleet.filter((d) => {
    if (selectedVehicleType === 'All') return true;
    return d.vehicleType === selectedVehicleType;
  });

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Manila coordinates
    const map = L.map(mapContainerRef.current, {
      center: [14.6565, 121.035],
      zoom: 13,
      zoomControl: false,
    });

    // Dark sleek tile layer (CartoDB Dark Matter)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Markers dynamically as coordinates update from real-time store
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Create custom vehicle icons
    const createVehicleIcon = (vehicleType: VehicleType, status: string, heading: number = 0) => {
      const isTrip = status === 'ON TRIP';
      const color = isTrip ? '#F59E0B' : '#10B981';
      const iconSvg =
        vehicleType === 'Motorcycle'
          ? `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5L9 11l3-4h3l2 4.5"/><path d="M9 11h4.5"/></svg>`
          : `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 11.1 2 11.5 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>`;

      return L.divIcon({
        className: 'custom-vehicle-marker',
        html: `
          <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; inset: 0; border-radius: 50%; background: ${color}; opacity: 0.25;" class="animate-ping"></div>
            <div style="position: relative; width: 32px; height: 32px; border-radius: 50%; background: #0c121e; border: 2px solid ${color}; display: flex; align-items: center; justify-content: center; color: ${color}; box-shadow: 0 0 12px ${color}88;">
              ${iconSvg}
            </div>
            <div style="position: absolute; -top: 4px; -right: 4px; width: 10px; height: 10px; border-radius: 50%; background: ${color}; border: 2px solid #0c121e;"></div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });
    };

    filteredFleet.forEach((drv) => {
      if (!drv.currentLocation) return;

      const [lat, lng] = drv.currentLocation;
      const icon = createVehicleIcon(drv.vehicleType, drv.status, drv.heading || 0);

      if (markersRef.current[drv.id]) {
        // Move marker
        markersRef.current[drv.id].setLatLng([lat, lng]);
        markersRef.current[drv.id].setIcon(icon);
      } else {
        // Create marker
        const marker = L.marker([lat, lng], { icon }).addTo(map);

        marker.on('click', () => {
          setSelectedDriver(drv);
        });

        markersRef.current[drv.id] = marker;
      }
    });

    // Remove markers that are no longer in fleet
    Object.keys(markersRef.current).forEach((id) => {
      if (!filteredFleet.find((d) => d.id === id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });
  }, [filteredFleet]);

  const handleFocusDriver = (driver: Driver) => {
    setSelectedDriver(driver);
    if (mapInstanceRef.current && driver.currentLocation) {
      mapInstanceRef.current.flyTo(driver.currentLocation, 15, { duration: 1.2 });
    }
  };

  return (
    <div id="live-trips-view-root" className="space-y-6 pb-12">
      {/* Control Bar: Vehicle Filters & Refresh Ping */}
      <div className="p-4 bg-[#0c121e] border border-slate-800 rounded-2xl shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {['All', 'Sedan', 'Motorcycle', 'SUV'].map((vt) => (
            <button
              key={vt}
              onClick={() => setSelectedVehicleType(vt)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedVehicleType === vt
                  ? 'bg-amber-500 text-black font-extrabold shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span>{vt}</span>
              <span className="ml-1.5 opacity-80 text-[10px]">
                ({vt === 'All' ? activeFleet.length : activeFleet.filter((d) => d.vehicleType === vt).length})
              </span>
            </button>
          ))}
        </div>

        {/* Telemetry Status and Radar Pulse Trigger */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>{filteredFleet.length} Active Radar Pings</span>
          </div>

          <button
            onClick={() => triggerManualTelemetryPing()}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold rounded-xl flex items-center gap-1.5 border border-slate-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Ping Fleet</span>
          </button>
        </div>
      </div>

      {/* Main Map & Live Telemetry Inspector Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left / Center 2-Cols: Interactive Leaflet Map */}
        <div className="lg:col-span-2 relative h-[560px] bg-[#070b13] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <div ref={mapContainerRef} className="w-full h-full z-0" />

          {/* Map Overlay HUD Card */}
          <div className="absolute top-4 left-4 z-10 bg-[#0c121e]/90 backdrop-blur-md border border-slate-800 p-3.5 rounded-2xl shadow-xl flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Navigation className="w-4 h-4 animate-spin" />
            </div>
            <div>
              <span className="text-xs font-black text-white block">Metro Manila Telemetry Radar</span>
              <span className="text-[10px] text-slate-400 font-mono">EDSA • Quezon City • Diliman Corridor</span>
            </div>
          </div>
        </div>

        {/* Right 1-Col: Live Telemetry HUD Feed */}
        <div className="space-y-4">
          <div className="p-4 bg-[#0c121e] border border-slate-800 rounded-2xl shadow-lg flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Radio className="w-4 h-4 text-amber-400" />
              <span>Telemetry Transponders</span>
            </span>
            <span className="text-[10px] font-mono text-emerald-400 font-bold">100% Signal</span>
          </div>

          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
            {filteredFleet.map((drv) => {
              const isSelected = selectedDriver?.id === drv.id;
              return (
                <div
                  key={drv.id}
                  onClick={() => handleFocusDriver(drv)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500 shadow-xl shadow-amber-500/10'
                      : 'bg-[#0c121e] border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={drv.avatar}
                        alt={drv.name}
                        className="w-10 h-10 rounded-xl object-cover ring-1 ring-amber-500/30"
                      />
                      <div>
                        <span className="text-xs font-black text-white block">{drv.name}</span>
                        <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded">
                          {drv.plateNumber}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase ${
                        drv.status === 'ON TRIP'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {drv.status}
                    </span>
                  </div>

                  {/* Telemetry metrics */}
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-800/80 text-[11px]">
                    <div className="flex flex-col">
                      <span className="text-slate-500 text-[9px] uppercase font-bold">Current Speed</span>
                      <span className="font-mono font-black text-white text-xs mt-0.5">
                        {drv.speedKmh || 35} km/h
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-slate-500 text-[9px] uppercase font-bold">Heading</span>
                      <span className="font-mono font-black text-amber-400 text-xs mt-0.5">
                        {drv.heading || 90}° Bearing
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onInspectDriver(drv);
                      }}
                      className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1"
                    >
                      <Eye className="w-3 h-3 text-cyan-400" />
                      <span>Inspect</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenCall(drv.name, drv.phone, 'DRIVER');
                      }}
                      className="px-2.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-[11px] font-bold transition-colors"
                      title="Direct Line"
                    >
                      <Phone className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
