const M_PER_DEG = 111_320;

/**
 * Turns a place's bounding box into a camera view that shows the WHOLE area.
 * Small places get a tilted close-up; big areas get a straight-down map view.
 * Pure function (no Cesium) so it can be unit-tested.
 */
export function boundsToView(south: number, north: number, west: number, east: number) {
  const lat = (south + north) / 2;
  const lon = (west + east) / 2;
  const dLat = (north - south) * M_PER_DEG;
  const dLon = (east - west) * M_PER_DEG * Math.cos((lat * Math.PI) / 180);
  const radius = Math.hypot(dLat, dLon) / 2;
  const range = Math.min(3_000_000, Math.max(1500, radius * 2.4));
  return { lon, lat, range, pitchDeg: range > 20_000 ? -90 : -45 };
}
