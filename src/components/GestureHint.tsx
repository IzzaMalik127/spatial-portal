import { useEffect, useState } from 'react';
import { isTouchDevice } from '../config';
import styles from '../styles/ui.module.css';

/** One-time hint for touch screens: which gestures move the 3D map. Disappears after a few seconds or on tap. */
export function GestureHint({ show = isTouchDevice(), seconds = 8 }: { show?: boolean; seconds?: number }) {
  const [visible, setVisible] = useState(show);
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setVisible(false), seconds * 1000);
    return () => clearTimeout(t);
  }, [visible, seconds]);
  if (!visible) return null;
  return (
    <div className={styles.gestureHint} role="note" onClick={() => setVisible(false)}>
      Drag to move · Pinch to zoom · Two-finger drag to tilt · Tap a pin for details
    </div>
  );
}
