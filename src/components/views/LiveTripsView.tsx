import React, { useEffect, useRef, useState } from 'react';
import { MapPin, ExternalLink, Compass, Search, Loader2, Navigation } from 'lucide-react';
import { useRealtimeDb } from '../../context/RealtimeDbContext';
import { Driver, VehicleType } from '../../types';
import { fetchOsrmRoute, OsrmRouteResult } from '../../utils/osrmRouting';
import {
  queryGoogleMapsGrounding,
  getBrowserOrFallbackCoords,
  MapsGroundingResult,
} from '../../utils/mapsGroundingService';
import L from 'leaflet';

interface LiveTripsViewProps {
  onInspectDriver: (driver: Driver) => void;
  onOpenCall: (name: string, phone: string, role: string) => void;
}

export const LiveTripsView: React.FC<LiveTripsViewProps> = ({ onInspectDriver, onOpenCall }) => {
  const { drivers, bookings, triggerManualTelemetryPing, isLivePolling } = useRealtimeDb();
  const [selectedVehicleType, setSelectedVehicleType] = useState<string>('All');
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [activeOsrmRoute, setActiveOsrmRoute] = useState<{
    route: OsrmRouteResult;
    pickupName: string;
    dropoffName: string;
  } | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  // Google Maps Grounding State
  const [mapsQuery, setMapsQuery] = useState<string>(
    'Major transport terminals, drop-off bays, and landmarks near SM North EDSA and Quezon Avenue'
  );
  const [mapsResult, setMapsResult] = useState<MapsGroundingResult | null>(null);
  const [isLoadingMaps, setIsLoadingMaps] = useState<boolean>(false);
  const [mapsError, setMapsError] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const markerMetaRef = useRef<Record<string, string>>({});
  const routeLayerGroupRef = useRef<L.LayerGroup | null>(null);

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

    // Reset any stale marker references from previous mounts
    markersRef.current = {};
    markerMetaRef.current = {};

    // Manila coordinates
    const map = L.map(mapContainerRef.current, {
      center: [14.6565, 121.035],
      zoom: 13,
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

    routeLayerGroupRef.current = L.layerGroup().addTo(map);
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
      markersRef.current = {};
      markerMetaRef.current = {};
      routeLayerGroupRef.current = null;
      mapInstanceRef.current = null;
    };
  }, []);

  // Fetch & render real OSRM street-level route when a driver is selected
  useEffect(() => {
    const map = mapInstanceRef.current;
    const routeLayer = routeLayerGroupRef.current;
    if (!map || !routeLayer) return;

    try {
      routeLayer.clearLayers();
    } catch {
      return;
    }

    const targetDriver =
      selectedDriver || activeFleet.find((d) => d.status === 'ON TRIP') || activeFleet[0] || null;

    if (!targetDriver || !targetDriver.currentLocation) {
      setActiveOsrmRoute(null);
      return;
    }

    // Match driver's active or recent booking for dropoff coordinates, or use a Metro Manila hub
    const matchedBooking = bookings.find(
      (b) =>
        b.driverAssigned?.id === targetDriver.id ||
        b.driverAssigned?.plateNumber === targetDriver.plateNumber
    );

    const pickupCoords: [number, number] = targetDriver.currentLocation;
    const dropoffCoords: [number, number] = matchedBooking?.route?.dropoffCoords || [
      14.6565,
      121.0289,
    ]; // SM North EDSA hub
    const pickupName = matchedBooking?.route?.pickup || `${targetDriver.name} (Live GPS)`;
    const dropoffName = matchedBooking?.route?.dropoff || 'SM North EDSA Terminal';

    let isCancelled = false;
    setIsLoadingRoute(true);

    fetchOsrmRoute(pickupCoords, dropoffCoords).then((osrmResult) => {
      if (isCancelled || !mapInstanceRef.current || !routeLayerGroupRef.current) return;
      setIsLoadingRoute(false);
      setActiveOsrmRoute({
        route: osrmResult,
        pickupName,
        dropoffName,
      });

      try {
        routeLayerGroupRef.current.clearLayers();

        // Outer glow line
        L.polyline(osrmResult.geometry, {
          color: '#0c121e',
          weight: 8,
          opacity: 0.75,
        }).addTo(routeLayerGroupRef.current);

        // Primary OSRM street route polyline
        const routeLine = L.polyline(osrmResult.geometry, {
          color: targetDriver.vehicleType === 'Motorcycle' ? '#06B6D4' : '#F59E0B',
          weight: 4.5,
          opacity: 0.95,
        }).addTo(routeLayerGroupRef.current);

        // Destination marker pin
        const destIcon = L.divIcon({
          className: 'osrm-dest-pin',
          html: `<div style="width: 22px; height: 22px; border-radius: 50%; background: #F43F5E; border: 3px solid #0c121e; box-shadow: 0 0 10px rgba(244,63,94,0.7);"></div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });

        L.marker(dropoffCoords, { icon: destIcon })
          .bindPopup(
            `<div style="font-size:12px;color:#0c121e;"><strong>Dropoff:</strong> ${dropoffName}<br/><strong>OSRM Distance:</strong> ${osrmResult.distanceKm} km (~${osrmResult.durationMins} mins)</div>`
          )
          .addTo(routeLayerGroupRef.current);

        if (selectedDriver && mapInstanceRef.current) {
          mapInstanceRef.current.fitBounds(routeLine.getBounds(), {
            padding: [48, 48],
            maxZoom: 15,
            animate: false,
          });
        }
      } catch {
        // ignore if map unmounted during async route draw
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [selectedDriver, bookings]);

  // Update Markers dynamically as coordinates update from real-time store
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Create custom vehicle icons
    const createVehicleIcon = (vehicleType: VehicleType, status: string) => {
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
      const metaKey = `${drv.vehicleType}:${drv.status}`;
      const existingMarker = markersRef.current[drv.id];

      try {
        if (existingMarker && map.hasLayer(existingMarker)) {
          existingMarker.setLatLng([lat, lng]);
          if (markerMetaRef.current[drv.id] !== metaKey) {
            existingMarker.setIcon(createVehicleIcon(drv.vehicleType, drv.status));
            markerMetaRef.current[drv.id] = metaKey;
          }
        } else {
          if (existingMarker) {
            try {
              existingMarker.remove();
            } catch {}
          }
          const icon = createVehicleIcon(drv.vehicleType, drv.status);
          const marker = L.marker([lat, lng], { icon }).addTo(map);

          marker.on('click', () => {
            setSelectedDriver(drv);
          });

          markersRef.current[drv.id] = marker;
          markerMetaRef.current[drv.id] = metaKey;
        }
      } catch {
        // ignore transient Leaflet DOM errors
      }
    });

    // Remove markers that are no longer in fleet
    Object.keys(markersRef.current).forEach((id) => {
      if (!filteredFleet.find((d) => d.id === id)) {
        try {
          markersRef.current[id].remove();
        } catch {}
        delete markersRef.current[id];
        delete markerMetaRef.current[id];
      }
    });
  }, [filteredFleet]);

  const handleFocusDriver = (driver: Driver) => {
    setSelectedDriver(driver);
    if (mapInstanceRef.current && driver.currentLocation) {
      try {
        mapInstanceRef.current.setView(driver.currentLocation, 15, { animate: false });
      } catch {}
    }
  };

  const handleRunMapsGrounding = async (
    customPrompt?: string,
    useBrowserGeo?: boolean,
    overrideCoords?: [number, number]
  ) => {
    const promptToRun = (customPrompt ?? mapsQuery).trim();
    if (!promptToRun) return;

    setIsLoadingMaps(true);
    setMapsError(null);

    try {
      const targetDriver =
        selectedDriver || activeFleet.find((d) => d.status === 'ON TRIP') || activeFleet[0] || null;
      const defaultLat = overrideCoords?.[0] ?? targetDriver?.currentLocation?.[0] ?? 14.6565;
      const defaultLng = overrideCoords?.[1] ?? targetDriver?.currentLocation?.[1] ?? 121.035;

      const coords = useBrowserGeo
        ? await getBrowserOrFallbackCoords(defaultLat, defaultLng)
        : { latitude: defaultLat, longitude: defaultLng };

      const result = await queryGoogleMapsGrounding(
        promptToRun,
        coords.latitude,
        coords.longitude
      );
      setMapsResult(result);
      if (customPrompt) setMapsQuery(customPrompt);
    } catch (err: any) {
      setMapsError(err?.message || 'Unable to fetch Google Maps grounding data.');
    } finally {
      setIsLoadingMaps(false);
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
          <div
            className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-xl border ${
              isLivePolling
                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                : 'text-amber-400 bg-amber-500/10 border-amber-500/30'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isLivePolling ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
              }`}
            ></span>
            <span>
              {isLivePolling
                ? `${filteredFleet.length} Active Live Units`
                : 'Updates Paused (Inspection Mode)'}
            </span>
          </div>

          <button
            onClick={() => triggerManualTelemetryPing()}
            title="Refresh active driver positions across fleet"
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold rounded-xl border border-slate-700 transition-colors cursor-pointer"
          >
            Refresh Fleet
          </button>
        </div>
      </div>

      {/* Main Map & Live Telemetry Inspector Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left / Center 2-Cols: Interactive Leaflet Map */}
        <div className="lg:col-span-2 relative h-[560px] bg-[#070b13] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <div ref={mapContainerRef} className="w-full h-full z-0" />

          {/* Map Overlay HUD Card */}
          <div className="absolute top-4 left-4 z-10 bg-[#0c121e]/95 backdrop-blur-md border border-slate-800 p-3.5 rounded-2xl shadow-xl max-w-xs space-y-1.5">
            <div>
              <span className="text-xs font-black text-white block">Metro Manila Route & Traffic Radar</span>
              <span className="text-[10px] text-slate-400 font-mono">
                {isLoadingRoute
                  ? 'Calculating street route...'
                  : activeOsrmRoute
                  ? `Via ${activeOsrmRoute.route.summary}`
                  : 'EDSA • Quezon City • Diliman Corridor'}
              </span>
            </div>
            {activeOsrmRoute && (
              <div className="pt-1.5 border-t border-slate-800/80 text-[11px] font-mono flex items-center gap-2 text-amber-400">
                <span>{activeOsrmRoute.route.distanceKm} km</span>
                <span className="text-slate-600">·</span>
                <span>~{activeOsrmRoute.route.durationMins} mins</span>
                <span className="text-slate-500 truncate max-w-[130px]">
                  → {activeOsrmRoute.dropoffName}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right 1-Col: Live Telemetry HUD Feed */}
        <div className="space-y-4">
          <div className="p-4 bg-[#0c121e] border border-slate-800 rounded-2xl shadow-lg flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-300">
              Active Driver Units
            </span>
            <span className="text-[10px] font-mono text-emerald-400 font-bold">100% Signal</span>
          </div>

          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
            {filteredFleet.map((drv, index) => {
              const isSelected = selectedDriver?.id === drv.id;
              return (
                <div
                  key={`livetrip-driver-${drv.id || 'drv'}-${drv.email || index}-${index}`}
                  onClick={() => handleFocusDriver(drv)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500 shadow-xl shadow-amber-500/10'
                      : 'bg-[#0c121e] border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black text-white block">{drv.name}</span>
                      <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded">
                        {drv.plateNumber}
                      </span>
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
                      className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold rounded-lg transition-colors flex items-center justify-center cursor-pointer"
                    >
                      Inspect
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFocusDriver(drv);
                        handleRunMapsGrounding(
                          `Verified landmarks, pickup bays, gas stations, and traffic hubs near ${drv.name}'s current position in Quezon City / Metro Manila`,
                          false,
                          drv.currentLocation
                        );
                      }}
                      className="px-2.5 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                      title="Query Google Maps Grounding around this driver"
                    >
                      Maps Info
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenCall(drv.name, drv.phone, 'DRIVER');
                      }}
                      className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                      title="Direct Line"
                    >
                      Call
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Google Maps Grounding Intelligence Panel (Free Tier) */}
      <div className="p-6 bg-[#0c121e] border border-slate-800 rounded-3xl shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-white">
                  Google Maps Grounding & Landmark Verification
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  FREE TIER • googleMaps Tool
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time place verification, pickup terminals, gas stations, and emergency landmarks grounded with live Google Maps data.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                handleRunMapsGrounding(
                  'Nearest transport terminals, passenger pickup bays, and malls near current driver coordinates',
                  false
                )
              }
              disabled={isLoadingMaps}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold rounded-xl border border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              Nearby Terminals
            </button>
            <button
              type="button"
              onClick={() =>
                handleRunMapsGrounding(
                  '24/7 gas stations, vehicle repair shops, and rest stops nearby',
                  false
                )
              }
              disabled={isLoadingMaps}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold rounded-xl border border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              24/7 Gas & Repair
            </button>
            <button
              type="button"
              onClick={() =>
                handleRunMapsGrounding(
                  'Hospitals, emergency rooms, and police stations near my current location',
                  true
                )
              }
              disabled={isLoadingMaps}
              className="px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 text-[11px] font-bold rounded-xl border border-amber-500/30 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Navigation className="w-3 h-3" />
              <span>Use My GPS</span>
            </button>
          </div>
        </div>

        {/* Search Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleRunMapsGrounding();
          }}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={mapsQuery}
              onChange={(e) => setMapsQuery(e.target.value)}
              placeholder="Ask Google Maps about terminals, landmarks, hospitals, or drop-off zones..."
              className="w-full bg-[#080c14] border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
          <button
            type="submit"
            disabled={isLoadingMaps}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoadingMaps ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Grounding with Google Maps...</span>
              </>
            ) : (
              <>
                <MapPin className="w-4 h-4" />
                <span>Search Google Maps Data</span>
              </>
            )}
          </button>
        </form>

        {mapsError && (
          <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl text-xs text-red-300 font-medium">
            {mapsError}
          </div>
        )}

        {mapsResult && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-2">
            {/* Grounded Summary */}
            <div className="lg:col-span-2 p-4 bg-[#080c14] border border-slate-800/90 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 border-b border-slate-800 pb-2">
                <span className="uppercase font-bold text-amber-400">
                  Grounded Dispatch Intelligence ({mapsResult.model})
                </span>
                <span>
                  Center: {mapsResult.coordinates.latitude.toFixed(4)},{' '}
                  {mapsResult.coordinates.longitude.toFixed(4)}
                </span>
              </div>
              <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                {mapsResult.text}
              </div>
            </div>

            {/* Extracted Google Maps Grounding Links & Review Snippets */}
            <div className="p-4 bg-[#080c14] border border-slate-800/90 rounded-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  Verified Google Maps Places ({mapsResult.places.length})
                </span>
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              </div>

              {mapsResult.places.length === 0 ? (
                <p className="text-xs text-slate-400">
                  No specific map pin links returned for this query. Try searching for a specific landmark or station name.
                </p>
              ) : (
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {mapsResult.places.map((place, idx) => (
                    <div
                      key={`maps-place-${idx}`}
                      className="p-3 bg-slate-900/70 border border-slate-800 hover:border-amber-500/40 rounded-xl transition-all space-y-1.5"
                    >
                      <a
                        href={place.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between gap-2 text-xs font-bold text-amber-400 hover:text-amber-300 underline decoration-amber-500/40"
                      >
                        <span className="truncate">{place.title}</span>
                        <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                      </a>
                      {place.reviewSnippets && place.reviewSnippets.length > 0 && (
                        <div className="space-y-1 pt-1 border-t border-slate-800/70">
                          {place.reviewSnippets.map((snippet, sIdx) => (
                            <p
                              key={`snippet-${idx}-${sIdx}`}
                              className="text-[11px] text-slate-400 italic leading-snug"
                            >
                              "{snippet}"
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
