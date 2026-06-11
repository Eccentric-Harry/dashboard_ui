import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import './mini-month.css'

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function parseISODate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function toISODate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function monthGrid(date: Date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1)
  const gridStart = startOfWeek(first)
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  const gridEnd = startOfWeek(lastDay)
  gridEnd.setDate(gridEnd.getDate() + 6)
  const totalDays = Math.round((gridEnd.getTime() - gridStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
  return daysBetween(gridStart, totalDays)
}

function daysBetween(start: Date, count: number) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return date
  })
}

function startOfWeek(date: Date) {
  const next = new Date(date)
  next.setDate(date.getDate() - date.getDay())
  return next
}

interface MiniMonthProps {
  selectedDate: string
  onSelect: (date: string) => void
  activeDates?: Set<string>
  onMonthChange?: (startISO: string, endISO: string) => void
  maxDate?: string
  disableFutureMonths?: boolean
  allowFuture?: boolean
}

export function MiniMonth({
  selectedDate,
  onSelect,
  activeDates,
  onMonthChange,
  maxDate,
  disableFutureMonths,
  allowFuture,
}: MiniMonthProps) {
  const [currentMonth, setCurrentMonth] = useState(() => parseISODate(selectedDate))

  useEffect(() => {
    setCurrentMonth(parseISODate(selectedDate))
  }, [selectedDate])

  const days = monthGrid(currentMonth)
  const activeMonthIndex = currentMonth.getMonth()

  useEffect(() => {
    if (onMonthChange) {
      const startISO = toISODate(days[0])
      const endISO = toISODate(days[days.length - 1])
      onMonthChange(startISO, endISO)
    }
  }, [currentMonth])

  const handleMonthStep = (direction: -1 | 1) => {
    const next = new Date(currentMonth)
    next.setMonth(currentMonth.getMonth() + direction)
    setCurrentMonth(next)
  }

  const todayISO = toISODate(new Date())

  const isNextMonthFuture = () => {
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    const today = new Date()
    return nextMonth > new Date(today.getFullYear(), today.getMonth(), 1)
  }

  const isNextDisabled = disableFutureMonths && isNextMonthFuture()

  return (
    <section className="mini-month" aria-label="Month selector">
      <div className="mini-month-head">
        <div className="mini-month-title">
          <CalendarDays size={15} />
          <b>
            {new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(
              currentMonth,
            )}
          </b>
        </div>
        <div className="mini-month-nav">
          <button type="button" onClick={() => handleMonthStep(-1)} aria-label="Previous Month">
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            onClick={() => handleMonthStep(1)}
            aria-label="Next Month"
            disabled={isNextDisabled}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
      <div className="mini-month-weekdays">
        {WEEKDAY_LABELS.map((day) => (
          <span key={day}>{day[0]}</span>
        ))}
      </div>
      <div className="mini-month-grid">
        {days.map((date) => {
          const iso = toISODate(date)
          const isSelected = iso === selectedDate
          const isMuted = date.getMonth() !== activeMonthIndex
          const isToday = iso === todayISO
          const isFuture = allowFuture ? false : (maxDate ? iso > maxDate : iso > todayISO)

          return (
            <button
              key={iso}
              type="button"
              className={`${isSelected ? 'is-selected' : ''} ${isMuted ? 'is-muted' : ''} ${
                isToday ? 'today' : ''
              } ${isFuture ? 'future' : ''}`}
              disabled={maxDate !== undefined && iso > maxDate}
              onClick={() => onSelect(iso)}
            >
              {date.getDate()}
              {activeDates?.has(iso) && <i />}
            </button>
          )
        })}
      </div>
    </section>
  )
}
