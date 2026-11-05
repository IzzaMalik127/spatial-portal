import type { Quality } from '../types';

/** Render-quality presets. Pure data so it can be unit-tested without WebGL. */
export interface QualityPreset {
  /** Globe tile detail: higher = fewer/coarser tiles = more FPS. */
  maximumScreenSpaceError: number;
  /** MSAA samples (1 = off, use FXAA instead). */
  msaaSamples: number;
  /** Fraction of the base resolution to render at. */
  resolutionScale: number;
  /** true = render at the screen's native pixel density (sharpest, slowest). */
  nativeResolution: boolean;
}

export const QUALITY_PRESETS: Record<Quality, QualityPreset> = {
  low: { maximumScreenSpaceError: 4, msaaSamples: 1, resolutionScale: 0.75, nativeResolution: false },
  balanced: { maximumScreenSpaceError: 2, msaaSamples: 1, resolutionScale: 1, nativeResolution: false },
  high: { maximumScreenSpaceError: 1.25, msaaSamples: 4, resolutionScale: 1, nativeResolution: true },
};

export const getPreset = (q: Quality): QualityPreset => QUALITY_PRESETS[q];

/** Below this frame rate (FPS) the Auto mode steps quality down. */
export const LOW_FPS = 28;

/** Auto mode: returns the next lighter preset when the measured FPS is too low (never steps up). */
export function nextQuality(current: Quality, fps: number): Quality {
  if (fps >= LOW_FPS) return current;
  return current === 'high' ? 'balanced' : 'low';
}
