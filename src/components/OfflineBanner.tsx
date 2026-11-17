import { useOnlineStatus } from '../hooks/useOnlineStatus';
import styles from '../styles/ui.module.css';

/** Shown while the browser is offline: explains why some maps are missing. */
export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div role="status" className={styles.offlineBanner}>
      You are offline. Live map layers need a connection; the built-in world map and local data keep working.
    </div>
  );
}
