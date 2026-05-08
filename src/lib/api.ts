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

export async function updateFoodEntry(id: string, data: { description: string; calories: number; proteinGrams: number; mealType: string; date: string }) {
  const response = await fetch(`${API_BASE_URL}/health/food/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to update food entry');
  }
  return response.json();
}

export async function deleteFoodEntry(id: string) {
  const response = await fetch(`${API_BASE_URL}/health/food/${id}`, {
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
