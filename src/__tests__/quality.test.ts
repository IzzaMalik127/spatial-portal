import { LOW_FPS, QUALITY_PRESETS, getPreset, nextQuality } from '../utils/quality';

describe('quality presets', () => {
  it('trades detail for speed: low is coarser than high', () => {
    expect(getPreset('low').maximumScreenSpaceError).toBeGreaterThan(getPreset('high').maximumScreenSpaceError);
    expect(getPreset('low').resolutionScale).toBeLessThan(getPreset('high').resolutionScale);
  });
  it('only the high preset renders at native screen resolution', () => {
    expect(getPreset('high').nativeResolution).toBe(true);
    expect(getPreset('balanced').nativeResolution).toBe(false);
    expect(getPreset('low').nativeResolution).toBe(false);
  });
  it('auto mode steps down when FPS is low and never steps up', () => {
    expect(nextQuality('high', LOW_FPS - 1)).toBe('balanced');
    expect(nextQuality('balanced', LOW_FPS - 1)).toBe('low');
    expect(nextQuality('low', 5)).toBe('low');
    expect(nextQuality('balanced', 60)).toBe('balanced');
    expect(nextQuality('low', 60)).toBe('low');
  });
  it('defines every level with valid values', () => {
    for (const p of Object.values(QUALITY_PRESETS)) {
      expect(p.msaaSamples).toBeGreaterThanOrEqual(1);
      expect(p.resolutionScale).toBeGreaterThan(0);
    }
  });
});
