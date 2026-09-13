// Appearance store — the glass ↔ solid surface preference. Purely client-side:
// persisted to localStorage and applied as data-surface on <html>. index.html
// applies the stored value inline before first paint so there's no glass flash
// on load; this store owns every change after that.

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { createSelectors } from './zustand-utils';

export type SurfaceStyle = 'glass' | 'solid';

// Keep in sync with the inline script in index.html.
const STORAGE_KEY = 'surfaceStyle';
const THEME_COLOR: Record<SurfaceStyle, string> = { glass: '#dfe4df', solid: '#f5f6f8' };

interface AppearanceState {
  surfaceStyle: SurfaceStyle;
}

interface AppearanceActions {
  actions: {
    setSurfaceStyle: (style: SurfaceStyle) => void;
    toggleSurfaceStyle: () => void;
  };
}

type AppearanceStore = AppearanceState & AppearanceActions;

function readStoredStyle(): SurfaceStyle {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'solid' ? 'solid' : 'glass';
  } catch {
    return 'glass';
  }
}

function applySurfaceStyle(style: SurfaceStyle) {
  document.documentElement.dataset.surface = style;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[style]);
}

const useAppearanceStoreBase = create<AppearanceStore>()(
  devtools(
    immer((set, get) => ({
      surfaceStyle: readStoredStyle(),
      actions: {
        setSurfaceStyle: (style) => {
          if (style === get().surfaceStyle) return;
          try {
            localStorage.setItem(STORAGE_KEY, style);
          } catch {
            // storage blocked — the switch still applies for this session
          }
          const commit = () => {
            applySurfaceStyle(style);
            set((state) => {
              state.surfaceStyle = style;
            });
          };
          // Crossfade the whole page rather than snapping every surface at once.
          const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          if (document.startViewTransition && !reduceMotion) document.startViewTransition(commit);
          else commit();
        },
        toggleSurfaceStyle: () => {
          get().actions.setSurfaceStyle(get().surfaceStyle === 'solid' ? 'glass' : 'solid');
        },
      },
    })),
    { name: 'appearance-store' },
  ),
);

applySurfaceStyle(useAppearanceStoreBase.getState().surfaceStyle);

// Follow changes made in another tab.
window.addEventListener('storage', (e) => {
  if (e.key !== STORAGE_KEY) return;
  const style: SurfaceStyle = e.newValue === 'solid' ? 'solid' : 'glass';
  applySurfaceStyle(style);
  useAppearanceStoreBase.setState({ surfaceStyle: style });
});

export const useAppearanceStore = createSelectors(useAppearanceStoreBase);
