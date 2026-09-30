export interface MapsGroundedPlace {
  title: string;
  uri: string;
  reviewSnippets: string[];
}

export interface MapsGroundingResult {
  text: string;
  places: MapsGroundedPlace[];
  model: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

/**
 * Helper to get browser geolocation if available, otherwise falls back to provided default coords.
 */
export async function getBrowserOrFallbackCoords(
  fallbackLat = 14.6565,
  fallbackLng = 121.035
): Promise<{ latitude: number; longitude: number }> {
  if (typeof window === 'undefined' || !('geolocation' in navigator)) {
    return { latitude: fallbackLat, longitude: fallbackLng };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      () => {
        resolve({ latitude: fallbackLat, longitude: fallbackLng });
      },
      { timeout: 3500, maximumAge: 60000 }
    );
  });
}

/**
 * Queries the backend /api/maps-grounding route powered by Gemini 3.5 Flash with the googleMaps tool.
 */
export async function queryGoogleMapsGrounding(
  prompt: string,
  latitude?: number,
  longitude?: number
): Promise<MapsGroundingResult> {
  const response = await fetch('/api/maps-grounding', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      latitude,
      longitude,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to query Google Maps grounding.');
  }

  return data as MapsGroundingResult;
}
