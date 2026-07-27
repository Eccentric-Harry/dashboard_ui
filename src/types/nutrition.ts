// Nutrition domain types. Re-exported from lib/api during migration.
export type { HydrationData } from '../lib/api';

// The backend doesn't have a single typed FoodEntry export in lib/api (each
// consumer shapes it loosely); keep that pattern here rather than inventing a
// stricter contract the backend doesn't actually guarantee.
export type FoodEntry = Record<string, unknown>;

export interface FoodEntryRequest {
  description: string;
  calories: number;
  proteinGrams: number;
  mealType: string;
  date: string;
}

export interface HydrationUpdateRequest {
  waterIntakeMl: number;
  targetMl?: number;
  notes?: string;
  date: string;
}
