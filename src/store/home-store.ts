// Home store — the cross-domain read model behind /home. Home reads every domain
// through its existing endpoint and each slice settles independently: a failing
// domain marks only its own slice as errored and the rest of the page renders.
//
// The store is date-agnostic; the route hands it a HomeWindow on load and the
// targeted reload actions reuse that window. State survives route changes, so
// returning to /home shows the last snapshot while it refreshes.

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { createSelectors, remoteStateWith, requestAndSet, type RemoteDataStatus } from './zustand-utils';
import { financeService } from '../services/finance-service';
import { focusService } from '../services/focus-service';
import { learningsService } from '../services/learnings-service';
import { mindService } from '../services/mind-service';
import { nutritionService } from '../services/nutrition-service';
import { sleepService } from '../services/sleep-service';
import { tasksService } from '../services/tasks-service';
import { workoutsService } from '../services/workouts-service';
import type { SafeResult } from '../types/api';
import type { DailyFinancialLog, SpendingSummary } from '../types/finance';
import type { FocusDaySummary, FocusSuggestion } from '../types/focus';
import type { LearningsSummary } from '../types/learnings';
import type { DailyLog, MindEntry, MindSummary } from '../types/mind';
import type { HydrationData, NutritionSummary } from '../types/nutrition';
import type { SleepEntry } from '../types/sleep';
import type { DailyTask } from '../types/tasks';
import type { StravaActivity, StravaActivityStats } from '../types/workouts';

/** The date range every Home read is scoped to. */
export interface HomeWindow {
  /** YYYY-MM-DD */
  today: string;
  /** First day of the history window (series, streak strips, insights). */
  start: string;
  /** Tasks run past today so the pending card can show upcoming items, not just overdue ones. */
  tasksUntil: string;
  /** Days of finance history, matching the window length. */
  days: number;
}

type HomeSlice<T> = RemoteDataStatus<T | null>;

interface HomeState {
  /** The window of the most recent load; reload actions reuse it. */
  window: HomeWindow | null;
  /** True once the first full load has settled — drives skeletons, not refreshes. */
  initialized: boolean;
  nutrition: HomeSlice<NutritionSummary>;
  hydration: HomeSlice<HydrationData>;
  tasks: HomeSlice<DailyTask[]>;
  sleep: HomeSlice<SleepEntry[]>;
  focus: HomeSlice<FocusDaySummary[]>;
  moods: HomeSlice<DailyLog[]>;
  workouts: HomeSlice<StravaActivity[]>;
  workoutStats: HomeSlice<StravaActivityStats>;
  learnings: HomeSlice<LearningsSummary>;
  mind: HomeSlice<MindSummary>;
  mindEntries: HomeSlice<MindEntry[]>;
  wins: HomeSlice<MindEntry[]>;
  anchors: HomeSlice<MindEntry[]>;
  focusSuggestions: HomeSlice<FocusSuggestion[]>;
  spending: HomeSlice<SpendingSummary>;
  finance: HomeSlice<DailyFinancialLog[]>;
}

type SliceKey = {
  [K in keyof HomeState]: HomeState[K] extends HomeSlice<unknown> ? K : never;
}[keyof HomeState];

type SliceData<K extends SliceKey> = NonNullable<HomeState[K]['data']>;

interface HomeActions {
  actions: {
    load: (window: HomeWindow) => Promise<void>;
    /** Re-run every slice against the current window. */
    refetch: () => Promise<void>;
    reloadSleep: () => Promise<void>;
    reloadAnchors: () => Promise<void>;
    /** Thoughts only — what Home's quick capture writes to /mind. */
    reloadMindEntries: () => Promise<void>;
    /** Wins only — shown in Home's capture list, kept out of the thought-based insights. */
    reloadWins: () => Promise<void>;
    /** Focus history + calendar suggestions move together: importing a block changes both. */
    reloadFocus: () => Promise<void>;
    reloadHydration: () => Promise<void>;
    /** Apply a mutation response without a round trip. */
    patchHydration: (data: HydrationData) => void;
    patchMind: (patch: Partial<MindSummary>) => void;
  };
}

type HomeStore = HomeState & HomeActions;

