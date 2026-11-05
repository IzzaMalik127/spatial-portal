import { initialState, reducer } from '../store/appStore';

describe('app reducer', () => {
  it('toggles a layer and resets its status', () => {
    const s = reducer(initialState, { type: 'toggleLayer', id: 'osm' });
    expect(s.layers.find((l) => l.id === 'osm')?.enabled).toBe(true);
    const off = reducer(s, { type: 'toggleLayer', id: 'osm' });
    expect(off.layers.find((l) => l.id === 'osm')?.enabled).toBe(false);
  });

  it('updates remote layer status without touching other layers', () => {
    const s = reducer(initialState, { type: 'layerStatus', id: 'assets', status: 'error', error: 'boom' });
    expect(s.layers.find((l) => l.id === 'assets')).toMatchObject({ status: 'error', error: 'boom' });
    expect(s.layers.find((l) => l.id === 'satellite')?.status).toBe('idle');
  });

  it('stores and clears the selected asset', () => {
    const asset = { id: 'A1', name: 'Test', source: 'entity' as const, properties: {}, pickMs: 3 };
    const s = reducer(initialState, { type: 'select', asset });
    expect(s.selected?.id).toBe('A1');
    expect(reducer(s, { type: 'select', asset: null }).selected).toBeNull();
  });

  it('returns the same state object when hover is unchanged (no extra re-render)', () => {
    const s = reducer(initialState, { type: 'hover', name: 'X' });
    expect(reducer(s, { type: 'hover', name: 'X' })).toBe(s);
  });
});

describe('layer catalogue', () => {
  it('exposes every data format required by the brief', () => {
    const ids = initialState.layers.map((l) => l.id);
    expect(ids).toEqual(expect.arrayContaining(['satellite', 'wms', 'terrain', 'tileset', 'assets', 'czml']));
  });
});

describe('regional overview layer', () => {
  it('WMS only draws when zoomed out, so it cannot blur the city view', () => {
    const wms = initialState.layers.find((l) => l.id === 'wms');
    expect(wms?.visibleAboveM).toBeGreaterThan(0);
  });
});

describe('street map range', () => {
  it('street map is hidden when zoomed far out, where Esri has no street tiles', () => {
    const osm = initialState.layers.find((l) => l.id === 'osm');
    expect(osm?.visibleBelowM).toBeGreaterThan(0);
    const wms = initialState.layers.find((l) => l.id === 'wms');
    expect(osm!.visibleBelowM!).toBeGreaterThan(wms!.visibleAboveM!);
  });
});

describe('3D buildings range', () => {
  it('3D buildings only draw when close, so they cannot speckle the zoomed-out map', () => {
    const t = initialState.layers.find((l) => l.id === 'tileset');
    expect(t?.visibleBelowM).toBeGreaterThan(0);
  });
});

describe('layer opacity', () => {
  it('stores opacity per layer without touching the others', () => {
    const s = reducer(initialState, { type: 'setOpacity', id: 'osm', opacity: 0.3 });
    expect(s.layers.find((l) => l.id === 'osm')?.opacity).toBe(0.3);
    expect(s.layers.find((l) => l.id === 'satellite')?.opacity).toBe(1);
  });
  it('lets every layer be ticked at the same time', () => {
    let s = initialState;
    for (const l of initialState.layers) if (!l.enabled) s = reducer(s, { type: 'toggleLayer', id: l.id });
    expect(s.layers.every((l) => l.enabled)).toBe(true);
  });
});
