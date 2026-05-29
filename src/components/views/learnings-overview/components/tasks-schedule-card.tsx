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

  // Progress counts
  const completedCount = tasks.filter((t) => t.completed).length
  const totalCount = tasks.length

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
          {tasks.map((task) => {
            const isOverdue = task.date && task.date < selectedDate && !task.completed
            return (
              <div
                key={task.id}
                className={`learnings-task-item-premium ${task.completed ? 'is-completed' : ''} ${
                  isOverdue ? 'is-overdue' : ''
                } ${activeTaskId === task.id ? 'actions-visible' : ''}`}
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
                    {isOverdue && (
                      <span className="learnings-task-badge-premium overdue" title={`Originally scheduled for ${task.date}`}>
                        Overdue
                      </span>
                    )}
                  </div>
                  {task.notes && (
                    <p className="learnings-task-notes-premium">{task.notes}</p>
                  )}
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
            )
          })}
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
