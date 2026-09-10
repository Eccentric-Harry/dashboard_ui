import { useMemo, useState } from 'react'
import { ArrowRight, Check, CheckCircle2, ListTodo } from 'lucide-react'
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

/** "2026-09-14" → "Sun 14" for the row's due chip. */
function shortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })
}

function PendingTasksCard({ loading, today, tasks, onToggle, onNavigate }: PendingTasksCardProps) {
  const [busyId, setBusyId] = useState<string | null>(null)

  const { rows, counts } = useMemo(() => {
    const open = (tasks ?? []).filter((t) => !t.completed && !!t.date)
    const withBucket = open
      .map((t) => {
        const bucket: Bucket = t.date < today ? 'overdue' : t.date === today ? 'today' : 'upcoming'
        return { task: t, bucket }
      })
      // Overdue first (most urgent), then today, then the near future; each
      // group ordered by its own date so the soonest thing leads.
      .sort((a, b) => {
        const order: Record<Bucket, number> = { overdue: 0, today: 1, upcoming: 2 }
        if (order[a.bucket] !== order[b.bucket]) return order[a.bucket] - order[b.bucket]
        if (a.bucket === 'overdue') return b.task.date.localeCompare(a.task.date)
        return a.task.date.localeCompare(b.task.date)
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
        <div className="home-tasks-list">
          {Array.from({ length: 4 }, (_, i) => (
            <span key={i} className="home-skel" style={{ height: 46, borderRadius: 14 }} />
          ))}
        </div>
      </section>
    )
  }

  const total = rows.length

  return (
    <section className="home-card home-card--tasks" aria-label="Pending tasks">
      <header className="home-card-head">
        <div>
          <span className="home-card-eyebrow">Tasks</span>
          <h2 className="home-card-title">
            {total === 0 ? 'Nothing pending' : counts.overdue > 0 ? `${counts.overdue} need catching up` : `${total} on the runway`}
          </h2>
        </div>
        <button type="button" className="home-tasks-open" onClick={() => onNavigate('/tasks')}>
          Open <ArrowRight size={12} strokeWidth={2.6} />
        </button>
      </header>

      <div className="home-tasks-accent">
        <div className={cn('home-tasks-stat', counts.overdue > 0 && 'is-watch')}>
          <strong>{counts.overdue}</strong>
          <span>Overdue</span>
        </div>
        <div className="home-tasks-sep" />
        <div className="home-tasks-stat">
          <strong>{counts.today}</strong>
          <span>Today</span>
        </div>
        <div className="home-tasks-sep" />
        <div className="home-tasks-stat">
          <strong>{counts.upcoming}</strong>
          <span>Upcoming</span>
        </div>
      </div>

      <div className="home-tasks-list">
        {rows.length === 0 ? (
          <div className="home-tasks-empty">
            <CheckCircle2 size={26} strokeWidth={1.8} aria-hidden="true" />
            <p>You're all caught up.</p>
            <span>Nothing overdue, due today, or coming up soon.</span>
          </div>
        ) : (
          rows.map(({ task, bucket }) => (
            <div key={task.id ?? task.title} className={cn('home-task-row', `home-task-row--${bucket}`)}>
              <button
                type="button"
                className="home-task-check"
                aria-label={`Mark "${task.title}" done`}
                disabled={busyId === task.id}
                onClick={() => void handleToggle(task)}
              >
                <Check size={12} strokeWidth={3} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="home-task-body"
                onClick={() => onNavigate('/tasks')}
              >
                <b title={task.title}>{task.title}</b>
                <span className="home-task-meta">
                  <span className={cn('home-task-due', `home-task-due--${bucket}`)}>
                    {bucket === 'overdue' ? `Overdue · ${shortDate(task.date)}` : bucket === 'today' ? 'Today' : shortDate(task.date)}
                  </span>
                  {task.category && <span className="home-task-cat">{task.category}</span>}
                </span>
              </button>
            </div>
          ))
        )}
      </div>

      {total > 0 && (
        <button type="button" className="home-tasks-foot" onClick={() => onNavigate('/tasks')}>
          <ListTodo size={13} strokeWidth={2.3} aria-hidden="true" />
          Plan &amp; reorder in Tasks
          <ArrowRight size={13} strokeWidth={2.3} aria-hidden="true" />
        </button>
      )}
    </section>
  )
}

export { PendingTasksCard }
