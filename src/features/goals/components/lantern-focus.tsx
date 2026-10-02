import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { ArrowRight, CalendarDays, Check, ChevronDown, DoorOpen, Loader2, Minus, PenLine, Plus, Settings2, Undo2, X } from 'lucide-react'
import type { GoalCheckInPayload, GoalProgressView } from '@/types/goals'
import { useConfirmClose } from '@/hooks/use-confirm-close'
import { getErrorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'
import { addDays, dayLabel, formatAmount, formatNumber, formatProgress, paceSentence, relativeDay, ruleLabel, shapeOf, weekdayLetter } from '../goal-format'
import { goalColor } from '../goal-palette'
import { lightLevel, previewLevel } from '../lantern-light'
import { campSound } from '../camp-sound'
import { useHeld } from '../use-held'
import { useHold } from '../use-hold'
import { usePop } from '../use-pop'
import { goalWorld } from '../worlds/world-registry'
import { CampSheet } from './camp-sheet'
import { LanternArt } from './lantern-art'

type LanternFocusProps = {
  view: GoalProgressView | null
  /** The lantern on the string it was lowered from. */
  origin: HTMLElement | null
  today: string
  busy: boolean
  onLog: (goalId: string, payload: GoalCheckInPayload) => Promise<void>
  onUndo: (goalId: string, checkInId: string) => Promise<void>
  /** Opens the goal workshop for this goal (archive and delete live there too). */
  onEdit: (view: GoalProgressView) => void
  /** Walks into the goal's own world, if it has one. */
  onOpenWorld: (view: GoalProgressView) => void
  onClose: () => void
}

const RECENT_DAYS = 7
/** How long a freshly lit lantern stays down so you can see it glow, before it goes back up. */
const SETTLE_MS = 820

const isMinutes = (unit?: string | null) => !!unit && /^(min|mins|minutes?)$/i.test(unit.trim())
const timeOf = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''

/** Quick amounts: what finishes the day (or the week's even share), then round numbers. */
function quickAmounts(view: GoalProgressView, dayValue: number, inThisWeek: boolean, isToday: boolean): { label: string; value: number }[] {
  const { goal, week } = view
  const out: { label: string; value: number }[] = []
  const add = (label: string, value: number) => {
    if (value > 0 && !out.some((o) => o.value === value)) out.push({ label, value })
  }
  if (goal.period === 'DAY') {
    const remaining = Math.ceil(goal.target - dayValue)
    if (remaining > 0) add(`Finish · ${formatAmount(remaining, goal.unit)}`, remaining)
    add(formatAmount(goal.target, goal.unit), goal.target)
    add(formatAmount(Math.ceil(goal.target / 2), goal.unit), Math.ceil(goal.target / 2))
  } else {
    if (inThisWeek && !week.kept && week.perDayToFinish != null) {
      add(`${isToday ? 'Today’s' : 'A day’s'} share · ${formatAmount(Math.ceil(week.perDayToFinish), goal.unit)}`, Math.ceil(week.perDayToFinish))
    }
    const steps = isMinutes(goal.unit) ? [15, 30, 60] : [Math.ceil(goal.target / 14), Math.ceil(goal.target / 7)]
    steps.forEach((v) => add(formatAmount(v, goal.unit), v))
  }
  return out.slice(0, 4)
}

/** Nudge size for the − / + buttons. */
const stepOf = (view: GoalProgressView) => (isMinutes(view.goal.unit) ? 5 : view.goal.target >= 100 ? 10 : 1)

/**
 * A lantern, lowered to you on its cord: the big lantern on top shows the light it holds
 * (and, striped, what this entry would bring it to); its paper tag underneath is the
 * whole interaction. Amounts get a stepper, a few quick amounts and one big button; check
 * goals are held to light, like on the string. The day and a note are folded away until
 * wanted — most logs are "today, the usual". The entries already made that day sit at
 * the bottom as paper slips you can undo.
 */
function LanternFocus({ view: liveView, origin, today, busy, onLog, onUndo, onEdit, onOpenWorld, onClose }: LanternFocusProps) {
  const open = liveView != null
  const view = useHeld(liveView)
  const goalId = view?.goal.id
  const [date, setDate] = useState(today)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [showDays, setShowDays] = useState(false)
  const [showNote, setShowNote] = useState(false)
  const [settling, setSettling] = useState(false)

  const entries = useMemo(() => (view?.recentEntries ?? []).filter((c) => c.date === date), [view, date])
  const dayValue = entries.reduce((sum, c) => sum + c.value, 0)
  const inThisWeek = !!view && date >= view.week.weekStart
  const quick = useMemo(
    () => (view ? quickAmounts(view, dayValue, inThisWeek, date === today) : []),
    [view, dayValue, inThisWeek, date, today],
  )

  // Every open starts on today, folded, pre-filled with the most useful amount.
  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDate(today)
    setNote('')
    setError('')
    setShowDays(false)
    setShowNote(false)
    setSettling(false)
  }, [open, goalId, today])

  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAmount(quick[0] ? String(quick[0].value) : '')
    // Only when the day changes — not when a log updates the quick list underneath.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, goalId, date])

  const { requestClose, dialog: confirmCloseDialog } = useConfirmClose(open && note.trim().length > 0 && !busy && !settling, onClose)

  const isCount = view?.goal.measure === 'COUNT'
  const doneOnDay = !isCount && entries.length > 0
  const holdable = !!view && !isCount && !doneOnDay && !busy && !settling

  const settleTimer = useRef<number | null>(null)
  useEffect(
    () => () => {
      if (settleTimer.current != null) window.clearTimeout(settleTimer.current)
    },
    [goalId],
  )
  const settleThenClose = () => {
    setSettling(true)
    settleTimer.current = window.setTimeout(onClose, SETTLE_MS)
  }

  const log = async (payload: GoalCheckInPayload) => {
    if (!view) return
    setError('')
    try {
      await onLog(view.goal.id, payload)
      settleThenClose()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not log that — try again.'))
      campSound.play('soft-no')
    }
  }

  const { charging, nudged, handlers: holdHandlers } = useHold({
    enabled: holdable,
    onComplete: () => void log({ date, note: note.trim() || undefined }),
    onTap: () => undefined,
  })
  useEffect(() => {
    if (charging) campSound.chargeStart()
    else campSound.chargeStop()
  }, [charging])
  useEffect(() => {
    if (nudged) campSound.play('nudge')
  }, [nudged])

  // Hold-to-repeat on the stepper.
  const repeat = useRef<{ delay: number | null; tick: number | null }>({ delay: null, tick: null })
  const stopRepeat = () => {
    if (repeat.current.delay != null) window.clearTimeout(repeat.current.delay)
    if (repeat.current.tick != null) window.clearInterval(repeat.current.tick)
    repeat.current = { delay: null, tick: null }
  }
  useEffect(() => stopRepeat, [])

  const litOnHero = !!view && (date === today ? view.today.hit : doneOnDay)
  const popped = usePop(!!view && view.today.hit)

  if (!view) return null

  const { goal, week } = view
  const shape = shapeOf(goal)
  const value = Number(amount)
  const validAmount = value > 0 && value <= 100000
  const days = Array.from({ length: RECENT_DAYS }, (_, i) => addDays(today, i - (RECENT_DAYS - 1)))
  const when = relativeDay(date, today)
  const onDay = when === 'Today' ? 'today' : when === 'Yesterday' ? 'yesterday' : `on ${dayLabel(date)}`
  const step = stepOf(view)

  const nudgeAmount = (dir: 1 | -1) => {
    setAmount((a) => {
      const next = Math.max(0, (Number(a) || 0) + dir * step)
      return String(Math.round(next * 10) / 10)
    })
    campSound.play(dir > 0 ? 'step-up' : 'step-down')
  }
  const startRepeat = (e: ReactPointerEvent<HTMLButtonElement>, dir: 1 | -1) => {
    if (e.button !== 0) return
    e.preventDefault()
    nudgeAmount(dir)
    stopRepeat()
    repeat.current.delay = window.setTimeout(() => {
      repeat.current.tick = window.setInterval(() => nudgeAmount(dir), 70)
    }, 380)
  }

  // The readout: where this goal stands on the chosen day (or week), in its own terms.
  let bigValue: string
  let bigOf: string
  let caption: string
  if (shape === 'daily-amount') {
    bigValue = formatNumber(dayValue)
    bigOf = `/${formatNumber(goal.target)}`
    caption = `${goal.unit ?? ''} ${onDay}`.trim()
  } else if (shape === 'weekly-total') {
    bigValue = formatAmount(inThisWeek ? week.value : 0, goal.unit)
    bigOf = ` of ${formatAmount(week.target, goal.unit)}`
    caption = inThisWeek ? 'this week' : `the week of ${dayLabel(date)}`
  } else if (shape === 'times-week') {
    bigValue = formatNumber(week.value)
    bigOf = `/${formatNumber(week.target)}`
    caption = 'times this week'
  } else {
    // Today's state is the big button below; the readout carries the week.
    bigValue = formatNumber(week.value)
    bigOf = `/${formatNumber(week.target)}`
    caption = 'days this week'
  }

  let badge: string | null = null
  if (isCount && shape === 'daily-amount') {
    if (dayValue >= goal.target) badge = 'Already lit — extra counts too'
    else if (validAmount && dayValue + value >= goal.target) badge = 'That lights it!'
  } else if (isCount) {
    if (inThisWeek && week.kept) badge = 'Week already kept — a bonus'
    else if (inThisWeek && validAmount && week.value + value >= week.target) badge = 'That keeps the week!'
  } else if (!doneOnDay && inThisWeek && !week.kept && week.value + 1 >= week.target) {
    badge = 'This one keeps the week!'
  }

  const level = settling || charging ? Math.max(lightLevel(view), charging ? 1 : 0) : lightLevel(view)
  const preview = isCount && validAmount && !settling ? previewLevel(view, value, dayValue, inThisWeek) : undefined

  const submitCount = () => {
    if (busy || settling || !validAmount) return
    void log({ date, value, note: note.trim() || undefined })
  }

  const undo = async (checkInId: string) => {
    setError('')
    try {
      await onUndo(goal.id, checkInId)
      campSound.play('close')
    } catch (err) {
      setError(getErrorMessage(err, 'Could not undo that — try again.'))
    }
  }

  const titleId = 'lantern-focus-title'
  const color = goalColor(goal)
  const world = goalWorld(goal.world)

  const hero = (
    <div
      className={cn(
        'lantern lantern--hero',
        litOnHero && 'is-lit',
        level > 0 && !litOnHero && 'has-light',
        charging && 'is-charging',
        popped && 'is-popped',
        nudged && 'is-nudged',
        holdable && 'is-holdable',
      )}
      data-color={color}
      data-focus-goal-id={goal.id}
      {...(holdable ? holdHandlers : {})}
      aria-hidden="true"
    >
      <LanternArt icon={goal.icon} level={level} preview={preview} lit={litOnHero} busy={busy} iconSize={34} />
    </div>
  )

  return (
    <>
      <CampSheet
        open={open}
        onRequestClose={requestClose}
        origin={origin}
        labelledBy={titleId}
        hero={hero}
        color={color}
        tag
        width={430}
      >
        <form
          className="lf"
          onSubmit={(e) => {
            e.preventDefault()
            submitCount()
          }}
        >
          <header className="lf-head">
            <div className="lf-title">
              <h2 id={titleId}>{goal.title}</h2>
              <p>{ruleLabel(goal)}</p>
            </div>
            <button type="button" className="cs-icon" onClick={() => onEdit(view)} aria-label={`Shape ${goal.title}`} title="Shape this goal">
              <Settings2 size={16} strokeWidth={2.4} />
            </button>
            <button type="button" className="cs-icon" onClick={requestClose} aria-label="Close" title="Close">
              <X size={16} strokeWidth={2.6} />
            </button>
          </header>

          <div className="lf-read" aria-live="polite">
            <p className="lf-big">
              <strong>{bigValue}</strong>
              {bigOf && <span>{bigOf}</span>}
            </p>
            <p className="lf-caption">{caption}</p>
            {badge && <p className="lf-badge">{badge}</p>}
          </div>

          {isCount ? (
            <div className="lf-amount-block">
              <div className="lf-stepper">
                <button
                  type="button"
                  className="lf-step"
                  aria-label={`Less, by ${formatAmount(step, goal.unit)}`}
                  onPointerDown={(e) => startRepeat(e, -1)}
                  onPointerUp={stopRepeat}
                  onPointerLeave={stopRepeat}
                  onPointerCancel={stopRepeat}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      nudgeAmount(-1)
                    }
                  }}
                >
                  <Minus size={20} strokeWidth={3} />
                </button>
                <label className="lf-amount">
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    aria-label={`Amount${goal.unit ? ` in ${goal.unit}` : ''}`}
                    data-autofocus
                  />
                  {goal.unit && <span>{goal.unit}</span>}
                </label>
                <button
                  type="button"
                  className="lf-step"
                  aria-label={`More, by ${formatAmount(step, goal.unit)}`}
                  onPointerDown={(e) => startRepeat(e, 1)}
                  onPointerUp={stopRepeat}
                  onPointerLeave={stopRepeat}
                  onPointerCancel={stopRepeat}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      nudgeAmount(1)
                    }
                  }}
                >
                  <Plus size={20} strokeWidth={3} />
                </button>
              </div>
              {quick.length > 0 && (
                <div className="lf-chips">
                  {quick.map((q) => (
                    <button
                      key={q.value}
                      type="button"
                      className={cn('lf-chip', value === q.value && 'is-on')}
                      onClick={() => {
                        setAmount(String(q.value))
                        campSound.play('tap')
                      }}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              )}
              <button type="submit" className="lf-cta" disabled={busy || settling || !validAmount}>
                {busy ? <Loader2 size={18} className="animate-spin" /> : settling ? <Check size={18} strokeWidth={3} /> : <Plus size={18} strokeWidth={3} />}
                {settling ? 'Added!' : validAmount ? `Add ${formatAmount(value, goal.unit)}${when === 'Today' ? '' : ` · ${when}`}` : 'How much?'}
              </button>
            </div>
          ) : doneOnDay || settling ? (
            <p className="lf-done">
              <Check size={18} strokeWidth={3.2} /> Lit {onDay}
            </p>
          ) : (
            <button
              type="button"
              className={cn('lf-cta lf-hold', charging && 'is-charging', nudged && 'is-nudged')}
              disabled={busy}
              data-autofocus
              {...holdHandlers}
            >
              <span className="lf-hold-fill" aria-hidden="true" />
              <span className="lf-hold-label">
                {busy ? <Loader2 size={18} className="animate-spin" /> : null}
                {charging ? 'Keep holding…' : nudged ? 'Hold it a little longer' : `Hold to light${when === 'Today' ? '' : ` · ${when}`}`}
              </span>
            </button>
          )}

          <div className="lf-folds">
            <button type="button" className={cn('lf-pill', showDays && 'is-on')} aria-expanded={showDays} onClick={() => setShowDays((s) => !s)}>
              <CalendarDays size={14} strokeWidth={2.5} /> {when === 'Today' ? 'Today' : when === 'Yesterday' ? 'Yesterday' : dayLabel(date)}
              <ChevronDown size={13} strokeWidth={2.8} className={cn('lf-chev', showDays && 'is-open')} />
            </button>
            {!doneOnDay && (
              <button type="button" className={cn('lf-pill', (showNote || note) && 'is-on')} aria-expanded={showNote} onClick={() => setShowNote((s) => !s)}>
                <PenLine size={14} strokeWidth={2.5} /> {note ? 'Note added' : 'Add a note'}
              </button>
            )}
          </div>

          {showDays && (
            <div className="lf-days" role="radiogroup" aria-label="Which day">
              {days.map((d) => {
                const logged = (view.recentEntries ?? []).some((c) => c.date === d)
                return (
                  <button
                    key={d}
                    type="button"
                    role="radio"
                    aria-checked={d === date}
                    className={cn('lf-day', d === date && 'is-on', logged && 'has-log')}
                    onClick={() => {
                      setDate(d)
                      campSound.play('tap')
                    }}
                  >
                    <small>{d === today ? 'Today' : weekdayLetter(d)}</small>
                    <strong>{Number(d.slice(8))}</strong>
                  </button>
                )
              })}
            </div>
          )}

          {showNote && !doneOnDay && (
            <input
              className="lf-note"
              type="text"
              value={note}
              maxLength={200}
              placeholder={goal.icon === 'book' ? 'Which book, where you got to…' : 'Anything worth remembering…'}
              onChange={(e) => setNote(e.target.value)}
              autoFocus
            />
          )}

          {error && (
            <p className="lf-error" role="alert">
              {error}
            </p>
          )}

          {entries.length > 0 && (
            <div className="lf-slips">
              <p className="lf-slips-title">{when === 'Today' ? 'Logged today' : `Logged ${onDay}`}</p>
              <ul>
                {entries.map((c, i) => (
                  <li key={c.id} className="lf-slip" style={{ ['--tilt' as string]: `${((i % 3) - 1) * 0.8}deg` }}>
                    <strong>{isCount ? formatAmount(c.value, goal.unit) : 'Lit'}</strong>
                    {c.note && <span className="lf-slip-note">“{c.note}”</span>}
                    <span className="lf-slip-time">{timeOf(c.createdAt)}</span>
                    <button
                      type="button"
                      className="lf-undo"
                      onClick={() => void undo(c.id)}
                      disabled={busy || settling}
                      aria-label={`Undo ${isCount ? formatAmount(c.value, goal.unit) : 'this'}`}
                      title="Undo"
                    >
                      <Undo2 size={13} strokeWidth={2.6} />
                    </button>
                  </li>
                ))}
              </ul>
              {isCount && entries.length > 1 && <p className="lf-slips-total">{formatNumber(dayValue)} in all</p>}
            </div>
          )}

          {world ? (
            <button type="button" className="lf-world" onClick={() => onOpenWorld(view)}>
              <DoorOpen size={18} strokeWidth={2.4} />
              <span>
                <strong>Visit {world.name}</strong>
                <small>This lantern’s own world</small>
              </span>
              <ArrowRight size={16} strokeWidth={2.6} />
            </button>
          ) : (
            <button type="button" className="lf-world-hint" onClick={() => onEdit(view)}>
              <DoorOpen size={14} strokeWidth={2.5} /> Give it a world of its own
            </button>
          )}

          <footer className="lf-week">
            <ol aria-label="This week">
              {week.days.map((d) => (
                <li
                  key={d.date}
                  className={cn(d.hit && 'is-hit', d.today && 'is-today', (d.future || d.beforeStart) && 'is-off')}
                  aria-label={`${dayLabel(d.date)}${d.hit ? ': counted' : ''}`}
                >
                  <i />
                  <small>{weekdayLetter(d.date)}</small>
                </li>
              ))}
            </ol>
            <p>
              {shape === 'weekly-total' ? formatProgress(week.value, week.target, goal.unit) + ' · ' : ''}
              {paceSentence(view)}
            </p>
          </footer>
        </form>
      </CampSheet>
      {confirmCloseDialog}
    </>
  )
}

export { LanternFocus }
