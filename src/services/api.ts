import type { AssetCollection, GeocodeResult } from '../types';

const BASE = import.meta.env.VITE_API_BASE_URL ?? '/data';

export class ApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(url: string, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { signal });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    throw new ApiError('Network error: could not reach the server');
  }
  if (!res.ok) throw new ApiError(`Request failed (${res.status})`, res.status);
  return (await res.json()) as T;
}

// ---- Caching: identical requests share one promise; failures are evicted so retry works.
const cache = new Map<string, Promise<unknown>>();

export function cachedGet<T>(path: string): Promise<T> {
  if (!cache.has(path)) {
    const p = request<T>(`${BASE}${path}`).catch((e) => {
      cache.delete(path);
      throw e;
    });
    cache.set(path, p);
  }
  return cache.get(path) as Promise<T>;
}

export const clearApiCache = () => cache.clear();

/** Spatial asset feed (GeoJSON FeatureCollection). Point VITE_API_BASE_URL at your backend. */
export const fetchAssets = () => cachedGet<AssetCollection>('/assets.geojson');

/** CZML time-dynamic feed (array of CZML packets, first packet is the document header). */
export const fetchCzml = () => cachedGet<unknown[]>('/vehicles.czml');

// ---- Geocoding (OpenStreetMap Nominatim) for real-time autocompletion.
interface NominatimHit { place_id: number; display_name: string; lat: string; lon: string; boundingbox?: string[] }
const geoCache = new Map<string, GeocodeResult[]>();

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<GeocodeResult[]> {
  const key = query.trim().toLowerCase();
  const hit = geoCache.get(key);
  if (hit) return hit;
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(key)}`;
  const data = await request<NominatimHit[]>(url, signal);
  const results = data.map((d) => ({
    id: d.place_id,
    label: d.display_name,
    lat: Number(d.lat),
    lon: Number(d.lon),
    bbox:
      d.boundingbox?.length === 4
        ? (d.boundingbox.map(Number) as [number, number, number, number])
        : undefined,
  }));
  geoCache.set(key, results);
  return results;
}
