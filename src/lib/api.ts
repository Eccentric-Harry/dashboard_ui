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
