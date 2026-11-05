export type LayerId = 'satellite' | 'osm' | 'wms' | 'terrain' | 'tileset' | 'assets' | 'czml';
export type Quality = 'low' | 'balanced' | 'high';
export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface LayerState {
  id: LayerId;
  label: string;
  description: string;
  enabled: boolean;
  /** 0-1 opacity for imagery layers (undefined = not an imagery layer). */
  opacity?: number;
  /** Imagery layer is only drawn while the camera is higher than this (metres). */
  visibleAboveM?: number;
  /** Imagery layer is only drawn while the camera is lower than this (metres). */
  visibleBelowM?: number;
  status: LoadStatus;
  error?: string;
}

/** Minimal GeoJSON typing for the REST layer. */
export interface AssetFeature {
  type: 'Feature';
  geometry: { type: string; coordinates: unknown };
  properties: Record<string, unknown>;
}
export interface AssetCollection {
  type: 'FeatureCollection';
  features: AssetFeature[];
}

export interface SelectedAsset {
  id: string;
  name: string;
  source: 'entity' | 'tileset';
  properties: Record<string, unknown>;
  /** Time taken by scene.pick() + parsing, in ms (acceptance target: < 150). */
  pickMs: number;
}

export interface GeocodeResult {
  id: number;
  label: string;
  lat: number;
  lon: number;
  /** [south, north, west, east] in degrees, when the geocoder knows the area's extent. */
  bbox?: [number, number, number, number];
}
