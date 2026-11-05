import { useEffect, type Dispatch } from 'react';
import * as Cesium from 'cesium';
import type { Action } from '../store/appStore';
import { findEntity, parsePicked } from '../utils/picking';

const HOVER_COLOR = Cesium.Color.YELLOW.withAlpha(0.9);
const SELECT_COLOR = Cesium.Color.LIME.withAlpha(0.9);

/** Remembers a tile feature's original colour so highlights can be undone. */
class FeatureHighlight {
  private feature?: Cesium.Cesium3DTileFeature;
  private original = new Cesium.Color();
  set(feature: Cesium.Cesium3DTileFeature | undefined, color: Cesium.Color) {
    if (feature === this.feature) return;
    this.clear();
    if (!feature) return;
    this.feature = feature;
    Cesium.Color.clone(feature.color, this.original);
    feature.color = color;
  }
  clear() {
    if (this.feature && !this.feature.tileset.isDestroyed()) this.feature.color = this.original;
    this.feature = undefined;
  }
}

/**
 * ScreenSpaceEventHandler wiring for the scene.pick() raycasting pipeline.
 *  - LEFT_CLICK: select (sidebar overlay + highlight)
 *  - MOUSE_MOVE: hover (cursor, name chip, 3D-building highlight), throttled to ~16 picks/s
 */
export function useAssetPicking(viewer: Cesium.Viewer | null, dispatch: Dispatch<Action>) {
  useEffect(() => {
    if (!viewer) return;
    const canvas = viewer.scene.canvas;
    const handler = new Cesium.ScreenSpaceEventHandler(canvas);
    const hoverFx = new FeatureHighlight();
    const selectFx = new FeatureHighlight();
    let lastMove = 0;

    handler.setInputAction((e: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
      const t0 = performance.now();
      const picked = viewer.scene.pick(e.position);
      const asset = parsePicked(viewer, picked, t0);
      hoverFx.clear();
      selectFx.set(picked instanceof Cesium.Cesium3DTileFeature ? picked : undefined, SELECT_COLOR);
      viewer.selectedEntity = asset?.source === 'entity' ? findEntity(viewer, e.position) : undefined;
      dispatch({ type: 'select', asset });
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    handler.setInputAction((e: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
      const now = performance.now();
      if (now - lastMove < 60) return;
      lastMove = now;
      const picked = viewer.scene.pick(e.endPosition);
      const asset = parsePicked(viewer, picked, now);
      const isFeature = picked instanceof Cesium.Cesium3DTileFeature;
      hoverFx.set(isFeature ? picked : undefined, HOVER_COLOR);
      canvas.style.cursor = asset ? 'pointer' : 'default';
      dispatch({ type: 'hover', name: asset?.name ?? null });
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    return () => {
      handler.destroy(); // no leaked listeners
      hoverFx.clear();
      selectFx.clear();
    };
  }, [viewer, dispatch]);
}
