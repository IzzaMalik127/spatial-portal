import * as Cesium from 'cesium';
import type { Quality } from '../types';
import { getPreset } from './quality';
import { maxPitch } from './tilt';
import { boundsToView } from './geo';

/** Default home view (sample data is around Lahore). `range` = distance from the target in metres. */
export const HOME = { lon: 74.3142, lat: 31.5889, range: 4000 };

/** Viewers that are currently running a fly-to animation (pitch clamp must not fight it). */
const flying = new WeakSet<Cesium.Viewer>();

/**
 * Orbital camera setup: 360° rotation, zoom bounds, tilt limits, depth-test optimisation.
 * Returns a cleanup function that removes the listeners it added.
 */
export function configureCamera(viewer: Cesium.Viewer): () => void {
  const ctrl = viewer.scene.screenSpaceCameraController;
  ctrl.enableRotate = true;
  ctrl.enableTilt = true;
  ctrl.enableZoom = true;
  ctrl.minimumZoomDistance = 150; // metres: closer than this goes beyond the photo resolution (blurry)
  ctrl.maximumZoomDistance = 3.0e7; // whole-globe view
  ctrl.inertiaSpin = 0.9;
  ctrl.inertiaZoom = 0.8;

  // Depth test optimisation: objects hide correctly behind terrain.
  viewer.scene.globe.depthTestAgainstTerrain = true;
  viewer.scene.fog.enabled = true;
  viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#9db4c6'); // soft colour where street-map tiles end at the poles
  viewer.scene.highDynamicRange = false; // skip HDR post-processing
  viewer.scene.globe.tileCacheSize = 400; // bounded tile memory
  applyQuality(viewer, 'balanced');

  // Pitch restriction: near the ground you may tilt to -10°; the higher you go, the more the camera is
  // forced to face the globe (so zooming out never leaves the globe stuck at the bottom of the screen).
  // Skipped while a fly-to animation runs, so it never fights the animation.
  viewer.camera.percentageChanged = 0.01;
  const remove = viewer.camera.changed.addEventListener(() => {
    if (flying.has(viewer)) return;
    const limit = maxPitch(viewer.camera.positionCartographic.height);
    if (viewer.camera.pitch > limit + 1e-3) {
      viewer.camera.setView({
        orientation: { heading: viewer.camera.heading, pitch: limit, roll: 0 },
      });
    }
  });

  // Headlight: models (3D buildings) are lit from the viewer's direction, so they never turn dark
  // just because it is night at the sun's real position.
  viewer.scene.light = new Cesium.DirectionalLight({ direction: Cesium.Cartesian3.clone(viewer.camera.directionWC) });
  const removeLight = viewer.scene.preRender.addEventListener(() => {
    const light = viewer.scene.light as Cesium.DirectionalLight;
    Cesium.Cartesian3.clone(viewer.camera.directionWC, light.direction);
  });

  return () => {
    remove();
    removeLight();
  };
}

/**
 * Applies a render-quality preset (tile detail, anti-aliasing, resolution) to the live viewer.
 * Cheap to call at runtime; no viewer re-initialisation.
 */
export function applyQuality(viewer: Cesium.Viewer, quality: Quality) {
  const p = getPreset(quality);
  viewer.scene.globe.maximumScreenSpaceError = p.maximumScreenSpaceError;
  viewer.scene.msaaSamples = p.msaaSamples;
  viewer.scene.postProcessStages.fxaa.enabled = p.msaaSamples === 1; // cheap AA when MSAA is off
  viewer.useBrowserRecommendedResolution = !p.nativeResolution; // native = sharper on HiDPI screens
  viewer.resolutionScale = p.resolutionScale;
}

/**
 * Animated fly-to that keeps the target in the centre of the screen (45° tilt, `range` metres away).
 * From far away it first descends looking straight down (the globe stays centred), then tilts in.
 * `duration` 0 jumps instantly (used for the first view on page load).
 */
export function flyToLocation(
  viewer: Cesium.Viewer,
  lon: number,
  lat: number,
  range = 3500,
  duration = 2.5,
  pitchDeg = -45,
) {
  const target = new Cesium.BoundingSphere(Cesium.Cartesian3.fromDegrees(lon, lat, 0), 1);
  flying.add(viewer);
  const done = () => flying.delete(viewer);
  const tiltIn = (seconds: number) =>
    viewer.camera.flyToBoundingSphere(target, {
      duration: seconds,
      offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(pitchDeg), range),
      complete: done,
      cancel: done,
    });

  const far = viewer.camera.positionCartographic.height > 200_000;
  if (far && duration > 0) {
    viewer.camera.flyToBoundingSphere(target, {
      duration: duration * 0.65,
      offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-90), 150_000),
      complete: () => tiltIn(duration * 0.35 + 0.5),
      cancel: done,
    });
  } else {
    tiltIn(duration);
  }
}

/**
 * Instantly places the camera `range` metres from a location, looking at it (45° tilt).
 * Uses lookAt (always lands correctly, unlike a zero-length flight).
 */
export function jumpToLocation(viewer: Cesium.Viewer, lon: number, lat: number, range = 3500) {
  const centre = Cesium.Cartesian3.fromDegrees(lon, lat, 0);
  viewer.camera.lookAt(centre, new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-45), range));
  viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY); // release the lock so the user can navigate freely
}

/** Opens the app directly at the home view, and re-applies it after the first rendered frame. */
export function jumpHome(viewer: Cesium.Viewer) {
  const apply = () => jumpToLocation(viewer, HOME.lon, HOME.lat, HOME.range);
  apply();
  const remove = viewer.scene.postRender.addEventListener(() => {
    remove(); // once only
    if (!viewer.isDestroyed()) apply();
  });
}

/** Flies to a place so that its whole bounding box [south, north, west, east] is in view. */
export function flyToBounds(viewer: Cesium.Viewer, south: number, north: number, west: number, east: number) {
  const v = boundsToView(south, north, west, east);
  flyToLocation(viewer, v.lon, v.lat, v.range, 3, v.pitchDeg);
}

export const flyHome = (viewer: Cesium.Viewer, duration = 3) =>
  flyToLocation(viewer, HOME.lon, HOME.lat, HOME.range, duration);
