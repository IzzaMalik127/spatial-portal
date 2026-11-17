import * as Cesium from 'cesium';
import { parsePicked, pickAsset } from '../utils/picking';

/** A minimal stand-in for the Cesium viewer: picking only needs scene.pick and the clock. */
function fakeViewer(pickResult?: unknown) {
  return {
    clock: { currentTime: Cesium.JulianDate.now() },
    scene: { pick: vi.fn().mockReturnValue(pickResult) },
  } as unknown as Cesium.Viewer & { scene: { pick: ReturnType<typeof vi.fn> } };
}

/** A real Cesium3DTileFeature without needing a loaded tileset (instanceof checks still work). */
function fakeTileFeature(props: Record<string, unknown>, featureId = 7) {
  const feature = Object.create(Cesium.Cesium3DTileFeature.prototype);
  Object.defineProperty(feature, 'featureId', { value: featureId });
  feature.getPropertyIds = () => Object.keys(props);
  feature.getProperty = (name: string) => props[name];
  return feature as Cesium.Cesium3DTileFeature;
}

describe('picking: entities (raycast hit on a pin or extruded box)', () => {
  const entity = new Cesium.Entity({
    id: 'entity-1',
    name: 'Fallback name',
    properties: { id: 'LHR-002', name: 'Lahore Fort', status: 'Operational', height: 0, note: '' },
  });

  it('turns a picked entity into a SelectedAsset with its properties', () => {
    const asset = parsePicked(fakeViewer(), { id: entity, primitive: {} });
    expect(asset).toMatchObject({ id: 'LHR-002', name: 'Lahore Fort', source: 'entity' });
    expect(asset?.properties).toMatchObject({ status: 'Operational', height: 0 });
  });

  it('drops empty values but keeps meaningful zeros', () => {
    const asset = parsePicked(fakeViewer(), { id: entity });
    expect(asset?.properties).not.toHaveProperty('note');
    expect(asset?.properties.height).toBe(0);
  });

  it('falls back to the entity id and name when it has no custom properties', () => {
    const bare = new Cesium.Entity({ id: 'drone-1', name: 'Inspection Drone 1' });
    expect(parsePicked(fakeViewer(), { id: bare })).toMatchObject({ id: 'drone-1', name: 'Inspection Drone 1' });
  });

  it('hides auto-generated HTML descriptions but keeps plain-text ones', () => {
    const html = new Cesium.Entity({ id: 'a', description: '<table class="x"><tr><td>1</td></tr></table>' });
    expect(parsePicked(fakeViewer(), { id: html })?.properties).not.toHaveProperty('description');
    const plain = new Cesium.Entity({ id: 'b', description: 'Patrols around the fort' });
    expect(parsePicked(fakeViewer(), { id: plain })?.properties.description).toBe('Patrols around the fort');
  });
});

describe('picking: 3D Tiles buildings', () => {
  it('reads building properties from a picked tile feature', () => {
    const feature = fakeTileFeature({ name: 'Orangzeb Sarai', elementId: 604159953, 'addr:city': undefined, building: 'yes' });
    const asset = parsePicked(fakeViewer(), feature);
    expect(asset).toMatchObject({ id: '604159953', name: 'Orangzeb Sarai', source: 'tileset' });
    expect(asset?.properties).toMatchObject({ building: 'yes' });
    expect(asset?.properties).not.toHaveProperty('addr:city'); // undefined values are hidden
  });

  it('uses a default name and the feature id when OSM has no name or element id', () => {
    const asset = parsePicked(fakeViewer(), fakeTileFeature({ building: 'yes' }, 42));
    expect(asset).toMatchObject({ id: '42', name: 'Building (3D Tiles)' });
  });
});

describe('picking: empty space and the scene.pick call', () => {
  it('returns null when nothing is under the cursor', () => {
    expect(parsePicked(fakeViewer(), undefined)).toBeNull();
    expect(parsePicked(fakeViewer(), { id: 'not-an-entity' })).toBeNull();
  });

  it('pickAsset forwards the screen position to scene.pick', () => {
    const viewer = fakeViewer(undefined);
    const position = new Cesium.Cartesian2(120, 80);
    expect(pickAsset(viewer, position)).toBeNull();
    expect(viewer.scene.pick).toHaveBeenCalledWith(position);
  });

  it('acceptance: parsing a pick takes well under 150 ms', () => {
    const entity = new Cesium.Entity({ id: 'e', properties: { id: 'X', name: 'Y' } });
    const asset = parsePicked(fakeViewer(), { id: entity });
    expect(asset?.pickMs).toBeLessThan(150);
  });
});
