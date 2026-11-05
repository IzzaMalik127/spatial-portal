import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react';
import type { LayerId, LayerState, LoadStatus, SelectedAsset } from '../types';

export interface AppState {
  layers: LayerState[];
  selected: SelectedAsset | null;
  hoveredName: string | null;
  sidebarOpen: boolean;
}

export type Action =
  | { type: 'toggleLayer'; id: LayerId }
  | { type: 'setOpacity'; id: LayerId; opacity: number }
  | { type: 'layerStatus'; id: LayerId; status: LoadStatus; error?: string }
  | { type: 'select'; asset: SelectedAsset | null }
  | { type: 'hover'; name: string | null }
  | { type: 'toggleSidebar' };

export const initialState: AppState = {
  layers: [
    { id: 'satellite', opacity: 1, label: 'High-res satellite imagery', description: 'Esri World Imagery (WMTS)', enabled: true, status: 'idle' },
    { id: 'osm', opacity: 0.5, visibleBelowM: 200_000, label: 'Street map', description: 'Esri World Street Map · appears when closer than 200 km', enabled: false, status: 'idle' },
    { id: 'wms', opacity: 0.6, visibleAboveM: 40_000, label: 'WMS: NASA Blue Marble', description: 'NASA GIBS WMS · global overview, appears when zoomed out', enabled: false, status: 'idle' },
    { id: 'terrain', label: 'Digital Elevation Model', description: 'Cesium World Terrain (needs ion token)', enabled: false, status: 'idle' },
    { id: 'tileset', visibleBelowM: 10_000, label: '3D Tileset: OSM Buildings', description: 'Cesium 3D Tiles (needs ion token) · shows when closer than 10 km', enabled: false, status: 'idle' },
    { id: 'assets', label: 'Infrastructure assets', description: 'GeoJSON from REST endpoint', enabled: true, status: 'idle' },
    { id: 'czml', label: 'Live inspection drone', description: 'Time-dynamic CZML feed', enabled: false, status: 'idle' },
  ],
  selected: null,
  hoveredName: null,
  sidebarOpen: true,
};

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'toggleLayer':
      return {
        ...state,
        layers: state.layers.map((l) =>
          l.id === action.id ? { ...l, enabled: !l.enabled, status: 'idle', error: undefined } : l,
        ),
      };
    case 'setOpacity':
      return {
        ...state,
        layers: state.layers.map((l) => (l.id === action.id ? { ...l, opacity: action.opacity } : l)),
      };
    case 'layerStatus':
      return {
        ...state,
        layers: state.layers.map((l) =>
          l.id === action.id ? { ...l, status: action.status, error: action.error } : l,
        ),
      };
    case 'select':
      return { ...state, selected: action.asset };
    case 'hover':
      return state.hoveredName === action.name ? state : { ...state, hoveredName: action.name };
    case 'toggleSidebar':
      return { ...state, sidebarOpen: !state.sidebarOpen };
    default:
      return state;
  }
}

const Ctx = createContext<{ state: AppState; dispatch: Dispatch<Action> } | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
