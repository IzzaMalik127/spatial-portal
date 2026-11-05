const DEG = Math.PI / 180;

/** Below this camera height (m) you may tilt almost to the horizon. */
export const NEAR_HEIGHT = 100_000;
/** Above this camera height (m) the camera must look straight down at the globe. */
export const FAR_HEIGHT = 2_000_000;

/**
 * Highest allowed camera pitch (radians; -90° = straight down) for a given height.
 * Close to the ground: -10° (nearly horizontal). Far out: -90°, so the globe always stays centred.
 * Pure function so it can be unit-tested without WebGL.
 */
export function maxPitch(height: number): number {
  const t = Math.min(1, Math.max(0, (height - NEAR_HEIGHT) / (FAR_HEIGHT - NEAR_HEIGHT)));
  return (-10 + (-90 + 10) * t) * DEG;
}
