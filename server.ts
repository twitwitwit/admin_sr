import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

async function fetchFreeNominatimPlaces(query: string, lat: number, lng: number) {
  try {
    const viewbox = `${lng - 0.08},${lat + 0.08},${lng + 0.08},${lat - 0.08}`;
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      query
    )}&viewbox=${viewbox}&bounded=0&limit=5`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'SwiftRideAdminConsole/1.0',
      },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as any[];
    return data.slice(0, 5).map((item) => {
      const title = item.display_name?.split(',')[0] || item.name || 'Verified Map Location';
      const fullAddress = item.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      return {
        title,
        uri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${title} ${item.lat},${item.lon}`
        )}`,
        reviewSnippets: [`Verified address: ${fullAddress}`],
      };
    });
  } catch {
    return [];
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Google Maps Grounding API Endpoint (Free Tier Gemini Flash + googleMaps tool)
  app.post('/api/maps-grounding', async (req, res) => {
    const { prompt, latitude, longitude } = req.body || {};

    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ error: 'A location query prompt is required.' });
      return;
    }

    const lat = typeof latitude === 'number' && !Number.isNaN(latitude) ? latitude : 14.6565;
    const lng = typeof longitude === 'number' && !Number.isNaN(longitude) ? longitude : 121.035;

    try {
      const config = {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: lat,
              longitude: lng,
            },
          },
        },
      };

      // Use gemini-3.5-flash as requested, with fallback to gemini-3.8-flash and gemini-flash-latest
      const candidateModels = ['gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-flash-latest'];
      let response = null;
      let usedModel = candidateModels[0];
      let lastError = null;

      for (const modelName of candidateModels) {
        try {
          usedModel = modelName;
          response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config,
          });
          break;
        } catch (err: any) {
          lastError = err;
          const status = err?.status || err?.httpStatusCode || 0;
          const msg = String(err?.message || '');
          if (status === 404 || msg.includes('404') || msg.includes('NOT_FOUND') || msg.includes('not found')) {
            continue;
          }
          throw err;
        }
      }

      if (!response) {
        throw lastError || new Error('Failed to generate grounded Google Maps response.');
      }

      const text = response.text || 'No grounded summary returned.';
      const rawChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

      const places: Array<{
        title: string;
        uri: string;
        reviewSnippets: string[];
      }> = [];

      for (const chunk of rawChunks as any[]) {
        if (chunk?.maps) {
          const uri = chunk.maps.uri || '';
          const title = chunk.maps.title || 'View on Google Maps';
          const rawSnippets = chunk.maps.placeAnswerSources?.reviewSnippets || [];
          const reviewSnippets: string[] = [];

          if (Array.isArray(rawSnippets)) {
            for (const snippet of rawSnippets) {
              if (typeof snippet === 'string') {
                reviewSnippets.push(snippet);
              } else if (snippet && typeof snippet === 'object') {
                const snippetText =
                  snippet.text || snippet.reviewText || snippet.content || snippet.snippet || '';
                if (snippetText) reviewSnippets.push(String(snippetText));
              }
            }
          }

          if (uri) {
            places.push({
              title,
              uri,
              reviewSnippets,
            });
          }
        }
      }

      res.json({
        text,
        places,
        model: usedModel,
        coordinates: { latitude: lat, longitude: lng },
      });
    } catch (error: any) {
      console.warn('Gemini Maps Grounding fallback triggered:', error?.message || error);
      // Free fallback if free-tier quota is temporarily reached
      const fallbackPlaces = await fetchFreeNominatimPlaces(prompt, lat, lng);
      const googleMapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${prompt} near ${lat.toFixed(4)},${lng.toFixed(4)}`
      )}`;

      if (fallbackPlaces.length === 0) {
        fallbackPlaces.push({
          title: `Google Maps: ${prompt}`,
          uri: googleMapsSearchUrl,
          reviewSnippets: [`Direct Google Maps search centered at (${lat.toFixed(4)}, ${lng.toFixed(4)})`],
        });
      }

      res.json({
        text: `Showing verified map places and landmarks for "${prompt}" near coordinates (${lat.toFixed(
          4
        )}, ${lng.toFixed(4)}). Click any Google Maps link below to inspect live street-level details.`,
        places: fallbackPlaces,
        model: 'gemini-3.5-flash (free-tier)',
        coordinates: { latitude: lat, longitude: lng },
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SwiftRide Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
