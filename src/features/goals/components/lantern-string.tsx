import { Plus } from 'lucide-react'
import type { GoalPayload, GoalProgressView } from '@/types/goals'
import { MAX_ACTIVE_GOALS } from '../goal-format'
import { useMediaQuery } from '../use-media-query'
import { GoalIcon } from './goal-icon'
import { GoalLantern } from './goal-lantern'

type LanternStringProps = {
  loading: boolean
  goals: GoalProgressView[]
  pending: ReadonlySet<string>
  onComplete: (view: GoalProgressView) => void
  onOpen: (view: GoalProgressView, from: HTMLElement | null) => void
  onAdd: (preset?: GoalPayload, from?: HTMLElement | null) => void
  /** The lantern Hoot hung today's first-light star on, if any. */
  firstLightId?: string | null
}

/** Small, kind first goals for an empty camp — each opens the goal form pre-filled. */
const STARTERS: { payload: GoalPayload; rule: string }[] = [
  { payload: { title: 'Read', icon: 'book', color: 'tangerine', measure: 'COUNT', period: 'DAY', target: 10, unit: 'pages', daysPerWeek: 5 }, rule: '10 pages, 5 days a week' },
  { payload: { title: 'Move', icon: 'dumbbell', color: 'mint', measure: 'CHECK', period: 'WEEK', target: 3 }, rule: '3 times a week' },
  { payload: { title: 'Deep learning', icon: 'graduation', color: 'grape', measure: 'COUNT', period: 'WEEK', target: 420, unit: 'min' }, rule: '7 hours a week' },
  { payload: { title: 'Ten quiet minutes', icon: 'leaf', color: 'sky', measure: 'CHECK', period: 'DAY', target: 1, daysPerWeek: 4 }, rule: '4 days a week' },
  { payload: { title: 'Write', icon: 'pen', color: 'berry', measure: 'COUNT', period: 'DAY', target: 200, unit: 'words', daysPerWeek: 5 }, rule: '200 words, 5 days a week' },
  { payload: { title: 'Call someone you love', icon: 'phone', color: 'teal', measure: 'CHECK', period: 'WEEK', target: 1 }, rule: 'Once a week' },
]

type Slot = { kind: 'goal'; view: GoalProgressView } | { kind: 'add' } | { kind: 'ghost' }

/** The drop below the string for slot `i` of `n`: a quadratic sag, deepest in the middle. */
const dropAt = (i: number, n: number, sag: number) => {
  const t = (i + 0.5) / n
  return Math.round(4 * sag * t * (1 - t))
}

/**
 * The camp's lantern string — across the sky on wide screens; on a phone the same single
 * string scrolls sideways with the next lantern peeking in. The string's sag and each lantern's drop come from the same curve, so they
 * always hang where the cord actually is. An empty hook at the end hangs a new lantern.
 */
function LanternString({ loading, goals, pending, onComplete, onOpen, onAdd, firstLightId }: LanternStringProps) {
  const narrow = useMediaQuery('(max-width: 760px)')
  // One string everywhere; on a phone it scrolls sideways (snapping lantern to lantern)
  // instead of wrapping into rows, so the sky stays one line and the next lantern peeks in.
  const perRow = MAX_ACTIVE_GOALS + 1
  const sag = narrow ? 22 : 34

  const renderRow = (row: Slot[], r: number) => {
    return (
      <div className="lantern-row" key={r} style={{ ['--n' as string]: row.length }}>
        {/* One viewBox unit is one pixel vertically, so the cord's sag matches each lantern's drop. */}
        <svg
          className="lantern-cordline"
          viewBox={`0 0 100 ${sag + 12}`}
          preserveAspectRatio="none"
          style={{ height: sag + 12 }}
          aria-hidden="true"
        >
          <path d={`M0 6 Q 50 ${6 + 2 * sag} 100 6`} vectorEffect="non-scaling-stroke" />
        </svg>
        <span className="lantern-post lantern-post--l" aria-hidden="true" />
        <span className="lantern-post lantern-post--r" aria-hidden="true" />
        <div className="lantern-slots">
          {row.map((slot, i) => {
            const drop = dropAt(i, row.length, sag)
            if (slot.kind === 'goal') {
              return (
                <GoalLantern
                  key={slot.view.goal.id}
                  view={slot.view}
                  busy={pending.has(slot.view.goal.id)}
                  drop={drop}
                  index={r * perRow + i}
                  onComplete={onComplete}
                  onOpen={onOpen}
                  firstLight={slot.view.goal.id === firstLightId}
                />
              )
            }
            if (slot.kind === 'add') {
              return (
                <button
                  key="add"
                  type="button"
                  className="lantern lantern--add"
                  style={{ ['--drop' as string]: `${drop}px` }}
                  onClick={(e) => onAdd(undefined, e.currentTarget)}
                  aria-label="Hang a new lantern — add a goal"
                >
                  <span className="lantern-hang" aria-hidden="true">
                    <span className="lantern-cord" />
                    <span className="lantern-body">
                      <Plus size={20} strokeWidth={3} />
                    </span>
                  </span>
                  <span className="lantern-tag">
                    <span className="lantern-name">New lantern</span>
                    <span className="lantern-figure">
                      <small>add a goal</small>
                    </span>
                  </span>
                </button>
              )
            }
            return (
              <span key={`ghost-${i}`} className="lantern lantern--ghost" style={{ ['--drop' as string]: `${drop}px` }} aria-hidden="true">
                <span className="lantern-hang">
                  <span className="lantern-cord" />
                  <span className="lantern-body" />
                </span>
              </span>
            )
          })}
        </div>
      </div>
    )
  }

  if (loading) {
    const ghosts: Slot[] = Array.from({ length: narrow ? 3 : 5 }, () => ({ kind: 'ghost' }))
    return (
      <div className="lanterns">
        <div className="lantern-scroller">{renderRow(ghosts, 0)}</div>
      </div>
    )
  }

  const slots: Slot[] = goals.map((view) => ({ kind: 'goal', view }))
  if (goals.length < MAX_ACTIVE_GOALS) slots.push({ kind: 'add' })
  const rows: Slot[][] = []
  for (let i = 0; i < slots.length; i += perRow) rows.push(slots.slice(i, i + perRow))

  return (
    <div className="lanterns">
      <div className="lantern-scroller">{rows.map((row, r) => renderRow(row, r))}</div>

      {goals.length === 0 && (
        <div className="starter-note">
          <p className="starter-note-kicker">Set up camp</p>
          <h2 className="starter-note-title">What shall we look after together?</h2>
          <p className="starter-note-line">Pick one to shape — nothing’s added until you say so. A quiet day never undoes a week.</p>
          <ul className="starter-note-grid">
            {STARTERS.map(({ payload, rule }) => (
              <li key={payload.title}>
                <button type="button" className="starter-pick" data-color={payload.color} onClick={(e) => onAdd(payload, e.currentTarget)}>
                  <span className="starter-badge" aria-hidden="true">
                    <GoalIcon icon={payload.icon} size={16} strokeWidth={2.5} />
                  </span>
                  <span className="starter-text">
                    <span>{payload.title}</span>
                    <small>{rule}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export { LanternString }
