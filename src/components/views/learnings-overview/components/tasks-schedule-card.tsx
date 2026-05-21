import { useState, useEffect, useCallback } from 'react'
import { Check, Loader2, Pencil, Trash2, Clock } from 'lucide-react'
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

  return (
    <section className="learnings-card learnings-tasks-card-premium">
      <div className="learnings-card-header-flex">
        <div>
          <p className="learnings-card-eyebrow">Schedule</p>
          <h3 className="learnings-card-title">
            <Clock size={16} className="title-icon" />
            Tasks for the day
          </h3>
        </div>
        {totalCount > 0 && (
          <span className="premium-progress-badge">
            {progressPercent}% Done
          </span>
        )}
      </div>

      {totalCount > 0 && (
        <div className="learnings-progress-wrapper">
          <div className="learnings-progress-text-flex">
            <span className="learnings-progress-label">Completion progress</span>
            <span className="learnings-progress-value">{completedCount} of {totalCount} tasks completed</span>
          </div>
          <div className="learnings-progress-track">
            <div
              className="learnings-progress-bar"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {loading ? (
        <div className="learnings-loading" style={{ marginTop: 24 }}>
          <Loader2 className="spinner animate-spin" size={14} />
          Loading tasks...
        </div>
      ) : tasks.length === 0 ? (
        <p className="learnings-empty" style={{ marginTop: 18 }}>
          No tasks scheduled. Add one from the header action.
        </p>
      ) : (
        <div className="learnings-tasks-list-premium" style={{ marginTop: 18 }}>
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`learnings-task-item-premium ${task.completed ? 'is-completed' : ''}`}
            >
              <button
                type="button"
                className={`learnings-task-check-premium ${task.completed ? 'checked' : ''}`}
                onClick={() => handleToggle(task)}
                aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
              >
                {task.completed && <Check size={12} strokeWidth={3} />}
              </button>
              
              <div className="learnings-task-content-premium">
                {task.scheduledTime && (
                  <span className="learnings-task-time-premium">{task.scheduledTime}</span>
                )}
                <span className="learnings-task-title-premium">{task.title}</span>
              </div>

              <div className="learnings-task-actions-premium">
                <button
                  type="button"
                  className="learnings-icon-btn-premium edit"
                  onClick={() => onEditTask(task)}
                  aria-label="Edit task"
                >
                  <Pencil size={11} />
                </button>
                <button
                  type="button"
                  className="learnings-icon-btn-premium delete"
                  onClick={() => setDeleteTarget(task)}
                  aria-label="Delete task"
                >
                  <Trash2 size={11} />
                </button>
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
