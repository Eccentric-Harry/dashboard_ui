// Declarative Nutrition + Hydration endpoint descriptors, ported from lib/api.ts.
import type { ApiEndpoint } from '../api-config';

export const API_GET_NUTRITION_SUMMARY: ApiEndpoint = { url: '/dashboard/nutrition-summary', method: 'get' };

// Defaults to the backend's summary view; pass view: 'full' for the meal detail sheet.
export const API_GET_FOOD_ENTRIES: ApiEndpoint = { url: '/health/food', method: 'get' };
export const API_ADD_FOOD_ENTRY: ApiEndpoint = { url: '/health/food', method: 'post' };
export const API_UPDATE_FOOD_ENTRY: ApiEndpoint<{ mealId: string; entryId: string }> = {
  url: ({ mealId, entryId }) => `/health/food/${mealId}/meal/${entryId}`,
  method: 'put',
};
export const API_DELETE_FOOD_ENTRY: ApiEndpoint<{ mealId: string; entryId: string }> = {
  url: ({ mealId, entryId }) => `/health/food/${mealId}/meal/${entryId}`,
  method: 'delete',
};

export const API_GET_HYDRATION: ApiEndpoint = { url: '/health/hydration', method: 'get' };
export const API_GET_HYDRATION_RANGE: ApiEndpoint = { url: '/health/hydration/range', method: 'get' };
export const API_ADD_WATER_INTAKE: ApiEndpoint = { url: '/health/hydration/add', method: 'post' };
export const API_UPDATE_HYDRATION: ApiEndpoint<{ id: string }> = {
  url: ({ id }) => `/health/hydration/${id}`,
  method: 'put',
};
