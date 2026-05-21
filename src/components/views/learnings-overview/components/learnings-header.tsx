import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import type { AppPath } from '../../../dashboard/quantified-self-dashboard/data'
import type { LearningsSummary } from '../../../../lib/api'
import { formatHeaderDate, isoDate, parseIsoDate } from '../learnings-utils'

interface LearningsHeaderProps {
  selectedDate: string
  onDateChange: (date: string) => void
  onNavigate?: (pathname: AppPath, search?: string) => void
  onAddLearning: () => void
  onAddTask: () => void
  summary: LearningsSummary | null
}

export function LearningsHeader({
  selectedDate,
  onDateChange,
  onNavigate,
  onAddLearning,
  onAddTask,
  summary,
}: LearningsHeaderProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [visibleMonth, setVisibleMonth] = useState(() => parseIsoDate(selectedDate))

  useEffect(() => {
    setVisibleMonth(parseIsoDate(selectedDate))
  }, [selectedDate])

  const selectedDateObject = useMemo(() => parseIsoDate(selectedDate), [selectedDate])

  const calendarDays = useMemo(() => {
    const year = visibleMonth.getFullYear()
    const month = visibleMonth.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days: (Date | null)[] = []
    for (let i = 0; i < firstDay; i++) days.push(null)
    for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d))
    return days
  }, [visibleMonth])

  const handleDateSelect = (date: Date) => {
    const dateValue = isoDate(date)
    onDateChange(dateValue)
    setIsCalendarOpen(false)
    onNavigate?.('/learnings', `?date=${dateValue}`)
  }

  return (
    <header className="learnings-header">
      <div className="learnings-date-picker-wrap">
        <button
          type="button"
          className="learnings-date-trigger"
          aria-expanded={isCalendarOpen}
          aria-haspopup="dialog"
          onClick={() => setIsCalendarOpen((o) => !o)}
        >
          <span className="learnings-date-trigger-text">
            <strong>{formatHeaderDate(selectedDateObject)}</strong>
            <small className="learnings-date-trigger-sub">
              {summary
                ? `${summary.today.learningsCount} logged · ${summary.today.tasksCompleted}/${summary.today.tasksTotal} tasks done`
                : 'Pick a date to review your day'}
            </small>
          </span>
          <ChevronDown size={22} strokeWidth={2.2} />
        </button>

        {isCalendarOpen && (
          <>
            <div
              className="learnings-calendar-backdrop"
              role="presentation"
              onClick={() => setIsCalendarOpen(false)}
            />
            <div className="learnings-header-calendar learnings-card" role="dialog" aria-label="Choose date">
            <div className="learnings-header-calendar-head">
              <b>
                {visibleMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </b>
              <span className="learnings-header-calendar-nav">
                <button
                  type="button"
                  className="learnings-icon-btn"
                  onClick={() =>
                    setVisibleMonth(
                      new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1),
                    )
                  }
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  className="learnings-icon-btn"
                  onClick={() =>
                    setVisibleMonth(
                      new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1),
                    )
                  }
                >
                  <ChevronRight size={14} />
                </button>
              </span>
            </div>
            <div className="learnings-calendar-grid">
              {calendarDays.map((date, i) => {
                if (!date) return <span key={`empty-${i}`} />
                const dateValue = isoDate(date)
                const isSelected = dateValue === selectedDate
                return (
                  <button
                    key={dateValue}
                    type="button"
                    className={`learnings-calendar-day ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleDateSelect(date)}
                  >
                    {date.getDate()}
                  </button>
                )
              })}
            </div>
          </div>
          </>
        )}
      </div>

      <div className="learnings-header-actions">
        <button type="button" className="learnings-add-btn secondary" onClick={onAddTask}>
          <Plus size={14} strokeWidth={3} />
          <span>Task</span>
        </button>
        <button type="button" className="learnings-add-btn primary" onClick={onAddLearning}>
          <Plus size={14} strokeWidth={3} />
          <span>Learning</span>
        </button>
      </div>
    </header>
  )
}
