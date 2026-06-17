import { useState, useEffect, useCallback } from 'react'
import {
  Check,
  Loader2,
  Pencil,
  Trash2,
  ListTodo,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  BookOpen,
  Dumbbell,
  ShoppingCart,
  Sparkles,
  DollarSign,
  CheckSquare
} from 'lucide-react'
import toast from 'react-hot-toast'
import { fetchTasks, toggleTask, deleteTask } from '../../../../lib/api'
import type { DailyTask } from '../../../../lib/api'
import { ConfirmDialog } from '../../../ui/confirm-dialog'

// Dynamic task categories and themes
type TaskCategory = 'Work' | 'Learning' | 'Fitness' | 'Shopping' | 'Chores' | 'Finance' | 'Personal' | 'General';

interface TaskTheme {
  name: TaskCategory;
  color: string;
  bgLight: string;
  borderLight: string;
  badgeBg: string;
  badgeText: string;
  shadowColor: string;
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
}

const CATEGORY_THEMES: Record<TaskCategory, TaskTheme> = {
  Work: {
    name: 'Work',
    color: '#0ea5e9',
    bgLight: 'rgba(14, 165, 233, 0.04)',
    borderLight: 'rgba(14, 165, 233, 0.15)',
    badgeBg: 'rgba(14, 165, 233, 0.08)',
    badgeText: '#0369a1',
    shadowColor: 'rgba(14, 165, 233, 0.12)',
    icon: Briefcase
  },
  Learning: {
    name: 'Learning',
    color: '#6366f1',
    bgLight: 'rgba(99, 102, 241, 0.04)',
    borderLight: 'rgba(99, 102, 241, 0.15)',
    badgeBg: 'rgba(99, 102, 241, 0.08)',
    badgeText: '#4338ca',
    shadowColor: 'rgba(99, 102, 241, 0.12)',
    icon: BookOpen
  },
  Fitness: {
    name: 'Fitness',
    color: '#f97316',
    bgLight: 'rgba(249, 115, 22, 0.04)',
    borderLight: 'rgba(249, 115, 22, 0.15)',
    badgeBg: 'rgba(249, 115, 22, 0.08)',
    badgeText: '#c2410c',
    shadowColor: 'rgba(249, 115, 22, 0.12)',
    icon: Dumbbell
  },
  Shopping: {
    name: 'Shopping',
    color: '#d97706',
    bgLight: 'rgba(217, 119, 6, 0.04)',
    borderLight: 'rgba(217, 119, 6, 0.15)',
    badgeBg: 'rgba(217, 119, 6, 0.08)',
    badgeText: '#b45309',
    shadowColor: 'rgba(217, 119, 6, 0.12)',
    icon: ShoppingCart
  },
  Chores: {
    name: 'Chores',
    color: '#a855f7',
    bgLight: 'rgba(168, 85, 247, 0.04)',
    borderLight: 'rgba(168, 85, 247, 0.15)',
    badgeBg: 'rgba(168, 85, 247, 0.08)',
    badgeText: '#7e22ce',
    shadowColor: 'rgba(168, 85, 247, 0.12)',
    icon: Sparkles
  },
  Finance: {
    name: 'Finance',
    color: '#10b981',
    bgLight: 'rgba(16, 185, 129, 0.04)',
    borderLight: 'rgba(16, 185, 129, 0.15)',
    badgeBg: 'rgba(16, 185, 129, 0.08)',
    badgeText: '#047857',
    shadowColor: 'rgba(16, 185, 129, 0.12)',
    icon: DollarSign
  },
  Personal: {
    name: 'Personal',
    color: '#8b5cf6',
    bgLight: 'rgba(139, 92, 246, 0.04)',
    borderLight: 'rgba(139, 92, 246, 0.15)',
    badgeBg: 'rgba(139, 92, 246, 0.08)',
    badgeText: '#6d28d9',
    shadowColor: 'rgba(139, 92, 246, 0.12)',
    icon: Sparkles
  },
  General: {
    name: 'General',
    color: '#14b8a6',
    bgLight: 'rgba(20, 184, 166, 0.04)',
    borderLight: 'rgba(20, 184, 166, 0.15)',
    badgeBg: 'rgba(20, 184, 166, 0.08)',
    badgeText: '#0f766e',
    shadowColor: 'rgba(20, 184, 166, 0.12)',
    icon: CheckSquare
  }
};

