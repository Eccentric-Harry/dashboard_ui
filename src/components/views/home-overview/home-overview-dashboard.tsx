import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { CheckSquare, Droplets, Lightbulb, MessageCircle, Moon, Plus, Trophy, Utensils } from 'lucide-react'
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
import { HomeHeader } from './components/home-header'
import type { QuickAddAction } from './components/home-header'
import { ConfettiBurst } from './components/confetti-burst'
import { NonNegotiablesCard } from './components/non-negotiables-card'
import { TodayHeroCard } from './components/today-hero-card'
import { SleepCard } from './components/sleep-card'
import { InsightsCard } from './components/insights-card'
import { TrendsCard } from './components/trends-card'
import { QuickCaptureCard } from './components/quick-capture-card'
import type { QuickCaptureMode, RecentCapture } from './components/quick-capture-card'
import { WeekRollupCard } from './components/week-rollup-card'
import { buildDayRecords, countActiveDays, generateInsights, INSIGHT_WINDOW_DAYS } from './insights-engine'
import { promoteForHome } from '../../../lib/insights/engine'
import { buildBurndown, financeInsights } from '../../../lib/insights/finance'
import { buildMindDays, mindInsights } from '../../../lib/insights/mind'
import { nutritionDaysFromSummary, nutritionInsights } from '../../../lib/insights/nutrition'
import { DEFAULT_RING_TARGETS } from '../../../lib/api'
import { lastNDates, WATER_QUICK_ADD_ML } from './home-types'
import { HOME_WINDOW_DAYS, useHomeData } from './use-home-data'
import '../nutrition-overview/nutrition-redesign.css'
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
  const [captureRequest, setCaptureRequest] = useState<{ mode: QuickCaptureMode; nonce: number } | null>(null)
  const [fabOpen, setFabOpen] = useState(false)
  const [sleepFormNonce, setSleepFormNonce] = useState(0)
  const [confettiTrigger, setConfettiTrigger] = useState(0)
  const fabRef = useRef<HTMLDivElement | null>(null)

  const fireConfetti = useCallback(() => setConfettiTrigger((n) => n + 1), [])

  // Bottom-dock quick-add bubble opens the same expandable FAB menu
  useEffect(() => {
    const handler = () => setFabOpen(true)
    window.addEventListener('mobile-quick-add', handler)
    return () => window.removeEventListener('mobile-quick-add', handler)
  }, [])

  useEffect(() => {
    if (!fabOpen) return
    const handlePointer = (e: MouseEvent) => {
      if (fabRef.current && !fabRef.current.contains(e.target as Node)) setFabOpen(false)
    }
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFabOpen(false) }
    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [fabOpen])

  const weekDates = useMemo(() => lastNDates(INSIGHT_WINDOW_DAYS, home.today), [home.today])
  const windowDates = useMemo(() => lastNDates(HOME_WINDOW_DAYS, home.today), [home.today])

  // Profile-backed ring targets; defaults cover loading and failure alike.
  const ringTargets = home.targets.data ?? DEFAULT_RING_TARGETS

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
        mindEntries: home.mindEntries.data,
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
      home.mindEntries.data,
    ],
  )

  const weekRecords = useMemo(
    () => dayRecords.filter((r) => weekDates.includes(r.date)),
    [dayRecords, weekDates],
  )

  // Days 8–14 back — the rollup's week-over-week baseline.
  const prevWeekRecords = useMemo(
    () => dayRecords.filter((r) => !weekDates.includes(r.date)),
    [dayRecords, weekDates],
  )

  // Shared-engine finance input; also powers the "safe/day" rollup stat.
  const financeInput = useMemo(
    () =>
      home.spending.data
        ? {
            today: home.today,
            monthKey: home.today.slice(0, 7),
            logs: home.finance.data ?? [],
            monthlyBudget: home.spending.data.monthlyBudget ?? null,
            monthTotalSpentOverride: home.spending.data.totalSpent ?? null,
          }
        : null,
    [home.spending.data, home.finance.data, home.today],
  )

  // Top finance/nutrition findings from the shared engine — only urgent or
  // high-confidence ones bubble up to Home (max 2), keeping the feed curated.
  const promotedInsights = useMemo(() => {
    const domainInsights = []
    if (home.nutrition.data) {
      domainInsights.push(
        ...nutritionInsights({
          today: home.today,
          days: nutritionDaysFromSummary(
            home.nutrition.data.dailyCalories ?? {},
            home.nutrition.data.dailyProtein ?? {},
          ),
          proteinGoal: home.nutrition.data.proteinGoal ?? null,
          calorieTarget: home.nutrition.data.calorieGoal ?? null,
          tdee: null,
          fitnessGoal: null,
        }),
      )
    }
    if (financeInput) {
      domainInsights.push(...financeInsights(financeInput))
    }
    if (home.mindEntries.data) {
      domainInsights.push(
        ...mindInsights({
          today: home.today,
          days: buildMindDays(home.mindEntries.data, home.today, 30),
          windowDays: 30,
        }),
      )
    }
    return promoteForHome(domainInsights, 2)
  }, [home.nutrition.data, financeInput, home.mindEntries.data, home.today])

  const safePerDay = useMemo(() => {
    if (!financeInput) return null
    const burndown = buildBurndown(financeInput)
    return burndown?.isCurrentMonth ? Math.round(burndown.safePerDay) : null
  }, [financeInput])

  const insights = useMemo(
    () =>
      generateInsights(
        weekRecords,
        {
          proteinGoal: home.nutrition.data?.proteinGoal ?? null,
          spending: home.spending.data,
          workoutStreakWeeks: home.workoutStats.data?.currentStreakWeeks ?? 0,
          learningStreakDays: home.learnings.data?.stats?.streakDays ?? 0,
          sleepTargetMinutes: ringTargets.sleepTargetMinutes,
        },
        promotedInsights,
      ),
    [weekRecords, home.nutrition.data, home.spending.data, home.workoutStats.data, home.learnings.data, promotedInsights, ringTargets.sleepTargetMinutes],
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

  const todayMood = useMemo(
    () => (home.moods.data ?? []).find((log) => log.date === home.today)?.moodScore ?? null,
    [home.moods.data, home.today],
  )

  // Newest-first feed of what actually went through the Task/Thought/Win
  // capture grid today — fills the card's leftover footer space instead of
  // leaving it dead air.
  const recentCaptures = useMemo<RecentCapture[]>(() => {
    const fromTasks = todayTasks
      .filter((t) => t.createdAt)
      .map((t) => ({ id: `task-${t.id}`, mode: 'task' as const, text: t.title, at: t.createdAt as string }))
    const fromMind = (home.mindEntries.data ?? [])
      .filter((e) => (e.type === 'THOUGHT' || e.type === 'WIN') && e.date === home.today && e.createdAt)
      .map((e) => ({
        id: `mind-${e.id}`,
        mode: (e.type === 'WIN' ? 'win' : 'thought') as 'win' | 'thought',
        text: e.text,
        at: e.createdAt as string,
      }))
    return [...fromTasks, ...fromMind]
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 4)
  }, [todayTasks, home.mindEntries.data, home.today])

  const isFirstRun =
    !home.loading &&
    countActiveDays(dayRecords) === 0 &&
    (home.sleep.data?.length ?? 0) === 0 &&
    (home.tasks.data?.length ?? 0) === 0

  const handleAddWater = useCallback(async () => {
    const before = home.hydration.data?.waterIntakeMl ?? 0
    const target = home.hydration.data?.targetMl ?? 3000
    try {
      const res = await addWaterIntake(WATER_QUICK_ADD_ML, home.today)
      if (res?.data) {
        home.patchHydration(res.data)
      } else {
        await home.reloadHydration()
      }
      const after = res?.data?.waterIntakeMl ?? before + WATER_QUICK_ADD_ML
      if (before < target && after >= target) {
        fireConfetti()
        toast.success('Hydration goal hit — nice work. 💧')
      } else {
        toast.success(`+${WATER_QUICK_ADD_ML}ml logged.`)
      }
    } catch {
      toast.error('Could not log water — try again.')
    }
  }, [home, fireConfetti])

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
      if (action === 'sleep') {
        setSleepFormNonce((n) => n + 1)
        document.querySelector('.home-card--sleep')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
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

  const handleMood = useCallback(
    async (score: number) => {
      try {
        await saveMindMood(home.today, score)
        toast.success('Noted. Thanks for checking in.')
        void home.refetch()
      } catch {
        toast.error('Could not save mood — try again.')
        throw new Error('mood save failed')
      }
    },
    [home],
  )

  const handleLogSleep = useCallback(
    async (payload: SleepEntryPayload) => {
      try {
        await logSleep(payload)
        await home.reloadSleep()
        // A new night can close the REST ring — the hero listens for this.
        window.dispatchEvent(new CustomEvent('rings-updated'))
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
      <ConfettiBurst trigger={confettiTrigger} />
      <HomeHeader
        dateIso={home.today}
        onQuickAdd={handleQuickAdd}
        level={home.rings.data?.streak.level}
        xpIntoLevel={home.rings.data?.xpIntoLevel}
        xpForNextLevel={home.rings.data?.xpForNextLevel}
      />

      {/* Mobile FAB — fixed bottom-right, hidden on desktop via CSS */}
      {fabOpen && <div className="home-fab-overlay" onClick={() => setFabOpen(false)} aria-hidden="true" />}
      {fabOpen && (
        <div className="home-fab-actions" role="menu">
          {([
            ['task', CheckSquare, 'Task'],
            ['meal', Utensils, 'Meal'],
            ['water', Droplets, 'Water +250ml'],
            ['win', Trophy, 'Win'],
            ['thought', MessageCircle, 'Thought'],
            ['learning', Lightbulb, 'Learning'],
            ['sleep', Moon, 'Log Sleep'],
          ] as const).map(([action, Icon, label]) => (
            <button
              key={action}
              type="button"
              role="menuitem"
              className="home-fab-action"
              onClick={() => { setFabOpen(false); handleQuickAdd(action) }}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
      )}
      <div className="home-fab" ref={fabRef}>
        <button
          type="button"
          className={`home-fab-btn${fabOpen ? ' is-open' : ''}`}
          aria-haspopup="menu"
          aria-expanded={fabOpen}
          aria-label="Quick add"
          onClick={() => setFabOpen((o) => !o)}
        >
          <Plus size={20} />
        </button>
      </div>

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

      <div className="home-grid">
        <NonNegotiablesCard
          loading={home.loading}
          failed={home.rings.failed}
          today={home.today}
          rings={home.rings.data}
          range={home.ringsRange.data}
          onLogSleep={() => handleQuickAdd('sleep')}
          onStartFocus={() => onNavigate('/learnings')}
          onNavigate={onNavigate}
          onRetry={() => void home.reloadRings()}
        />

        <TodayHeroCard
          loading={home.loading}
          nutrition={home.nutrition.data}
          calendarItems={home.calendarToday.data}
          todayTasks={todayTasks}
          overdueCount={overdueCount}
          hydration={home.hydration.data}
          focusMinutesToday={todayRecord?.focusMinutes ?? 0}
          focusTargetMinutes={ringTargets.focusTargetMinutes}
          focusRunning={focusSession?.status === 'RUNNING'}
          onAddWater={() => void handleAddWater()}
          onStartFocus={() => onNavigate('/learnings')}
          onNavigate={onNavigate}
          onCelebrate={fireConfetti}
        />

        <QuickCaptureCard
          onCapture={handleCapture}
          focusRequest={captureRequest}
          moodScore={todayMood}
          onMood={handleMood}
          recentCaptures={recentCaptures}
        />

        <SleepCard
          loading={home.loading}
          failed={home.sleep.failed}
          entries={home.sleep.data}
          today={home.today}
          sleepTargetMinutes={ringTargets.sleepTargetMinutes}
          openFormNonce={sleepFormNonce}
          onLog={handleLogSleep}
          onRetry={() => void home.reloadSleep()}
        />

        <InsightsCard
          loading={home.loading}
          insights={insights}
          activeDays={countActiveDays(weekRecords)}
          onRefresh={() => void home.refetch()}
          onNavigate={onNavigate}
        />

        <TrendsCard loading={home.loading} records={dayRecords} />

        <WeekRollupCard
          loading={home.loading}
          weekRecords={weekRecords}
          prevWeekRecords={prevWeekRecords}
          nutrition={home.nutrition.data}
          spending={home.spending.data}
          safePerDay={safePerDay}
        />
      </div>
    </div>
  )
}

export { HomeOverviewDashboard }
