import { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Footprints, Minus, Moon, Plus, X, Flame as FocusFlame } from 'lucide-react'
import type { DailyRing, ManualMoveType, RingDay } from '../../../../lib/api'
import { logManualMove } from '../../../../lib/api'
import type { AppPath } from '../../../dashboard/quantified-self-dashboard/data'
import { cn } from '../../../../lib/utils'
import { RingDial } from '../../../game/ring-dial'
import { StreakFlame } from '../../../game/streak-flame'
import { XpBar } from '../../../game/xp-bar'
import { DayNode } from '../../../game/day-node'
import type { DayNodeState } from '../../../game/day-node'
import { ConfettiBurst, useCelebration } from '../../../game/celebrate'
import { addDaysIso, formatMinutes, weekdayLetter } from '../home-types'

const MOVE_TYPES: ManualMoveType[] = ['Walk', 'Run', 'Gym', 'Cycle', 'Other']

/** Serif headline in the loopPhrase() spirit — a story, never a shortfall. */
function nonNegotiablePhrase(ringsClosed: number, hour: number): string {
  if (ringsClosed >= 3) return 'Three for three. Take a bow.'
  if (ringsClosed === 2) return 'Two down, one to go.'
  if (ringsClosed === 1) return hour < 12 ? 'One down before noon.' : 'One down. Two still open.'
  return hour < 12 ? 'The three are waiting.' : hour < 18 ? 'Still time for all three.' : 'The evening is still yours.'
}

type NonNegotiablesCardProps = {
  loading: boolean
  failed: boolean
  today: string
  rings: RingDay | null
  range: DailyRing[] | null
  onLogSleep: () => void
  onStartFocus: () => void
  onNavigate: (path: AppPath, search?: string) => void
  onRetry: () => void
}

type MoveDraft = {
  type: ManualMoveType
  minutes: number
  note: string
}

/**
 * The marquee card: did I do my three things today, and how long is my chain?
 * Rings come precomputed from GET /rings/today; the only write this card owns
 * is the manual "I moved" log (optimistic close, rollback + toast on failure).
 */
