const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1';

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

export async function addTransaction(data: { description: string; amount: number; category: string; type: string; date: string }) {
  const response = await fetch(`${API_BASE_URL}/finance/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to add transaction');
  }
  return response.json();
}

export async function updateTransaction(id: string, data: { description: string; amount: number; category: string; type: string; date: string }) {
  const response = await fetch(`${API_BASE_URL}/finance/transactions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to update transaction');
  }
  return response.json();
}

export async function deleteTransaction(id: string) {
  const response = await fetch(`${API_BASE_URL}/finance/transactions/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete transaction');
  }
  // Delete typically returns 204 No Content, so we don't try to parse JSON.
}

export interface RepaymentInstallment {
  id: string;
  dueDate: string;
  amount: string;
  status: string;
}

export async function fetchSliceRepayments() {
  const response = await fetch(`${API_BASE_URL}/finance/slice-repayments`);
  if (!response.ok) {
    throw new Error('Failed to fetch Slice repayments');
  }
  return response.json();
}

// ─── Strava Activities ───────────────────────────────────────────────

export interface StravaActivity {
  id: string;
  stravaEmbedId?: string;
  stravaToken?: string;
  date: string;
  activityName: string;
  sportType: string;
  distanceKm: number;
  movingTime: string;
  movingTimeMinutes: number;
  elevationGainMeters: number;
  paceMinPerKm?: number;
  source: string;
  startTime?: string;
  activityUrl?: string;
}

export interface StravaActivityStats {
  totalDistanceKm: number;
  totalActivities: number;
  totalMovingTimeMinutes: number;
  totalElevationMeters: number;
  best5kPaceMinPerKm: number | null;
  best5kPaceFormatted: string;
  countBySportType: Record<string, number>;
  distanceBySportType: Record<string, number>;
  currentStreakWeeks: number;
  recentEmbeds: Array<{ id: string; token?: string }>;
}

export async function fetchStravaActivities() {
  const response = await fetch(`${API_BASE_URL}/workouts/activities`);
  if (!response.ok) {
    throw new Error('Failed to fetch Strava activities');
  }
  return response.json();
}

export async function fetchStravaActivityStats() {
  const response = await fetch(`${API_BASE_URL}/workouts/activities/stats`);
  if (!response.ok) {
    throw new Error('Failed to fetch Strava activity stats');
  }
  return response.json();
}

export async function createStravaActivity(data: {
  activityName: string;
  sportType: string;
  distanceKm: number;
  movingTime: string;
  elevationGainMeters: number;
  date: string;
  stravaEmbedId?: string;
  stravaToken?: string;
}) {
  const response = await fetch(`${API_BASE_URL}/workouts/activities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to create Strava activity');
  }
  return response.json();
}

export async function importStravaJson(payload: any) {
  const response = await fetch(`${API_BASE_URL}/workouts/import/strava`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error('Failed to import Strava JSON');
  }
  return response.json();
}

export async function fetchFeaturedStravaEmbed() {
  const response = await fetch(`${API_BASE_URL}/workouts/featured-embed`);
  if (!response.ok) {
    throw new Error('Failed to fetch featured Strava embed');
  }
  const result = await response.json();
  return result.data;
}

export async function updateFeaturedStravaEmbed(data: { id: string; token?: string }) {
  const response = await fetch(`${API_BASE_URL}/workouts/featured-embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to update featured Strava embed');
  }
  return response.json();
}

// ─── Learnings API ───────────────────────────────────────────────────

export interface LearningLog {
  id?: string;
  title: string;
  description: string;
  category: string;
  date: string; // YYYY-MM-DD
  createdAt?: string;
}

export async function fetchLearnings(date?: string) {
  const query = date ? `?date=${date}` : '';
  const response = await fetch(`${API_BASE_URL}/learnings${query}`);
  if (!response.ok) {
    throw new Error('Failed to fetch learnings');
  }
  return response.json();
}

export async function fetchLearningsForRange(startDate: string, endDate: string) {
  const response = await fetch(`${API_BASE_URL}/learnings/range?startDate=${startDate}&endDate=${endDate}`);
  if (!response.ok) {
    throw new Error('Failed to fetch learnings in range');
  }
  return response.json();
}

export async function addLearning(data: Omit<LearningLog, 'id'>) {
  const response = await fetch(`${API_BASE_URL}/learnings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to add learning');
  }
  return response.json();
}

export async function updateLearning(id: string, data: Omit<LearningLog, 'id'>) {
  const response = await fetch(`${API_BASE_URL}/learnings/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to update learning');
  }
  return response.json();
}

export async function deleteLearning(id: string) {
  const response = await fetch(`${API_BASE_URL}/learnings/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete learning');
  }
  return response.json();
}

// ─── Learnings Summary & Tasks ───────────────────────────────────────

export interface LearningsCategoryCount {
  name: string;
  count: number;
}

export interface LearningsTodaySummary {
  learningsCount: number;
  tasksTotal: number;
  tasksCompleted: number;
  categories: LearningsCategoryCount[];
}

export interface LearningsTimelineDay {
  date: string;
  learningsCount: number;
  tasksCompleted: number;
  intensity: number;
}

export interface LearningsStatsSummary {
  weeklyLearningCount: number;
  streakDays: number;
}

