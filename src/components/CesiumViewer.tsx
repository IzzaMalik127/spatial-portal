import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import styles from '../styles/ui.module.css';
import { configureCamera, jumpHome } from '../utils/camera';
import { configureNetwork } from '../utils/network';

Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_TOKEN ?? '';
configureNetwork();

interface Props {
  onReady: (viewer: Cesium.Viewer | null) => void;
}

/** Owns the Cesium Viewer lifecycle: created once on mount, fully destroyed on unmount (no leaks). */
export function CesiumViewer({ onReady }: Props) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;
    const viewer = new Cesium.Viewer(container.current, {
      baseLayer: false, // layers are managed from the sidebar
      baseLayerPicker: false,
      geocoder: false, // replaced by our own autocompleting geocoder
      homeButton: false,
      navigationHelpButton: false,
      animation: false,
      timeline: false,
      fullscreenButton: false,
      infoBox: false, // replaced by the React sidebar overlay
      selectionIndicator: true,
      shouldAnimate: false,
    });
    // Cesium's default double-click makes the camera lock onto the clicked entity; we don't want that.
    viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
    viewer.scene.debugShowFramesPerSecond = import.meta.env.DEV; // FPS meter in dev
    const removeCameraListener = configureCamera(viewer);
    jumpHome(viewer); // open directly over Lahore (no fly-in from space)
    onReady(viewer);

    return () => {
      removeCameraListener();
      onReady(null);
      if (!viewer.isDestroyed()) viewer.destroy();
    };
  }, [onReady]);

  return <div ref={container} className={styles.viewer} data-testid="cesium-container" />;
}
