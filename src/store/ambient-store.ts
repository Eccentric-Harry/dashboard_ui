// Ambient store — the HUD's view of the world outside the window.
//
// Unlike every other store here this one holds no Life OS data: its source is
// services/external/open-meteo-service.ts, not the backend, so it does not use
// requestAndSet (which is typed to a SafeResult from ApiRequest). It keeps the
// same vocabulary — loading / loaded / error — so consumers read the same.
//
// Everything is cached in localStorage: a route change must not re-prompt for
// location or re-hit a public API, and the last snapshot stays on screen while a
// refresh is in flight (stale-while-revalidate) rather than blinking to a
// skeleton every ten minutes.

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { fetchAmbientSnapshot, requestDeviceCoords, reverseGeocode } from '../services/external/open-meteo-service';
import type { AmbientCoords, AmbientGateReason, AmbientPlace, AmbientSnapshot } from '../types/ambient';
import { createSelectors } from './zustand-utils';

const COORDS_KEY = 'hud.ambient.coords';
const PLACE_KEY = 'hud.ambient.place';
const SNAPSHOT_KEY = 'hud.ambient.snapshot';

/** Open-Meteo updates current conditions every 15 min; AQI hourly. 10 is polite. */
const SNAPSHOT_TTL_MS = 10 * 60_000;
/** A fix older than this is re-taken on the next refresh — laptops travel. */
const COORDS_TTL_MS = 12 * 60 * 60_000;

function readCache<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

function writeCache(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage blocked (private window, quota) — the session still works, it just
    // re-fetches on the next load.
  }
}

interface AmbientState {
  coords: AmbientCoords | undefined;
  place: AmbientPlace | undefined;
  snapshot: AmbientSnapshot | undefined;
  gate: AmbientGateReason;
  loading: boolean;
  error: string | undefined;
}

interface AmbientActions {
  actions: {
    /** Refresh if the cached snapshot has aged out. Safe to call on every mount. */
    ensureFresh: () => Promise<void>;
    /** User gesture only — this is what opens the browser permission dialog. */
    enableLocation: () => Promise<void>;
    refresh: (options?: { force?: boolean }) => Promise<void>;
  };
}

const cachedCoords = readCache<AmbientCoords>(COORDS_KEY);

const useAmbientStoreBase = create<AmbientState & AmbientActions>()(
  devtools(
    immer((set, get) => {
      let inFlight: Promise<void> | undefined;

      const loadSnapshot = async (coords: AmbientCoords) => {
        set((state) => {
          state.loading = true;
          state.error = undefined;
        });

        const { data, error } = await fetchAmbientSnapshot(coords);

        set((state) => {
          state.loading = false;
          if (data) {
            state.snapshot = data;
            state.error = undefined;
            state.gate = 'idle';
          } else {
            // Keep whatever is already on screen; a failed refresh is not a reason
            // to blank the column.
            state.error = error;
            if (!navigator.onLine) state.gate = 'offline';
          }
        });

        if (data) writeCache(SNAPSHOT_KEY, data);
      };

      const loadPlace = async (coords: AmbientCoords) => {
        const place = await reverseGeocode(coords);
        if (!place) return;
        set((state) => {
          state.place = place;
        });
        writeCache(PLACE_KEY, place);
      };

      return {
        coords: cachedCoords,
        place: readCache<AmbientPlace>(PLACE_KEY),
        snapshot: readCache<AmbientSnapshot>(SNAPSHOT_KEY),
        gate: cachedCoords ? 'idle' : 'idle',
        loading: false,
        error: undefined,

        actions: {
          ensureFresh: async () => {
            const { coords, snapshot } = get();
            if (!coords) return;
            if (snapshot && Date.now() - snapshot.fetchedAt < SNAPSHOT_TTL_MS) return;
            await get().actions.refresh();
          },

          refresh: async ({ force = false } = {}) => {
            const { coords, snapshot } = get();
            if (!coords) return;
            if (!force && snapshot && Date.now() - snapshot.fetchedAt < SNAPSHOT_TTL_MS) return;
            // Route changes can fire this from several mounts at once.
            inFlight ??= loadSnapshot(coords).finally(() => {
              inFlight = undefined;
            });
            // A place name the first reverse-geocode missed (or a fix taken before
            // this store cached names at all) is picked up here rather than never.
            if (!get().place) void loadPlace(coords);
            await inFlight;
          },

          enableLocation: async () => {
            set((state) => {
              state.gate = 'prompting';
              state.error = undefined;
            });

            const { data, error } = await requestDeviceCoords();

            if (!data) {
              set((state) => {
                state.gate = error === 'denied' ? 'denied' : 'unavailable';
                state.error = error;
              });
              return;
            }

            set((state) => {
              state.coords = data;
              state.gate = 'idle';
            });
            writeCache(COORDS_KEY, data);

            await Promise.all([loadSnapshot(data), loadPlace(data)]);
          },
        },
      };
    }),
    { name: 'ambient-store' },
  ),
);

// A fix older than the TTL is refreshed silently on the next gesture-free load:
// the permission is already granted, so this opens no dialog.
if (cachedCoords && Date.now() - cachedCoords.fixedAt > COORDS_TTL_MS) {
  void requestDeviceCoords().then(({ data }) => {
    if (!data) return;
    useAmbientStoreBase.setState({ coords: data });
    writeCache(COORDS_KEY, data);
  });
}

export const useAmbientStore = createSelectors(useAmbientStoreBase);
export const ambientActions = useAmbientStoreBase.getState().actions;
