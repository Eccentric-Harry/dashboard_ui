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
import { calendarService } from '../../../services/calendar-service'
import { financeService } from '../../../services/finance-service'
import { focusService } from '../../../services/focus-service'
import { learningsService } from '../../../services/learnings-service'
import { mindService } from '../../../services/mind-service'
import { nutritionService } from '../../../services/nutrition-service'
import { sleepService } from '../../../services/sleep-service'
import { tasksService } from '../../../services/tasks-service'
import { workoutsService } from '../../../services/workouts-service'
import type { FocusSuggestion } from '../../../types/focus'
import type { NutritionSummary, SpendingSummary } from './home-types'
import { addDaysIso, isoDate } from './home-types'

/** Days of history fetched for series, streak strips, and the insights window. */
export const HOME_WINDOW_DAYS = 14

export type Slice<T> = {
  data: T | null
  failed: boolean
}

const emptySlice = { data: null, failed: false }

async function settle<R>(
  promise: Promise<{ data?: R | null; error?: unknown }>,
  set: (slice: Slice<R>) => void,
): Promise<void> {
  const result = await promise
  if (result.error) {
    set({ data: null, failed: true })
  } else {
    set({ data: result.data ?? null, failed: false })
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
  anchors: Slice<MindEntry[]>
  focusSuggestions: Slice<FocusSuggestion[]>
  spending: Slice<SpendingSummary>
  finance: Slice<DailyFinancialLog[]>
  refetch: () => Promise<void>
  reloadAnchors: () => Promise<void>
  reloadFocus: () => Promise<void>
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
  const [anchors, setAnchors] = useState<Slice<MindEntry[]>>(emptySlice)
  const [focusSuggestions, setFocusSuggestions] = useState<Slice<FocusSuggestion[]>>(emptySlice)
  const [spending, setSpending] = useState<Slice<SpendingSummary>>(emptySlice)
  const [finance, setFinance] = useState<Slice<DailyFinancialLog[]>>(emptySlice)

  const reloadSleep = useCallback(async () => {
    await settle<SleepEntry[]>(sleepService.getEntries(windowStart, today), setSleep)
  }, [windowStart, today])

  const reloadAnchors = useCallback(async () => {
    await settle<MindEntry[]>(mindService.getEntries('INTENTION'), setAnchors)
  }, [])

  /** Focus history + calendar suggestions move together: importing a block changes both. */
  const reloadFocus = useCallback(async () => {
    await Promise.allSettled([
      settle<FocusDaySummary[]>(focusService.getHistory(windowStart, today), setFocus),
      settle<FocusSuggestion[]>(
        focusService.getCalendarSuggestions(windowStart, today),
        setFocusSuggestions,
      ),
    ])
  }, [windowStart, today])

  const reloadHydration = useCallback(async () => {
    await settle<HydrationData>(nutritionService.getHydration(today), setHydration)
  }, [today])

  const refetch = useCallback(async () => {
    await Promise.allSettled([
      settle<NutritionSummary>(nutritionService.getSummary(today) as Promise<{ data?: NutritionSummary; error?: unknown }>, setNutrition),
      settle<HydrationData>(nutritionService.getHydration(today), setHydration),
      // End date runs past today so the Tasks card can show upcoming pending
      // items, not just today's + overdue. Every other consumer of this slice
      // filters by date, so the wider window is inert for them.
      settle<DailyTask[]>(tasksService.getTasksRange(windowStart, addDaysIso(today, 21)), setTasks),
      settle<CalendarItem[]>(calendarService.getItemsForRange(today, today), setCalendarToday),
      settle<SleepEntry[]>(sleepService.getEntries(windowStart, today), setSleep),
      settle<FocusDaySummary[]>(focusService.getHistory(windowStart, today), setFocus),
      settle<DailyLog[]>(mindService.getDailyLogRange(windowStart, today), setMoods),
      settle<StravaActivity[]>(workoutsService.getActivities(), setWorkouts),
      settle<StravaActivityStats>(workoutsService.getStats(), setWorkoutStats),
      settle<LearningsSummary>(learningsService.getSummary(today), setLearnings),
      settle<MindSummary>(mindService.getSummary(today), setMind),
      settle<MindEntry[]>(mindService.getEntries('THOUGHT'), setMindEntries),
      settle<MindEntry[]>(mindService.getEntries('INTENTION'), setAnchors),
      settle<FocusSuggestion[]>(
        focusService.getCalendarSuggestions(windowStart, today),
        setFocusSuggestions,
      ),
      settle<SpendingSummary>(financeService.getSpendingSummary(today.slice(0, 7)) as Promise<{ data?: SpendingSummary; error?: unknown }>, setSpending),
      settle<DailyFinancialLog[]>(financeService.getDailyLogs(HOME_WINDOW_DAYS), setFinance),
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
    anchors,
    focusSuggestions,
    spending,
    finance,
    refetch,
    reloadAnchors,
    reloadFocus,
    reloadSleep,
    reloadHydration,
    patchHydration,
    patchMind,
  }
}
