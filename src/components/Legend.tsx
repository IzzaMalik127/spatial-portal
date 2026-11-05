import styles from '../styles/ui.module.css';

const ITEMS = [
  { label: 'Operational', color: '#22c55e' },
  { label: 'Under maintenance', color: '#f59e0b' },
  { label: 'Planned', color: '#38bdf8' },
];

/** Explains the colours of the pins and 3D boxes from the Infrastructure assets layer. */
export function Legend() {
  return (
    <section className={styles.panel} aria-label="Legend">
      <h2 className={styles.h2}>Legend</h2>
      <ul className={styles.legendList}>
        {ITEMS.map((i) => (
          <li key={i.label}>
            <span className={styles.swatch} style={{ background: i.color }} />
            {i.label}
          </li>
        ))}
      </ul>
      <p className={styles.muted}>
        Pins and 3D boxes are sample assets from the Infrastructure layer. A box&apos;s height comes from the
        asset&apos;s height value. Click one for details.
      </p>
    </section>
  );
}
