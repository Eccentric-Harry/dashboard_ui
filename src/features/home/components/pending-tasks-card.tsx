import { useMemo, useState } from 'react'
import { ArrowUpRight, Check, CheckCircle2, ChevronRight } from 'lucide-react'
import type { DailyTask } from '@/types/tasks'
import type { AppPath } from '@/app/routes'
import { cn } from '@/lib/utils'

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
  // Tapping a stat narrows the list to that bucket; tapping it again clears.
  const [filter, setFilter] = useState<Bucket | null>(null)

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
        <span className="home-skel" style={{ height: 64, borderRadius: 18 }} />
        <div className="hm-task-list">
          {Array.from({ length: 3 }, (_, i) => (
            <span key={i} className="home-skel" style={{ height: 40, borderRadius: 12, marginTop: 8 }} />
          ))}
        </div>
      </section>
    )
  }

  const total = rows.length
  // Which stat to spotlight: the most urgent non-empty bucket.
  const lead: Bucket = counts.overdue > 0 ? 'overdue' : counts.today > 0 ? 'today' : 'upcoming'
  const visibleRows = filter ? rows.filter((r) => r.bucket === filter) : rows

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
        <button type="button" className="hm-icon-btn" onClick={() => onNavigate('/tasks')} aria-label="Plan and reorder in Tasks">
          <ArrowUpRight size={14} strokeWidth={2.4} />
        </button>
      </header>

      {/* Today's Meals stat strip: three counts on one well, split by hairlines.
          Each bar is that bucket's share of everything open, so the strip reads
          as a distribution at a glance. The counts double as list filters. */}
      <div className="hm-strip hm-strip--tasks" role="group" aria-label="Filter tasks">
        {(['overdue', 'today', 'upcoming'] as Bucket[]).map((b) => (
          <button
            key={b}
            type="button"
            aria-pressed={filter === b}
            onClick={() => setFilter((f) => (f === b ? null : b))}
            className={cn(
              'hm-strip-stat',
              `hm-strip-stat--${b}`,
              counts[b] > 0 && 'has-items',
              filter === b && 'is-active',
              filter === null && counts[b] > 0 && lead === b && 'is-lead',
            )}
          >
            <strong>{counts[b]}</strong>
            <span>{b === 'upcoming' ? 'Upcoming' : BUCKET_LABEL[b]}</span>
            <i className="hm-strip-bar" aria-hidden="true">
              <i style={{ width: total > 0 ? `${(counts[b] / total) * 100}%` : '0%' }} />
            </i>
          </button>
        ))}
      </div>

      {filter && visibleRows.length === 0 ? (
        <div className="hm-empty">
          <CheckCircle2 size={20} strokeWidth={2} aria-hidden="true" />
          <p>No {filter === 'upcoming' ? 'upcoming' : BUCKET_LABEL[filter].toLowerCase()} tasks.</p>
          <span>Tap {filter === 'upcoming' ? 'Upcoming' : BUCKET_LABEL[filter]} again to see everything.</span>
        </div>
      ) : total === 0 ? (
        <div className="hm-empty">
          <CheckCircle2 size={20} strokeWidth={2} aria-hidden="true" />
          <p>You're all caught up.</p>
          <span>Nothing overdue, due today, or coming up soon.</span>
        </div>
      ) : (
        <ul className="hm-task-list">
          {visibleRows.map(({ task, bucket }, i) => (
            <li key={task.id ?? `${task.title}-${i}`} className={cn('hm-task-row', `hm-task-row--${bucket}`)}>
              <button
                type="button"
                className="hm-task-check"
                aria-label={`Mark "${task.title}" done`}
                disabled={busyId === task.id}
                onClick={() => void handleToggle(task)}
              >
                <Check size={11} strokeWidth={3.5} aria-hidden="true" />
              </button>
              <button type="button" className="hm-task-body" onClick={() => onNavigate('/tasks')}>
                <b title={task.title}>{task.title}</b>
                <span className="hm-task-tags">
                  <span className={cn('hm-tag', `hm-tag--${bucket}`)}>{dueLabel(task.date, today, bucket)}</span>
                  {task.category && <span className="hm-task-cat">{task.category}</span>}
                </span>
              </button>
              <ChevronRight className="hm-task-go" size={14} strokeWidth={2.4} aria-hidden="true" />
            </li>
          ))}
          {!filter && total <= 3 && (
            <li className="hm-task-tail" aria-hidden="true">
              Nothing else due in the next three weeks.
            </li>
          )}
        </ul>
      )}
    </section>
  )
}

export { PendingTasksCard }
