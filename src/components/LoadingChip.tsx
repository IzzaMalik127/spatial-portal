import { useEffect, useState } from 'react';
import type * as Cesium from 'cesium';
import styles from '../styles/ui.module.css';

/** Small "Loading map detail…" badge while the globe is still downloading sharper map tiles. */
export function LoadingChip({ viewer }: { viewer: Cesium.Viewer | null }) {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!viewer) return;
    // The event reports how many tiles are still waiting to load.
    const remove = viewer.scene.globe.tileLoadProgressEvent.addEventListener((remaining: number) => {
      setBusy(remaining > 0);
    });
    return () => remove();
  }, [viewer]);

  if (!busy) return null;
  return (
    <div className={styles.loadingChip} role="status">
      Loading map detail…
    </div>
  );
}
