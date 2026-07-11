import { useCallback, useEffect, useState } from 'react'
import type {
  CalendarItem,
  DailyFinancialLog,
  DailyLog,
  DailyTask,
  FocusDaySummary,
  HydrationData,
  LearningsSummary,
  MindEntry,
  MindSummary,
  SleepEntry,
  StravaActivity,
  StravaActivityStats,
} from '../../../lib/api'
import {
  fetchCalendarItemsForRange,
  fetchDailyFinanceLogs,
  fetchDailyLogRange,
  fetchFocusHistory,
  fetchHydration,
  fetchLearningsSummary,
  fetchMindEntries,
  fetchMindSummary,
  fetchNutritionSummary,
  fetchSleepEntries,
  fetchSpendingSummary,
  fetchStravaActivities,
  fetchStravaActivityStats,
  fetchTasksForRange,
} from '../../../lib/api'
import type { NutritionSummary, SpendingSummary } from './home-types'
import { addDaysIso, isoDate } from './home-types'

/** Days of history fetched for series, streak strips, and the insights window. */
export const HOME_WINDOW_DAYS = 14

export type Slice<T> = {
  data: T | null
  failed: boolean
}

const emptySlice = { data: null, failed: false }

async function settle<T, R>(
  promise: Promise<T>,
  pick: (result: T) => R | null | undefined,
  set: (slice: Slice<R>) => void,
): Promise<void> {
  try {
    const result = await promise
    set({ data: pick(result) ?? null, failed: false })
  } catch {
    set({ data: null, failed: true })
  }
}

export interface HomeData {
  today: string
  loading: boolean
  nutrition: Slice<NutritionSummary>
  hydration: Slice<HydrationData>
  tasks: Slice<DailyTask[]>
  calendarToday: Slice<CalendarItem[]>
  sleep: Slice<SleepEntry[]>
  focus: Slice<FocusDaySummary[]>
  moods: Slice<DailyLog[]>
  workouts: Slice<StravaActivity[]>
  workoutStats: Slice<StravaActivityStats>
  learnings: Slice<LearningsSummary>
  mind: Slice<MindSummary>
  mindEntries: Slice<MindEntry[]>
  spending: Slice<SpendingSummary>
  finance: Slice<DailyFinancialLog[]>
  refetch: () => Promise<void>
  reloadSleep: () => Promise<void>
  reloadHydration: () => Promise<void>
  patchHydration: (data: HydrationData) => void
  patchMind: (patch: Partial<MindSummary>) => void
}

/**
 * Home reads every domain through its existing endpoint, each request settled
 * independently: a failing store marks only its own slice as failed and the
 * rest of the page renders normally.
 */
export function useHomeData(): HomeData {
  const today = isoDate()
  const windowStart = addDaysIso(today, -(HOME_WINDOW_DAYS - 1))

  const [loading, setLoading] = useState(true)
  const [nutrition, setNutrition] = useState<Slice<NutritionSummary>>(emptySlice)
  const [hydration, setHydration] = useState<Slice<HydrationData>>(emptySlice)
  const [tasks, setTasks] = useState<Slice<DailyTask[]>>(emptySlice)
  const [calendarToday, setCalendarToday] = useState<Slice<CalendarItem[]>>(emptySlice)
  const [sleep, setSleep] = useState<Slice<SleepEntry[]>>(emptySlice)
  const [focus, setFocus] = useState<Slice<FocusDaySummary[]>>(emptySlice)
  const [moods, setMoods] = useState<Slice<DailyLog[]>>(emptySlice)
  const [workouts, setWorkouts] = useState<Slice<StravaActivity[]>>(emptySlice)
  const [workoutStats, setWorkoutStats] = useState<Slice<StravaActivityStats>>(emptySlice)
  const [learnings, setLearnings] = useState<Slice<LearningsSummary>>(emptySlice)
  const [mind, setMind] = useState<Slice<MindSummary>>(emptySlice)
  const [mindEntries, setMindEntries] = useState<Slice<MindEntry[]>>(emptySlice)
  const [spending, setSpending] = useState<Slice<SpendingSummary>>(emptySlice)
  const [finance, setFinance] = useState<Slice<DailyFinancialLog[]>>(emptySlice)

  const reloadSleep = useCallback(async () => {
    await settle(fetchSleepEntries(windowStart, today), (r) => r.data, setSleep)
  }, [windowStart, today])

  const reloadHydration = useCallback(async () => {
    await settle(fetchHydration(today), (r) => r.data as HydrationData, setHydration)
  }, [today])

  const refetch = useCallback(async () => {
    await Promise.allSettled([
      settle(fetchNutritionSummary(today), (r) => r.data as NutritionSummary, setNutrition),
      settle(fetchHydration(today), (r) => r.data as HydrationData, setHydration),
      settle(fetchTasksForRange(windowStart, today), (r) => r.data as DailyTask[], setTasks),
      settle(fetchCalendarItemsForRange(today, today), (r) => r.data as CalendarItem[], setCalendarToday),
      settle(fetchSleepEntries(windowStart, today), (r) => r.data, setSleep),
      settle(fetchFocusHistory(windowStart, today), (r) => r.data, setFocus),
      settle(fetchDailyLogRange(windowStart, today), (r) => r.data, setMoods),
      settle(fetchStravaActivities(), (r) => r.data as StravaActivity[], setWorkouts),
      settle(fetchStravaActivityStats(), (r) => r.data as StravaActivityStats, setWorkoutStats),
      settle(fetchLearningsSummary(today), (r) => r.data as LearningsSummary, setLearnings),
      settle(fetchMindSummary(today), (r) => r.data, setMind),
      settle(fetchMindEntries('THOUGHT'), (r) => r.data as MindEntry[], setMindEntries),
      settle(fetchSpendingSummary(today.slice(0, 7)), (r) => r.data as SpendingSummary, setSpending),
      settle(fetchDailyFinanceLogs(HOME_WINDOW_DAYS), (r) => r.data as DailyFinancialLog[], setFinance),
    ])
    setLoading(false)
  }, [today, windowStart])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refetch()
  }, [refetch])

  useEffect(() => {
    const handleUpdate = () => {
      void refetch()
    }
    window.addEventListener('calendar-updated', handleUpdate)
    return () => window.removeEventListener('calendar-updated', handleUpdate)
  }, [refetch])

  const patchHydration = useCallback((data: HydrationData) => {
    setHydration({ data, failed: false })
  }, [])

  const patchMind = useCallback((patch: Partial<MindSummary>) => {
    setMind((prev) => (prev.data ? { data: { ...prev.data, ...patch }, failed: false } : prev))
  }, [])

  return {
    today,
    loading,
    nutrition,
    hydration,
    tasks,
    calendarToday,
    sleep,
    focus,
    moods,
    workouts,
    workoutStats,
    learnings,
    mind,
    mindEntries,
    spending,
    finance,
    refetch,
    reloadSleep,
    reloadHydration,
    patchHydration,
    patchMind,
  }
}
