import { memo, type Dispatch } from 'react';
import { HAS_ION_TOKEN } from '../config';
import type { Action } from '../store/appStore';
import type { LayerState } from '../types';
import styles from '../styles/ui.module.css';

interface Props {
  layers: LayerState[];
  dispatch: Dispatch<Action>;
  /** Defaults to whether a Cesium ion token is configured. */
  hasIonToken?: boolean;
}

function LayerPanelBase({ layers, dispatch, hasIonToken = HAS_ION_TOKEN }: Props) {
  return (
    <section className={styles.panel} aria-label="Layers">
      <h2 className={styles.h2}>Layers</h2>
      <p className={styles.muted}>Tick any layers together. Use the sliders to blend map layers.</p>
      <ul className={styles.layerList}>
        {layers.map((l) => {
          const locked = Boolean(l.requiresToken) && !hasIonToken; // switched off, with a note instead of an error
          return (
            <li key={l.id} className={styles.layerItem}>
              <label className={styles.layerLabel} title={locked ? 'Add a Cesium ion token to .env to use this layer' : undefined}>
                <input
                  type="checkbox"
                  checked={l.enabled && !locked}
                  disabled={locked}
                  onChange={() => dispatch({ type: 'toggleLayer', id: l.id })}
                />
                <span>
                  <strong>{l.label}</strong>
                  <small>{l.description}</small>
                </span>
                {locked && <span className={`${styles.badge} ${styles.locked}`}>needs token</span>}
                {!locked && l.enabled && <span className={`${styles.badge} ${styles[l.status]}`}>{l.status}</span>}
              </label>
              {!locked && l.enabled && l.opacity !== undefined && (
                <label className={styles.opacity}>
                  <span>Opacity</span>
                  <input
                    type="range"
                    min={0.1}
                    max={1}
                    step={0.05}
                    value={l.opacity}
                    aria-label={`${l.label} opacity`}
                    onChange={(e) => dispatch({ type: 'setOpacity', id: l.id, opacity: Number(e.target.value) })}
                  />
                </label>
              )}
              {!locked && l.status === 'error' && (
                <p role="alert" className={styles.error}>
                  {l.error} — untick and tick again to retry.
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Memoised: hovering the map updates app state ~16x/s, and the layer list must not re-render for that. */
export const LayerPanel = memo(LayerPanelBase);
