// Nutrition store. Read slices for food entries / hydration / summary; the
// primary /nutrition dashboard mostly reads from DashboardContext (migrates in
// the Home sprint) — this store backs the child cards that fetch independently.

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import {
  requestAndSet,
  createSelectors,
  emptyRemoteStateWithArray,
  remoteStateWith,
  type RemoteDataStatus,
} from './zustand-utils';
import { nutritionService } from '../services/nutrition-service';
import type { FoodEntry, HydrationData } from '../types/nutrition';

interface NutritionState {
  foodEntries: RemoteDataStatus<FoodEntry[]>;
  hydration: RemoteDataStatus<HydrationData | null>;
  hydrationRange: RemoteDataStatus<HydrationData[]>;
  summary: RemoteDataStatus<unknown>;
}

interface NutritionActions {
  actions: {
    loadFoodEntries: (days?: number, startDate?: string, endDate?: string, mealType?: string) => Promise<void>;
    loadHydration: (date?: string) => Promise<void>;
    loadHydrationRange: (days?: number, startDate?: string, endDate?: string) => Promise<void>;
    loadSummary: (date?: string) => Promise<void>;
  };
}

type NutritionStore = NutritionState & NutritionActions;

const initialState: NutritionState = {
  foodEntries: emptyRemoteStateWithArray<FoodEntry>(),
  hydration: remoteStateWith<HydrationData | null>(null),
  hydrationRange: emptyRemoteStateWithArray<HydrationData>(),
  summary: remoteStateWith<unknown>(null),
};

const useNutritionStoreBase = create<NutritionStore>()(
  devtools(
    immer((set) => ({
      ...initialState,
      actions: {
        loadFoodEntries: async (days, startDate, endDate, mealType) => {
          await requestAndSet<NutritionStore, 'foodEntries'>(
            'foodEntries',
            () => nutritionService.getFoodEntries(days, startDate, endDate, mealType),
            set,
          );
        },
        loadHydration: async (date) => {
          await requestAndSet<NutritionStore, 'hydration'>(
            'hydration',
            () => nutritionService.getHydration(date),
            set,
          );
        },
        loadHydrationRange: async (days, startDate, endDate) => {
          await requestAndSet<NutritionStore, 'hydrationRange'>(
            'hydrationRange',
            () => nutritionService.getHydrationRange(days, startDate, endDate),
            set,
          );
        },
        loadSummary: async (date) => {
          await requestAndSet<NutritionStore, 'summary'>(
            'summary',
            () => nutritionService.getSummary(date),
            set,
          );
        },
      },
    })),
    { name: 'NutritionStore' },
  ),
);

export const useNutritionStore = createSelectors(useNutritionStoreBase);

/** Stable module-level handle — safe to call without listing as a dependency. */
export const nutritionActions = useNutritionStoreBase.getState().actions;
