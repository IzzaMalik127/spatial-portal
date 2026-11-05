import type { Dispatch } from 'react';
import type { Action } from '../store/appStore';
import type { LayerState } from '../types';
import styles from '../styles/ui.module.css';

interface Props {
  layers: LayerState[];
  dispatch: Dispatch<Action>;
}

export function LayerPanel({ layers, dispatch }: Props) {
  return (
    <section className={styles.panel} aria-label="Layers">
      <h2 className={styles.h2}>Layers</h2>
      <p className={styles.muted}>Tick any layers together. Use the sliders to blend map layers.</p>
      <ul className={styles.layerList}>
        {layers.map((l) => (
          <li key={l.id} className={styles.layerItem}>
            <label className={styles.layerLabel}>
              <input
                type="checkbox"
                checked={l.enabled}
                onChange={() => dispatch({ type: 'toggleLayer', id: l.id })}
              />
              <span>
                <strong>{l.label}</strong>
                <small>{l.description}</small>
              </span>
              {l.enabled && <span className={`${styles.badge} ${styles[l.status]}`}>{l.status}</span>}
            </label>
            {l.enabled && l.opacity !== undefined && (
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
            {l.status === 'error' && (
              <p role="alert" className={styles.error}>
                {l.error} — untick and tick again to retry.
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
