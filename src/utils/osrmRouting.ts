/**
 * OSRM (Open Source Routing Machine) Routing Utility for Leaflet Maps
 * Uses the public OSRM HTTP API (https://router.project-osrm.org)
 * Note: OSRM expects coordinates in [longitude, latitude] order in the URL,
 * while Leaflet uses [latitude, longitude].
 */

export interface OsrmRouteResult {
  distanceKm: number;
  durationMins: number;
  geometry: [number, number][]; // Array of [lat, lng] pairs ready for Leaflet L.polyline()
  summary: string;
}

/**
 * Fetches real street-level routing geometry, road distance (km), and duration (mins)
 * between two [lat, lng] coordinates using OSRM.
 */
export async function fetchOsrmRoute(
  pickupCoords: [number, number],
  dropoffCoords: [number, number]
): Promise<OsrmRouteResult> {
  const [lat1, lng1] = pickupCoords;
  const [lat2, lng2] = dropoffCoords;

  const url = `https://router.project-osrm.org/route/v1/driving/${lng1},${lat1};${lng2},${lat2}?overview=full&geometries=geojson`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`OSRM HTTP error ${response.status}`);
    }

    const data = await response.json();
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      throw new Error('No OSRM route found');
    }

    const route = data.routes[0];
    // Convert GeoJSON [lng, lat] coordinates to Leaflet [lat, lng]
    const geometry: [number, number][] = route.geometry.coordinates.map(
      (coord: [number, number]) => [coord[1], coord[0]]
    );

    const distanceKm = Number((route.distance / 1000).toFixed(1));
    const durationMins = Math.max(1, Math.round(route.duration / 60));
    const summary = route.legs?.[0]?.summary || 'Metro Manila Road Network';

    return {
      distanceKm,
      durationMins,
      geometry,
      summary,
    };
  } catch {
    // Fallback Haversine road approximation if offline or rate-limited
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    const straightKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = Number(Math.max(1, straightKm * 1.3).toFixed(1));
    const durationMins = Math.max(5, Math.round(distanceKm * 2.5));

    return {
      distanceKm,
      durationMins,
      geometry: [pickupCoords, dropoffCoords],
      summary: 'Direct Corridor Fallback',
    };
  }
}
