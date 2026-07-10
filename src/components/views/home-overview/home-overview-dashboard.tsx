import { useCallback, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { CheckSquare, Moon, Utensils } from 'lucide-react'
import type { SleepEntryPayload } from '../../../lib/api'
import {
  addLearning,
  addTask,
  addWaterIntake,
  createMindEntry,
  logSleep,
  saveMindMood,
} from '../../../lib/api'
import type { AppPath } from '../../dashboard/quantified-self-dashboard/data'
import { useFocus } from '../../../contexts/FocusContext'
import { SosOverlay } from '../mind-overview/components/sos-overlay'
import { HomeHeader } from './components/home-header'
import type { QuickAddAction } from './components/home-header'
import { TodayHeroCard } from './components/today-hero-card'
import { SleepCard } from './components/sleep-card'
import { InsightsCard } from './components/insights-card'
import { MomentumCard } from './components/momentum-card'
import { buildHabitStrips } from './habit-strips'
import { QuickCaptureCard } from './components/quick-capture-card'
import type { QuickCaptureMode } from './components/quick-capture-card'
import { WeekRollupCard } from './components/week-rollup-card'
import { buildDayRecords, countActiveDays, generateInsights, INSIGHT_WINDOW_DAYS } from './insights-engine'
import { lastNDates, WATER_QUICK_ADD_ML } from './home-types'
import { HOME_WINDOW_DAYS, useHomeData } from './use-home-data'
import './home-overview.css'

const CAPTURE_TOASTS: Record<QuickCaptureMode, string> = {
  task: 'Added to today’s tasks.',
  thought: 'Captured. It has a home now — not your head.',
  win: 'Filed as evidence.',
  learning: 'Logged to today’s learnings.',
}

type HomeOverviewDashboardProps = {
  onNavigate: (pathname: AppPath, search?: string) => void
}

function HomeOverviewDashboard({ onNavigate }: HomeOverviewDashboardProps) {
  const home = useHomeData()
  const { session: focusSession } = useFocus()
  const [sosOpen, setSosOpen] = useState(false)
  const [captureRequest, setCaptureRequest] = useState<{ mode: QuickCaptureMode; nonce: number } | null>(null)

  const weekDates = useMemo(() => lastNDates(INSIGHT_WINDOW_DAYS, home.today), [home.today])
  const windowDates = useMemo(() => lastNDates(HOME_WINDOW_DAYS, home.today), [home.today])

  // The 14-day cross-domain series every derived view (insights, momentum) reads from.
  const dayRecords = useMemo(
    () =>
      buildDayRecords({
        days: windowDates,
        sleep: home.sleep.data,
        focus: home.focus.data,
        moods: home.moods.data,
        tasks: home.tasks.data,
        workouts: home.workouts.data,
        nutrition: home.nutrition.data,
        finance: home.finance.data,
        learnings: home.learnings.data,
      }),
    [
      windowDates,
      home.sleep.data,
      home.focus.data,
      home.moods.data,
      home.tasks.data,
      home.workouts.data,
      home.nutrition.data,
      home.finance.data,
      home.learnings.data,
    ],
  )

  const weekRecords = useMemo(
    () => dayRecords.filter((r) => weekDates.includes(r.date)),
    [dayRecords, weekDates],
  )

  const insights = useMemo(
    () =>
      generateInsights(weekRecords, {
        proteinGoal: home.nutrition.data?.proteinGoal ?? null,
        spending: home.spending.data,
        workoutStreakWeeks: home.workoutStats.data?.currentStreakWeeks ?? 0,
        learningStreakDays: home.learnings.data?.stats?.streakDays ?? 0,
      }),
    [weekRecords, home.nutrition.data, home.spending.data, home.workoutStats.data, home.learnings.data],
  )

  const habitStrips = useMemo(() => buildHabitStrips(dayRecords, weekDates), [dayRecords, weekDates])

  const bestStreak = useMemo(
    () =>
      habitStrips.reduce(
        (best, strip) => (strip.streak > best.streak ? { streak: strip.streak, label: strip.label } : best),
        { streak: 0, label: 'No active streak yet' },
      ),
    [habitStrips],
  )

  const todayRecord = dayRecords[dayRecords.length - 1]
  const todayTasks = useMemo(
    () => (home.tasks.data ?? []).filter((t) => t.date === home.today),
    [home.tasks.data, home.today],
  )
  const overdueCount = useMemo(
    () => (home.tasks.data ?? []).filter((t) => t.date && t.date < home.today && !t.completed).length,
    [home.tasks.data, home.today],
  )

  const avgSleepMinutes = useMemo(() => {
    const nights = weekRecords.filter((r) => r.sleepMinutes != null)
    if (nights.length === 0) return null
    return Math.round(nights.reduce((sum, r) => sum + (r.sleepMinutes as number), 0) / nights.length)
  }, [weekRecords])

  const isFirstRun =
    !home.loading &&
    countActiveDays(dayRecords) === 0 &&
    (home.sleep.data?.length ?? 0) === 0 &&
    (home.tasks.data?.length ?? 0) === 0

  const handleMoodSelect = useCallback(
    async (value: number) => {
      const next = home.mind.data?.moodScore === value ? null : value
      home.patchMind({ moodScore: next })
      if (next != null) {
        try {
          await saveMindMood(home.today, next)
        } catch {
          /* mood is a soft signal; don't nag on failure */
        }
      }
    },
    [home],
  )

  const handleAddWater = useCallback(async () => {
    try {
      const res = await addWaterIntake(WATER_QUICK_ADD_ML, home.today)
      if (res?.data) {
        home.patchHydration(res.data)
      } else {
        await home.reloadHydration()
      }
      toast.success(`+${WATER_QUICK_ADD_ML}ml logged.`)
    } catch {
      toast.error('Could not log water — try again.')
    }
  }, [home])

  const handleQuickAdd = useCallback(
    (action: QuickAddAction) => {
      if (action === 'water') {
        void handleAddWater()
        return
      }
      if (action === 'meal') {
        onNavigate('/nutrition')
        return
      }
      setCaptureRequest((prev) => ({ mode: action, nonce: (prev?.nonce ?? 0) + 1 }))
      document.querySelector('.home-card--capture')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    },
    [handleAddWater, onNavigate],
  )

  const handleCapture = useCallback(
    async (mode: QuickCaptureMode, text: string) => {
      try {
        if (mode === 'task') {
          await addTask({ title: text, date: home.today })
          window.dispatchEvent(new CustomEvent('calendar-updated'))
        } else if (mode === 'thought') {
          await createMindEntry({ text, date: home.today })
        } else if (mode === 'win') {
          await createMindEntry({ type: 'WIN', text, date: home.today })
        } else {
          await addLearning({
            title: text.length > 80 ? `${text.slice(0, 79).trim()}…` : text,
            description: text,
            category: 'General',
            date: home.today,
          })
        }
        toast.success(CAPTURE_TOASTS[mode])
        if (mode === 'task' || mode === 'learning') {
          void home.refetch()
        }
      } catch {
        toast.error('Could not save that — try again.')
        throw new Error('capture failed')
      }
    },
    [home],
  )

  const handleLogSleep = useCallback(
    async (payload: SleepEntryPayload) => {
      try {
        await logSleep(payload)
        await home.reloadSleep()
        toast.success('Night logged. Sleep well tonight too.')
      } catch {
        toast.error('Could not save sleep — try again.')
        throw new Error('sleep log failed')
      }
    },
    [home],
  )

  return (
    <div className="home-dashboard">
      <HomeHeader
        dateIso={home.today}
        mood={home.mind.data?.moodScore ?? null}
        onMoodSelect={(value) => void handleMoodSelect(value)}
        streakDays={bestStreak.streak}
        streakLabel={bestStreak.streak > 0 ? `${bestStreak.label}: ${bestStreak.streak} days` : bestStreak.label}
        onQuickAdd={handleQuickAdd}
        onOpenSos={() => setSosOpen(true)}
      />

      {isFirstRun && (
        <section className="home-card home-card--welcome" aria-label="Welcome">
          <h2>Welcome to your Life OS.</h2>
          <p>This page learns from what you log. Start with any one of these:</p>
          <div className="home-welcome-actions">
            <button type="button" onClick={() => document.querySelector<HTMLButtonElement>('.home-card--sleep .home-btn-primary')?.click()}>
              <Moon size={14} /> Log last night's sleep
            </button>
            <button type="button" onClick={() => onNavigate('/nutrition')}>
              <Utensils size={14} /> Log your first meal
            </button>
            <button type="button" onClick={() => handleQuickAdd('task')}>
              <CheckSquare size={14} /> Add your first task
            </button>
          </div>
        </section>
      )}

      <TodayHeroCard
        loading={home.loading}
        nutrition={home.nutrition.data}
        calendarItems={home.calendarToday.data}
        todayTasks={todayTasks}
        overdueCount={overdueCount}
        hydration={home.hydration.data}
        focusMinutesToday={todayRecord?.focusMinutes ?? 0}
        focusRunning={focusSession?.status === 'RUNNING'}
        onAddWater={() => void handleAddWater()}
        onStartFocus={() => onNavigate('/learnings')}
        onNavigate={onNavigate}
      />

      <div className="home-grid">
        <SleepCard
          loading={home.loading}
          failed={home.sleep.failed}
          entries={home.sleep.data}
          today={home.today}
          onLog={handleLogSleep}
          onRetry={() => void home.reloadSleep()}
        />

        <InsightsCard
          loading={home.loading}
          insights={insights}
          activeDays={countActiveDays(weekRecords)}
          onRefresh={() => void home.refetch()}
        />

        <MomentumCard loading={home.loading} strips={habitStrips} weekDates={weekDates} />

        <QuickCaptureCard onCapture={handleCapture} focusRequest={captureRequest} />

        <WeekRollupCard
          loading={home.loading}
          mind={home.mind.data}
          nutrition={home.nutrition.data}
          spending={home.spending.data}
          avgSleepMinutes={avgSleepMinutes}
        />
      </div>

      <SosOverlay open={sosOpen} onClose={() => setSosOpen(false)} />
    </div>
  )
}

export { HomeOverviewDashboard }
