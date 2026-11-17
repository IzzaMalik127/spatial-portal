import { act, renderHook, waitFor } from '@testing-library/react';
import type * as Cesium from 'cesium';
import { useLayerSync } from '../hooks/useLayerSync';
import { initialState } from '../store/appStore';
import type { LayerState } from '../types';
import { addLayerWithRetry, removeLayer } from '../utils/layers';

vi.mock('../utils/layers', () => ({ addLayerWithRetry: vi.fn(), removeLayer: vi.fn() }));

const add = vi.mocked(addLayerWithRetry);
const remove = vi.mocked(removeLayer);

function fakeViewer(height = 1000) {
  return {
    isDestroyed: () => false,
    camera: { positionCartographic: { height }, changed: { addEventListener: () => () => {} } },
  } as unknown as Cesium.Viewer;
}

const layer = (id: LayerState['id'], over: Partial<LayerState> = {}): LayerState => ({
  ...initialState.layers.find((l) => l.id === id)!,
  enabled: false,
  ...over,
});

beforeEach(() => {
  add.mockReset();
  remove.mockReset();
});

describe('useLayerSync: toggling layers never re-creates the viewer', () => {
  it('adds only the layer that was switched on, then reports it ready', async () => {
    const resource = { alpha: 1, show: true };
    add.mockResolvedValue(resource as never);
    const dispatch = vi.fn();
    const viewer = fakeViewer();
    const { rerender } = renderHook(({ layers }) => useLayerSync(viewer, layers, dispatch), {
      initialProps: { layers: [layer('satellite'), layer('osm')] },
    });
    expect(add).not.toHaveBeenCalled();
    rerender({ layers: [layer('satellite'), layer('osm', { enabled: true })] });
    expect(add).toHaveBeenCalledTimes(1);
    expect(add.mock.calls[0][1]).toBe('osm');
    await waitFor(() => expect(dispatch).toHaveBeenCalledWith({ type: 'layerStatus', id: 'osm', status: 'ready' }));
  });

  it('removes just that layer when it is switched off', async () => {
    const resource = { alpha: 1, show: true };
    add.mockResolvedValue(resource as never);
    const dispatch = vi.fn();
    const viewer = fakeViewer();
    const { rerender } = renderHook(({ layers }) => useLayerSync(viewer, layers, dispatch), {
      initialProps: { layers: [layer('osm', { enabled: true })] },
    });
    await waitFor(() => expect(dispatch).toHaveBeenCalledWith({ type: 'layerStatus', id: 'osm', status: 'ready' }));
    rerender({ layers: [layer('osm', { enabled: false })] });
    expect(remove).toHaveBeenCalledWith(viewer, 'osm', resource);
  });

  it('ignores a failure that arrives after the user unticked the layer (no stale error)', async () => {
    let fail: (e: Error) => void = () => {};
    add.mockReturnValue(new Promise((_, reject) => (fail = reject)) as never);
    const dispatch = vi.fn();
    const viewer = fakeViewer();
    const { rerender } = renderHook(({ layers }) => useLayerSync(viewer, layers, dispatch), {
      initialProps: { layers: [layer('terrain', { enabled: true })] },
    });
    rerender({ layers: [layer('terrain', { enabled: false })] }); // user unticks while loading
    await act(async () => fail(new Error('network problem')));
    expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ status: 'error' }));
  });

  it('reports an error when a still-ticked layer fails', async () => {
    add.mockRejectedValue(new Error('boom'));
    const dispatch = vi.fn();
    renderHook(() => useLayerSync(fakeViewer(), [layer('czml', { enabled: true })], dispatch));
    await waitFor(() =>
      expect(dispatch).toHaveBeenCalledWith({ type: 'layerStatus', id: 'czml', status: 'error', error: 'boom' }),
    );
  });
});

describe('useLayerSync: opacity and distance ranges', () => {
  it('updates the live layer opacity in place', async () => {
    const resource = { alpha: 1, show: true };
    add.mockResolvedValue(resource as never);
    const dispatch = vi.fn();
    const viewer = fakeViewer();
    const { rerender } = renderHook(({ layers }) => useLayerSync(viewer, layers, dispatch), {
      initialProps: { layers: [layer('osm', { enabled: true, opacity: 0.5 })] },
    });
    await waitFor(() => expect(dispatch).toHaveBeenCalledWith({ type: 'layerStatus', id: 'osm', status: 'ready' }));
    rerender({ layers: [layer('osm', { enabled: true, opacity: 0.8 })] });
    expect(resource.alpha).toBe(0.8);
  });

  it('hides the street map when the camera is higher than 200 km, shows it below', async () => {
    const resource = { alpha: 1, show: true };
    add.mockResolvedValue(resource as never);
    const dispatch = vi.fn();
    const high = fakeViewer(300_000);
    const { rerender } = renderHook(({ layers }) => useLayerSync(high, layers, dispatch), {
      initialProps: { layers: [layer('osm', { enabled: true })] },
    });
    await waitFor(() => expect(dispatch).toHaveBeenCalledWith({ type: 'layerStatus', id: 'osm', status: 'ready' }));
    rerender({ layers: [layer('osm', { enabled: true, opacity: 0.5 })] });
    expect(resource.show).toBe(false);
    (high.camera.positionCartographic as { height: number }).height = 5_000;
    rerender({ layers: [layer('osm', { enabled: true, opacity: 0.6 })] });
    expect(resource.show).toBe(true);
  });
});
