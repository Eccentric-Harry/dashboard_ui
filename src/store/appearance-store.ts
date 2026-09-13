// Appearance store — client-side look preferences, persisted to localStorage and
// applied as attributes on <html>. index.html applies both before first paint so
// nothing flashes on load; this store owns every change after that.
//   data-surface — glass ↔ solid.
//   data-theme   — "dark" only while the preference is dark *and* the current
//                  route has been reviewed for dark (DARK_THEME_ROUTES). Other
//                  routes keep rendering light rather than half-dark.

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { isStandalone } from '../lib/utils';
import { createSelectors } from './zustand-utils';

export type SurfaceStyle = 'glass' | 'solid';
export type ThemePreference = 'light' | 'dark';

// Keep keys and routes in sync with the inline script in index.html. A new route
// joins this list only after it has been reviewed in dark.
const SURFACE_KEY = 'surfaceStyle';
const THEME_KEY = 'themePreference';
export const DARK_THEME_ROUTES: ReadonlySet<string> = new Set([
  '/home', '/nutrition', '/finance', '/learnings', '/tasks', '/workouts',
  '/calendar', '/prompts', '/people', '/profile', '/mind',
]);
const THEME_COLOR = { glass: '#dfe4df', solid: '#f5f6f8', dark: '#0c0d0f' } as const;

interface AppearanceState {
  surfaceStyle: SurfaceStyle;
  themePreference: ThemePreference;
  activePath: string;
}

interface AppearanceActions {
  actions: {
    setSurfaceStyle: (style: SurfaceStyle) => void;
    toggleSurfaceStyle: () => void;
    setThemePreference: (theme: ThemePreference) => void;
    toggleTheme: () => void;
    syncActivePath: (path: string) => void;
  };
}

type AppearanceStore = AppearanceState & AppearanceActions;

function readStored<T extends string>(key: string, value: T, fallback: T): T {
  try {
    return localStorage.getItem(key) === value ? value : fallback;
  } catch {
    return fallback;
  }
}

function persist(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // storage blocked — the switch still applies for this session
  }
}

// App.tsx normalizes the route and syncs it in a layout effect; this only needs
// to agree with index.html for the frames before that, including the '/' alias.
function readInitialPath(): string {
  let path = window.location.pathname;
  try {
    if (isStandalone()) path = localStorage.getItem('pwa_last_path') || path;
  } catch {
    // fall through to the URL
  }
  return path === '/' ? '/home' : path;
}

export function isDarkThemeActive({ themePreference, activePath }: Pick<AppearanceState, 'themePreference' | 'activePath'>) {
  return themePreference === 'dark' && DARK_THEME_ROUTES.has(activePath);
}

function applyAppearance(state: AppearanceState) {
  const root = document.documentElement;
  const dark = isDarkThemeActive(state);
  root.dataset.surface = state.surfaceStyle;
  if (dark) root.dataset.theme = 'dark';
  else delete root.dataset.theme;
  setThemeColor(dark ? THEME_COLOR.dark : THEME_COLOR[state.surfaceStyle]);
}

// Android's standalone PWA doesn't reliably repaint the status bar when the
// existing meta's content attribute changes, so swap in a fresh element.
function setThemeColor(color: string) {
  const current = document.querySelector('meta[name="theme-color"]');
  const meta = document.createElement('meta');
  meta.name = 'theme-color';
  meta.content = color;
  if (current) current.replaceWith(meta);
  else document.head.appendChild(meta);
}

// Crossfade the whole page rather than snapping every surface at once.
function withCrossfade(commit: () => void) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (document.startViewTransition && !reduceMotion) document.startViewTransition(commit);
  else commit();
}

const useAppearanceStoreBase = create<AppearanceStore>()(
  devtools(
    immer((set, get) => {
      const commit = (recipe: (state: AppearanceState) => void) => {
        set(recipe);
        applyAppearance(get());
      };

      return {
        surfaceStyle: readStored<SurfaceStyle>(SURFACE_KEY, 'solid', 'glass'),
        themePreference: readStored<ThemePreference>(THEME_KEY, 'dark', 'light'),
        activePath: readInitialPath(),
        actions: {
          setSurfaceStyle: (style) => {
            if (style === get().surfaceStyle) return;
            persist(SURFACE_KEY, style);
            withCrossfade(() => commit((state) => { state.surfaceStyle = style; }));
          },
          toggleSurfaceStyle: () => {
            get().actions.setSurfaceStyle(get().surfaceStyle === 'solid' ? 'glass' : 'solid');
          },
          setThemePreference: (theme) => {
            if (theme === get().themePreference) return;
            persist(THEME_KEY, theme);
            withCrossfade(() => commit((state) => { state.themePreference = theme; }));
          },
          toggleTheme: () => {
            get().actions.setThemePreference(get().themePreference === 'dark' ? 'light' : 'dark');
          },
          // Route changes flip the theme without a crossfade — the route swap is the transition.
          syncActivePath: (path) => {
            if (path === get().activePath) return;
            commit((state) => { state.activePath = path; });
          },
        },
      };
    }),
    { name: 'appearance-store' },
  ),
);

applyAppearance(useAppearanceStoreBase.getState());

// Follow changes made in another tab.
window.addEventListener('storage', (e) => {
  if (e.key === SURFACE_KEY) {
    useAppearanceStoreBase.setState({ surfaceStyle: e.newValue === 'solid' ? 'solid' : 'glass' });
  } else if (e.key === THEME_KEY) {
    useAppearanceStoreBase.setState({ themePreference: e.newValue === 'dark' ? 'dark' : 'light' });
  } else {
    return;
  }
  applyAppearance(useAppearanceStoreBase.getState());
});

export const useAppearanceStore = createSelectors(useAppearanceStoreBase);
export const appearanceActions = useAppearanceStoreBase.getState().actions;
