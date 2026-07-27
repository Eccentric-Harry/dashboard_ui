// Workouts store — mirrors the finance-store template. Read slices only; the
// add/edit/embed mutations stay in the child modals (via lib/api) for now.

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import {
  requestAndSet,
  createSelectors,
  remoteStateWith,
  emptyRemoteStateWithArray,
  type RemoteDataStatus,
} from './zustand-utils';
import { workoutsService } from '../services/workouts-service';
import type { StravaActivity, StravaActivityStats } from '../types/workouts';

interface WorkoutsState {
  activities: RemoteDataStatus<StravaActivity[]>;
  stats: RemoteDataStatus<StravaActivityStats | null>;
}

interface WorkoutsActions {
  actions: {
    loadActivities: () => Promise<void>;
    loadStats: () => Promise<void>;
    /** Refresh both slices (replaces the component-local refreshData). */
    loadAll: () => Promise<void>;
  };
}

type WorkoutsStore = WorkoutsState & WorkoutsActions;

const initialState: WorkoutsState = {
  activities: emptyRemoteStateWithArray<StravaActivity>(),
  stats: remoteStateWith<StravaActivityStats | null>(null),
};

const useWorkoutsStoreBase = create<WorkoutsStore>()(
  devtools(
    immer((set, get) => ({
      ...initialState,
      actions: {
        loadActivities: async () => {
          await requestAndSet<WorkoutsStore, 'activities'>('activities', workoutsService.getActivities, set);
        },
        loadStats: async () => {
          await requestAndSet<WorkoutsStore, 'stats'>('stats', workoutsService.getStats, set);
        },
        loadAll: async () => {
          await Promise.all([get().actions.loadActivities(), get().actions.loadStats()]);
        },
      },
    })),
    { name: 'WorkoutsStore' },
  ),
);

export const useWorkoutsStore = createSelectors(useWorkoutsStoreBase);
