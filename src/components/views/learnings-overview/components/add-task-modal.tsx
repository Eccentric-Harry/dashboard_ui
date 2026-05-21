import { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { addTask, updateTask } from '../../../../lib/api'
import type { DailyTask } from '../../../../lib/api'
import './add-learning-modal.css'

const TIME_OPTIONS = [
  '',
  '08:00 AM',
  '09:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '01:00 PM',
  '02:00 PM',
  '03:00 PM',
  '04:00 PM',
  '05:00 PM',
  '06:00 PM',
]

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
        setScheduledTime(initialData.scheduledTime || '')
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
        scheduledTime: scheduledTime || undefined,
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
    <div className="learning-modal-backdrop" role="presentation" onClick={onClose}>
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
              <select
                id="task-time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
              >
                <option value="">No specific time</option>
                {TIME_OPTIONS.filter(Boolean).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
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
