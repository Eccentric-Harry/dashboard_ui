// Workouts store — mirrors the finance-store template. Read slices only; the
// add/edit/embed mutations live in the child modals, which call loadAll() on success.

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
import type { StravaActivity, StravaActivityStats, StravaEmbedRef } from '../types/workouts';

interface WorkoutsState {
  activities: RemoteDataStatus<StravaActivity[]>;
  stats: RemoteDataStatus<StravaActivityStats | null>;
  /** The pinned activity; null when nothing is pinned. */
  featuredEmbed: RemoteDataStatus<StravaEmbedRef | null>;
}

interface WorkoutsActions {
  actions: {
    loadActivities: () => Promise<void>;
    loadStats: () => Promise<void>;
    loadFeaturedEmbed: () => Promise<void>;
    /** Refresh every workouts slice (replaces the component-local refreshData). */
    loadAll: () => Promise<void>;
  };
}

type WorkoutsStore = WorkoutsState & WorkoutsActions;

const initialState: WorkoutsState = {
  activities: emptyRemoteStateWithArray<StravaActivity>(),
  stats: remoteStateWith<StravaActivityStats | null>(null),
  featuredEmbed: remoteStateWith<StravaEmbedRef | null>(null),
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
        loadFeaturedEmbed: async () => {
          await requestAndSet<WorkoutsStore, 'featuredEmbed'>('featuredEmbed', workoutsService.getFeaturedEmbed, set);
        },
        loadAll: async () => {
          await Promise.all([
            get().actions.loadActivities(),
            get().actions.loadStats(),
            get().actions.loadFeaturedEmbed(),
          ]);
        },
      },
    })),
    { name: 'WorkoutsStore' },
  ),
);

export const useWorkoutsStore = createSelectors(useWorkoutsStoreBase);
