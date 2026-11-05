import { useCallback, useEffect, useState } from 'react';
import type * as Cesium from 'cesium';
import { AppProvider, useApp } from './store/appStore';
import { CesiumViewer } from './components/CesiumViewer';
import { LayerPanel } from './components/LayerPanel';
import { GeocoderSearch } from './components/GeocoderSearch';
import { Legend } from './components/Legend';
import { LoadingChip } from './components/LoadingChip';
import { AssetInfoPanel } from './components/AssetInfoPanel';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useLayerSync } from './hooks/useLayerSync';
import { useAdaptiveQuality } from './hooks/useAdaptiveQuality';
import { useAssetPicking } from './hooks/useAssetPicking';
import { MiniMap } from './components/MiniMap';
import { applyQuality, flyHome } from './utils/camera';
import type { Quality } from './types';
import styles from './styles/ui.module.css';

function Portal() {
  const { state, dispatch } = useApp();
  const [viewer, setViewer] = useState<Cesium.Viewer | null>(null);
  const [mode, setMode] = useState<'auto' | Quality>('auto');
  const [active, setActive] = useState<Quality>('balanced');
  const onMode = (m: 'auto' | Quality) => {
    setMode(m);
    setActive(m === 'auto' ? 'balanced' : m);
  };
  useEffect(() => {
    if (viewer) applyQuality(viewer, active);
  }, [viewer, active]);
  const onReady = useCallback((v: Cesium.Viewer | null) => setViewer(v), []);

  useLayerSync(viewer, state.layers, dispatch);
  useAssetPicking(viewer, dispatch);
  useAdaptiveQuality(viewer, mode === 'auto', active, setActive);

  const clearSelection = () => {
    if (viewer) viewer.selectedEntity = undefined;
    dispatch({ type: 'select', asset: null });
  };

  return (
    <div className={styles.app}>
      <aside className={`${styles.sidebar} ${state.sidebarOpen ? '' : styles.collapsed}`}>
        <header className={styles.header}>
          <h1>3D Spatial Portal</h1>
        </header>
        <GeocoderSearch viewer={viewer} />
        <LayerPanel layers={state.layers} dispatch={dispatch} />
        <Legend />
        <section className={styles.panel} aria-label="Render quality">
          <h2 className={styles.h2}>Render quality</h2>
          <select value={mode} onChange={(e) => onMode(e.target.value as 'auto' | Quality)} aria-label="Render quality" className={styles.select}>
            <option value="auto">Auto (now: {active})</option>
            <option value="low">Low (fastest)</option>
            <option value="balanced">Balanced</option>
            <option value="high">High (sharpest, slower)</option>
          </select>
        </section>
        <MiniMap viewer={viewer} />
      </aside>

      <main className={styles.main}>
        <button
          className={styles.toggle}
          onClick={() => dispatch({ type: 'toggleSidebar' })}
          aria-label="Toggle sidebar"
          aria-expanded={state.sidebarOpen}
        >
          ☰
        </button>
        <button className={styles.home} onClick={() => viewer && flyHome(viewer)}>⌂ Home</button>
        {state.selected && (
          <div className={styles.overlay}>
            <AssetInfoPanel asset={state.selected} onClose={clearSelection} />
          </div>
        )}
        <LoadingChip viewer={viewer} />
        {state.hoveredName && <div className={styles.hoverChip}>{state.hoveredName}</div>}
        <CesiumViewer onReady={onReady} />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <Portal />
      </AppProvider>
    </ErrorBoundary>
  );
}
