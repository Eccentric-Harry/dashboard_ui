const API_BASE_URL = 'http://localhost:8080/api/v1';

export async function fetchDashboardData(date?: string) {
  const query = date ? `?date=${date}` : '';
  const response = await fetch(`${API_BASE_URL}/dashboard${query}`);
  if (!response.ok) {
    throw new Error('Failed to fetch dashboard data');
  }
  return response.json();
}

export async function fetchNutritionSummary(date?: string) {
  const query = date ? `?date=${date}` : '';
  const response = await fetch(`${API_BASE_URL}/dashboard/nutrition-summary${query}`);
  if (!response.ok) {
    throw new Error('Failed to fetch nutrition summary');
  }
  return response.json();
}

export async function fetchFoodEntries(days?: number, startDate?: string, endDate?: string, mealType?: string) {
  const params = new URLSearchParams();
  if (days) params.append('days', days.toString());
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  if (mealType) params.append('mealType', mealType);
  
  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await fetch(`${API_BASE_URL}/health/food${query}`);
  if (!response.ok) {
    throw new Error('Failed to fetch food entries');
  }
  return response.json();
}

export async function addFoodEntry(data: { description: string; calories: number; proteinGrams: number; mealType: string; date: string }) {
  const response = await fetch(`${API_BASE_URL}/health/food`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to add food entry');
  }
  return response.json();
}

export async function updateFoodEntry(mealId: string, entryId: string, data: { description: string; calories: number; proteinGrams: number; mealType: string; date: string }) {
  const response = await fetch(`${API_BASE_URL}/health/food/${mealId}/meal/${entryId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to update food entry');
  }
  return response.json();
}

export async function deleteFoodEntry(mealId: string, entryId: string) {
  const response = await fetch(`${API_BASE_URL}/health/food/${mealId}/meal/${entryId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete food entry');
  }
  return response.json();
}

export async function fetchSpendingSummary(month?: string) {
  const query = month ? `?month=${month}` : '';
  const response = await fetch(`${API_BASE_URL}/dashboard/spending-summary${query}`);
  if (!response.ok) {
    throw new Error('Failed to fetch spending summary');
  }
  return response.json();
}

export async function fetchWorkoutsData() {
  const response = await fetch(`${API_BASE_URL}/workouts`);
  if (!response.ok) {
    throw new Error('Failed to fetch workouts data');
  }
  return response.json();
}

export interface HydrationData {
  id?: string;
  date: string;
  waterIntakeMl: number;
  targetMl: number;
  progress: number;
  notes?: string;
}

export async function fetchHydration(date?: string) {
  const query = date ? `?date=${date}` : '';
  const response = await fetch(`${API_BASE_URL}/health/hydration${query}`);
  if (!response.ok) {
    throw new Error('Failed to fetch hydration data');
  }
  return response.json();
}

export async function addWaterIntake(amount: number, date?: string) {
  const params = new URLSearchParams();
  params.append('amount', amount.toString());
  if (date) params.append('date', date);
  
  const response = await fetch(`${API_BASE_URL}/health/hydration/add?${params.toString()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    throw new Error('Failed to add water intake');
  }
  return response.json();
}

export async function updateHydration(id: string, data: { waterIntakeMl: number; targetMl?: number; notes?: string; date: string }) {
  const response = await fetch(`${API_BASE_URL}/health/hydration/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to update hydration');
  }
  return response.json();
}

export interface FinancialTotals {
  totalExpense: number;
  totalIncome: number;
}

export interface FinancialTransaction {
  id: string;
  description: string;
  amount: number;
  timestamp: string;
}

export interface DailyFinancialLog {
  id: string;
  date: string;
  dailyTotals: FinancialTotals;
  transactions: Record<string, FinancialTransaction[]>;
}

export async function fetchDailyFinanceLogs(days?: number) {
  const query = days ? `?days=${days}` : '';
  const response = await fetch(`${API_BASE_URL}/finance/daily-logs${query}`);
  if (!response.ok) {
    throw new Error('Failed to fetch daily finance logs');
  }
  return response.json();
}
