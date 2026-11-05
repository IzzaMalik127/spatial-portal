import type { SelectedAsset } from '../types';
import styles from '../styles/ui.module.css';

interface Props {
  asset: SelectedAsset | null;
  onClose: () => void;
}

export function AssetInfoPanel({ asset, onClose }: Props) {
  if (!asset) {
    return (
      <section className={styles.panel} aria-label="Asset details">
        <h2 className={styles.h2}>Asset details</h2>
        <p className={styles.muted}>Click a marker or building on the globe to see its properties.</p>
      </section>
    );
  }
  return (
    <section className={styles.panel} aria-label="Asset details">
      <div className={styles.row}>
        <h2 className={styles.h2}>{asset.name}</h2>
        <button className={styles.iconBtn} onClick={onClose} aria-label="Clear selection">✕</button>
      </div>
      <p className={styles.muted}>
        ID: <code>{asset.id}</code> · picked in {asset.pickMs} ms
      </p>
      <table className={styles.table}>
        <tbody>
          {Object.entries(asset.properties).map(([k, v]) => (
            <tr key={k}>
              <th scope="row">{k}</th>
              <td>{String(v)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