function detectCategory(title: string): TaskCategory {
  const t = title.toLowerCase();
  
  // 1. Work / Professional / Dev / Academic Admin
  if (/\b(work|meeting|email|office|call|project|code|dev|pr\b|review|commit|deploy|jira|slack|standup|scrum|interview|resume|portfolio|zustand|redux|store\s+management|state\s+store|github|gitlab|bitbucket|repo\b|backend|frontend|database|sql|api\b|apis\b|swagger|ui\b|ux\b|json|test\b|testing|debugging|debug|bug\b|log\b|logs\b|pipeline|ci\/cd|jenkins|docker|container|kubernetes|aws|cloud|server|port|localhost|host|sonarqube|stage|confluence|mcp\b|setup|release|build|load|data|registration|internship|cdc\b|thesis|assignment|vtop\b|viva|exam|seminar|presentation|ppt|tech\b|talk\b)\b/.test(t)) {
    return 'Work';
  }

  // 2. Finance
  if (/\b(finance|bill|pay|bank|credit|tax|rent|repayment|slice|money|salary|budget|spending|expense|income|fee|fees|alumni)\b/.test(t)) {
    return 'Finance';
  }

  // 3. Shopping / Groceries
  if (/\b(buy|order|shop|groceries|cleanser|snacks|purchase|gift|grocer|market|supermarket)\b/.test(t)) {
    return 'Shopping';
  }

  // 4. Chores / Housekeeping
  if (/\b(laundry|clean|wash|tidy|fix|vacuum|dishes|cook|meal|prep|trash|dust|fold|clothes|sweep|mop)\b/.test(t)) {
    return 'Chores';
  }

  // 5. Fitness / Health
  if (/\b(gym|run|workout|exercise|walk|stretch|swim|cardio|weights|health|yoga|meditate|sleep|hydration|water|calories|protein)\b/.test(t)) {
    return 'Fitness';
  }

  // 6. Learning / Self-Improvement (with travel exclusion for "book")
  const hasBook = /\bbook\b/.test(t) && !/\b(flight|ticket|cab|hotel|seat|room|table|ride|train|bus|stay|trip|pass)\b/.test(t);
  if (hasBook || /\b(learn|study|notion|leetcode|course|video|read|write|article|tutorial|lecture|homework|revision|practice|textbook|reading)\b/.test(t)) {
    return 'Learning';
  }
  
  return 'General';
}

interface TasksScheduleCardProps {
  refreshKey: number
  onRefresh: () => void
  onEditTask: (task: DailyTask) => void
}

const PAGE_SIZE = 5

