/** Build-time configuration and device checks. Pure (no Cesium), so components and tests can import it freely. */

/** True when a Cesium ion token was provided in .env (enables terrain and 3D buildings). */
export const HAS_ION_TOKEN = Boolean(import.meta.env.VITE_CESIUM_ION_TOKEN);
/** True when a Mapbox token was provided in .env (enables the 2D mini-map). */
export const HAS_MAPBOX_TOKEN = Boolean(import.meta.env.VITE_MAPBOX_TOKEN);

const matches = (query: string) => typeof window !== 'undefined' && window.matchMedia?.(query).matches === true;

/** Phone-sized screen. */
export const isSmallScreen = () => matches('(max-width: 768px)');
/** Primary input is touch (phones and tablets; a laptop with an optional touch screen does not count). */
export const isTouchDevice = () => matches('(pointer: coarse)');

export interface DeviceInfo {
  smallScreen: boolean;
  touch: boolean;
  /** navigator.deviceMemory (GB, Chrome only). */
  memoryGb?: number;
  cores?: number;
}

export function getDeviceInfo(): DeviceInfo {
  const nav = typeof navigator === 'undefined' ? undefined : (navigator as Navigator & { deviceMemory?: number });
  return {
    smallScreen: isSmallScreen(),
    touch: isTouchDevice(),
    memoryGb: nav?.deviceMemory,
    cores: nav?.hardwareConcurrency,
  };
}
