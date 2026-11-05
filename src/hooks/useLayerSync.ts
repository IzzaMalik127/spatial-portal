import { useEffect, useRef, type Dispatch } from 'react';
import type * as Cesium from 'cesium';
import type { Action } from '../store/appStore';
import type { LayerId, LayerState } from '../types';
import { addLayerWithRetry, removeLayer, type LayerResource } from '../utils/layers';

/**
 * Keeps Cesium layers in sync with React state. Toggling a layer only adds/removes
 * that one resource: the viewer is never re-created and the canvas never re-mounts.
 */
export function useLayerSync(viewer: Cesium.Viewer | null, layers: LayerState[], dispatch: Dispatch<Action>) {
  const live = useRef(new Map<LayerId, LayerResource>());
  const pending = useRef(new Set<LayerId>());
  const latest = useRef(layers);
  latest.current = layers;

  // New viewer instance -> forget handles that belonged to the old one.
  useEffect(
    () => () => {
      live.current.clear();
      pending.current.clear();
    },
    [viewer],
  );

  const signature = layers.map((l) => `${l.id}:${l.enabled}`).join('|');

  useEffect(() => {
    if (!viewer) return;
    for (const layer of layers) {
      const present = live.current.has(layer.id);
      if (layer.enabled && !present && !pending.current.has(layer.id)) {
        const id = layer.id;
        pending.current.add(id);
        dispatch({ type: 'layerStatus', id, status: 'loading' });
        const wanted = () => !!latest.current.find((l) => l.id === id)?.enabled;
        addLayerWithRetry(viewer, id, wanted)
          .then((res) => {
            if (viewer.isDestroyed()) return;
            const stillOn = latest.current.find((l) => l.id === id)?.enabled;
            if (!stillOn) return removeLayer(viewer, id, res); // toggled off while loading
            live.current.set(id, res);
            dispatch({ type: 'layerStatus', id, status: 'ready' });
          })
          .catch((err: Error) => {
            // Ignore failures of a layer that was unticked meanwhile (no stale error under an unticked box).
            if (!viewer.isDestroyed() && wanted()) dispatch({ type: 'layerStatus', id, status: 'error', error: err.message });
          })
          .finally(() => {
            if (!viewer.isDestroyed()) pending.current.delete(id);
          });
      } else if (!layer.enabled && present) {
        removeLayer(viewer, layer.id, live.current.get(layer.id)!);
        live.current.delete(layer.id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewer, signature]);

  // Opacity sliders: update live imagery layers in place (no re-creation).
  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return;
    for (const l of layers) {
      const res = live.current.get(l.id);
      if (res && l.opacity !== undefined && 'alpha' in res) (res as Cesium.ImageryLayer).alpha = l.opacity;
    }
  }, [viewer, layers]);

  // Layers with `visibleAboveM` / `visibleBelowM` only draw inside a camera-height range
  // (coarse overview data when zoomed out, street-level data when zoomed in).
  const syncVisibility = () => {
    if (!viewer || viewer.isDestroyed()) return;
    const height = viewer.camera.positionCartographic.height;
    for (const l of latest.current) {
      const res = live.current.get(l.id);
      if (res && (l.visibleAboveM !== undefined || l.visibleBelowM !== undefined) && 'show' in res) {
        (res as Cesium.ImageryLayer).show =
          height >= (l.visibleAboveM ?? 0) && height <= (l.visibleBelowM ?? Number.POSITIVE_INFINITY);
      }
    }
  };
  useEffect(syncVisibility, [viewer, layers]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!viewer) return;
    const remove = viewer.camera.changed.addEventListener(syncVisibility);
    return () => remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewer]);
}
