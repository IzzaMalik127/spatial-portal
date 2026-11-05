import { boundsToView } from '../utils/geo';

describe('boundsToView', () => {
  it('shows a whole city (Karachi-sized box) from a straight-down map view', () => {
    const v = boundsToView(24.7, 25.2, 66.8, 67.5);
    expect(v.range).toBeGreaterThan(20_000);
    expect(v.range).toBeLessThan(200_000);
    expect(v.pitchDeg).toBe(-90);
    expect(v.lat).toBeCloseTo(24.95);
  });
  it('keeps a tilted close-up for a tiny place and never goes closer than 1.5 km', () => {
    const v = boundsToView(31.588, 31.589, 74.314, 74.315);
    expect(v.range).toBe(1500);
    expect(v.pitchDeg).toBe(-45);
  });
  it('caps the height for very large areas', () => {
    expect(boundsToView(-60, 80, -180, 180).range).toBe(3_000_000);
  });
});
