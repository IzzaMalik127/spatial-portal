# 3D Infrastructure & Spatial Data Management Portal (Frontend)

React + TypeScript + CesiumJS (Vite).

## Run
1. `npm install`
2. (optional) copy `.env.example` to `.env` and add a free Cesium ion token
3. `npm run dev` → open http://localhost:5173
4. `npm test` (unit tests) · `npm run build` (type-check + production build)

## Structure
| Path | Responsibility |
| --- | --- |
| `src/components/CesiumViewer.tsx` | Viewer lifecycle (create once, destroy on unmount) |
| `src/utils/camera.ts` | Orbit controls, zoom bounds, pitch clamp, depth test, fly-to |
| `src/utils/layers.ts` | Add/remove imagery, terrain (DEM), 3D Tiles, GeoJSON layers |
| `src/utils/picking.ts` + `hooks/useAssetPicking.ts` | `scene.pick()` raycasting via ScreenSpaceEventHandler |
| `src/services/api.ts` | Typed REST layer with caching, error handling, abortable geocoding |
| `src/store/appStore.tsx` | Reducer + context for layer/selection state |
| `public/data/assets.geojson` | Sample REST payload (replace with your backend via `VITE_API_BASE_URL`) |

## Data formats & services
| Format | Where |
| --- | --- |
| **3D Tiles** | `utils/layers.ts` (`tileset`: Cesium OSM Buildings, with hover/select highlight) |
| **GeoJSON** | `public/data/assets.geojson` via `services/api.ts` (`assets` layer) |
| **CZML** | `public/data/vehicles.czml` (`czml` layer: time-dynamic inspection drone) |
| **WMTS** | `satellite` layer (Esri World Imagery, REST WMTS) |
| **WMS** | `wms` layer (NASA GIBS Blue Marble WMS) |
| **Street map** | `osm` layer: Esri World Street Map via the ArcGIS provider (no API key; placeholder tiles are discarded) |
| **Mapbox GL JS** | `components/MiniMap.tsx` (2D overview synced to the 3D camera; needs `VITE_MAPBOX_TOKEN`) |

## Performance tuning
`utils/quality.ts` defines Low / Balanced / High presets (tile detail, anti-aliasing, resolution) applied live by `applyQuality()` in `utils/camera.ts`; pick the preset in the sidebar. Auto mode (default) measures real FPS and steps the preset down when it stays below 28 FPS. Hover picks are throttled to ~16/s. The WMS layer is NASA GIBS Blue Marble (free, no watermark, ~500 m data) and only draws when the camera is above 40 km; swap the URL in `utils/layers.ts` for your own WMS.

## Acceptance criteria map
- **60 FPS / no leaks**: FPS meter in dev; viewer destroyed on unmount; handlers destroyed in hook cleanup.
- **Pick < 150 ms**: pick time displayed in the Asset details panel.
- **No viewer re-init**: layer toggles add/remove one resource; viewer is created once.
- **Clean code + tests**: modular folders, JSDoc on spatial utilities, `npm test`.

## Layers needing an ion token
Terrain (DEM) and 3D OSM Buildings use Cesium ion. Without a token they show a clear error and everything else still works.
