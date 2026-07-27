// Strictly-typed Nutrition + Hydration service — one-liners over safeCall<T>().
// AI meal analysis (multipart upload + polling) stays in lib/api as a dedicated
// flow; it doesn't fit the simple request/response shape this service wraps.

import { instance } from './http/api-request';
import type { SafeResult } from '../types/api';
import type { FoodEntry, FoodEntryRequest, HydrationData, HydrationUpdateRequest } from '../types/nutrition';
import * as E from './endpoints/nutrition-endpoints';

export interface NutritionServiceInterface {
  getSummary(date?: string): Promise<SafeResult<unknown>>;
  /**
   * Defaults to the backend's summary view (macros + grade only). Pass view: 'full' to get the
   * AI clinical payload back — several KB per meal, so only ever for a single day or a single meal.
   */
  getFoodEntries(days?: number, startDate?: string, endDate?: string, mealType?: string, view?: 'full'): Promise<SafeResult<FoodEntry[]>>;
  addFoodEntry(dto: FoodEntryRequest): Promise<SafeResult<FoodEntry>>;
  updateFoodEntry(mealId: string, entryId: string, dto: FoodEntryRequest): Promise<SafeResult<FoodEntry>>;
  deleteFoodEntry(mealId: string, entryId: string): Promise<SafeResult<unknown>>;
  getHydration(date?: string): Promise<SafeResult<HydrationData>>;
  getHydrationRange(days?: number, startDate?: string, endDate?: string): Promise<SafeResult<HydrationData[]>>;
  addWaterIntake(amount: number, date?: string): Promise<SafeResult<HydrationData>>;
  updateHydration(id: string, dto: HydrationUpdateRequest): Promise<SafeResult<HydrationData>>;
}

export const nutritionService: NutritionServiceInterface = {
  getSummary: (date) => instance.safeCall(E.API_GET_NUTRITION_SUMMARY, { query: { date } }),
  getFoodEntries: (days, startDate, endDate, mealType, view) =>
    instance.safeCall<FoodEntry[]>(E.API_GET_FOOD_ENTRIES, { query: { days, startDate, endDate, mealType, view } }),
  addFoodEntry: (dto) => instance.safeCall<FoodEntry>(E.API_ADD_FOOD_ENTRY, { body: dto }),
  updateFoodEntry: (mealId, entryId, dto) =>
    instance.safeCall<FoodEntry>(E.API_UPDATE_FOOD_ENTRY, { params: { mealId, entryId }, body: dto }),
  deleteFoodEntry: (mealId, entryId) =>
    instance.safeCall(E.API_DELETE_FOOD_ENTRY, { params: { mealId, entryId } }),
  getHydration: (date) => instance.safeCall<HydrationData>(E.API_GET_HYDRATION, { query: { date } }),
  getHydrationRange: (days, startDate, endDate) =>
    instance.safeCall<HydrationData[]>(E.API_GET_HYDRATION_RANGE, { query: { days, startDate, endDate } }),
  addWaterIntake: (amount, date) =>
    instance.safeCall<HydrationData>(E.API_ADD_WATER_INTAKE, { query: { amount, date } }),
  updateHydration: (id, dto) =>
    instance.safeCall<HydrationData>(E.API_UPDATE_HYDRATION, { params: { id }, body: dto }),
};