export interface LearningsSummary {
  date: string;
  today: LearningsTodaySummary;
  timeline: LearningsTimelineDay[];
  stats: LearningsStatsSummary;
}

export async function fetchLearningsSummary(date?: string) {
  const query = date ? `?date=${date}` : '';
  const response = await fetch(`${API_BASE_URL}/dashboard/learnings-summary${query}`);
  if (!response.ok) {
    throw new Error('Failed to fetch learnings summary');
  }
  return response.json();
}

export interface DailyTask {
  id?: string;
  title: string;
  date: string;
  scheduledTime?: string;
  notes?: string;
  completed?: boolean;
  sortOrder?: number;
  createdAt?: string;
  completedAt?: string;
}

export async function fetchTasks(date: string) {
  const response = await fetch(`${API_BASE_URL}/learnings/tasks?date=${date}`);
  if (!response.ok) {
    throw new Error('Failed to fetch tasks');
  }
  return response.json();
}

export async function fetchTasksForRange(startDate: string, endDate: string) {
  const response = await fetch(
    `${API_BASE_URL}/learnings/tasks/range?startDate=${startDate}&endDate=${endDate}`,
  );
  if (!response.ok) {
    throw new Error('Failed to fetch tasks in range');
  }
  return response.json();
}

export async function addTask(data: Omit<DailyTask, 'id'>) {
  const response = await fetch(`${API_BASE_URL}/learnings/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to add task');
  }
  return response.json();
}

export async function updateTask(id: string, data: Omit<DailyTask, 'id'>) {
  const response = await fetch(`${API_BASE_URL}/learnings/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to update task');
  }
  return response.json();
}

export async function toggleTask(id: string) {
  const response = await fetch(`${API_BASE_URL}/learnings/tasks/${id}/toggle`, {
    method: 'PATCH',
  });
  if (!response.ok) {
    throw new Error('Failed to toggle task');
  }
  return response.json();
}

export async function deleteTask(id: string) {
  const response = await fetch(`${API_BASE_URL}/learnings/tasks/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete task');
  }
  return response.json();
}

// ─── Calendar API ───────────────────────────────────────────────────

export type CalendarItemType = 'TASK' | 'EVENT' | 'REMINDER' | 'MILESTONE';
export type CalendarRecurrence = 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface CalendarItem {
  id?: string;
  occurrenceId?: string;
  date: string;
  originalDate?: string;
  title: string;
  startTime?: string;
  endTime?: string;
  allDay?: boolean;
  itemType?: CalendarItemType;
  category?: string;
  color?: string;
  notes?: string;
  completed?: boolean;
  sortOrder?: number;
  recurrenceFrequency?: CalendarRecurrence;
  recurrenceUntil?: string;
  createdAt?: string;
}

export type CalendarItemPayload = {
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  allDay?: boolean;
  itemType?: CalendarItemType;
  category?: string;
  color?: string;
  notes?: string;
  completed?: boolean;
  sortOrder?: number;
  recurrenceFrequency?: CalendarRecurrence;
  recurrenceUntil?: string;
};

export async function fetchCalendarItemsForRange(startDate: string, endDate: string) {
  const response = await fetch(
    `${API_BASE_URL}/calendar/items/range?startDate=${startDate}&endDate=${endDate}`,
  );
  if (!response.ok) {
    throw new Error('Failed to fetch calendar items');
  }
  return response.json();
}

export async function createCalendarItem(data: CalendarItemPayload) {
  const response = await fetch(`${API_BASE_URL}/calendar/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to create calendar item');
  }
  return response.json();
}

export async function updateCalendarItem(id: string, data: CalendarItemPayload) {
  const response = await fetch(`${API_BASE_URL}/calendar/items/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to update calendar item');
  }
  return response.json();
}

export async function toggleCalendarItem(id: string) {
  const response = await fetch(`${API_BASE_URL}/calendar/items/${id}/toggle`, {
    method: 'PATCH',
  });
  if (!response.ok) {
    throw new Error('Failed to toggle calendar item');
  }
  return response.json();
}

export async function deleteCalendarItem(id: string) {
  const response = await fetch(`${API_BASE_URL}/calendar/items/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete calendar item');
  }
  return response.json();
}

export interface DailyLog {
  id?: string;
  date?: string;
  newLearnings?: string[];
  moodRating?: string;
}

// Global active GET request tracking for route navigation loader
let activeGetRequests = 0;
const requestChangeListeners = new Set<(count: number) => void>();

export function subscribeToActiveRequests(listener: (count: number) => void) {
  requestChangeListeners.add(listener);
  listener(activeGetRequests);
  return () => {
    requestChangeListeners.delete(listener);
  };
}

if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const url = typeof args[0] === 'string' ? args[0] : args[0] instanceof URL ? args[0].href : '';
    const options = args[1];
    const isGet = !options || !options.method || options.method.toUpperCase() === 'GET';
    const isLocalApi = url.includes('/api/v1/');

    const shouldTrack = isGet && isLocalApi;
    if (shouldTrack) {
      activeGetRequests++;
      requestChangeListeners.forEach(cb => cb(activeGetRequests));
    }

    try {
      return await originalFetch(...args);
    } finally {
      if (shouldTrack) {
        activeGetRequests--;
        requestChangeListeners.forEach(cb => cb(activeGetRequests));
      }
    }
  };
}

