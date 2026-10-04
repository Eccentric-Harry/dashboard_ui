import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import type { CampChestOpenResult, CampLookPayload, CampQuestClaimResult, CampView, GoalCheckInPayload, GoalPayload, GoalProgressView } from '@/types/goals'
import { goalsService } from '@/services/goals-service'
import { goalsActions, useGoalsStore } from '@/store/goals-store'
import { isAwaitingData } from '@/store/zustand-utils'
import { celebrationActions } from '@/store/celebration-store'
import { getErrorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'
import { SkyDeco } from './components/sky-deco'
import { WorldBar } from './components/world-bar'
import { LanternString } from './components/lantern-string'
import { WorldGround } from './components/world-ground'
import { JournalBook, type JournalPage } from './components/journal-book'
import { GoalModal } from './components/goal-modal'
import { LanternFocus } from './components/lantern-focus'
import { ChestReveal } from './components/chest-reveal'
import { QuestLetter } from './components/quest-letter'
import { PipCorner, type PipCornerTab } from './components/pip-corner'
import { ShootingStar } from './components/shooting-star'
import { CampLighthouse } from './components/camp-lighthouse'
import { programActions, useProgramStore } from '@/store/program-store'
import { dayNumber, keptPromises, programLength } from './lighthouse/program-engine'
import { allDoneToday, pipState, type PipMoment } from './buddy-brain'
import { boardHeadline, dayLabel, formatAmount, goalDay, MAX_ACTIVE_GOALS } from './goal-format'
import { GREETING, skyPhase } from './sky-phase'
import { campSound, type CampVoice } from './camp-sound'
import { buddyNameOf, campItem } from './camp-catalog'
import { claimable } from './camp-quests'
import { pipGrowth } from './pip-growth'
import './camp-ui.css'
import './goals-overview.css'

type GoalModalState =
  | { mode: 'create'; preset?: GoalPayload; origin?: HTMLElement | null }
  | { mode: 'edit'; view: GoalProgressView; origin?: HTMLElement | null }
  | null
type LogState = { goalId: string; origin: HTMLElement | null } | null

/** How long Pip holds a reaction before going back to reading the board. */
const MOMENT_MS = 7000

/** The lantern to celebrate on: the big one if it's lowered for logging, else the one on the string. */
const goalElement = (id: string) =>
  document.querySelector<HTMLElement>(`[data-focus-goal-id="${id}"]`) ??
  document.querySelector<HTMLElement>(`[data-goal-id="${id}"]`)

/**
 * One moment per crossing, biggest first: a kept week, then the last lantern of the day,
 * then a single goal done. Every burst goes through celebrationActions, and `once` turns
 * an undo-then-redo into a quiet echo.
 */
function momentFor(
  prev: GoalProgressView | undefined,
  next: GoalProgressView,
  board: GoalProgressView[],
  today: string,
): PipMoment | null {
  if (!prev) return null
  const anchor = goalElement(next.goal.id)
  if (!prev.week.kept && next.week.kept) {
    celebrationActions.celebrate({
      anchor,
      palette: 'candy',
      label: `${next.goal.title} kept for the week`,
      detail: next.weekStreak > 1 ? `${next.weekStreak} weeks in a row` : undefined,
      once: { key: `goal-week-${next.goal.id}`, scope: next.week.weekStart },
    })
    return { kind: 'week-kept', goalTitle: next.goal.title, streak: next.weekStreak }
  }
  if (next.today.date !== today || prev.today.hit || !next.today.hit) return null
  if (allDoneToday(board)) {
    celebrationActions.celebrate({
      anchor: document.querySelector<HTMLElement>('.camp-diorama'),
      palette: 'candy',
      label: 'Every lantern lit',
      detail: 'Everything for today is done',
      once: { key: 'goals-day', scope: today },
    })
    return { kind: 'day-done' }
  }
  celebrationActions.celebrate({
    anchor,
    palette: 'candy',
    intensity: 'echo',
    label: `${next.goal.title} done for today`,
    once: { key: `goal-day-${next.goal.id}`, scope: today },
  })
  return { kind: 'goal-done', goalTitle: next.goal.title }
}

/** The sound for a progress change: a lantern pop that climbs as the day fills, then the bigger moment. */
function soundFor(prev: GoalProgressView | undefined, next: GoalProgressView, board: GoalProgressView[], today: string, moment: PipMoment | null) {
  if (!prev) return
  const newlyLit = !prev.today.hit && next.today.hit && next.today.date === today
  if (newlyLit) {
    const litNow = board.filter((g) => g.today.hit).length
    campSound.play('pop', { step: litNow - 1 })
  } else if (next.goal.measure === 'COUNT') {
    campSound.play('sparkle')
  }
  if (moment?.kind === 'week-kept') window.setTimeout(() => campSound.play('week-kept'), 320)
  else if (moment?.kind === 'day-done') window.setTimeout(() => campSound.play('day-done'), 380)
}

type GoalsOverviewDashboardProps = {
  onExit: () => void
  /** Walks into a goal's own world (/goals?world=<id>). */
  onOpenWorld: (goalId: string) => void
  /** Sails to The Lighthouse, the 90-day program (/goals?program=lighthouse). */
  onOpenLighthouse: () => void
}

type Origin = HTMLElement | null

type CampCast = Extract<CampVoice, 'pip' | 'wren' | 'fen' | 'moss'>

/** What each character says as they hand you their thing — their voice blips play it. */
const HELLO: Record<CampCast, string> = {
  pip: 'ooh new things',
  wren: 'post for you',
  fen: 'welcome welcome',
  moss: 'ah the journal',
}

const LETTER_KEY = 'camp.letter.read'
const readLetterDay = () => {
  try {
    return window.localStorage.getItem(LETTER_KEY)
  } catch {
    return null
  }
}

function GoalsOverviewDashboard({ onExit, onOpenWorld, onOpenLighthouse }: GoalsOverviewDashboardProps) {
  const board = useGoalsStore.use.board()
  const programState = useProgramStore.use.state()
  const [today, setToday] = useState(goalDay)
  const [now, setNow] = useState(() => new Date())
  const [goalModal, setGoalModal] = useState<GoalModalState>(null)
  const [logState, setLogState] = useState<LogState>(null)
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set())
  const [moment, setMoment] = useState<PipMoment | null>(null)
  const [journal, setJournal] = useState<{ page: JournalPage; origin: Origin } | null>(null)
  const [letter, setLetter] = useState<{ origin: Origin } | null>(null)
  const [corner, setCorner] = useState<{ tab: PipCornerTab; origin: Origin } | null>(null)
  const [chestOpen, setChestOpen] = useState(false)
  const [talking, setTalking] = useState<CampCast | null>(null)
  const [letterDay, setLetterDay] = useState(readLetterDay)
  const talkTimer = useRef<number | null>(null)

  useEffect(() => {
    void goalsActions.loadBoard(today)
    void programActions.load(today)
  }, [today])

  // The sky follows the clock; crossing 04:00 moves the board to the new day.
  useEffect(() => {
    const tick = () => {
      setNow(new Date())
      const day = goalDay()
      if (day !== today) setToday(day)
    }
    window.addEventListener('focus', tick)
    document.addEventListener('visibilitychange', tick)
    const timer = window.setInterval(tick, 60_000)
    return () => {
      window.removeEventListener('focus', tick)
      document.removeEventListener('visibilitychange', tick)
      window.clearInterval(timer)
    }
  }, [today])

  // Sound lives only at camp; the ambience follows the sky.
  useEffect(() => {
    campSound.enter()
    return () => campSound.leave()
  }, [])
  const phase = skyPhase(now)
  useEffect(() => campSound.setScene(phase), [phase])

  useEffect(() => {
    if (!moment) return
    const t = window.setTimeout(() => setMoment(null), MOMENT_MS)
    return () => window.clearTimeout(t)
  }, [moment])

  useEffect(
    () => () => {
      if (talkTimer.current != null) window.clearTimeout(talkTimer.current)
    },
    [],
  )

  const goals = useMemo(() => board.data?.goals ?? [], [board.data])
  const program = programState.data?.program ?? null
  const camp: CampView | undefined = board.data?.camp
  const weekStart = board.data?.weekStart ?? today
  const loading = isAwaitingData(board)
  const buddyName = buddyNameOf(camp?.buddyName)
  const headline = useMemo(() => boardHeadline(goals, today, weekStart), [goals, today, weekStart])
  const pip = useMemo(() => pipState(goals, today, now, moment, buddyName), [goals, today, now, moment, buddyName])
  const bestStreak = useMemo(() => goals.reduce((m, g) => Math.max(m, g.weekStreak), 0), [goals])
  const grownWeeks = camp?.grownWeeks ?? goals.reduce((sum, g) => sum + g.weeksKept, 0)
  const growth = pipGrowth(grownWeeks)
  const chestWeeks = (camp?.chest ?? []).reduce((n, c) => n + c.weeks, 0)
  const ready = claimable([...(camp?.quests ?? []), ...(camp?.questsYesterday ?? [])]).length
  // Stickers in the album: tiers reached, minus the ones still waiting in the chest.
  const stickers = useMemo(() => {
    const reached = goals.reduce((sum, g) => sum + [1, 4, 12, 26, 52].filter((n) => g.weeksKept >= n).length, 0)
    const waiting = (camp?.chest ?? []).reduce((n, c) => n + c.stickers.length, 0)
    return Math.max(0, reached - waiting)
  }, [goals, camp])
  const look = {
    wear: { hat: camp?.equipped.hat, neck: camp?.equipped.neck, face: camp?.equipped.face },
    stage: growth.stage,
    decor: camp?.decor ?? [],
  }
  const logView = logState ? goals.find((g) => g.goal.id === logState.goalId) ?? null : null

  const markPending = (id: string, on: boolean) =>
    setPending((prev) => {
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })

  /** A character speaks as they hand something over: blips in their voice, a moving mouth. */
  const speak = (who: CampCast) => {
    campSound.voice(who, HELLO[who])
    setTalking(who)
    if (talkTimer.current != null) window.clearTimeout(talkTimer.current)
    talkTimer.current = window.setTimeout(() => setTalking(null), 1100)
  }

  /** Runs one progress change for a goal, swaps its judged row in, and plays any moment. */
  const runProgress = useCallback(
    async (goalId: string, call: () => ReturnType<typeof goalsService.addCheckIn>) => {
      const prev = useGoalsStore.getState().board.data?.goals.find((g) => g.goal.id === goalId)
      markPending(goalId, true)
      try {
        const res = await call()
        if (res.error || !res.data) throw new Error(res.error?.message ?? 'No response')
        goalsActions.applyGoal(res.data)
        const nextBoard = useGoalsStore.getState().board.data?.goals ?? []
        const m = momentFor(prev, res.data, nextBoard, today)
        soundFor(prev, res.data, nextBoard, today, m)
        if (m) setMoment(m)
        // Quests and the chest move with progress.
        void goalsActions.refreshCamp(today)
        return res.data
      } finally {
        markPending(goalId, false)
      }
    },
    [today],
  )

  const handleLog = useCallback(
    async (goalId: string, payload: GoalCheckInPayload) => {
      const view = await runProgress(goalId, () => goalsService.addCheckIn(goalId, payload, today))
      const { goal } = view
      if (goal.measure === 'COUNT' && payload.value) {
        toast.success(`${formatAmount(payload.value, goal.unit)} logged to ${goal.title}.`)
      }
    },
    [runProgress, today],
  )

  const handleUndo = useCallback(
    (goalId: string, checkInId: string) =>
      runProgress(goalId, () => goalsService.deleteCheckIn(goalId, checkInId, today)).then(() => undefined),
    [runProgress, today],
  )

  /** A held lantern: mark today done. */
  const handleComplete = useCallback(
    async (view: GoalProgressView) => {
      if (pending.has(view.goal.id) || view.today.hit) return
      try {
        await runProgress(view.goal.id, () => goalsService.addCheckIn(view.goal.id, { date: today }, today))
      } catch (err) {
        toast.error(getErrorMessage(err, 'Could not save that — try again.'))
      }
    },
    [pending, today, runProgress],
  )

  const handleSaveGoal = useCallback(
    async (payload: GoalPayload, id?: string) => {
      const res = id ? await goalsService.updateGoal(id, payload, today) : await goalsService.createGoal(payload, today)
      if (res.error || !res.data) throw new Error(res.error?.message ?? 'Could not save this goal.')
      goalsActions.applyGoal(res.data)
      void goalsActions.refreshCamp(today)
      toast.success(id ? 'Goal updated.' : `${res.data.goal.title} has a lantern at camp.`)
    },
    [today],
  )

  const handleArchive = useCallback(
    async (id: string) => {
      const res = await goalsService.setStatus(id, 'ARCHIVED')
      if (res.error) throw new Error(res.error.message)
      goalsActions.removeGoal(id)
      void goalsActions.refreshCamp(today)
      toast.success('Packed away. Its history is kept — unpack it from the journal.')
    },
    [today],
  )

  const handleDelete = useCallback(
    async (id: string) => {
      const res = await goalsService.deleteGoal(id)
      if (res.error) throw new Error(res.error.message)
      goalsActions.removeGoal(id)
      void goalsActions.refreshCamp(today)
      toast.success('Goal deleted.')
    },
    [today],
  )

  const handleRestore = useCallback(
    async (id: string) => {
      const res = await goalsService.setStatus(id, 'ACTIVE')
      if (res.error) {
        toast.error(res.error.message || 'Could not restore that goal.')
        return false
      }
      await goalsActions.loadBoard(today)
      toast.success('Back at camp.')
      return true
    },
    [today],
  )

  // ── The camp: chest, quests, Fen's cart, the look ──────────────────────

  const handleOpenChest = useCallback(async (): Promise<CampChestOpenResult | null> => {
    const res = await goalsService.openChest(today)
    if (res.error || !res.data) {
      toast.error(res.error?.message || 'The chest is stuck — try again.')
      return null
    }
    return res.data
  }, [today])

  const settleChest = (result: CampChestOpenResult) => {
    goalsActions.applyCamp(result.camp)
    if (result.sparks > 0) setMoment({ kind: 'chest', sparks: result.sparks })
  }

  const handleClaim = useCallback(
    async (questId: string): Promise<CampQuestClaimResult | null> => {
      const res = await goalsService.claimQuest(questId, today)
      if (res.error || !res.data) {
        toast.error(res.error?.message || 'Couldn’t claim that — try again.')
        return null
      }
      return res.data
    },
    [today],
  )

  const settleClaim = (result: CampQuestClaimResult) => {
    goalsActions.applyCamp(result.camp)
    if (result.reward > 0) setMoment({ kind: 'quest', sparks: result.reward })
  }

  const handleBuy = useCallback(
    async (itemId: string) => {
      const res = await goalsService.buyItem(itemId, today)
      if (res.error || !res.data) throw new Error(res.error?.message || 'Fen couldn’t sell that just now.')
      goalsActions.applyCamp(res.data)
      setMoment({ kind: 'bought', item: campItem(itemId)?.name })
      return res.data
    },
    [today],
  )

  const handleLook = useCallback(
    async (next: CampLookPayload) => {
      const res = await goalsService.setLook(next, today)
      if (res.error || !res.data) throw new Error(res.error?.message || 'Couldn’t change that — try again.')
      goalsActions.applyCamp(res.data)
      return res.data
    },
    [today],
  )

  const openCreate = (preset?: GoalPayload, origin?: Origin) => {
    if (goals.length >= MAX_ACTIVE_GOALS) return
    setGoalModal({ mode: 'create', preset, origin })
  }
  const openLog = (view: GoalProgressView, origin: Origin) => setLogState({ goalId: view.goal.id, origin })
  const openJournal = (page: JournalPage, origin: Origin) => {
    speak('moss')
    setJournal({ page, origin })
  }
  const openLetter = (origin: Origin) => {
    speak('wren')
    setLetter({ origin })
    setLetterDay(today)
    try {
      window.localStorage.setItem(LETTER_KEY, today)
    } catch {
      // Without storage the letter just looks new again next visit.
    }
  }
  const openCorner = (tab: PipCornerTab, origin: Origin) => {
    speak(tab === 'shop' ? 'fen' : 'pip')
    setCorner({ tab, origin })
  }
  const openChestReveal = () => {
    campSound.play('tap')
    setChestOpen(true)
  }

  const sheetOpen = goalModal != null || logState != null || journal != null || letter != null || corner != null || chestOpen
  const letterNew = (camp?.quests.length ?? 0) > 0 && letterDay !== today

  return (
    <main className={cn('camp-world', `camp--${phase}`)} aria-label="The camp — your goals">
      <div className="camp-scene" inert={sheetOpen}>
        <SkyDeco />
        {phase === 'night' && !sheetOpen && <ShootingStar onWish={() => setMoment({ kind: 'wish' })} />}
        <WorldBar greeting={GREETING[phase]} dateLabel={dayLabel(today)} bestStreak={bestStreak} sparks={camp?.sparks ?? 0} onExit={onExit} />

        <section className="world-sky" aria-label="Today's lanterns">
          {/* Far off on the horizon: the way to the 90-day program. */}
          <CampLighthouse
            day={program ? dayNumber(program, today) : null}
            length={program ? programLength(program) : 90}
            kept={programState.data ? keptPromises(programState.data.logs) : 0}
            onOpen={() => {
              campSound.play('open')
              onOpenLighthouse()
            }}
          />
          {board.hasErrors && !board.data ? (
            <div className="world-error" aria-live="polite">
              <p>Couldn’t reach camp just now.</p>
              <button type="button" className="tb-btn" onClick={() => void goalsActions.loadBoard(today)}>
                Try again
              </button>
            </div>
          ) : (
            <LanternString
              loading={loading}
              goals={goals}
              pending={pending}
              onComplete={(view) => void handleComplete(view)}
              onOpen={openLog}
              onAdd={openCreate}
            />
          )}
        </section>

        <WorldGround
          loading={loading}
          today={today}
          weekStart={weekStart}
          goals={goals}
          headline={headline.title}
          pip={loading ? { mood: 'waking', line: 'One sec — stretching…' } : pip}
          buddyName={buddyName}
          look={look}
          stickers={stickers}
          chestWeeks={chestWeeks}
          questsReady={ready}
          letterNew={letterNew}
          talking={talking}
          onOpenJournal={openJournal}
          onOpenChest={openChestReveal}
          onOpenLetter={openLetter}
          onOpenCorner={openCorner}
        />
      </div>

      <JournalBook
        page={journal?.page ?? null}
        origin={journal?.origin ?? null}
        goals={goals}
        camp={camp}
        pip={{ mood: pip.mood, stage: growth.stage, wear: look.wear }}
        onPage={(page) => setJournal((j) => (j ? { ...j, page } : j))}
        onEdit={(view) => {
          setJournal(null)
          setGoalModal({ mode: 'edit', view, origin: goalElement(view.goal.id) })
        }}
        onRestore={handleRestore}
        onClose={() => setJournal(null)}
      />

      <QuestLetter
        open={letter != null}
        origin={letter?.origin ?? null}
        today={today}
        quests={camp?.quests ?? []}
        leftovers={camp?.questsYesterday ?? []}
        onClaim={handleClaim}
        onSettled={settleClaim}
        onClose={() => setLetter(null)}
      />

      <PipCorner
        tab={corner?.tab ?? null}
        origin={corner?.origin ?? null}
        camp={camp}
        mood={pip.mood}
        stage={growth.stage}
        weeksKept={grownWeeks}
        onTab={(tab) => setCorner((c) => (c ? { ...c, tab } : c))}
        onBuy={handleBuy}
        onLook={handleLook}
        onClose={() => setCorner(null)}
      />

      <ChestReveal
        open={chestOpen}
        contents={camp?.chest ?? []}
        onOpen={handleOpenChest}
        onSettled={settleChest}
        onClose={() => setChestOpen(false)}
      />

      <GoalModal
        state={goalModal}
        onSave={handleSaveGoal}
        onArchive={handleArchive}
        onDelete={handleDelete}
        onClose={() => setGoalModal(null)}
      />

      <LanternFocus
        view={logView}
        origin={logState?.origin ?? null}
        today={today}
        busy={logView ? pending.has(logView.goal.id) : false}
        onLog={handleLog}
        onUndo={handleUndo}
        onEdit={(view) => {
          const origin = logState?.origin ?? null
          setLogState(null)
          setGoalModal({ mode: 'edit', view, origin })
        }}
        onOpenWorld={(view) => {
          setLogState(null)
          campSound.play('open')
          onOpenWorld(view.goal.id)
        }}
        onClose={() => setLogState(null)}
      />
    </main>
  )
}

export { GoalsOverviewDashboard }
