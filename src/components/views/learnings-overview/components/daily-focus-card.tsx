import { useState, useEffect, useCallback } from 'react'
import { Loader2, Target, Check } from 'lucide-react'
import { fetchDailyLog, updateDailyLog } from '../../../../lib/api'

interface DailyFocusCardProps {
  selectedDate: string
  refreshKey: number
  initialFocus?: string | null
  initialCompleted?: boolean
  onRefresh: () => void
}

export function DailyFocusCard({
  selectedDate,
  refreshKey,
  initialFocus,
  initialCompleted,
  onRefresh,
}: DailyFocusCardProps) {
  const [focus, setFocus] = useState(initialFocus ?? '')
  const [completed, setCompleted] = useState(initialCompleted ?? false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchDailyLog(selectedDate)
      const log = res?.data
      setFocus(log?.dailyOneThing ?? '')
      setCompleted(Boolean(log?.dailyOneThingCompleted))
    } catch {
      setFocus('')
      setCompleted(false)
    } finally {
      setLoading(false)
    }
  }, [selectedDate])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  useEffect(() => {
    if (initialFocus !== undefined) setFocus(initialFocus ?? '')
    if (initialCompleted !== undefined) setCompleted(initialCompleted ?? false)
  }, [initialFocus, initialCompleted, selectedDate])

  const persist = async (nextFocus: string, nextCompleted: boolean) => {
    setSaving(true)
    try {
      await updateDailyLog(selectedDate, {
        dailyOneThing: nextFocus,
        dailyOneThingCompleted: nextCompleted,
      })
      onRefresh()
    } finally {
      setSaving(false)
    }
  }

  const handleBlur = () => {
    if (focus.trim() !== (initialFocus ?? '')) {
      persist(focus.trim(), completed)
    }
  }

  const handleToggle = async () => {
    const next = !completed
    setCompleted(next)
    await persist(focus.trim(), next)
  }

  return (
    <section className={`learnings-card learnings-focus-card-premium ${completed ? 'is-completed' : ''}`}>
      <div className="learnings-card-header-flex">
        <div>
          <p className="learnings-card-eyebrow">Daily focus</p>
          <h3 className="learnings-card-title">
            <Target size={16} className="title-icon" />
            One thing for today
          </h3>
        </div>
        {completed && (
          <span className="premium-badge-completed">
            Achieved
          </span>
        )}
      </div>

      {loading ? (
        <div className="learnings-loading" style={{ marginTop: 20 }}>
          <Loader2 className="spinner animate-spin" size={14} />
          Loading focus...
        </div>
      ) : (
        <div className="learnings-focus-interactive-row" style={{ marginTop: 20 }}>
          <button
            type="button"
            className={`learnings-focus-check-circle ${completed ? 'checked' : ''} ${!focus.trim() ? 'disabled' : ''}`}
            onClick={handleToggle}
            disabled={saving || !focus.trim()}
            aria-label={completed ? "Mark incomplete" : "Mark as completed"}
          >
            {completed ? (
              <Check size={12} strokeWidth={3} className="check-icon" />
            ) : (
              <div className="circle-dot-hover" />
            )}
          </button>
          
          <div className="learnings-focus-input-wrapper-premium">
            <input
              type="text"
              className="learnings-focus-input-premium"
              placeholder="What is your single most important outcome today?"
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              onBlur={handleBlur}
              disabled={saving}
            />
          </div>
        </div>
      )}
    </section>
  )
}
