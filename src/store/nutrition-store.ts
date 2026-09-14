// Nutrition store. Read slices for food entries / hydration / summary. The primary
// /nutrition dashboard reads the shared /dashboard aggregate (dashboard-store); this
// store backs the child cards with their own reads.

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
import type { FoodEntry, HydrationData, NutritionSummary } from '../types/nutrition';

interface NutritionState {
  foodEntries: RemoteDataStatus<FoodEntry[]>;
  hydration: RemoteDataStatus<HydrationData | null>;
  hydrationRange: RemoteDataStatus<HydrationData[]>;
  summary: RemoteDataStatus<NutritionSummary | null>;
}

interface NutritionActions {
  actions: {
    loadFoodEntries: (days?: number, startDate?: string, endDate?: string, mealType?: string) => Promise<void>;
    loadHydration: (date?: string) => Promise<void>;
    loadHydrationRange: (days?: number, startDate?: string, endDate?: string) => Promise<void>;
    loadSummary: (date?: string) => Promise<void>;
    /** Apply a mutation response (e.g. water added) without a round trip. */
    applyHydration: (data: HydrationData) => void;
  };
}

type NutritionStore = NutritionState & NutritionActions;

const initialState: NutritionState = {
  foodEntries: emptyRemoteStateWithArray<FoodEntry>(),
  hydration: remoteStateWith<HydrationData | null>(null),
  hydrationRange: emptyRemoteStateWithArray<HydrationData>(),
  summary: remoteStateWith<NutritionSummary | null>(null),
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
        applyHydration: (data) =>
          set((state) => {
            state.hydration.data = data;
            state.hydration.loaded = true;
            state.hydration.hasErrors = false;
          }),
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