function NonNegotiablesCard({
  loading,
  failed,
  today,
  rings,
  range,
  onLogSleep,
  onStartFocus,
  onNavigate,
  onRetry,
}: NonNegotiablesCardProps) {
  const [moveOpen, setMoveOpen] = useState(false)
  const [moveDraft, setMoveDraft] = useState<MoveDraft>({ type: 'Walk', minutes: 30, note: '' })
  const [moveSaving, setMoveSaving] = useState(false)
  const [optimisticMove, setOptimisticMove] = useState<number | null>(null)
  const [banner, setBanner] = useState<string | null>(null)
  const movePopRef = useRef<HTMLDivElement | null>(null)
  const { confettiTrigger, celebrate } = useCelebration()

  // Dial size is a prop, not CSS — track the mobile breakpoint directly.
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches,
  )
  useEffect(() => {
    const query = window.matchMedia('(max-width: 768px)')
    const handle = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    query.addEventListener('change', handle)
    return () => query.removeEventListener('change', handle)
  }, [])
  const dialSize = isMobile ? 76 : 104

  const ring = rings?.ring ?? null
  const streak = rings?.streak ?? null

  // Optimistic MOVE overlay — cleared as soon as fresh server data arrives.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOptimisticMove(null)
  }, [ring?.moveMinutes, ring?.computedAt])

  const moveMinutes = optimisticMove ?? ring?.moveMinutes ?? 0
  const moveTarget = ring?.moveTargetMinutes ?? 15
  const moveClosed = optimisticMove != null ? optimisticMove >= moveTarget : (ring?.moveClosed ?? false)
  const restClosed = ring?.restClosed ?? false
  const deepClosed = ring?.deepClosed ?? false
  const ringsClosed = (restClosed ? 1 : 0) + (deepClosed ? 1 : 0) + (moveClosed ? 1 : 0)
  const perfect = ringsClosed === 3

  const hour = new Date().getHours()
  const atRisk = !loading && !perfect && hour >= 20 && (streak?.currentStreak ?? 0) > 0

  // Celebration fires only on an in-session close: the first data we see for
  // an already-perfect day just records the state without fireworks. It watches
  // the server-confirmed ring (never the optimistic overlay) so the streak
  // number in the banner is the recomputed truth, not a stale guess.
  const serverPerfect = ring?.perfect ?? false
  const prevPerfectRef = useRef<boolean | null>(null)
  useEffect(() => {
    if (loading || rings == null) return
    if (prevPerfectRef.current === false && serverPerfect) {
      if (celebrate('perfect-day', today)) {
        const line =
          streak && streak.currentStreak > 1
            ? `Three for three. Streak: ${streak.currentStreak} days. +100 XP.`
            : 'Three for three. +100 XP.'
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setBanner(line)
      }
    }
    prevPerfectRef.current = serverPerfect
  }, [serverPerfect, loading, rings, celebrate, today, streak])

  // Popover closes on outside click / Escape — the FAB's pattern.
  useEffect(() => {
    if (!moveOpen) return
    const handlePointer = (e: MouseEvent) => {
      if (movePopRef.current && !movePopRef.current.contains(e.target as Node)) setMoveOpen(false)
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoveOpen(false)
    }
    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [moveOpen])

  const submitMove = async () => {
    if (moveSaving) return
    setMoveSaving(true)
    setOptimisticMove(Math.max(moveDraft.minutes, ring?.moveMinutes ?? 0))
    setMoveOpen(false)
    try {
      await logManualMove({
        date: today,
        minutes: moveDraft.minutes,
        activityType: moveDraft.type,
        note: moveDraft.note.trim() || undefined,
      })
      window.dispatchEvent(new CustomEvent('rings-updated'))
      toast.success('Movement logged. It counts.')
      setMoveDraft({ type: 'Walk', minutes: 30, note: '' })
    } catch {
      setOptimisticMove(null)
      toast.error('Could not log that — try again.')
    } finally {
      setMoveSaving(false)
    }
  }

  // Last 7 ring days for the strip, today last.
  const week = useMemo(() => {
    const byDate = new Map((range ?? []).map((r) => [r.date, r]))
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDaysIso(today, i - 6)
      const day = byDate.get(date) ?? null
      let state: DayNodeState = 'missed'
      if (date === today) state = 'today'
      else if (day?.frozen) state = 'frozen'
      else if (day?.perfect) state = 'perfect'
      else if ((day?.ringsClosed ?? 0) > 0) state = 'partial'
      return { date, day, state }
    })
  }, [range, today])
  const weekPerfect = week.filter((w) => w.day?.perfect).length

  const flameVariant = !streak || streak.currentStreak === 0
    ? 'dormant'
    : atRisk
      ? 'at-risk'
      : 'live'

  if (loading) {
    return (
      <section className="home-card home-nn-card" aria-label="Three non-negotiables">
        <div className="home-nn-head">
          <div>
            <p className="ntr-eyebrow">Today · The Three</p>
            <span className="home-skel home-skel--title" style={{ width: 240, marginTop: 6 }} />
          </div>
        </div>
        <div className="home-nn-body is-skeleton">
          {Array.from({ length: 3 }, (_, i) => (
            <span key={i} className="home-skel" style={{ width: 104, height: 104, borderRadius: '50%' }} />
          ))}
        </div>
      </section>
    )
  }

  if (failed) {
    return (
      <section className="home-card home-nn-card" aria-label="Three non-negotiables">
        <div className="home-nn-head">
          <div>
            <p className="ntr-eyebrow">Today · The Three</p>
            <h2 className="home-nn-phrase">The rings are resting.</h2>
          </div>
        </div>
        <div className="home-card-empty">
          <p>Couldn't load the rings right now.</p>
          <button type="button" className="home-btn-quiet" onClick={onRetry}>
            Retry
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="home-card home-nn-card" aria-label="Three non-negotiables">
      <ConfettiBurst trigger={confettiTrigger} />

      <div className="home-nn-head">
        <div>
          <p className="ntr-eyebrow">Today · The Three</p>
          <h2 className="home-nn-phrase">{nonNegotiablePhrase(ringsClosed, hour)}</h2>
        </div>
        <div className="home-nn-meta">
          {streak && (
            <StreakFlame
              count={streak.currentStreak}
              variant={flameVariant}
              title={
                flameVariant === 'at-risk'
                  ? `${streak.currentStreak}-day streak — still open tonight`
                  : undefined
              }
            />
          )}
          {rings && streak && (
            <XpBar level={streak.level} xpIntoLevel={rings.xpIntoLevel} xpForNextLevel={rings.xpForNextLevel} />
          )}
        </div>
      </div>

      {banner && (
        <div className="home-nn-banner" role="status">
          <span>{banner}</span>
          <button type="button" aria-label="Dismiss" onClick={() => setBanner(null)}>
            <X size={13} />
          </button>
        </div>
      )}

      <div className="home-nn-body">
        <div className="home-nn-rings">
          <div className="home-nn-ring">
            <RingDial
              value={ring?.restMinutes ?? 0}
              target={ring?.restTargetMinutes ?? 450}
              label="Rest"
              accent="rest"
              size={dialSize}
              display={formatMinutes(ring?.restMinutes ?? 0)}
              state={restClosed ? 'closed' : 'open'}
              onClick={onLogSleep}
              ariaLabel={`Rest: ${formatMinutes(ring?.restMinutes ?? 0)} of ${formatMinutes(ring?.restTargetMinutes ?? 450)} sleep${restClosed ? ', complete' : ''}`}
            />
            {restClosed ? (
              <span className="home-nn-done">logged</span>
            ) : (
              <button type="button" className="home-nn-action" aria-label="Log last night's sleep" onClick={onLogSleep}>
                <Moon size={11} strokeWidth={2.5} /> <span className="home-nn-action-label">Log last night</span>
              </button>
            )}
          </div>

          <div className="home-nn-ring">
            <RingDial
              value={ring?.deepMinutes ?? 0}
              target={ring?.deepTargetMinutes ?? 120}
              label="Deep"
              accent="deep"
              size={dialSize}
              display={formatMinutes(ring?.deepMinutes ?? 0)}
              state={deepClosed ? 'closed' : 'open'}
              onClick={onStartFocus}
              ariaLabel={`Deep work: ${formatMinutes(ring?.deepMinutes ?? 0)} of ${formatMinutes(ring?.deepTargetMinutes ?? 120)} focus${deepClosed ? ', complete' : ''}`}
            />
            {deepClosed ? (
              <span className="home-nn-done">logged</span>
            ) : (
              <button type="button" className="home-nn-action" aria-label="Start a focus session" onClick={onStartFocus}>
                <FocusFlame size={11} strokeWidth={2.5} /> <span className="home-nn-action-label">Start focus</span>
              </button>
            )}
          </div>

          <div className="home-nn-ring" ref={movePopRef}>
            <RingDial
              value={moveMinutes}
              target={moveTarget}
              label="Move"
              accent="move"
              size={dialSize}
              display={formatMinutes(moveMinutes)}
              state={moveClosed ? 'closed' : 'open'}
              onClick={() => onNavigate('/workouts')}
              ariaLabel={`Move: ${formatMinutes(moveMinutes)} of ${formatMinutes(moveTarget)} activity${moveClosed ? ', complete' : ''}`}
            />
            {moveClosed ? (
              <span className="home-nn-done">
                {ring?.moveSource === 'MANUAL' || optimisticMove != null ? 'moved' : 'logged'}
              </span>
            ) : (
              <button
                type="button"
                className="home-nn-action"
                aria-label="Log movement manually"
                aria-expanded={moveOpen}
                onClick={() => setMoveOpen((open) => !open)}
              >
                <Footprints size={11} strokeWidth={2.5} /> <span className="home-nn-action-label">I moved</span>
              </button>
            )}

            {moveOpen && (
              <div className="home-nn-pop" role="dialog" aria-label="Log movement">
                <div className="home-nn-pop-chips" role="radiogroup" aria-label="Activity type">
                  {MOVE_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      role="radio"
                      aria-checked={moveDraft.type === type}
                      className={cn('home-nn-chip', moveDraft.type === type && 'is-active')}
                      onClick={() => setMoveDraft((d) => ({ ...d, type }))}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                <div className="home-nn-pop-row">
                  <div className="home-nn-stepper">
                    <button
                      type="button"
                      aria-label="Less time"
                      onClick={() => setMoveDraft((d) => ({ ...d, minutes: Math.max(5, d.minutes - 5) }))}
                    >
                      <Minus size={12} />
                    </button>
                    <b>{moveDraft.minutes}m</b>
                    <button
                      type="button"
                      aria-label="More time"
                      onClick={() => setMoveDraft((d) => ({ ...d, minutes: Math.min(360, d.minutes + 5) }))}
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                  <button type="button" className="home-btn-primary home-nn-pop-save" disabled={moveSaving} onClick={() => void submitMove()}>
                    {moveSaving ? 'Saving…' : 'Log it'}
                  </button>
                </div>
                <input
                  type="text"
                  className="home-nn-pop-note"
                  placeholder="Optional note — where, with whom…"
                  value={moveDraft.note}
                  maxLength={120}
                  onChange={(e) => setMoveDraft((d) => ({ ...d, note: e.target.value }))}
                />
              </div>
            )}
          </div>
        </div>

        <div className="home-nn-week" aria-label="Last seven days">
          <div className="home-nn-week-row">
            {week.map(({ date, day, state }) => (
              <span key={date} className="home-nn-week-col">
                <small>{weekdayLetter(date)}</small>
                <DayNode
                  state={state}
                  date={date}
                  ringsClosed={state === 'today' ? ringsClosed : (day?.ringsClosed ?? 0)}
                  size={26}
                  onClick={() => onNavigate('/calendar', `?date=${date}`)}
                />
              </span>
            ))}
          </div>
          <span className="home-nn-week-note">
            {atRisk
              ? `Still open — the day turns over at 4 am.`
              : `↳ this week ${weekPerfect}/7`}
          </span>
        </div>
      </div>
    </section>
  )
}

export { NonNegotiablesCard }
