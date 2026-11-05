import * as Cesium from 'cesium';
import type { SelectedAsset } from '../types';
import { cleanProperties } from './properties';

/**
 * Raycast pick via scene.pick(). Handles both GeoJSON entities (markers, building polygons)
 * and 3D Tiles features. Returns null when nothing pickable is under the cursor.
 */
export function pickAsset(viewer: Cesium.Viewer, position: Cesium.Cartesian2): SelectedAsset | null {
  const t0 = performance.now();
  return parsePicked(viewer, viewer.scene.pick(position), t0);
}

/** Converts an already-picked object (from scene.pick) into a SelectedAsset. */
export function parsePicked(viewer: Cesium.Viewer, picked: unknown, t0 = performance.now()): SelectedAsset | null {
  if (!Cesium.defined(picked)) return null;

  // 3D Tiles building feature
  if (picked instanceof Cesium.Cesium3DTileFeature) {
    const properties: Record<string, unknown> = {};
    for (const key of picked.getPropertyIds()) properties[key] = picked.getProperty(key);
    return {
      id: String(properties.elementId ?? properties['osm_id'] ?? picked.featureId),
      name: String(properties.name ?? 'Building (3D Tiles)'),
      source: 'tileset',
      properties: cleanProperties(properties),
      pickMs: Math.round(performance.now() - t0),
    };
  }

  // Entity from a data source
  const entity = (picked as { id?: unknown }).id;
  if (entity instanceof Cesium.Entity) {
    const time = viewer.clock.currentTime;
    const properties = { ...((entity.properties?.getValue(time) ?? {}) as Record<string, unknown>) };
    const d = entity.description as unknown;
    const description = typeof d === 'string' ? d : (d as Cesium.Property | undefined)?.getValue(time);
    if (typeof description === 'string' && description && !/<\/?(table|tbody|tr|td|th)\b/i.test(description) && !('description' in properties)) properties.description = description;
    const layerName = (entity.entityCollection?.owner as { name?: string } | undefined)?.name;
    if (layerName && !('layer' in properties)) properties.layer = layerName;
    return {
      id: String(properties.id ?? entity.id),
      name: String(properties.name ?? entity.name ?? 'Unnamed asset'),
      source: 'entity',
      properties: cleanProperties(properties),
      pickMs: Math.round(performance.now() - t0),
    };
  }
  return null;
}

/** Returns the live Entity under the cursor so the viewer can show its selection indicator. */
export function findEntity(viewer: Cesium.Viewer, position: Cesium.Cartesian2): Cesium.Entity | undefined {
  const picked = viewer.scene.pick(position);
  const e = (picked as { id?: unknown } | undefined)?.id;
  return e instanceof Cesium.Entity ? e : undefined;
}
