import { useState } from 'react'
import { ChevronDown, Flame, Loader2, Package, Pencil, RotateCcw } from 'lucide-react'
import type { Goal, GoalProgressView, GoalWeekResult } from '@/types/goals'
import { goalsService } from '@/services/goals-service'
import { cn } from '@/lib/utils'
import { countsDays, formatNumber, formatProgress, MAX_ACTIVE_GOALS, ruleLabel, shapeOf, weekRangeLabel, weekRatio } from '../goal-format'
import { goalColor } from '../goal-palette'
import { GoalIcon } from './goal-icon'

type JournalWeeksProps = {
  goals: GoalProgressView[]
  onEdit: (view: GoalProgressView) => void
  /** Resolves true once the goal is back at camp. */
  onRestore: (id: string) => Promise<boolean>
}

function weekValueLabel(goal: Goal, week: Pick<GoalWeekResult, 'value' | 'target'>): string {
  if (countsDays(goal)) {
    const noun = shapeOf(goal) === 'times-week' ? 'times' : 'days'
    return `${formatNumber(week.value)} of ${formatNumber(week.target)} ${noun}`
  }
  return formatProgress(week.value, week.target, goal.unit)
}

/**
 * The journal's ledger: every goal with its recent weeks as postage stamps — a kept week
 * gets a stamp, a quiet week is just an empty square (a rest, not a mark against it),
 * and this week fills in as it goes. Tap a goal's name to shape it.
 */
function JournalWeeks({ goals, onEdit, onRestore }: JournalWeeksProps) {
  const [archivedOpen, setArchivedOpen] = useState(false)
  const [archived, setArchived] = useState<Goal[] | null>(null)
  const [archivedFailed, setArchivedFailed] = useState(false)
  const [restoring, setRestoring] = useState<string | null>(null)
  const total = goals.reduce((sum, g) => sum + g.weeksKept, 0)

  const loadArchived = async () => {
    setArchivedFailed(false)
    const res = await goalsService.listGoals()
    if (res.error || !res.data) {
      setArchivedFailed(true)
      return
    }
    setArchived(res.data.filter((g) => g.status === 'ARCHIVED'))
  }

  const toggleArchived = () => {
    const next = !archivedOpen
    setArchivedOpen(next)
    if (next) void loadArchived()
  }

  const restore = async (id: string) => {
    setRestoring(id)
    const ok = await onRestore(id)
    setRestoring(null)
    if (ok) setArchived((prev) => prev?.filter((g) => g.id !== id) ?? null)
  }

  return (
    <section className="jw" aria-labelledby="jw-title">
      <header className="bk-page-head">
        <div>
          <h2 id="jw-title" className="bk-title">
            Weeks kept
          </h2>
          <p className="bk-hand">Every kept week gets a stamp. Quiet weeks are just rests.</p>
        </div>
        <span className="bk-total" title="Weeks kept, every goal, all time">
          <strong>{total}</strong>
          <small>{total === 1 ? 'week' : 'weeks'}</small>
        </span>
      </header>

      {goals.length === 0 ? (
        <p className="bk-empty">Hang a lantern and its weeks will be stamped here.</p>
      ) : (
        <ul className="jw-list">
          {goals.map((view) => {
            const ratio = weekRatio(view)
            return (
              <li key={view.goal.id} className="jw-row" data-color={goalColor(view.goal)}>
                <button type="button" className="jw-name" onClick={() => onEdit(view)} title={`Shape ${view.goal.title}`}>
                  <span className="jw-badge" aria-hidden="true">
                    <GoalIcon icon={view.goal.icon} size={14} strokeWidth={2.6} />
                  </span>
                  <span className="jw-text">
                    <strong>{view.goal.title}</strong>
                    <small>{ruleLabel(view.goal)}</small>
                  </span>
                  <Pencil className="jw-pencil" size={13} strokeWidth={2.6} aria-hidden="true" />
                </button>
                <span className="jw-count">
                  <strong>{view.weeksKept}</strong>
                  <small>kept</small>
                  {view.weekStreak > 1 && (
                    <em title={`${view.weekStreak} weeks in a row`}>
                      <Flame size={11} strokeWidth={2.8} /> {view.weekStreak}
                    </em>
                  )}
                </span>
                <ol className="jw-stamps" aria-label={`${view.goal.title}, recent weeks`}>
                  {view.history.map((w, i) => (
                    <li
                      key={w.weekStart}
                      className={cn('jw-stamp', w.kept && 'is-kept')}
                      style={{ ['--tilt' as string]: `${(((i * 7) % 5) - 2) * 2}deg` }}
                      title={`${weekRangeLabel(w.weekStart)} · ${w.kept ? 'kept' : 'a rest week'} · ${weekValueLabel(view.goal, w)}`}
                      aria-label={`Week of ${weekRangeLabel(w.weekStart)}: ${w.kept ? 'kept' : 'a rest week'}`}
                    >
                      {w.kept && <GoalIcon icon={view.goal.icon} size={11} strokeWidth={2.8} aria-hidden="true" />}
                    </li>
                  ))}
                  <li
                    className={cn('jw-stamp is-current', view.week.kept && 'is-kept')}
                    title={`This week · ${weekValueLabel(view.goal, view.week)}`}
                    aria-label={`This week so far: ${weekValueLabel(view.goal, view.week)}`}
                  >
                    {view.week.kept ? (
                      <GoalIcon icon={view.goal.icon} size={11} strokeWidth={2.8} aria-hidden="true" />
                    ) : (
                      <i style={{ height: `${Math.round(ratio * 100)}%` }} />
                    )}
                  </li>
                </ol>
              </li>
            )
          })}
        </ul>
      )}

      <footer className="jw-foot">
        <button type="button" className="bk-link" aria-expanded={archivedOpen} onClick={toggleArchived}>
          <Package size={14} strokeWidth={2.5} /> Packed away
          <ChevronDown size={13} strokeWidth={2.6} className={cn('bk-chev', archivedOpen && 'is-open')} />
        </button>

        {archivedOpen && (
          <div className="jw-archived" aria-live="polite">
            {archivedFailed ? (
              <p className="bk-hint">
                Couldn’t find them.{' '}
                <button type="button" className="bk-link" onClick={() => void loadArchived()}>
                  Try again
                </button>
              </p>
            ) : archived == null ? (
              <p className="bk-hint">
                <Loader2 size={12} className="animate-spin" /> Looking…
              </p>
            ) : archived.length === 0 ? (
              <p className="bk-hint">Nothing packed away. Archived goals keep their history here.</p>
            ) : (
              <ul>
                {archived.map((g) => (
                  <li key={g.id} data-color={goalColor(g)}>
                    <span className="jw-badge jw-badge--sm" aria-hidden="true">
                      <GoalIcon icon={g.icon} size={11} strokeWidth={2.6} />
                    </span>
                    <span className="jw-archived-title">{g.title}</span>
                    <span className="jw-archived-rule">{ruleLabel(g)}</span>
                    <button
                      type="button"
                      className="bk-btn"
                      disabled={restoring === g.id || goals.length >= MAX_ACTIVE_GOALS}
                      onClick={() => void restore(g.id)}
                    >
                      {restoring === g.id ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} strokeWidth={2.6} />}
                      Unpack
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </footer>
    </section>
  )
}

export { JournalWeeks }