export function TasksScheduleCard({
  refreshKey,
  onRefresh,
  onEditTask,
}: TasksScheduleCardProps) {
  const [tasks, setTasks] = useState<DailyTask[]>([])
  const [loading, setLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DailyTask | null>(null)
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const load = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true)
    try {
      const res = await fetchTasks()
      const sorted = (res?.data ?? []).sort((a: DailyTask, b: DailyTask) => {
        const dateCompare = (b.date || '').localeCompare(a.date || '')
        if (dateCompare !== 0) return dateCompare
        if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
          return a.sortOrder - b.sortOrder
        }
        if (b.id && a.id) return b.id.localeCompare(a.id)
        return 0
      })
      setTasks(sorted)
    } catch {
      if (showLoading) setTasks([])
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    setActiveTaskId(null)
    setPage(1)
  }, [load, refreshKey])

  const handleToggle = async (task: DailyTask) => {
    if (!task.id) return

    // Optimistic UI update
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t)))

    try {
      const isRecurring = task.recurrenceFrequency && task.recurrenceFrequency !== 'NONE'
      await toggleTask(task.id, isRecurring ? task.date : undefined)
      load(false)
      onRefresh()
    } catch (err: unknown) {
      // Rollback on error
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t)))
      toast.error(err instanceof Error ? err.message : 'Failed to update task')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget?.id) return
    const id = deleteTarget.id

    // Optimistic UI update
    setTasks((prev) => prev.filter((t) => t.id !== id))

    try {
      await deleteTask(id)
      toast.success(`Deleted "${deleteTarget.title}"`)
      setDeleteTarget(null)
      load(false)
      onRefresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete task')
      load(false) // Reload to restore
    }
  }

  const formatFriendlyDate = (dateStr: string) => {
    if (!dateStr) return ''
    try {
      const parts = dateStr.split('-').map(Number)
      if (parts.length === 3) {
        const dateObj = new Date(parts[0], parts[1] - 1, parts[2])
        return dateObj.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      }
      return dateStr
    } catch {
      return dateStr
    }
  }

  // Progress counts
  const completedCount = tasks.filter((t) => t.completed).length
  const totalCount = tasks.length

  const totalPages = Math.ceil(tasks.length / PAGE_SIZE)
  const start = (page - 1) * PAGE_SIZE
  const paginated = tasks.slice(start, start + PAGE_SIZE)

  return (
    <section className="learnings-card learnings-tasks-card-premium">
      <div className="learnings-card-header-flex">
        <div>
          <p className="learnings-card-eyebrow">Schedule</p>
          <h3 className="learnings-card-title">
            <ListTodo size={16} className="title-icon" />
            Tasks
          </h3>
          {totalCount > 0 && (
            <p className="learnings-card-subtitle">
              {completedCount} of {totalCount} completed
            </p>
          )}
        </div>
        {totalCount > 0 && (
          <div className="tasks-progress-ring-container">
            <svg className="tasks-progress-ring" width="68" height="68">
              <defs>
                <linearGradient id="tasksProgressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#1a7a4a" />
                </linearGradient>
                <filter id="tasksProgressGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              <circle
                className="tasks-progress-ring-bg"
                strokeWidth="4"
                fill="transparent"
                r="26"
                cx="34"
                cy="34"
              />
              <circle
                className="tasks-progress-ring-fill"
                strokeWidth="4"
                fill="transparent"
                r="26"
                cx="34"
                cy="34"
                strokeDasharray={`${2 * Math.PI * 26}`}
                strokeDashoffset={`${2 * Math.PI * 26 * (1 - completedCount / totalCount)}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="tasks-progress-ring-text">
              <span className="percent">{Math.round((completedCount / totalCount) * 100)}%</span>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="learnings-loading" style={{ marginTop: 24 }}>
          <Loader2 className="spinner animate-spin" size={14} />
          Loading tasks...
        </div>
      ) : tasks.length === 0 ? (
        <p className="learnings-empty" style={{ marginTop: 18 }}>
          No tasks scheduled. Add one to get started.
        </p>
      ) : (
        <div className="learnings-tasks-list-premium" style={{ marginTop: 18 }}>
          {paginated.map((task) => {
            const isOverdue = !task.completed && (() => {
              if (!task.scheduledTime) return false;
              const dateParts = task.date.split('-');
              if (dateParts.length !== 3) return false;
              const year = parseInt(dateParts[0], 10);
              const month = parseInt(dateParts[1], 10) - 1;
              const day = parseInt(dateParts[2], 10);

              let hours = 0;
              let minutes = 0;
              const ampmMatch = task.scheduledTime.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
              if (ampmMatch) {
                hours = parseInt(ampmMatch[1], 10);
                minutes = parseInt(ampmMatch[2], 10);
                const ampm = ampmMatch[3].toUpperCase();
                if (ampm === 'PM' && hours < 12) hours += 12;
                if (ampm === 'AM' && hours === 12) hours = 0;
              } else {
                const standardMatch = task.scheduledTime.match(/^(\d+):(\d+)$/);
                if (standardMatch) {
                  hours = parseInt(standardMatch[1], 10);
                  minutes = parseInt(standardMatch[2], 10);
                } else {
                  return false;
                }
              }

              const deadline = new Date(year, month, day, hours, minutes, 0, 0);
              return new Date() > deadline;
            })()

            const storedCategory = task.category as string | undefined
            const detectedCategory = detectCategory(task.title)
            const displayCategory = storedCategory || detectedCategory
            const themeCategory = (displayCategory in CATEGORY_THEMES) ? (displayCategory as TaskCategory) : 'General'
            const theme = CATEGORY_THEMES[themeCategory]
            const CategoryIcon = theme.icon

            return (
              <div
                key={task.id}
                className={`learnings-task-item-premium ${task.completed ? 'is-completed' : ''} ${isOverdue ? 'is-overdue' : ''
                  } ${activeTaskId === task.id ? 'actions-visible' : ''}`}
                style={{
                  '--theme-color': theme.color,
                  '--theme-bg-light': theme.bgLight,
                  '--theme-border-light': theme.borderLight,
                  '--theme-shadow-color': theme.shadowColor,
                } as React.CSSProperties}
                onClick={() => {
                  setActiveTaskId(activeTaskId === task.id ? null : (task.id ?? null))
                }}
              >
                <button
                  type="button"
                  className={`learnings-task-check-premium ${task.completed ? 'checked' : ''}`}
                  onClick={(e) => {
                     e.stopPropagation()
                     handleToggle(task)
                  }}
                  aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
                >
                  {task.completed && <Check size={12} strokeWidth={3} />}
                </button>

                <div className="learnings-task-content-premium">
                  <div className="learnings-task-title-row-premium">
                    <span className="learnings-task-title-premium">{task.title}</span>
                  </div>

                  {(task.scheduledTime || isOverdue || task.completed || task.date) && (
                    <div className="learnings-task-meta-row-premium">
                      <span
                        className="learnings-task-badge-premium category"
                        style={{
                          background: theme.badgeBg,
                          color: theme.badgeText,
                          border: `1px solid ${theme.borderLight}`,
                          gap: '4px',
                        }}
                      >
                        <CategoryIcon size={10} />
                        {displayCategory}
                      </span>
                      {task.date && (
                        <span className="learnings-task-badge-premium date" style={{ background: 'rgba(23, 28, 25, 0.05)', color: 'rgba(23, 28, 25, 0.6)', fontWeight: 600 }}>
                          {formatFriendlyDate(task.date)}
                        </span>
                      )}
                      {task.scheduledTime && !task.completed && (
                        <span className="learnings-task-badge-premium time">
                          {task.scheduledTime}
                        </span>
                      )}
                      {isOverdue && (
                        <span className="learnings-task-badge-premium overdue" title={`Originally scheduled for ${task.date}`}>
                          Overdue
                        </span>
                      )}
                      {task.completed && (
                        <span className="learnings-task-badge-premium completed">
                          Completed
                        </span>
                      )}
                    </div>
                  )}

                  {task.notes && (
                    <p className="learnings-task-notes-premium">{task.notes}</p>
                  )}
                </div>

                <div className="learnings-task-actions-premium" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="learnings-icon-btn-premium edit"
                    onClick={(e) => {
                      e.stopPropagation()
                      onEditTask(task)
                    }}
                    aria-label="Edit task"
                  >
                    <Pencil size={11} />
                  </button>
                  <button
                    type="button"
                    className="learnings-icon-btn-premium delete"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteTarget(task)
                    }}
                    aria-label="Delete task"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!loading && totalPages > 1 && (
        <div className="learnings-pagination">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="pagination-btn"
            type="button"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="pagination-info">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="pagination-btn"
            type="button"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete task?"
        message={`Remove "${deleteTarget?.title}" from your schedule?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </section>
  )
}
