import { useEffect, useRef } from 'react';
import type * as Cesium from 'cesium';
import type { Quality } from '../types';
import { LOW_FPS, nextQuality } from '../utils/quality';

/**
 * Auto quality: measures real FPS in 2-second windows and steps the preset down
 * when two windows in a row are slow. It never steps back up (avoids flip-flopping).
 * The first seconds after start-up are ignored, because tiles are still loading then.
 */
export function useAdaptiveQuality(
  viewer: Cesium.Viewer | null,
  enabled: boolean,
  active: Quality,
  setActive: (q: Quality) => void,
) {
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    if (!viewer || !enabled) return;
    let frames = 0;
    let windowStart = performance.now();
    let slowWindows = 0;
    let pauseUntil = windowStart + 8000;

    const remove = viewer.scene.postRender.addEventListener(() => {
      frames++;
      const now = performance.now();
      const elapsed = now - windowStart;
      if (elapsed < 2000) return;
      const fps = (frames * 1000) / elapsed;
      const reset = () => {
        frames = 0;
        windowStart = now;
      };
      if (elapsed > 5000 || now < pauseUntil) return reset(); // tab was hidden, or still warming up
      reset();
      if (fps >= LOW_FPS) {
        slowWindows = 0;
        return;
      }
      if (++slowWindows < 2) return;
      slowWindows = 0;
      const next = nextQuality(activeRef.current, fps);
      if (next !== activeRef.current) {
        setActive(next);
        pauseUntil = now + 4000; // let the new setting settle before measuring again
      }
    });
    return () => remove();
  }, [viewer, enabled, setActive]);
}
