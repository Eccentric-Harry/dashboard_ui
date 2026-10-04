// HUD store — the command center's read model: what the gutter columns beside the
// stage show on every route. Deliberately small: five reads, each one request, so
// it can afford to stay fresh on any route without the weight of /home's eighteen.
//
//   agenda    — today's and tomorrow's calendar items (events and tasks share one
//               collection), for "Up next" and the tasks ring.
//   nutrition — today's calories and protein against their goals.
//   hydration — today's water against its target.
//   focus     — today's focused minutes.
//   spending  — this month's budget and what's left of it.
//
// Refreshes are throttled (REFRESH_TTL_MS): mounting, a route change and the
// five-minute poll all call `refresh()`, and only a stale snapshot goes back to the
// network. A `calendar-updated` event forces one, so a task ticked off anywhere
// shows up here at once. Each slice settles on its own, so one failing domain
// leaves the others readable.

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { createSelectors, remoteStateWith, requestAndSet, type RemoteDataStatus } from './zustand-utils';
import { calendarService } from '../services/calendar-service';
import { financeService } from '../services/finance-service';
import { focusService } from '../services/focus-service';
import { nutritionService } from '../services/nutrition-service';
import { localToday } from '../lib/finance-ledger';
import type { CalendarItem } from '../types/calendar';
import type { SpendingSummary } from '../types/finance';
import type { FocusDaySummary } from '../types/focus';
import type { HydrationData, NutritionSummary } from '../types/nutrition';

const REFRESH_TTL_MS = 60_000;

interface HudState {
  /** The local day the snapshot was taken for — a new day forces a refresh. */
  day: string | null;
  fetchedAt: number;
  agenda: RemoteDataStatus<CalendarItem[] | null>;
  nutrition: RemoteDataStatus<NutritionSummary | null>;
  hydration: RemoteDataStatus<HydrationData | null>;
  focus: RemoteDataStatus<FocusDaySummary[] | null>;
  spending: RemoteDataStatus<SpendingSummary | null>;
}

interface HudActions {
  actions: {
    /** Re-read every slice if the snapshot is stale (or always, with `force`). */
    refresh: (force?: boolean) => Promise<void>;
  };
}

type HudStore = HudState & HudActions;

const addDays = (iso: string, n: number): string => {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d + n);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const useHudStoreBase = create<HudStore>()(
  devtools(
    immer((set, get) => ({
      day: null,
      fetchedAt: 0,
      agenda: remoteStateWith<CalendarItem[] | null>(null),
      nutrition: remoteStateWith<NutritionSummary | null>(null),
      hydration: remoteStateWith<HydrationData | null>(null),
      focus: remoteStateWith<FocusDaySummary[] | null>(null),
      spending: remoteStateWith<SpendingSummary | null>(null),
      actions: {
        refresh: async (force = false) => {
          const today = localToday();
          const { day, fetchedAt } = get();
          if (!force && day === today && Date.now() - fetchedAt < REFRESH_TTL_MS) return;
          set((state) => {
            state.day = today;
            state.fetchedAt = Date.now();
          });
          // `update` keeps the last snapshot on screen while it refreshes.
          const update = day === today;
          await Promise.all([
            requestAndSet<HudStore, 'agenda'>('agenda', () => calendarService.getItemsForRange(today, addDays(today, 1)), set, { update }),
            requestAndSet<HudStore, 'nutrition'>('nutrition', () => nutritionService.getSummary(today), set, { update }),
            requestAndSet<HudStore, 'hydration'>('hydration', () => nutritionService.getHydration(today), set, { update }),
            requestAndSet<HudStore, 'focus'>('focus', () => focusService.getHistory(today, today), set, { update }),
            requestAndSet<HudStore, 'spending'>('spending', () => financeService.getSpendingSummary(today.slice(0, 7)), set, { update }),
          ]);
        },
      },
    })),
    { name: 'hud-store' },
  ),
);

export const useHudStore = createSelectors(useHudStoreBase);
export const hudActions = useHudStoreBase.getState().actions;
