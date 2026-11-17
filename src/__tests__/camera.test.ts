import * as Cesium from 'cesium';
import { applyQuality, configureCamera, flyToBounds, flyToLocation, jumpToLocation } from '../utils/camera';

const deg = (r: number) => (r * 180) / Math.PI;

/** A fake viewer exposing just what the camera code touches, so no WebGL is needed. */
function makeViewer(height = 500, pitchDeg = -30) {
  const listeners: Array<() => void> = [];
  const viewer = {
    scene: {
      screenSpaceCameraController: {} as Record<string, unknown>,
      globe: {} as Record<string, unknown>,
      fog: {},
      postProcessStages: { fxaa: { enabled: false } },
      preRender: { addEventListener: () => () => {} },
      msaaSamples: 4,
      light: undefined as unknown,
    },
    camera: {
      pitch: Cesium.Math.toRadians(pitchDeg),
      heading: 0,
      percentageChanged: 0,
      directionWC: new Cesium.Cartesian3(0, 0, -1),
      positionCartographic: { height },
      changed: { addEventListener: (cb: () => void) => (listeners.push(cb), () => {}) },
      setView: vi.fn(),
      flyToBoundingSphere: vi.fn(),
      lookAt: vi.fn(),
      lookAtTransform: vi.fn(),
    },
    resolutionScale: 1,
    useBrowserRecommendedResolution: true,
  };
  return { viewer: viewer as unknown as Cesium.Viewer, raw: viewer, fire: () => listeners.forEach((l) => l()) };
}

describe('configureCamera: navigation limits', () => {
  it('sets zoom bounds and enables 360° rotation and tilt', () => {
    const { viewer, raw } = makeViewer();
    configureCamera(viewer);
    expect(raw.scene.screenSpaceCameraController).toMatchObject({
      enableRotate: true,
      enableTilt: true,
      enableZoom: true,
      minimumZoomDistance: 150,
      maximumZoomDistance: 3.0e7,
    });
    expect(raw.scene.globe.depthTestAgainstTerrain).toBe(true);
  });

  it('uses a headlight so 3D buildings are never dark at night', () => {
    const { viewer, raw } = makeViewer();
    configureCamera(viewer);
    expect(raw.scene.light).toBeInstanceOf(Cesium.DirectionalLight);
  });
});

describe('configureCamera: pitch clamp', () => {
  it('stops the camera tilting above the horizon near the ground', () => {
    const { viewer, raw, fire } = makeViewer(500, -5);
    configureCamera(viewer);
    fire();
    expect(raw.camera.setView).toHaveBeenCalledTimes(1);
    expect(deg(raw.camera.setView.mock.calls[0][0].orientation.pitch)).toBeCloseTo(-10);
  });

  it('leaves a normal tilt alone', () => {
    const { viewer, raw, fire } = makeViewer(500, -30);
    configureCamera(viewer);
    fire();
    expect(raw.camera.setView).not.toHaveBeenCalled();
  });

  it('forces a straight-down view when zoomed far out, so the globe stays centred', () => {
    const { viewer, raw, fire } = makeViewer(3_000_000, -50);
    configureCamera(viewer);
    fire();
    expect(deg(raw.camera.setView.mock.calls[0][0].orientation.pitch)).toBeCloseTo(-90);
  });
});

describe('flyToLocation', () => {
  it('does not fight the animation: the clamp pauses during a flight and resumes after', () => {
    const { viewer, raw, fire } = makeViewer(500, -5);
    configureCamera(viewer);
    flyToLocation(viewer, 74.3, 31.6, 3500, 2);
    const options = raw.camera.flyToBoundingSphere.mock.calls[0][1];
    fire();
    expect(raw.camera.setView).not.toHaveBeenCalled(); // flying
    options.complete();
    fire();
    expect(raw.camera.setView).toHaveBeenCalledTimes(1); // clamp is back
  });

  it('descends looking straight down from space, then tilts in (two stages)', () => {
    const { viewer, raw } = makeViewer(5_000_000, -90);
    flyToLocation(viewer, 74.3, 31.6, 3500, 3);
    expect(raw.camera.flyToBoundingSphere).toHaveBeenCalledTimes(1);
    const first = raw.camera.flyToBoundingSphere.mock.calls[0][1];
    expect(deg(first.offset.pitch)).toBeCloseTo(-90);
    first.complete();
    expect(raw.camera.flyToBoundingSphere).toHaveBeenCalledTimes(2);
    const second = raw.camera.flyToBoundingSphere.mock.calls[1][1];
    expect(deg(second.offset.pitch)).toBeCloseTo(-45);
    expect(second.offset.range).toBe(3500);
  });

  it('flyToBounds frames a whole city top-down from a sensible height', () => {
    const { viewer, raw } = makeViewer(500);
    flyToBounds(viewer, 24.7, 25.2, 66.8, 67.5); // Karachi-sized box
    const options = raw.camera.flyToBoundingSphere.mock.calls[0][1];
    expect(deg(options.offset.pitch)).toBeCloseTo(-90);
    expect(options.offset.range).toBeGreaterThan(20_000);
  });
});

describe('jumpToLocation and applyQuality', () => {
  it('jumps straight to a location and releases the camera lock', () => {
    const { viewer, raw } = makeViewer();
    jumpToLocation(viewer, 74.3142, 31.5889, 4000);
    expect(raw.camera.lookAt).toHaveBeenCalledTimes(1);
    expect(raw.camera.lookAtTransform).toHaveBeenCalledWith(Cesium.Matrix4.IDENTITY);
  });

  it('low quality is cheap: coarser tiles, FXAA, browser resolution', () => {
    const { viewer, raw } = makeViewer();
    applyQuality(viewer, 'low');
    expect(raw.scene.globe.maximumScreenSpaceError).toBeGreaterThan(3);
    expect(raw.scene.postProcessStages.fxaa.enabled).toBe(true);
    expect(raw.useBrowserRecommendedResolution).toBe(true);
  });

  it('high quality is sharp: MSAA and native resolution (capped at 2x pixel density)', () => {
    const { viewer, raw } = makeViewer();
    vi.stubGlobal('devicePixelRatio', 3);
    applyQuality(viewer, 'high');
    expect(raw.scene.msaaSamples).toBe(4);
    expect(raw.useBrowserRecommendedResolution).toBe(false);
    expect(raw.resolutionScale).toBeCloseTo(2 / 3);
    vi.unstubAllGlobals();
  });
});
