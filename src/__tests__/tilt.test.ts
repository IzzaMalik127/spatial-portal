import { FAR_HEIGHT, NEAR_HEIGHT, maxPitch } from '../utils/tilt';

const deg = (r: number) => (r * 180) / Math.PI;

describe('maxPitch (tilt limit by camera height)', () => {
  it('allows near-horizontal tilt close to the ground', () => {
    expect(deg(maxPitch(500))).toBeCloseTo(-10);
    expect(deg(maxPitch(NEAR_HEIGHT))).toBeCloseTo(-10);
  });
  it('forces a straight-down view far from the globe', () => {
    expect(deg(maxPitch(FAR_HEIGHT))).toBeCloseTo(-90);
    expect(deg(maxPitch(3e7))).toBeCloseTo(-90);
  });
  it('tightens smoothly as the camera rises', () => {
    const mid = deg(maxPitch((NEAR_HEIGHT + FAR_HEIGHT) / 2));
    expect(mid).toBeLessThan(-10);
    expect(mid).toBeGreaterThan(-90);
    expect(maxPitch(1e6)).toBeLessThan(maxPitch(2e5));
  });
});
