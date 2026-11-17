import { renderHook } from '@testing-library/react';
import * as Cesium from 'cesium';
import { useAssetPicking } from '../hooks/useAssetPicking';

// Replace only Cesium's mouse/touch event handler with a recorder, so we can "click" without a real canvas.
const state = vi.hoisted(() => ({ handlers: [] as Array<{ actions: Record<number, (e: unknown) => void>; destroyed: boolean }> }));
vi.mock('cesium', async (importOriginal) => {
  const actual = await importOriginal<typeof import('cesium')>();
  class FakeHandler {
    actions: Record<number, (e: unknown) => void> = {};
    destroyed = false;
    constructor() {
      state.handlers.push(this);
    }
    setInputAction(fn: (e: unknown) => void, type: number) {
      this.actions[type] = fn;
    }
    destroy() {
      this.destroyed = true;
    }
  }
  return { ...actual, ScreenSpaceEventHandler: FakeHandler };
});

const entity = new Cesium.Entity({ id: 'e1', properties: { id: 'BLD-101', name: 'Office Block A' } });

function setup(pickResult: unknown) {
  state.handlers.length = 0;
  const canvas = document.createElement('canvas');
  const viewer = {
    selectedEntity: undefined as unknown,
    clock: { currentTime: Cesium.JulianDate.now() },
    scene: { canvas, pick: vi.fn().mockReturnValue(pickResult) },
  } as unknown as Cesium.Viewer;
  const dispatch = vi.fn();
  const hook = renderHook(() => useAssetPicking(viewer, dispatch));
  return { viewer, dispatch, canvas, handler: () => state.handlers[0], ...hook };
}

const CLICK = Cesium.ScreenSpaceEventType.LEFT_CLICK;
const MOVE = Cesium.ScreenSpaceEventType.MOUSE_MOVE;

describe('useAssetPicking: clicks (tap on touch screens)', () => {
  it('selects the asset under the pointer and highlights its entity', () => {
    const { viewer, dispatch, handler } = setup({ id: entity });
    handler().actions[CLICK]({ position: new Cesium.Cartesian2(10, 20) });
    expect(dispatch).toHaveBeenCalledWith({
      type: 'select',
      asset: expect.objectContaining({ id: 'BLD-101', name: 'Office Block A', source: 'entity' }),
    });
    expect(viewer.selectedEntity).toBe(entity);
  });

  it('clears the selection when clicking empty space', () => {
    const { viewer, dispatch, handler } = setup(undefined);
    viewer.selectedEntity = entity;
    handler().actions[CLICK]({ position: new Cesium.Cartesian2(5, 5) });
    expect(dispatch).toHaveBeenCalledWith({ type: 'select', asset: null });
    expect(viewer.selectedEntity).toBeUndefined();
  });
});

describe('useAssetPicking: hover', () => {
  it('shows a pointer cursor and the asset name over a pickable object', () => {
    const { dispatch, canvas, handler } = setup({ id: entity });
    handler().actions[MOVE]({ endPosition: new Cesium.Cartesian2(1, 1) });
    expect(canvas.style.cursor).toBe('pointer');
    expect(dispatch).toHaveBeenCalledWith({ type: 'hover', name: 'Office Block A' });
  });

  it('resets the cursor over empty space', () => {
    const { dispatch, canvas, handler } = setup(undefined);
    handler().actions[MOVE]({ endPosition: new Cesium.Cartesian2(1, 1) });
    expect(canvas.style.cursor).toBe('default');
    expect(dispatch).toHaveBeenCalledWith({ type: 'hover', name: null });
  });

  it('throttles hover picking so mouse movement cannot flood the GPU', () => {
    const now = vi.spyOn(performance, 'now');
    const { viewer, handler } = setup({ id: entity });
    const move = handler().actions[MOVE];
    now.mockReturnValue(1000);
    move({ endPosition: new Cesium.Cartesian2(1, 1) });
    now.mockReturnValue(1020); // 20 ms later: skipped
    move({ endPosition: new Cesium.Cartesian2(2, 2) });
    now.mockReturnValue(1100); // 100 ms later: allowed
    move({ endPosition: new Cesium.Cartesian2(3, 3) });
    expect((viewer.scene.pick as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(2);
    now.mockRestore();
  });
});

describe('useAssetPicking: cleanup (no leaks)', () => {
  it('destroys the event handler when the component unmounts', () => {
    const { handler, unmount } = setup(undefined);
    expect(handler().destroyed).toBe(false);
    unmount();
    expect(handler().destroyed).toBe(true);
  });
});
