import { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import styles from '../styles/ui.module.css';
import { flyToLocation } from '../utils/camera';

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

/**
 * 2D Mapbox GL JS overview synced to the 3D camera.
 *  - Cesium camera moves  -> mini-map recentres (throttled)
 *  - Click on mini-map    -> Cesium flies there
 * Mapbox is lazy-loaded so it never slows the initial 3D start-up.
 */
export function MiniMap({ viewer }: { viewer: Cesium.Viewer | null }) {
  const box = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!viewer || !TOKEN || !box.current) return;
    let disposed = false;
    let cleanup = () => {};

    import('mapbox-gl').then(async (mod) => {
      await import('mapbox-gl/dist/mapbox-gl.css');
      if (disposed || !box.current) return;
      const mapboxgl = mod.default;
      mapboxgl.accessToken = TOKEN;
      try {
        const map = new mapboxgl.Map({
          container: box.current,
          style: 'mapbox://styles/mapbox/dark-v11',
          center: [74.3142, 31.5889],
          zoom: 11,
          attributionControl: false,
        });
        const marker = new mapboxgl.Marker({ color: '#38bdf8' }).setLngLat([74.3142, 31.5889]).addTo(map);

        // Cesium -> Mapbox: project the screen centre onto the globe.
        let last = 0;
        const sync = () => {
          const now = performance.now();
          if (now - last < 200) return; // throttle
          last = now;
          const canvas = viewer.scene.canvas;
          const centre = new Cesium.Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);
          const hit = viewer.camera.pickEllipsoid(centre, viewer.scene.globe.ellipsoid);
          if (!hit) return;
          const c = Cesium.Cartographic.fromCartesian(hit);
          const lngLat: [number, number] = [Cesium.Math.toDegrees(c.longitude), Cesium.Math.toDegrees(c.latitude)];
          map.setCenter(lngLat);
          marker.setLngLat(lngLat);
        };
        const removeListener = viewer.camera.changed.addEventListener(sync);

        // Mapbox -> Cesium
        map.on('click', (e) => flyToLocation(viewer, e.lngLat.lng, e.lngLat.lat, 2500, 2));

        cleanup = () => {
          removeListener();
          map.remove(); // free WebGL context
        };
      } catch (err) {
        setError((err as Error).message);
      }
    }).catch((err: Error) => setError(err.message));

    return () => {
      disposed = true;
      cleanup();
    };
  }, [viewer]);

  return (
    <section className={styles.panel} aria-label="2D overview map">
      <h2 className={styles.h2}>2D overview (Mapbox)</h2>
      {!TOKEN ? (
        <p className={styles.muted}>Add VITE_MAPBOX_TOKEN to your .env file to enable this mini-map.</p>
      ) : (
        <div ref={box} className={styles.miniMap} data-testid="mini-map" />
      )}
      {error && <p role="alert" className={styles.error}>{error}</p>}
    </section>
  );
}
