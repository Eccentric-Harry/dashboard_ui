import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { ArrowLeft, Cake, CalendarDays, CircleHelp, HeartHandshake, LifeBuoy, NotebookText, Settings2, Sun, Volume2, VolumeX } from 'lucide-react'
import type {
  ProgramAssessmentType,
  ProgramLetterKey,
  ProgramLog,
  ProgramLogPayload,
  ProgramStartPayload,
  ProgramTrackKey,
} from '@/types/program'
import { programService } from '@/services/program-service'
import { programActions, useProgramStore } from '@/store/program-store'
import { goalsActions, useGoalsStore } from '@/store/goals-store'
import { celebrationActions } from '@/store/celebration-store'
import { spiralActions } from '@/store/spiral-store'
import { isAwaitingData } from '@/store/zustand-utils'
import { cn } from '@/lib/utils'
import { SkyDeco } from '../components/sky-deco'
import { addDays, goalDay } from '../goal-format'
import { skyPhase } from '../sky-phase'
import { campSound, useCampSoundPrefs } from '../camp-sound'
import { buddyNameOf } from '../camp-catalog'
import { pipGrowth } from '../pip-growth'
import { MILESTONES, checkpointsDue, dayCell, dayNumber, isWeekly, keptPromises, lighthouseStage, programLength, weekCount, weekStartOf, type ProgramCtx } from './program-engine'
import { trackMeta } from './program-content'
import { momentLine, situationLine, type KeeperMoment, type KeeperOffer } from './lighthouse-voice'
import type { LighthouseApi, LogOptions } from './lighthouse-api'
import { LighthouseScene, type SceneObject } from './lighthouse-scene'
import { PhaseSign } from './phase-sign'
import { GuideSheet } from './guide-sheet'
import { TodayDeck } from './today-deck'
import { WeekView } from './week-view'
import { KeptSheet, LogbookView } from './logbook-view'
import { TrackSheet } from './track-sheet'
import { RunCoach } from './run-coach'
import { UrgeSurf } from './urge-surf'
import { ReviewSheet } from './review-sheet'
import { CheckpointSheet } from './checkpoint-sheet'
import { LettersSheet } from './letters-sheet'
import { SettingsSheet } from './settings-sheet'
import { StartView } from './start-view'
import { dayMonth } from './lh-utils'
import '../camp-ui.css'
import '../goals-overview.css'
import './lighthouse.css'

type Origin = HTMLElement | null
type Sheet =
  | { kind: 'track'; track: ProgramTrackKey; origin: Origin }
  | { kind: 'coach'; origin: Origin }
  | { kind: 'urge'; origin: Origin }
  | { kind: 'review'; origin: Origin; week: string; focus?: ProgramTrackKey | null }
  | { kind: 'checkpoint'; origin: Origin; type?: ProgramAssessmentType }
  | { kind: 'letters'; origin: Origin; letter?: ProgramLetterKey }
  | { kind: 'settings'; origin: Origin }
  | { kind: 'kept'; origin: Origin }
  | { kind: 'guide'; origin: Origin }
  | null
type View = 'today' | 'week' | 'logbook'

type LighthouseWorldProps = {
  onBack: () => void
  /** Leaves /goals for another route (Nutrition, Learnings). */
  onLeave: (path: '/nutrition' | '/learnings') => void
}

/** How long Pip holds a reaction before reading the day again. */
const MOMENT_MS = 7000
const DISMISS_KEY = 'lh.offer.dismissed'
const GUIDE_KEY = 'lh.guide.seen'
const readStored = (key: string) => {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}
const VIEWS = [
  { key: 'today', label: 'Today', icon: Sun },
  { key: 'week', label: 'Week', icon: CalendarDays },
  { key: 'logbook', label: 'Logbook', icon: NotebookText },
] as const

const cardOf = (track: ProgramTrackKey) => document.querySelector<HTMLElement>(`[data-track-card="${track}"]`)

/**
 * The Lighthouse — "90 days to 23" (design/LIGHTHOUSE_90_PLAN.md). A world inside /goals,
 * reached from the lighthouse on the camp's horizon: the island and its tower on the left,
 * the day's tracks on the right (Today · Week · Logbook), and every surface a sheet that
 * grows out of what you touched. Pip came along from the camp. All judging is client-side
 * (program-engine.ts); every write goes service → store → a reaction from Pip.
 */
