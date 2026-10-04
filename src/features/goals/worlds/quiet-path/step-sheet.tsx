import { useEffect, useState } from 'react'
import { BookOpen, Check, Feather, Footprints, Heart, Loader2, MessageCircle, Minus, PenLine, Plus, Sparkles, TreePine, Undo2, Wind, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { GoalCheckIn, GoalCheckInPayload, GoalPractice, GoalProgressView } from '@/types/goals'
import { getErrorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'
import { addDays, formatAmount } from '../../goal-format'
import { campSound } from '../../camp-sound'
import { CampSheet } from '../../components/camp-sheet'
import { PRACTICES, practiceInfo } from './path-data'

const ICONS: Record<GoalPractice, LucideIcon> = {
  breathe: Wind,
  walk: Footprints,
  still: Feather,
  write: PenLine,
  gratitude: Heart,
  nature: TreePine,
  talk: MessageCircle,
  learn: BookOpen,
  other: Sparkles,
}

export const PracticeIcon = ({ practice, size = 18 }: { practice: GoalPractice; size?: number }) => {
  const Icon = ICONS[practice]
  return <Icon size={size} strokeWidth={2.4} />
}

type StepSheetProps = {
  open: boolean
  origin: HTMLElement | null
  view: GoalProgressView | null
  today: string
  busy: boolean
  onLog: (payload: GoalCheckInPayload) => Promise<void>
  onUndo: (checkInId: string) => Promise<void>
  onClose: () => void
}

const isMinutes = (unit?: string | null) => !!unit && /^(min|mins|minutes?)$/i.test(unit.trim())

/**
 * Something else that helped: a practice done away from the path — a walk, a call, quiet
 * minutes. Pick what it was, an amount if the goal counts one, and — only if you like — a
 * line about what helped. It counts for the day (the camp lantern, days tended, "what
 * helps") but doesn't walk a stone; stones are walked by their sessions. Today's entries
 * sit at the bottom with undo. Nothing here asks how you feel.
 */
function StepSheet({ open, origin, view, today, busy, onLog, onUndo, onClose }: StepSheetProps) {
  const [practice, setPractice] = useState<GoalPractice | null>(null)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [yesterday, setYesterday] = useState(false)
  const [error, setError] = useState('')

  const goal = view?.goal
  const counts = goal?.measure === 'COUNT'
  const step = isMinutes(goal?.unit) ? 5 : 1

  // A fresh form on every open, pre-filled with a sensible amount for counted goals.
  const defaultAmount = goal && goal.measure === 'COUNT' ? String(goal.period === 'DAY' ? goal.target : isMinutes(goal.unit) ? 10 : 1) : ''
  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPractice(null)
    setNote('')
    setYesterday(false)
    setError('')
    setAmount(defaultAmount)
  }, [open, defaultAmount])

  const date = yesterday ? addDays(today, -1) : today
  const entries: GoalCheckIn[] = (view?.recentEntries ?? []).filter((c) => c.date === date)
  const value = Number(amount)
  const valid = !!practice && (!counts || (value > 0 && value <= 100000))

  const submit = async () => {
    if (!valid || busy || !practice) return
    setError('')
    try {
      await onLog({ date, practice, value: counts ? value : undefined, note: note.trim() || undefined })
    } catch (err) {
      setError(getErrorMessage(err, 'Couldn’t save that step — try again.'))
      campSound.play('soft-no')
    }
  }

  return (
    <CampSheet open={open} onRequestClose={onClose} origin={origin} labelledBy="qs-title" width={460} color="sky">
      <form
        className="qs"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <header className="qs-head">
          <div>
            <h2 id="qs-title">Something else that helped</h2>
            <p>A walk, a call, a few quiet minutes — log it as practice{yesterday ? ' for yesterday' : ' for today'}.</p>
          </div>
          <button type="button" className="cs-icon" onClick={onClose} aria-label="Close">
            <X size={16} strokeWidth={2.6} />
          </button>
        </header>

        <div className="qs-practices" role="radiogroup" aria-label="Practice">
          {PRACTICES.map((p, i) => (
            <button
              key={p.key}
              type="button"
              role="radio"
              aria-checked={practice === p.key}
              className={cn('qs-practice', practice === p.key && 'is-on')}
              style={{ ['--pr' as string]: p.fill }}
              onClick={() => {
                setPractice(p.key)
                campSound.play('tap')
              }}
              data-autofocus={i === 0 ? true : undefined}
            >
              <span className="qs-practice-icon" aria-hidden="true">
                <PracticeIcon practice={p.key} />
              </span>
              {p.label}
            </button>
          ))}
        </div>

        {counts && goal && (
          <div className="qs-amount">
            <span>How long</span>
            <div className="qs-stepper">
              <button type="button" aria-label="Less" onClick={() => setAmount((a) => String(Math.max(0, (Number(a) || 0) - step)))}>
                <Minus size={16} strokeWidth={3} />
              </button>
              <label>
                <input type="number" inputMode="decimal" min={0} step="any" value={amount} onChange={(e) => setAmount(e.target.value)} aria-label={`Amount in ${goal.unit ?? 'units'}`} />
                {goal.unit && <small>{goal.unit}</small>}
              </label>
              <button type="button" aria-label="More" onClick={() => setAmount((a) => String((Number(a) || 0) + step))}>
                <Plus size={16} strokeWidth={3} />
              </button>
            </div>
          </div>
        )}

        <label className="qs-note">
          <span>
            What helped? <em>optional</em>
          </span>
          <input type="text" value={note} maxLength={200} placeholder="A line for future you" onChange={(e) => setNote(e.target.value)} />
        </label>

        <div className="qs-when" role="radiogroup" aria-label="Which day">
          <button type="button" role="radio" aria-checked={!yesterday} className={cn(!yesterday && 'is-on')} onClick={() => setYesterday(false)}>
            Today
          </button>
          <button type="button" role="radio" aria-checked={yesterday} className={cn(yesterday && 'is-on')} onClick={() => setYesterday(true)}>
            Yesterday
          </button>
        </div>

        {error && (
          <p className="qs-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="qs-cta" disabled={!valid || busy}>
          {busy ? <Loader2 size={18} className="animate-spin" /> : <Footprints size={18} strokeWidth={2.6} />}
          {!practice ? 'Pick what you did' : 'Log it'}
        </button>

        {entries.length > 0 && (
          <div className="qs-entries">
            <p>{yesterday ? 'Logged yesterday' : 'Logged today'}</p>
            <ul>
              {entries.map((c) => {
                const info = practiceInfo(c.practice)
                return (
                  <li key={c.id}>
                    <span className="qs-entry-dot" style={{ background: info?.fill ?? '#d9c9ae' }} aria-hidden="true" />
                    <strong>{info?.label ?? 'A step'}</strong>
                    {counts && <small>{formatAmount(c.value, goal?.unit)}</small>}
                    {c.note && <em>“{c.note}”</em>}
                    <button type="button" className="qs-undo" onClick={() => void onUndo(c.id)} disabled={busy} aria-label="Undo this" title="Undo">
                      <Undo2 size={13} strokeWidth={2.6} />
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        <p className="qs-small">
          <Check size={12} strokeWidth={3} /> It counts toward the day and goes in your notebook. The path’s stones are walked by their sessions.
        </p>
      </form>
    </CampSheet>
  )
}

export { StepSheet }
