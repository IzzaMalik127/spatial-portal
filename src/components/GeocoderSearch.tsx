import { useEffect, useRef, useState } from 'react';
import type * as Cesium from 'cesium';
import { searchPlaces } from '../services/api';
import type { GeocodeResult, LoadStatus } from '../types';
import { flyToBounds, flyToLocation } from '../utils/camera';
import styles from '../styles/ui.module.css';

/** Search box with debounced, cancellable, real-time autocompletion. */
export function GeocoderSearch({ viewer }: { viewer: Cesium.Viewer | null }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [status, setStatus] = useState<LoadStatus>('idle');
  const skipNext = useRef(false); // set when we fill the box ourselves, so that doesn't start a new search

  useEffect(() => {
    if (skipNext.current) {
      skipNext.current = false;
      setResults([]);
      setStatus('idle');
      return;
    }
    if (query.trim().length < 3) {
      setResults([]);
      setStatus('idle');
      return;
    }
    const ctrl = new AbortController();
    setStatus('loading');
    const timer = setTimeout(() => {
      searchPlaces(query, ctrl.signal)
        .then((r) => {
          setResults(r);
          setStatus('ready');
        })
        .catch((e: Error) => {
          if (e.name !== 'AbortError') setStatus('error');
        });
    }, 350); // debounce
    return () => {
      clearTimeout(timer);
      ctrl.abort(); // drop stale in-flight request
    };
  }, [query]);

  const choose = (r: GeocodeResult) => {
    if (viewer) {
      if (r.bbox) flyToBounds(viewer, ...r.bbox); // show the whole area, not a close-up of its centre
      else flyToLocation(viewer, r.lon, r.lat);
    }
    const name = r.label.split(',')[0];
    if (name !== query) skipNext.current = true;
    setQuery(name);
    setResults([]);
  };

  return (
    <div className={styles.search}>
      <input
        type="search"
        placeholder="Search a place…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && setResults([])}
        aria-label="Search places"
      />
      {status === 'loading' && <small className={styles.muted}>Searching…</small>}
      {status === 'error' && <small className={styles.error}>Search failed. Check your connection.</small>}
      {results.length > 0 && (
        <ul className={styles.suggestions} role="listbox">
          {results.map((r) => (
            <li key={r.id} role="option" aria-selected={false}>
              <button onClick={() => choose(r)}>{r.label}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
