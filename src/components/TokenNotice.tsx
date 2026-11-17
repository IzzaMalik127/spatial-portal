import { HAS_ION_TOKEN } from '../config';
import styles from '../styles/ui.module.css';

/** Friendly explanation (instead of red errors) when no Cesium ion token is configured. */
export function TokenNotice({ hasIonToken = HAS_ION_TOKEN }: { hasIonToken?: boolean }) {
  if (hasIonToken) return null;
  return (
    <section className={styles.notice} role="note" aria-label="Cesium token notice">
      <strong>Running without a Cesium token</strong>
      <p>
        Terrain and 3D buildings are switched off. Everything else works with free maps, and the built-in world
        map works offline.
      </p>
      <p className={styles.muted}>
        To turn them on: copy .env.example to .env, add VITE_CESIUM_ION_TOKEN, then restart the app.
      </p>
    </section>
  );
}
