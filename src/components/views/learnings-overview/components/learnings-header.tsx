import { useMemo, useState, useEffect } from 'react'
import { ChevronDown, Plus, ListTodo, BookOpen } from 'lucide-react'
import type { AppPath } from '../../../dashboard/quantified-self-dashboard/data'
import type { LearningsSummary } from '../../../../lib/api'
import { fetchLearningsForRange, fetchTasksForRange } from '../../../../lib/api'
import { formatHeaderDate, parseIsoDate } from '../learnings-utils'
import { MiniMonth } from '../../../ui/mini-month'

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
  const [isFabOpen, setIsFabOpen] = useState(false)
  const [activeLearningsDates, setActiveLearningsDates] = useState<Set<string>>(new Set())
  const [calendarRange, setCalendarRange] = useState<{ start: string; end: string } | null>(null)

  const selectedDateObject = useMemo(() => parseIsoDate(selectedDate), [selectedDate])

  useEffect(() => {
    if (!calendarRange) return
    let active = true
    Promise.all([
      fetchLearningsForRange(calendarRange.start, calendarRange.end),
      fetchTasksForRange(calendarRange.start, calendarRange.end),
    ])
      .then(([learningsRes, tasksRes]) => {
        if (!active) return
        const datesSet = new Set<string>()
        const addDate = (raw: string) => {
          const key = typeof raw === 'string' ? raw.split('T')[0] : raw
          if (key) datesSet.add(key)
        }
        learningsRes?.data?.forEach((item: { date: string }) => addDate(item.date))
        tasksRes?.data?.forEach((item: { date: string }) => addDate(item.date))
        setActiveLearningsDates(datesSet)
      })
      .catch((err) => {
        console.error('Failed to load learnings range entries', err)
      })
    return () => {
      active = false
    }
  }, [calendarRange])

  const openCalendar = () => {
    setIsCalendarOpen(true)
  }

  const handleDateSelect = (dateStr: string) => {
    onDateChange(dateStr)
    setIsCalendarOpen(false)
    onNavigate?.('/learnings', `?date=${dateStr}`)
  }

  return (
    <header className="learnings-header">
      <div className="learnings-date-picker-wrap">
        <button
          type="button"
          className="learnings-date-trigger"
          aria-expanded={isCalendarOpen}
          aria-haspopup="dialog"
          onClick={() => (isCalendarOpen ? setIsCalendarOpen(false) : openCalendar())}
        >
          <span className="learnings-date-trigger-text">
            <span className="learnings-date-title-wrap">
              <strong>{formatHeaderDate(selectedDateObject)}</strong>
              <ChevronDown size={20} className="learnings-date-chevron" />
            </span>
            <small className="learnings-date-trigger-sub">
              {summary
                ? `${summary.today.learningsCount} logged | ${summary.today.tasksCompleted}/${summary.today.tasksTotal} today's tasks done`
                : 'Pick a date to review your day'}
            </small>
          </span>
        </button>

        {isCalendarOpen && (
          <>
            <div
              className="learnings-calendar-backdrop"
              role="presentation"
              onClick={() => setIsCalendarOpen(false)}
            />
            <div className="learnings-header-calendar learnings-card" role="dialog" aria-label="Choose date">
              <MiniMonth
                selectedDate={selectedDate}
                activeDates={activeLearningsDates}
                allowFuture={true}
                onMonthChange={(start, end) => setCalendarRange({ start, end })}
                onSelect={(dateStr) => {
                  handleDateSelect(dateStr)
                }}
              />
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

      {/* Floating Action Button (FAB) for Mobile View */}
      <div className={`learnings-fab-container ${isFabOpen ? 'is-open' : ''}`}>
        {isFabOpen && (
          <div
            className="learnings-fab-backdrop"
            role="presentation"
            onClick={() => setIsFabOpen(false)}
          />
        )}
        <div className="learnings-fab-options">
          <button
            type="button"
            className="learnings-fab-option-btn task"
            onClick={() => {
              onAddTask()
              setIsFabOpen(false)
            }}
          >
            <span className="learnings-fab-option-label">Add Task</span>
            <div className="learnings-fab-option-icon">
              <ListTodo size={16} />
            </div>
          </button>
          <button
            type="button"
            className="learnings-fab-option-btn learning"
            onClick={() => {
              onAddLearning()
              setIsFabOpen(false)
            }}
          >
            <span className="learnings-fab-option-label">Add Learning</span>
            <div className="learnings-fab-option-icon">
              <BookOpen size={16} />
            </div>
          </button>
        </div>
        <button
          type="button"
          className="learnings-fab-trigger"
          onClick={() => setIsFabOpen((prev) => !prev)}
          aria-expanded={isFabOpen}
          aria-label="Add item"
        >
          <Plus size={24} className="fab-plus-icon" />
        </button>
      </div>
    </header>
  )
}
