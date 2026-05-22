import { useState, useEffect, useCallback } from 'react'
import { Check, Loader2, Pencil, Trash2, ListTodo } from 'lucide-react'
import toast from 'react-hot-toast'
import { fetchTasks, toggleTask, deleteTask } from '../../../../lib/api'
import type { DailyTask } from '../../../../lib/api'
import { ConfirmDialog } from '../../../ui/confirm-dialog'

interface TasksScheduleCardProps {
  selectedDate: string
  refreshKey: number
  onRefresh: () => void
  onEditTask: (task: DailyTask) => void
}

export function TasksScheduleCard({
  selectedDate,
  refreshKey,
  onRefresh,
  onEditTask,
}: TasksScheduleCardProps) {
  const [tasks, setTasks] = useState<DailyTask[]>([])
  const [loading, setLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DailyTask | null>(null)
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchTasks(selectedDate)
      setTasks(res?.data ?? [])
    } catch {
      setTasks([])
    } finally {
      setLoading(false)
    }
  }, [selectedDate])

  useEffect(() => {
    load()
    setActiveTaskId(null)
  }, [load, refreshKey])

  const handleToggle = async (task: DailyTask) => {
    if (!task.id) return
    try {
      await toggleTask(task.id)
      load()
      onRefresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update task')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget?.id) return
    try {
      await deleteTask(deleteTarget.id)
      toast.success(`Deleted "${deleteTarget.title}"`)
      setDeleteTarget(null)
      load()
      onRefresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete task')
    }
  }

  const completedCount = tasks.filter((t) => t.completed).length
  const totalCount = tasks.length
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  // SVG Progress Ring calculations
  const radius = 28
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference

  return (
    <section className="learnings-card learnings-tasks-card-premium">
      <div className="learnings-card-header-flex">
        <div>
          <p className="learnings-card-eyebrow">Schedule</p>
          <h3 className="learnings-card-title">
            <ListTodo size={16} className="title-icon" />
            Tasks for the day
          </h3>
          {totalCount > 0 && (
            <p className="learnings-card-subtitle">
              {completedCount} of {totalCount} completed
            </p>
          )}
        </div>
        {totalCount > 0 && (
          <div className="tasks-progress-ring-container" title={`${progressPercent}% completed`}>
            <svg className="tasks-progress-ring" width="68" height="68">
              <defs>
                <linearGradient id="tasksProgressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#35b64b" />
                  <stop offset="100%" stopColor="#1a7a4a" />
                </linearGradient>
                <filter id="tasksProgressGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#1a7a4a" floodOpacity="0.24" />
                </filter>
              </defs>
              <circle
                className="tasks-progress-ring-bg"
                strokeWidth="5"
                fill="transparent"
                r={radius}
                cx="34"
                cy="34"
              />
              <circle
                className="tasks-progress-ring-fill"
                strokeWidth="5"
                fill="transparent"
                r={radius}
                cx="34"
                cy="34"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="tasks-progress-ring-text">
              <span className="percent">{progressPercent}%</span>
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
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`learnings-task-item-premium ${task.completed ? 'is-completed' : ''} ${
                activeTaskId === task.id ? 'actions-visible' : ''
              }`}
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
                <span className="learnings-task-title-premium">{task.title}</span>
              </div>
              
              <div className="learnings-task-right-wrap" onClick={(e) => e.stopPropagation()}>
                {task.scheduledTime && (
                  <span className="learnings-task-time-premium">
                    {task.scheduledTime}
                  </span>
                )}

                <div className="learnings-task-actions-premium">
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
            </div>
          ))}
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
