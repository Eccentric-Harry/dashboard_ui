// Dashboard store — replaces DashboardContext + useDashboardData.ts. Merges
// the /dashboard aggregate with /workouts (same two-call shape the original
// hook used).
//
// Only ONE place drives fetches: App.tsx calls dashboardActions.load(date)
// whenever the route date changes, and dashboardActions.bootstrapListener()
// once on mount to refetch on the app-wide 'dashboard-updated' event — exactly
// mirroring the old setup where a single <DashboardProvider date={...}> owned
// fetching and every consumer just read the shared context value. `useDashboard()`
// below is a compatibility hook (same { data, isLoading, error, refetch } shape)
// for the 12 existing consumers, which all call it with no arguments and must
// NOT each independently trigger a fetch.
//
// The merged `data` stays loosely typed (see dashboard-service.ts) — narrowing
// it is a follow-up, not something to guess at unverified against the real
// backend response.

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { createSelectors } from './zustand-utils';
import { dashboardService } from '../services/dashboard-service';
import { workoutsService } from '../services/workouts-service';

interface DashboardState {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  isLoading: boolean;
  error: Error | null;
  currentDate: string | undefined;
}

interface DashboardActions {
  actions: {
    load: (date?: string) => Promise<void>;
    bootstrapListener: () => void;
  };
}

type DashboardStore = DashboardState & DashboardActions;

let listenerBootstrapped = false;

const useDashboardStoreBase = create<DashboardStore>()(
  devtools(
    immer((set, get) => ({
      data: null,
      isLoading: true,
      error: null,
      currentDate: undefined,
      actions: {
        load: async (date) => {
          set((s) => {
            s.currentDate = date;
            s.isLoading = true;
          });
          const [dashboardRes, workoutsRes] = await Promise.allSettled([
            dashboardService.getDashboard(date),
            workoutsService.getWorkouts(),
          ]);

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const merged: any = {};
          if (dashboardRes.status === 'fulfilled' && !dashboardRes.value.error) {
            Object.assign(merged, dashboardRes.value.data as object);
          }
          if (workoutsRes.status === 'fulfilled' && !workoutsRes.value.error) {
            merged.workouts = workoutsRes.value.data;
          }

          set((s) => {
            s.data = merged;
            s.error = null;
            s.isLoading = false;
          });
        },
        bootstrapListener: () => {
          if (listenerBootstrapped) return;
          listenerBootstrapped = true;
          window.addEventListener('dashboard-updated', () => {
            void get().actions.load(get().currentDate);
          });
        },
      },
    })),
    { name: 'DashboardStore' },
  ),
);

export const useDashboardStore = createSelectors(useDashboardStoreBase);

/** Stable module-level handle — safe to call without listing as a dependency. */
export const dashboardActions = useDashboardStoreBase.getState().actions;

/**
 * Compatibility hook mirroring the old DashboardContext value shape. Called
 * with no arguments by every consumer — it only reads shared state; App.tsx
 * alone drives fetching via dashboardActions.load(date).
 */
export function useDashboard() {
  const data = useDashboardStore.use.data();
  const isLoading = useDashboardStore.use.isLoading();
  const error = useDashboardStore.use.error();

  return {
    data,
    isLoading,
    error,
    refetch: () => dashboardActions.load(useDashboardStoreBase.getState().currentDate),
  };
}
