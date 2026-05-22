import { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { addTask, updateTask } from '../../../../lib/api'
import type { DailyTask } from '../../../../lib/api'
import './add-learning-modal.css'

function formatTimeTo12Hour(time24: string): string {
  if (!time24) return ''
  const [hourStr, minStr] = time24.split(':')
  const hour = parseInt(hourStr, 10)
  const min = parseInt(minStr, 10)
  const period = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 === 0 ? 12 : hour % 12
  const formattedHour = displayHour.toString().padStart(2, '0')
  const formattedMin = min.toString().padStart(2, '0')
  return `${formattedHour}:${formattedMin} ${period}`
}

function formatTimeTo24Hour(time12: string): string {
  if (!time12) return ''
  if (/^\d{2}:\d{2}$/.test(time12)) return time12
  
  const match = time12.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!match) return ''
  let hour = parseInt(match[1], 10)
  const min = match[2]
  const period = match[3].toUpperCase()
  
  if (period === 'PM' && hour < 12) hour += 12
  if (period === 'AM' && hour === 12) hour = 0
  
  return `${hour.toString().padStart(2, '0')}:${min}`
}

interface AddTaskModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  isEdit?: boolean
  initialData?: DailyTask
  defaultDate: string
}

export function AddTaskModal({
  isOpen,
  onClose,
  onSuccess,
  isEdit,
  initialData,
  defaultDate,
}: AddTaskModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [notes, setNotes] = useState('')
  const [date, setDate] = useState(defaultDate)

  useEffect(() => {
    if (isOpen) {
      setError('')
      if (isEdit && initialData) {
        setTitle(initialData.title)
        setScheduledTime(initialData.scheduledTime ? formatTimeTo24Hour(initialData.scheduledTime) : '')
        setNotes(initialData.notes || '')
        setDate(initialData.date)
      } else {
        setTitle('')
        setScheduledTime('')
        setNotes('')
        setDate(defaultDate)
      }
    }
  }, [isOpen, isEdit, initialData, defaultDate])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !date) {
      setError('Title and date are required')
      return
    }

    setLoading(true)
    try {
      const payload = {
        title: title.trim(),
        date,
        scheduledTime: scheduledTime ? formatTimeTo12Hour(scheduledTime) : undefined,
        notes: notes.trim() || undefined,
        completed: initialData?.completed ?? false,
      }

      if (isEdit && initialData?.id) {
        await updateTask(initialData.id, payload)
        toast.success(`Updated task: "${title.trim()}"`)
      } else {
        await addTask(payload)
        toast.success(`Added task: "${title.trim()}"`)
      }

      onSuccess()
      onClose()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save task'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="learning-modal-backdrop is-tasks-theme" role="presentation" onClick={onClose}>
      <div
        className="learning-modal-popover"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="learning-modal-close" onClick={onClose}>
          <X size={16} />
        </button>

        <h2 className="learning-modal-title">{isEdit ? 'Edit Task' : 'Add Scheduled Task'}</h2>

        <form onSubmit={handleSubmit} className="learning-modal-form">
          <div className="form-group">
            <label htmlFor="task-title">Task</label>
            <input
              id="task-title"
              type="text"
              placeholder="e.g. Code review, Study session..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="task-time">Time (optional)</label>
              <input
                id="task-time"
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="task-date">Date</label>
              <input
                id="task-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="task-notes">Notes (optional)</label>
            <textarea
              id="task-notes"
              rows={2}
              placeholder="Extra context..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && <p className="learning-modal-error">{error}</p>}

          <button type="submit" className="learning-modal-submit" disabled={loading}>
            {loading ? <Loader2 className="spinner animate-spin" size={18} /> : 'Save Task'}
          </button>
        </form>
      </div>
    </div>
  )
}
