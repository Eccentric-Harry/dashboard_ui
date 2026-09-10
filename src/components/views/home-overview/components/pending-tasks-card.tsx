import { Fragment, useMemo, useState } from 'react'
import { ArrowRight, Check, CheckCircle2 } from 'lucide-react'
import type { DailyTask } from '../../../../lib/api'
import type { AppPath } from '../../../dashboard/quantified-self-dashboard/data'
import { cn } from '../../../../lib/utils'

type PendingTasksCardProps = {
  loading: boolean
  today: string
  /** Tasks across the home data window — this card filters to open ones due now or soon. */
  tasks: DailyTask[] | null
  onToggle: (task: DailyTask) => Promise<void>
  onNavigate: (path: AppPath, search?: string) => void
}

type Bucket = 'overdue' | 'today' | 'upcoming'

const BUCKET_LABEL: Record<Bucket, string> = { overdue: 'Overdue', today: 'Today', upcoming: 'Coming up' }

const dayDiff = (iso: string, today: string) =>
  Math.round((new Date(`${iso}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86_400_000)

/** A short, human due label per bucket — "Yesterday", "3d overdue", "Tomorrow", "Fri", "Fri 18". */
function dueLabel(iso: string, today: string, bucket: Bucket): string {
  if (bucket === 'today') return 'Today'
  const diff = dayDiff(iso, today)
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  if (bucket === 'overdue') {
    if (diff === -1) return 'Yesterday'
    return `${Math.abs(diff)}d late`
  }
  if (diff === 1) return 'Tomorrow'
  if (diff <= 6) return d.toLocaleDateString('en-US', { weekday: 'long' })
  return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })
}

function PendingTasksCard({ loading, today, tasks, onToggle, onNavigate }: PendingTasksCardProps) {
  const [busyId, setBusyId] = useState<string | null>(null)

  const { rows, counts } = useMemo(() => {
    const order: Record<Bucket, number> = { overdue: 0, today: 1, upcoming: 2 }
    const withBucket = (tasks ?? [])
      .filter((t) => !t.completed && !!t.date)
      .map((t) => ({
        task: t,
        bucket: (t.date < today ? 'overdue' : t.date === today ? 'today' : 'upcoming') as Bucket,
      }))
      // Overdue first (most urgent), then today, then the near future; each
      // group ordered by its own date so the soonest thing leads.
      .sort((a, b) => {
        if (order[a.bucket] !== order[b.bucket]) return order[a.bucket] - order[b.bucket]
        return a.bucket === 'overdue'
          ? b.task.date.localeCompare(a.task.date)
          : a.task.date.localeCompare(b.task.date)
      })
    return {
      rows: withBucket,
      counts: {
        overdue: withBucket.filter((r) => r.bucket === 'overdue').length,
        today: withBucket.filter((r) => r.bucket === 'today').length,
        upcoming: withBucket.filter((r) => r.bucket === 'upcoming').length,
      },
    }
  }, [tasks, today])

  const handleToggle = async (task: DailyTask) => {
    if (!task.id || busyId) return
    setBusyId(task.id)
    try {
      await onToggle(task)
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return (
      <section className="home-card home-card--tasks" aria-label="Pending tasks loading">
        <header className="home-card-head">
          <div>
            <span className="home-card-eyebrow">Tasks</span>
            <span className="home-skel home-skel--title" style={{ width: 150, marginTop: 6 }} />
          </div>
        </header>
        <span className="home-skel" style={{ height: 58, borderRadius: 18 }} />
        <div className="home-tasks-list">
          {Array.from({ length: 3 }, (_, i) => (
            <span key={i} className="home-skel" style={{ height: 44, borderRadius: 12 }} />
          ))}
        </div>
      </section>
    )
  }

  const total = rows.length
  // Which stat to spotlight: the most urgent non-empty bucket.
  const lead: Bucket = counts.overdue > 0 ? 'overdue' : counts.today > 0 ? 'today' : 'upcoming'

  return (
    <section className="home-card home-card--tasks" aria-label="Pending tasks">
      <header className="home-card-head">
        <div>
          <span className="home-card-eyebrow">Tasks</span>
          <h2 className="home-card-title">
            {total === 0
              ? 'Nothing pending'
              : counts.overdue > 0
                ? `${counts.overdue} to catch up on`
                : counts.today > 0
                  ? `${counts.today} for today`
                  : `${total} on the runway`}
          </h2>
        </div>
        <button type="button" className="home-tasks-open" onClick={() => onNavigate('/tasks')}>
          Open <ArrowRight size={12} strokeWidth={2.6} />
        </button>
      </header>

      <div className="home-tasks-accent" role="list">
        {(['overdue', 'today', 'upcoming'] as Bucket[]).map((b) => (
          <div
            key={b}
            role="listitem"
            className={cn(
              'home-tasks-stat',
              `home-tasks-stat--${b}`,
              counts[b] > 0 && 'has-items',
              counts[b] > 0 && lead === b && 'is-lead',
            )}
          >
            <i aria-hidden="true" />
            <strong>{counts[b]}</strong>
            <span>{b === 'upcoming' ? 'Upcoming' : BUCKET_LABEL[b]}</span>
          </div>
        ))}
      </div>

      <div className="home-tasks-list">
        {total === 0 ? (
          <div className="home-tasks-empty">
            <span className="home-tasks-empty-ic" aria-hidden="true">
              <CheckCircle2 size={22} strokeWidth={2} />
            </span>
            <p>You're all caught up.</p>
            <span>Nothing overdue, due today, or coming up soon.</span>
          </div>
        ) : (
          <ul className="home-tasks-rows">
            {rows.map(({ task, bucket }, i) => {
              const showGroup = i === 0 || rows[i - 1].bucket !== bucket
              return (
                <Fragment key={task.id ?? `${task.title}-${i}`}>
                  {showGroup && (
                    <li className="home-tasks-group" aria-hidden="true">
                      {BUCKET_LABEL[bucket]}
                    </li>
                  )}
                  <li className={cn('home-task-row', `home-task-row--${bucket}`)}>
                    <button
                      type="button"
                      className="home-task-check"
                      aria-label={`Mark "${task.title}" done`}
                      disabled={busyId === task.id}
                      onClick={() => void handleToggle(task)}
                    >
                      <Check size={12} strokeWidth={3.5} aria-hidden="true" />
                    </button>
                    <button type="button" className="home-task-body" onClick={() => onNavigate('/tasks')}>
                      <b title={task.title}>{task.title}</b>
                      <span className="home-task-meta">
                        <span className={cn('home-task-due', `home-task-due--${bucket}`)}>
                          {dueLabel(task.date, today, bucket)}
                        </span>
                        {task.category && (
                          <>
                            <span className="home-task-dot" aria-hidden="true" />
                            <span className="home-task-cat">{task.category}</span>
                          </>
                        )}
                      </span>
                    </button>
                    <ArrowRight className="home-task-go" size={13} strokeWidth={2.4} aria-hidden="true" />
                  </li>
                </Fragment>
              )
            })}
            {total <= 4 && (
              <li className="home-tasks-tail" aria-hidden="true">
                Nothing else due in the next three weeks.
              </li>
            )}
          </ul>
        )}
      </div>

      {total > 0 && (
        <button type="button" className="home-tasks-foot" onClick={() => onNavigate('/tasks')}>
          Plan &amp; reorder in Tasks
          <ArrowRight size={13} strokeWidth={2.4} aria-hidden="true" />
        </button>
      )}
    </section>
  )
}

export { PendingTasksCard }
