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

## Works without a token, offline, and on phones
- **No Cesium token:** terrain and 3D buildings show a grey "needs token" badge (not a red error) and a short notice explains how to enable them. Every free layer, picking, search, the drone and the sample 3D boxes keep working.
- **Offline:** a low-detail world map is bundled with the app (`Assets/Textures/NaturalEarthII`) and always sits under the live layers; local data (`public/data`) keeps working. An orange banner says when the browser is offline.
- **Touch:** drag = move, pinch = zoom, two-finger drag = tilt, tap = select. Buttons get 44 px tap targets, the sidebar starts closed on phones, page scrolling/pull-to-refresh cannot hijack the map, and a short gesture hint appears on touch screens.

## Performance
- Phones, tablets and weak computers start on the Low preset (Auto only ever steps down).
- Native-resolution rendering is capped at 2x pixel density.
- Up to 18 tile downloads per server at once (Cesium's default of 6 was a bottleneck), plus early connections (`preconnect`) to the map servers.
- 3D buildings use coarser tiles and `skipLevelOfDetail`; they only draw below 10 km. The street map and NASA layers only draw in their useful height range.
- The layer list and legend are memoised, so hovering the map does not re-render them.

## Security
- **No secrets in the code.** Tokens are read only from `import.meta.env` (`VITE_CESIUM_ION_TOKEN`, `VITE_MAPBOX_TOKEN`). `.env` and every `.env.*` file are git-ignored; only `.env.example` (empty values) is committed. `npm test` fails if a token-shaped string or a non-empty example value appears anywhere.
- **Browser tokens are public by design.** Anything with the `VITE_` prefix is bundled into the page and visible to every visitor. So use *restricted* tokens: in Cesium ion set the token's allowed URLs and a read-only scope (`assets:read`); in Mapbox add URL restrictions. Never put a server-side secret behind a `VITE_` name.
- **Dependencies.** `npm audit --omit=dev` reports 0 vulnerabilities in what ships to users. The remaining `npm audit` notices come from developer tooling only (test runner and build tool) and are not part of the production bundle.

## Tests
`npm test` runs unit tests plus 3D-feature tests that use the real Cesium classes with no GPU: ray-pick result parsing (entities and 3D Tiles features), click/tap and hover handling (including throttling and cleanup), camera limits (pitch clamp, zoom bounds, fly-to stages), layer syncing (add/remove, stale errors, opacity, distance ranges), token fallback, offline mode, touch behaviour and the secrets scan.

## Acceptance criteria map
- **60 FPS / no leaks**: FPS meter in dev; viewer destroyed on unmount; handlers destroyed in hook cleanup.
- **Pick < 150 ms**: pick time displayed in the Asset details panel.
- **No viewer re-init**: layer toggles add/remove one resource; viewer is created once.
- **Clean code + tests**: modular folders, JSDoc on spatial utilities, `npm test`.

## Layers needing an ion token
Terrain (DEM) and 3D OSM Buildings use Cesium ion. Without a token they show a clear error and everything else still works.
