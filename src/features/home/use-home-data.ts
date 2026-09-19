import { useEffect, useMemo } from 'react'
import { homeActions, useHomeStore, type HomeWindow } from '@/store/home-store'
import type { RemoteDataStatus } from '@/store/zustand-utils'
import type { DailyFinancialLog, SpendingSummary } from '@/types/finance'
import type { FocusDaySummary, FocusSuggestion } from '@/types/focus'
import type { LearningsSummary } from '@/types/learnings'
import type { DailyLog, MindEntry, MindSummary } from '@/types/mind'
import type { HydrationData, NutritionSummary } from '@/types/nutrition'
import type { SleepEntry } from '@/types/sleep'
import type { DailyTask } from '@/types/tasks'
import type { StravaActivity, StravaActivityStats } from '@/types/workouts'
import { addDaysIso, isoDate } from './home-types'

/** Days of history fetched for series, streak strips, and the insights window. */
export const HOME_WINDOW_DAYS = 14

/** Tasks are read this far past today so the Tasks card can show upcoming items too. */
const UPCOMING_TASK_DAYS = 21

export type Slice<T> = RemoteDataStatus<T | null>

export interface HomeData {
  today: string
  /** True until the first full load has settled. */
  loading: boolean
  nutrition: Slice<NutritionSummary>
  hydration: Slice<HydrationData>
  tasks: Slice<DailyTask[]>
  sleep: Slice<SleepEntry[]>
  focus: Slice<FocusDaySummary[]>
  moods: Slice<DailyLog[]>
  workouts: Slice<StravaActivity[]>
  workoutStats: Slice<StravaActivityStats>
  learnings: Slice<LearningsSummary>
  mind: Slice<MindSummary>
  mindEntries: Slice<MindEntry[]>
  wins: Slice<MindEntry[]>
  anchors: Slice<MindEntry[]>
  focusSuggestions: Slice<FocusSuggestion[]>
  spending: Slice<SpendingSummary>
  finance: Slice<DailyFinancialLog[]>
  refetch: () => Promise<void>
  reloadAnchors: () => Promise<void>
  reloadMindEntries: () => Promise<void>
  reloadWins: () => Promise<void>
  reloadFocus: () => Promise<void>
  reloadSleep: () => Promise<void>
  reloadHydration: () => Promise<void>
  patchHydration: (data: HydrationData) => void
  patchMind: (patch: Partial<MindSummary>) => void
}

/**
 * The /home read model, backed by the home store. Loads on mount (and when the day
 * rolls over), and refetches whenever a calendar/task mutation happens elsewhere.
 */
export function useHomeData(): HomeData {
  const today = isoDate()
  const homeWindow = useMemo<HomeWindow>(
    () => ({
      today,
      start: addDaysIso(today, -(HOME_WINDOW_DAYS - 1)),
      tasksUntil: addDaysIso(today, UPCOMING_TASK_DAYS),
      days: HOME_WINDOW_DAYS,
    }),
    [today],
  )

  const initialized = useHomeStore.use.initialized()
  const nutrition = useHomeStore.use.nutrition()
  const hydration = useHomeStore.use.hydration()
  const tasks = useHomeStore.use.tasks()
  const sleep = useHomeStore.use.sleep()
  const focus = useHomeStore.use.focus()
  const moods = useHomeStore.use.moods()
  const workouts = useHomeStore.use.workouts()
  const workoutStats = useHomeStore.use.workoutStats()
  const learnings = useHomeStore.use.learnings()
  const mind = useHomeStore.use.mind()
  const mindEntries = useHomeStore.use.mindEntries()
  const wins = useHomeStore.use.wins()
  const anchors = useHomeStore.use.anchors()
  const focusSuggestions = useHomeStore.use.focusSuggestions()
  const spending = useHomeStore.use.spending()
  const finance = useHomeStore.use.finance()

  useEffect(() => {
    void homeActions.load(homeWindow)
  }, [homeWindow])

  useEffect(() => {
    const handleUpdate = () => {
      void homeActions.refetch()
    }
    window.addEventListener('calendar-updated', handleUpdate)
    return () => window.removeEventListener('calendar-updated', handleUpdate)
  }, [])

  return {
    today,
    loading: !initialized,
    nutrition,
    hydration,
    tasks,
    sleep,
    focus,
    moods,
    workouts,
    workoutStats,
    learnings,
    mind,
    mindEntries,
    wins,
    anchors,
    focusSuggestions,
    spending,
    finance,
    refetch: homeActions.refetch,
    reloadAnchors: homeActions.reloadAnchors,
    reloadMindEntries: homeActions.reloadMindEntries,
    reloadWins: homeActions.reloadWins,
    reloadFocus: homeActions.reloadFocus,
    reloadSleep: homeActions.reloadSleep,
    reloadHydration: homeActions.reloadHydration,
    patchHydration: homeActions.patchHydration,
    patchMind: homeActions.patchMind,
  }
}
