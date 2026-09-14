// Strictly-typed Nutrition + Hydration service — one-liners over safeCall<T>().
// The multi-step AI meal-analysis flow (upload → poll) is orchestrated by
// meal-analysis-service.ts on top of the two job calls exposed here.

import { instance } from './http/api-request';
import type { SafeResult } from '../types/api';
import type {
  FoodEntry,
  FoodEntryRequest,
  HydrationData,
  HydrationUpdateRequest,
  MealAnalysisJobStarted,
  MealAnalysisJobStatus,
  NutritionSummary,
} from '../types/nutrition';
import * as E from './endpoints/nutrition-endpoints';

const MEAL_ANALYSIS_START_TIMEOUT_MS = 30_000;
const MEAL_ANALYSIS_POLL_TIMEOUT_MS = 20_000;

export interface NutritionServiceInterface {
  /** Multipart upload; returns the background job id almost immediately. */
  startMealAnalysis(formData: FormData): Promise<SafeResult<MealAnalysisJobStarted>>;
  getMealAnalysisJob(jobId: string): Promise<SafeResult<MealAnalysisJobStatus>>;
  getSummary(date?: string): Promise<SafeResult<NutritionSummary>>;
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
  startMealAnalysis: (formData) =>
    instance.safeCall<MealAnalysisJobStarted>(E.API_START_MEAL_ANALYSIS, {
      body: formData,
      timeoutMs: MEAL_ANALYSIS_START_TIMEOUT_MS,
    }),
  getMealAnalysisJob: (jobId) =>
    instance.safeCall<MealAnalysisJobStatus>(E.API_GET_MEAL_ANALYSIS_JOB, {
      params: { jobId },
      timeoutMs: MEAL_ANALYSIS_POLL_TIMEOUT_MS,
    }),
  getSummary: (date) => instance.safeCall<NutritionSummary>(E.API_GET_NUTRITION_SUMMARY, { query: { date } }),
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