const emptySlice = <T,>(): HomeSlice<T> => remoteStateWith<T | null>(null);

const initialState: HomeState = {
  window: null,
  initialized: false,
  nutrition: emptySlice(),
  hydration: emptySlice(),
  tasks: emptySlice(),
  sleep: emptySlice(),
  focus: emptySlice(),
  moods: emptySlice(),
  workouts: emptySlice(),
  workoutStats: emptySlice(),
  learnings: emptySlice(),
  mind: emptySlice(),
  mindEntries: emptySlice(),
  wins: emptySlice(),
  anchors: emptySlice(),
  focusSuggestions: emptySlice(),
  spending: emptySlice(),
  finance: emptySlice(),
};

const useHomeStoreBase = create<HomeStore>()(
  devtools(
    immer((set, get) => {
      /** Runs one slice's request lifecycle; an empty success body normalizes to null. */
      const settle = <K extends SliceKey>(key: K, request: () => Promise<SafeResult<SliceData<K>>>) =>
        requestAndSet<HomeStore, K>(
          key,
          async () => {
            const result = await request();
            return { ...result, data: result.data ?? null };
          },
          set,
        );

      /** Runs `body` against the current window; a no-op before the first load. */
      const withWindow = async (body: (window: HomeWindow) => Promise<unknown>) => {
        const { window } = get();
        if (window) await body(window);
      };

      const loadSleep = (w: HomeWindow) => settle('sleep', () => sleepService.getEntries(w.start, w.today));
      const loadAnchors = () => settle('anchors', () => mindService.getEntries('INTENTION'));
      const loadWins = () => settle('wins', () => mindService.getEntries('WIN'));
      const loadMindEntries = () => settle('mindEntries', () => mindService.getEntries('THOUGHT'));
      const loadHydration = (w: HomeWindow) => settle('hydration', () => nutritionService.getHydration(w.today));
      const loadFocus = (w: HomeWindow) =>
        Promise.all([
          settle('focus', () => focusService.getHistory(w.start, w.today)),
          settle('focusSuggestions', () => focusService.getCalendarSuggestions(w.start, w.today)),
        ]);

      const loadEverything = (w: HomeWindow) =>
        Promise.all([
          settle('nutrition', () => nutritionService.getSummary(w.today)),
          loadHydration(w),
          settle('tasks', () => tasksService.getTasksRange(w.start, w.tasksUntil)),
          loadSleep(w),
          loadFocus(w),
          settle('moods', () => mindService.getDailyLogRange(w.start, w.today)),
          settle('workouts', () => workoutsService.getActivities()),
          settle('workoutStats', () => workoutsService.getStats()),
          settle('learnings', () => learningsService.getSummary(w.today)),
          settle('mind', () => mindService.getSummary(w.today)),
          loadMindEntries(),
          loadWins(),
          loadAnchors(),
          settle('spending', () => financeService.getSpendingSummary(w.today.slice(0, 7))),
          settle('finance', () => financeService.getDailyLogs(w.days)),
        ]);

      return {
        ...initialState,
        actions: {
          load: async (window) => {
            set((state) => {
              state.window = window;
            });
            await loadEverything(window);
            set((state) => {
              state.initialized = true;
            });
          },
          refetch: () => withWindow(loadEverything),
          reloadSleep: () => withWindow(loadSleep),
          reloadAnchors: async () => {
            await loadAnchors();
          },
          reloadMindEntries: async () => {
            await loadMindEntries();
          },
          reloadWins: async () => {
            await loadWins();
          },
          reloadFocus: () => withWindow(loadFocus),
          reloadHydration: () => withWindow(loadHydration),
          patchHydration: (data) =>
            set((state) => {
              state.hydration.data = data;
              state.hydration.hasErrors = false;
            }),
          patchMind: (patch) =>
            set((state) => {
              if (state.mind.data) Object.assign(state.mind.data, patch);
            }),
        },
      };
    }),
    { name: 'HomeStore' },
  ),
);

export const useHomeStore = createSelectors(useHomeStoreBase);

/** Stable module-level handle — safe to call without listing as a dependency. */
export const homeActions = useHomeStoreBase.getState().actions;
