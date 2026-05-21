import { useState, useEffect, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import type { AppPath } from '../../../dashboard/quantified-self-dashboard/data'
import { fetchLearningsForRange, fetchTasksForRange } from '../../../../lib/api'
import { isoDate } from '../learnings-utils'

interface CalendarSelectorCardProps {
  selectedDate: string
  refreshKey: number
  onSelectDate: (date: string) => void
  onNavigate?: (pathname: AppPath, search?: string) => void
}

export function CalendarSelectorCard({
  selectedDate,
  refreshKey,
  onSelectDate,
  onNavigate,
}: CalendarSelectorCardProps) {
  const initialDate = useMemo(() => {
    const d = new Date(selectedDate)
    return d.toString() !== 'Invalid Date' ? d : new Date()
  }, [selectedDate])

  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth())
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear())
  const [highlightedDates, setHighlightedDates] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const d = new Date(selectedDate)
    if (d.toString() !== 'Invalid Date') {
      setCurrentMonth(d.getMonth())
      setCurrentYear(d.getFullYear())
    }
  }, [selectedDate])

  const { gridDays, rangeStart, rangeEnd } = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1)
    const firstDayOfWeek = firstDay.getDay()
    const numDaysCurrent = new Date(currentYear, currentMonth + 1, 0).getDate()
    const numDaysPrev = new Date(currentYear, currentMonth, 0).getDate()
    const days: Date[] = []

    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      days.push(new Date(currentYear, currentMonth - 1, numDaysPrev - i))
    }
    for (let i = 1; i <= numDaysCurrent; i++) {
      days.push(new Date(currentYear, currentMonth, i))
    }
    const trailingCount = 42 - days.length
    for (let i = 1; i <= trailingCount; i++) {
      days.push(new Date(currentYear, currentMonth + 1, i))
    }

    return {
      gridDays: days,
      rangeStart: isoDate(days[0]),
      rangeEnd: isoDate(days[days.length - 1]),
    }
  }, [currentMonth, currentYear])

  useEffect(() => {
    let active = true
    async function loadHighlights() {
      setLoading(true)
      try {
        const [learningsRes, tasksRes] = await Promise.all([
          fetchLearningsForRange(rangeStart, rangeEnd),
          fetchTasksForRange(rangeStart, rangeEnd),
        ])
        const datesSet = new Set<string>()
        const addDate = (raw: string) => {
          const key = typeof raw === 'string' ? raw.split('T')[0] : raw
          if (key) datesSet.add(key)
        }
        if (active && learningsRes?.data) {
          learningsRes.data.forEach((item: { date: string }) => addDate(item.date))
        }
        if (active && tasksRes?.data) {
          tasksRes.data.forEach((item: { date: string }) => addDate(item.date))
        }
        if (active) setHighlightedDates(datesSet)
      } catch (err) {
        console.error('Failed to load calendar highlights', err)
      } finally {
        if (active) setLoading(false)
      }
    }
    loadHighlights()
    return () => {
      active = false
    }
  }, [rangeStart, rangeEnd, refreshKey])

  const handleSelect = (d: Date) => {
    const isoStr = isoDate(d)
    onSelectDate(isoStr)
    onNavigate?.('/learnings', `?date=${isoStr}`)
    if (d.getMonth() !== currentMonth) {
      setCurrentMonth(d.getMonth())
      setCurrentYear(d.getFullYear())
    }
  }

  const monthName = new Date(currentYear, currentMonth).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <section className="learnings-card learnings-calendar-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 className="learnings-card-title">{monthName}</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {loading && <Loader2 className="spinner animate-spin" size={14} style={{ color: '#526057' }} />}
          <button
            type="button"
            className="learnings-icon-btn"
            onClick={() => {
              if (currentMonth === 0) {
                setCurrentMonth(11)
                setCurrentYear((y) => y - 1)
              } else setCurrentMonth((m) => m - 1)
            }}
            aria-label="Previous month"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            className="learnings-icon-btn"
            onClick={() => {
              if (currentMonth === 11) {
                setCurrentMonth(0)
                setCurrentYear((y) => y + 1)
              } else setCurrentMonth((m) => m + 1)
            }}
            aria-label="Next month"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 8,
          marginBottom: 8,
        }}
      >
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
          <div
            key={`${day}-${idx}`}
            style={{ textAlign: 'center', fontSize: 12, color: '#526057', fontWeight: 600 }}
          >
            {day}
          </div>
        ))}
      </div>

      <div className="learnings-calendar-grid">
        {gridDays.map((d, i) => {
          const isoStr = isoDate(d)
          const isSelected = selectedDate === isoStr
          const isCurrentMonth = d.getMonth() === currentMonth
          const hasActivity = highlightedDates.has(isoStr)

          return (
            <button
              key={i}
              type="button"
              className={`learnings-calendar-day ${isSelected ? 'selected' : ''} ${!isCurrentMonth ? 'other-month' : ''}`}
              onClick={() => handleSelect(d)}
            >
              {d.getDate()}
              {hasActivity && <span className="learnings-calendar-dot" />}
            </button>
          )
        })}
      </div>
    </section>
  )
}
