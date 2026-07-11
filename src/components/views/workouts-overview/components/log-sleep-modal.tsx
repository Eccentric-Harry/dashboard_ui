import { useEffect, useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { createPortal } from 'react-dom'
import toast from 'react-hot-toast'
import { addSleepLog } from '../../../../lib/api'

type LogSleepModalProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

function calcDurationMinutes(bedTime: string, wakeTime: string, date: string): number {
  if (!bedTime || !wakeTime || !date) return 0
  const bed = new Date(`${date}T${bedTime}`)
  let wake = new Date(`${date}T${wakeTime}`)
  if (wake <= bed) wake = new Date(wake.getTime() + 24 * 60 * 60 * 1000)
  return Math.round((wake.getTime() - bed.getTime()) / 60000)
}

function formatDuration(minutes: number): string {
  if (minutes <= 0) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function LogSleepModal({ isOpen, onClose, onSuccess }: LogSleepModalProps) {
  const [loading, setLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    bedTime: '22:30',
    wakeTime: '06:30',
    notes: '',
  })

  const durationMinutes = calcDurationMinutes(formData.bedTime, formData.wakeTime, formData.date)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        setFormData({
          date: new Date().toISOString().split('T')[0],
          bedTime: '22:30',
          wakeTime: '06:30',
          notes: '',
        })
        setIsSuccess(false)
      }, 0)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    if (durationMinutes <= 0) {
      toast.error('Wake time must be after bed time')
      return
    }
    setLoading(true)
    try {
      await addSleepLog({
        date: formData.date,
        bedTime: formData.bedTime,
        wakeTime: formData.wakeTime,
        durationMinutes,
        notes: formData.notes || undefined,
      })
      setIsSuccess(true)
      toast.success('Sleep logged')
      setTimeout(() => {
        onSuccess()
        onClose()
        setIsSuccess(false)
      }, 900)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to log sleep'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return createPortal(
    <div className="workouts-modal-backdrop" onClick={onClose}>
      <div
        className="workouts-modal-popover sleep-modal-popover"
        onClick={e => e.stopPropagation()}
      >
        <button className="workouts-modal-close" onClick={onClose} type="button">
          <X size={16} />
        </button>

        <h2>Log Sleep</h2>

        <form className="workouts-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Date</label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={e => setFormData({ ...formData, date: e.target.value })}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Bed Time</label>
              <input
                type="time"
                required
                value={formData.bedTime}
                onChange={e => setFormData({ ...formData, bedTime: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Wake Time</label>
              <input
                type="time"
                required
                value={formData.wakeTime}
                onChange={e => setFormData({ ...formData, wakeTime: e.target.value })}
              />
            </div>
          </div>

          <div className="sleep-duration-display">
            <span className="sleep-duration-label">Duration</span>
            <span className="sleep-duration-value">{formatDuration(durationMinutes)}</span>
          </div>

          <div className="form-group">
            <label>Notes (optional)</label>
            <textarea
              placeholder="e.g., Woke up once, felt rested..."
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <button
            className={`workouts-form-submit ${isSuccess ? 'success' : ''}`}
            type="submit"
            disabled={loading || isSuccess || durationMinutes <= 0}
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : isSuccess ? 'Sleep Logged!' : 'Log Sleep'}
          </button>
        </form>
      </div>
    </div>,
    document.body
  )
}

export { LogSleepModal }