function LighthouseWorld({ onBack, onLeave }: LighthouseWorldProps) {
  const remote = useProgramStore.use.state()
  const board = useGoalsStore.use.board()
  const [today, setToday] = useState(goalDay)
  const [now, setNow] = useState(() => new Date())
  const [view, setView] = useState<View>('today')
  const [sheet, setSheet] = useState<Sheet>(null)
  const [moment, setMoment] = useState<KeeperMoment | null>(null)
  const [busy, setBusy] = useState<ReadonlySet<string>>(new Set())
  const [fresh, setFresh] = useState<number | null>(null)
  const [starting, setStarting] = useState(false)
  const [dismissed, setDismissed] = useState(() => readStored(DISMISS_KEY))
  const [guideSeen, setGuideSeen] = useState(() => readStored(GUIDE_KEY) != null)
  const deckRef = useRef<HTMLDivElement | null>(null)
  const { enabled: soundOn } = useCampSoundPrefs()

  useEffect(() => {
    void programActions.load(today)
  }, [today])

  // Pip wears what Fen sold you at camp.
  useEffect(() => {
    if (!board.data && !board.loaded) void goalsActions.loadBoard(today)
  }, [board.data, board.loaded, today])

  // The sky follows the clock; crossing 04:00 moves the lighthouse to the new day.
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

  useEffect(() => {
    if (fresh == null) return
    const t = window.setTimeout(() => setFresh(null), 1600)
    return () => window.clearTimeout(t)
  }, [fresh])

  const data = remote.data
  const program = data?.program ?? null
  const ctx: ProgramCtx | null = useMemo(
    () => (data && program ? { program, logs: data.logs, reviews: data.reviews, sources: data.sources, today } : null),
    [data, program, today],
  )
  const camp = board.data?.camp
  const buddyName = buddyNameOf(camp?.buddyName)
  const wear = { hat: camp?.equipped.hat, neck: camp?.equipped.neck, face: camp?.equipped.face }
  const growth = pipGrowth(camp?.grownWeeks ?? 0).stage
  const kept = ctx ? keptPromises(ctx.logs) : 0
  const stage = lighthouseStage(kept)

  // ── The weekly review: Saturday and Sunday for this week; Monday and Tuesday catch last week ──
  const dow = useMemo(() => {
    const [y, m, d] = today.split('-').map(Number)
    return new Date(y, m - 1, d).getDay()
  }, [today])
  const thisWeek = weekStartOf(today)
  const lastWeek = addDays(thisWeek, -7)
  const reviewed = (w: string) => !!data?.reviews.some((r) => r.weekStart === w)
  const lastWeekCounts = !!program && dayNumber(program, addDays(lastWeek, 6)) >= 1
  const catchUp = (dow === 1 || dow === 2) && lastWeekCounts && !reviewed(lastWeek)
  const reviewWeek = catchUp ? lastWeek : thisWeek
  const reviewDue = !!program && dayNumber(program, today) >= 1 && (catchUp || ((dow === 0 || dow === 6) && !reviewed(thisWeek)))

  const due = ctx ? checkpointsDue(ctx.program, data?.assessments ?? [], today) : []

  // ── Pip ──
  const pip = useMemo(() => {
    if (!ctx) return { mood: 'waking' as const, line: isAwaitingData(remote) ? 'Lighting the lamp…' : 'A lighthouse on the edge of the camp. Ninety days, one stone at a time.' }
    if (moment) return momentLine(moment, ctx)
    const line = situationLine(ctx, now, buddyName)
    if (line.offer && dismissed === `${today}:${line.offer.track}`) {
      return { mood: 'content' as const, line: `Day ${Math.max(1, dayNumber(ctx.program, today))} of ${programLength(ctx.program)}. One stone at a time.` }
    }
    return line
  }, [ctx, moment, now, buddyName, dismissed, today, remote])

  const lastSpoken = useRef('')
  useEffect(() => {
    if (moment && pip.line !== lastSpoken.current) {
      lastSpoken.current = pip.line
      campSound.voice('pip', pip.line)
    }
  }, [moment, pip.line])

  // ── Writes ──

  const markBusy = (key: string, on: boolean) =>
    setBusy((prev) => {
      const next = new Set(prev)
      if (on) next.add(key)
      else next.delete(key)
      return next
    })

  const currentCtx = useCallback((): ProgramCtx | null => {
    const s = useProgramStore.getState().state.data
    if (!s?.program) return null
    return { program: s.program, logs: s.logs, reviews: s.reviews, sources: s.sources, today }
  }, [today])

  /** Pip's reaction, the sound and the burst for a log that just landed. */
  const react = useCallback(
    (before: ProgramCtx, log: ProgramLog, opts?: LogOptions) => {
      const after = currentCtx()
      if (!after) return
      const meta = trackMeta(log.track)
      const anchor = opts?.anchor ?? cardOf(log.track) ?? document.querySelector<HTMLElement>('.lh-scene')

      if (log.track === 'regard') {
        const k = keptPromises(after.logs)
        setFresh(k - 1)
        if ((MILESTONES as readonly number[]).includes(k)) {
          celebrationActions.celebrate({
            anchor: document.querySelector<HTMLElement>('.lh-tower') as HTMLElement | null,
            palette: 'candy',
            label: `${k} kept promises`,
            detail: k >= 100 ? 'The beam is on' : k >= 50 ? 'The lamp is lit' : 'The lamp room is built',
            once: { key: `lh-kept-${k}`, scope: after.program.id },
          })
          if (!opts?.soundPlayed) campSound.play('week-kept')
          setMoment({ kind: 'milestone', kept: k })
        } else {
          celebrationActions.celebrate({ anchor, palette: 'candy', intensity: 'echo', label: `Kept promise ${k}` })
          if (!opts?.soundPlayed) campSound.play('stone')
          setMoment({ kind: 'kept', kept: k })
        }
        return
      }
      if (log.track === 'mood') {
        if (!opts?.soundPlayed) campSound.play('tap')
        setMoment({ kind: 'mood', score: log.value ?? 3 })
        return
      }
      if (log.urge) {
        celebrationActions.celebrate({ anchor, palette: 'candy', intensity: 'echo', label: 'Urge ridden out' })
        campSound.play('chime')
        setMoment({ kind: 'urge' })
        return
      }
      if (log.stretch) {
        celebrationActions.celebrate({ anchor, palette: 'candy', label: 'Spoke up in a meeting', detail: 'That’s the rung', once: { key: 'lh-stretch', scope: weekStartOf(log.date) } })
        campSound.play('week-kept')
        setMoment({ kind: 'stretch' })
        return
      }

      const was = dayCell(before, log.track, log.date).status
      const cell = dayCell(after, log.track, log.date)
      const level = cell.status === 'full' ? 'FULL' : cell.status === 'min' ? 'MIN' : cell.status === 'rest' ? 'REST' : null
      if (!level) {
        campSound.play('tap')
        setMoment({ kind: 'checkpoint' })
        return
      }
      if (isWeekly(log.track) && level !== 'REST') {
        const w = weekStartOf(log.date)
        const b = weekCount(before, log.track, w)
        const a = weekCount(after, log.track, w)
        if (a.target != null && a.done >= a.target && b.done < a.target) {
          celebrationActions.celebrate({ anchor, palette: 'candy', label: `${meta.name}: ${a.done} of ${a.target} this week`, once: { key: `lh-week-${log.track}`, scope: w } })
          if (!opts?.soundPlayed) campSound.play('week-kept')
          setMoment({ kind: 'logged', track: log.track, level, detail: opts?.detail })
          return
        }
      }
      if (level !== 'REST' && was !== cell.status) {
        celebrationActions.celebrate({ anchor, palette: 'candy', intensity: 'echo', label: level === 'MIN' ? `${meta.name}: small version, done` : `${meta.name} done` })
      }
      const doneToday = after.program.tracks.filter((t) => ['full', 'min'].includes(dayCell(after, t.key, after.today).status)).length
      if (!opts?.soundPlayed) campSound.play(level === 'FULL' ? 'pop' : level === 'MIN' ? 'chime' : 'tap', { step: Math.max(0, doneToday - 1) })
      setMoment({ kind: 'logged', track: log.track, level, detail: opts?.detail })
    },
    [currentCtx],
  )

  const api: LighthouseApi = useMemo(() => {
    const id = () => useProgramStore.getState().state.data?.program?.id
    const fail = (message: string | undefined, fallback: string) => {
      toast.error(message || fallback)
      return null
    }
    return {
      addLog: async (payload: ProgramLogPayload, opts?: LogOptions) => {
        const pid = id()
        const before = currentCtx()
        if (!pid || !before) return null
        markBusy(payload.track, true)
        try {
          const res = await programService.addLog(pid, payload)
          if (res.error || !res.data) return fail(res.error?.message, 'Couldn’t save that — try again.')
          programActions.applyLog(res.data)
          react(before, res.data, opts)
          return res.data
        } finally {
          markBusy(payload.track, false)
        }
      },
      updateLog: async (logId, payload, opts) => {
        const pid = id()
        const before = currentCtx()
        if (!pid || !before) return null
        markBusy(payload.track, true)
        try {
          const res = await programService.updateLog(pid, logId, payload)
          if (res.error || !res.data) return fail(res.error?.message, 'Couldn’t update that — try again.')
          programActions.applyLog(res.data)
          react(before, res.data, opts)
          return res.data
        } finally {
          markBusy(payload.track, false)
        }
      },
      deleteLog: async (logId) => {
        const pid = id()
        if (!pid) return false
        const res = await programService.deleteLog(pid, logId)
        if (res.error) {
          toast.error(res.error.message || 'Couldn’t undo that.')
          return false
        }
        programActions.removeLog(logId)
        campSound.play('soft-no')
        return true
      },
      saveSettings: async (payload, message) => {
        const pid = id()
        if (!pid) return false
        const res = await programService.updateSettings(pid, payload)
        if (res.error || !res.data) {
          toast.error(res.error?.message || 'Couldn’t save that.')
          return false
        }
        programActions.applyProgram(res.data)
        if (message) toast.success(message)
        return true
      },
      writeLetter: async (key, text) => {
        const pid = id()
        if (!pid) return false
        const res = await programService.writeLetter(pid, key, text)
        if (res.error || !res.data) {
          toast.error(res.error?.message || 'Couldn’t keep that letter — try again.')
          return false
        }
        programActions.applyProgram(res.data)
        const letter = res.data.letters[key]
        campSound.play(letter?.sealed ? 'chest-shake' : 'page')
        setMoment({ kind: 'letter', sealedUntil: letter?.sealed ? letter.opensOn : null })
        return true
      },
      saveReview: async (weekStart, payload) => {
        const pid = id()
        if (!pid) return false
        const res = await programService.saveReview(pid, weekStart, payload)
        if (res.error || !res.data) {
          toast.error(res.error?.message || 'Couldn’t save the review.')
          return false
        }
        programActions.applyReview(res.data.review)
        programActions.applyProgram(res.data.program)
        celebrationActions.celebrate({ anchor: document.querySelector<HTMLElement>('.lh-scene'), palette: 'candy', intensity: 'echo', label: 'Weekly review saved', once: { key: 'lh-review', scope: weekStart } })
        campSound.play('chime')
        setMoment({ kind: 'review' })
        return true
      },
      addAssessment: async (payload) => {
        const pid = id()
        if (!pid) return null
        const res = await programService.addAssessment(pid, payload)
        if (res.error || !res.data) return fail(res.error?.message, 'Couldn’t save that check-in.')
        programActions.applyAssessment(res.data)
        campSound.play('chime')
        setMoment({ kind: 'checkpoint' })
        return res.data
      },
      deleteAssessment: async (assessmentId) => {
        const pid = id()
        if (!pid) return false
        const res = await programService.deleteAssessment(pid, assessmentId)
        if (res.error) {
          toast.error(res.error.message || 'Couldn’t delete that.')
          return false
        }
        programActions.removeAssessment(assessmentId)
        return true
      },
      addMedia: async (payload) => {
        const pid = id()
        if (!pid) return null
        const res = await programService.addMedia(pid, payload)
        if (res.error || !res.data) return fail(res.error?.message, 'Couldn’t save that file.')
        programActions.applyMedia({ ...res.data, dataUrl: payload.dataUrl })
        return res.data
      },
      deleteMedia: async (mediaId) => {
        const pid = id()
        if (!pid) return false
        const res = await programService.deleteMedia(pid, mediaId)
        if (res.error) {
          toast.error(res.error.message || 'Couldn’t delete that.')
          return false
        }
        programActions.removeMedia(mediaId)
        return true
      },
    }
  }, [currentCtx, react])

  const start = async (payload: ProgramStartPayload) => {
    setStarting(true)
    const res = await programService.start(payload)
    setStarting(false)
    if (res.error || !res.data) {
      toast.error(res.error?.message || 'Couldn’t begin — try again.')
      return
    }
    await programActions.load(today)
    campSound.play('week-kept')
    celebrationActions.celebrate({ anchor: document.querySelector<HTMLElement>('.lh-scene'), palette: 'candy', label: 'The first stone is the plan', detail: `Day 1 is ${dayMonth(payload.startDate)}` })
  }

  const remove = async () => {
    if (!program) return false
    const res = await programService.remove(program.id)
    if (res.error) {
      toast.error(res.error.message || 'Couldn’t delete the program.')
      return false
    }
    programActions.applyProgram(null)
    toast.success('Deleted. You can begin again any time.')
    return true
  }

  // ── Opening things ──

  const openTrack = (track: ProgramTrackKey, origin: Origin) => setSheet({ kind: 'track', track, origin })
  const showView = (v: View) => {
    campSound.play('page')
    setView(v)
    if (window.matchMedia('(max-width: 760px)').matches) deckRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const onObject = (o: SceneObject, el: HTMLElement) => {
    switch (o) {
      case 'tower':
        setSheet({ kind: 'kept', origin: el })
        break
      case 'logbook':
        showView('logbook')
        break
      case 'bottle':
        setSheet({ kind: 'letters', origin: el })
        break
      case 'bench':
        setSheet({ kind: 'review', origin: el, week: reviewWeek })
        break
      case 'flag':
        setSheet({ kind: 'checkpoint', origin: el, type: due[0]?.type })
        break
    }
  }
  const onOffer = (offer: KeeperOffer, el: HTMLElement) => {
    if (offer.kind === 'small') openTrack(offer.track, cardOf(offer.track) ?? el)
    else setSheet({ kind: 'review', origin: el, week: thisWeek, focus: offer.track })
  }
  const dismissOffer = () => {
    const offer = pip.offer
    if (!offer) return
    const v = `${today}:${offer.track}`
    setDismissed(v)
    try {
      window.localStorage.setItem(DISMISS_KEY, v)
    } catch {
      // Without storage the offer simply comes back on the next visit.
    }
  }

  const openGuide = (el: HTMLElement) => {
    setSheet({ kind: 'guide', origin: el })
    if (guideSeen) return
    setGuideSeen(true)
    try {
      window.localStorage.setItem(GUIDE_KEY, '1')
    } catch {
      // Without storage the dot simply shows again next time.
    }
  }

  /**
   * The sound for a log lands on the gesture, not when the server answers (a round-trip to
   * the database is long enough to hear). It's predicted from what's on screen: closing the
   * week's target rings the week, otherwise a pop that climbs with how many are done today.
   */
  const soundNow = (track: ProgramTrackKey, level: 'FULL' | 'MIN') => {
    if (!ctx) return
    if (isWeekly(track)) {
      const wk = weekCount(ctx, track, weekStartOf(today))
      if (wk.target != null && wk.done + 1 === wk.target && !['full', 'min'].includes(dayCell(ctx, track, today).status)) {
        campSound.play('week-kept')
        return
      }
    }
    const doneToday = ctx.program.tracks.filter((t) => t.key !== track && ['full', 'min'].includes(dayCell(ctx, t.key, today).status)).length
    campSound.play(level === 'FULL' ? 'pop' : 'chime', { step: doneToday })
  }

  const logSession = (track: ProgramTrackKey, level: 'FULL' | 'MIN', el: HTMLElement) => {
    soundNow(track, level)
    if (track === 'english') {
      void api.addLog({ track, date: today, level, minutes: level === 'FULL' ? 15 : 5 }, { anchor: el, detail: level === 'FULL' ? '15 minutes out loud' : undefined, soundPlayed: true })
    } else {
      void api.addLog({ track, date: today, level, minutes: track === 'learn' ? (level === 'FULL' ? 25 : 10) : undefined }, { anchor: el, soundPlayed: true })
    }
  }

  const logMood = (score: number, el: HTMLElement) => {
    if (!ctx) return
    const existing = [...ctx.logs].reverse().find((l) => l.track === 'mood' && l.date === today && l.value != null)
    const payload = { track: 'mood' as const, date: today, value: score, tag: existing?.tag ?? null, note: existing?.note ?? null }
    campSound.play('tap')
    void (existing ? api.updateLog(existing.id, payload, { anchor: el, soundPlayed: true }) : api.addLog(payload, { anchor: el, soundPlayed: true }))
  }

  const sheetOpen = sheet != null
  const day = ctx ? dayNumber(ctx.program, today) : 0
  const length = ctx ? programLength(ctx.program) : 90
  const loading = isAwaitingData(remote) && !data

  return (
    <main className={cn('camp-world lh-world', `camp--${phase}`, `lh--${stage}`)} aria-label="The lighthouse — 90 days to 23">
      <div className="camp-scene" inert={sheetOpen}>
        <SkyDeco />
        <header className="lh-bar">
          <button type="button" className="world-exit" onClick={onBack} aria-label="Back to the camp">
            <ArrowLeft size={16} strokeWidth={2.8} />
            <span>Camp</span>
          </button>
          <div className="lh-bar-title">
            <strong>{program?.title ?? 'The Lighthouse'}</strong>
            <small>
              {!ctx ? '90 days to 23' : `${dayMonth(ctx.program.startDate)} – ${dayMonth(ctx.program.birthday ?? ctx.program.endDate)} · ${day < 1 ? 'starts soon' : day > length ? 'complete' : `day ${day}`}`}
            </small>
          </div>
          <div className="lh-bar-chips">
            {ctx && (
              <button type="button" className="world-chip lh-chip-kept" onClick={(e) => setSheet({ kind: 'kept', origin: e.currentTarget })} title="Kept promises — every one a stone">
                <HeartHandshake size={15} strokeWidth={2.6} aria-hidden="true" />
                <strong>{kept}</strong>
                <small>kept</small>
              </button>
            )}
            {ctx && (
              <span className="world-chip lh-chip-day" title="Day 90 — your birthday">
                <Cake size={15} strokeWidth={2.6} aria-hidden="true" />
                <small>{dayMonth(ctx.program.birthday ?? ctx.program.endDate)}</small>
              </span>
            )}
            <button type="button" className={cn('world-breathe lh-guide-btn', !guideSeen && 'is-new')} onClick={(e) => openGuide(e.currentTarget)} aria-label="What’s what — a short guide" title="What’s what">
              <CircleHelp size={16} strokeWidth={2.4} />
            </button>
            {ctx && (
              <button type="button" className="world-breathe" onClick={(e) => setSheet({ kind: 'settings', origin: e.currentTarget })} aria-label="Program settings" title="Program settings">
                <Settings2 size={16} strokeWidth={2.4} />
              </button>
            )}
            <button type="button" className={cn('world-breathe', !soundOn && 'is-off')} onClick={() => campSound.setEnabled(!soundOn)} aria-label={soundOn ? 'Sound on — turn off' : 'Sound off — turn on'} title="Sound">
              {soundOn ? <Volume2 size={16} strokeWidth={2.4} /> : <VolumeX size={16} strokeWidth={2.4} />}
            </button>
            <button type="button" className="world-breathe" onClick={() => spiralActions.open()} aria-label="Spiral breaker" title="Spiral breaker">
              <LifeBuoy size={16} strokeWidth={2.4} />
            </button>
          </div>
        </header>

        <div className="lh-stage">
          <LighthouseScene
            kept={kept}
            stage={stage}
            fresh={fresh}
            pip={pip}
            buddyName={buddyName}
            wear={wear}
            growth={growth}
            flagUp={due.length > 0}
            bottleGlint={!!ctx && (!ctx.program.letters.to23 || (!!ctx.program.letters.to23 && !ctx.program.letters.to23.sealed))}
            reviewDue={reviewDue}
            onObject={(o, el) => (ctx ? onObject(o, el) : undefined)}
            onOffer={onOffer}
            onDismissOffer={dismissOffer}
          />

          <section className="lh-deck" ref={deckRef} aria-label="The program">
            {remote.hasErrors && !data ? (
              <div className="lh-error" aria-live="polite">
                <p>Couldn’t reach the lighthouse just now.</p>
                <button type="button" className="lh-btn lh-btn--soft" onClick={() => void programActions.load(today)}>
                  Try again
                </button>
              </div>
            ) : loading ? (
              <div className="lh-skeleton" aria-busy="true">
                <span />
                <span />
                <span />
              </div>
            ) : !ctx ? (
              <StartView today={today} profileWeightKg={data?.sources.profileWeightKg} busy={starting} onStart={(p) => void start(p)} />
            ) : (
              <>
                <PhaseSign program={ctx.program} today={today} />
                <nav className="lh-tabs" aria-label="Views">
                  {VIEWS.map(({ key, label, icon: Icon }) => (
                    <button key={key} type="button" className={cn('lh-tab', view === key && 'is-on')} aria-pressed={view === key} onClick={() => showView(key)}>
                      <Icon size={15} strokeWidth={2.6} aria-hidden="true" />
                      {label}
                    </button>
                  ))}
                </nav>
                <div className="lh-deck-body">
                  {view === 'today' && (
                    <TodayDeck
                      ctx={ctx}
                      assessments={data?.assessments ?? []}
                      busy={busy}
                      reviewDue={reviewDue}
                      onHoldFull={(t, el) => logSession(t, 'FULL', el)}
                      onSmall={(t, el) => logSession(t, 'MIN', el)}
                      onOpen={openTrack}
                      onMood={logMood}
                      onUrge={(el) => setSheet({ kind: 'urge', origin: el })}
                      onCheckpoint={(type, el) => setSheet({ kind: 'checkpoint', origin: el, type })}
                      onLetters={(el) => setSheet({ kind: 'letters', origin: el })}
                      onReview={(el) => setSheet({ kind: 'review', origin: el, week: reviewWeek })}
                    />
                  )}
                  {view === 'week' && <WeekView ctx={ctx} onReview={(w, el) => setSheet({ kind: 'review', origin: el, week: w })} onOpen={openTrack} />}
                  {view === 'logbook' && (
                    <LogbookView
                      ctx={ctx}
                      assessments={data?.assessments ?? []}
                      media={data?.media ?? []}
                      onKept={(el) => setSheet({ kind: 'kept', origin: el })}
                      onCheckpoint={(el) => setSheet({ kind: 'checkpoint', origin: el })}
                      onLetters={(el) => setSheet({ kind: 'letters', origin: el })}
                      onOpen={openTrack}
                    />
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      <TrackSheet
        open={sheet?.kind === 'track'}
        track={sheet?.kind === 'track' ? sheet.track : null}
        origin={sheet?.kind === 'track' ? sheet.origin : null}
        ctx={ctx}
        api={api}
        busy={sheet?.kind === 'track' ? busy.has(sheet.track) : false}
        onClose={() => setSheet(null)}
        onCoach={(el) => setSheet({ kind: 'coach', origin: el })}
        onUrge={(el) => setSheet({ kind: 'urge', origin: el })}
        onNavigate={(path) => {
          setSheet(null)
          onLeave(path)
        }}
      />
      <RunCoach open={sheet?.kind === 'coach'} origin={sheet?.kind === 'coach' ? sheet.origin : null} ctx={ctx} api={api} onClose={() => setSheet(null)} />
      <UrgeSurf open={sheet?.kind === 'urge'} origin={sheet?.kind === 'urge' ? sheet.origin : null} ctx={ctx} api={api} onClose={() => setSheet(null)} />
      <ReviewSheet
        open={sheet?.kind === 'review'}
        origin={sheet?.kind === 'review' ? sheet.origin : null}
        ctx={ctx}
        api={api}
        weekStart={sheet?.kind === 'review' ? sheet.week : reviewWeek}
        focus={sheet?.kind === 'review' ? sheet.focus : null}
        onClose={() => setSheet(null)}
      />
      <CheckpointSheet
        open={sheet?.kind === 'checkpoint'}
        origin={sheet?.kind === 'checkpoint' ? sheet.origin : null}
        ctx={ctx}
        assessments={data?.assessments ?? []}
        api={api}
        type={sheet?.kind === 'checkpoint' ? sheet.type : undefined}
        onClose={() => setSheet(null)}
      />
      <LettersSheet
        open={sheet?.kind === 'letters'}
        origin={sheet?.kind === 'letters' ? sheet.origin : null}
        ctx={ctx}
        api={api}
        letter={sheet?.kind === 'letters' ? sheet.letter : undefined}
        onClose={() => setSheet(null)}
      />
      <SettingsSheet
        open={sheet?.kind === 'settings'}
        origin={sheet?.kind === 'settings' ? sheet.origin : null}
        program={program}
        onSave={(patch) => api.saveSettings(patch, 'Saved.')}
        onDelete={remove}
        onClose={() => setSheet(null)}
      />
      <GuideSheet open={sheet?.kind === 'guide'} origin={sheet?.kind === 'guide' ? sheet.origin : null} buddyName={buddyName} onClose={() => setSheet(null)} />
      <KeptSheet open={sheet?.kind === 'kept'} origin={sheet?.kind === 'kept' ? sheet.origin : null} ctx={ctx} onClose={() => setSheet(null)} />
    </main>
  )
}

export { LighthouseWorld }
