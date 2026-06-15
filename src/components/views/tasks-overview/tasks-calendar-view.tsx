import { useState, useMemo, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { DailyTask } from '../../../lib/api'

type TaskCategory = 'Work' | 'Learning' | 'Fitness' | 'Shopping' | 'Chores' | 'Finance' | 'Personal' | 'General'

const CATEGORY_COLORS: Record<string, string> = {
  Work: '#0ea5e9',
  Learning: '#6366f1',
  Fitness: '#f97316',
  Shopping: '#d97706',
  Chores: '#a855f7',
  Finance: '#10b981',
  Personal: '#8b5cf6',
  General: '#14b8a6',
}

function detectCategory(title: string): string {
  const t = title.toLowerCase()
  if (/\b(work|meeting|email|office|call|project|code|dev|pr\b|review|commit|deploy|github|api\b|backend|frontend|test\b|debug|design|sprint|standup)\b/.test(t)) return 'Work'
  if (/\b(learn|study|course|read|book|article|tutorial|lecture|homework|leetcode|notion)\b/.test(t)) return 'Learning'
  if (/\b(gym|run|workout|exercise|walk|yoga|meditate|health|fitness)\b/.test(t)) return 'Fitness'
  if (/\b(buy|order|shop|groceries|purchase|gift)\b/.test(t)) return 'Shopping'
  if (/\b(laundry|clean|wash|tidy|fix|vacuum|dishes|cook|meal)\b/.test(t)) return 'Chores'
  if (/\b(finance|bill|pay|bank|credit|tax|rent|money|salary|budget)\b/.test(t)) return 'Finance'
  if (/\b(personal|family|friend|call\s+\w+|plan|travel|trip)\b/.test(t)) return 'Personal'
  return 'General'
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getMonthData(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrev = new Date(year, month, 0).getDate()
  const weeks: number[][] = []
  let week: number[] = []

  for (let i = firstDay - 1; i >= 0; i--) {
    week.push(daysInPrev - i)
  }

  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d)
    if (week.length === 7) {
      weeks.push(week)
      week = []
    }
  }

  if (week.length > 0) {
    let next = 1
    while (week.length < 7) {
      week.push(next++)
    }
    weeks.push(week)
  }

  return { weeks, firstDay, daysInMonth, daysInPrev }
}

interface TasksCalendarViewProps {
  tasks: DailyTask[]
  onSelect: (task: DailyTask) => void
}

export function TasksCalendarView({ tasks, onSelect }: TasksCalendarViewProps) {
  const today = useMemo(() => new Date(), [])
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  const scrollRef = useRef<HTMLDivElement>(null)
  const todayRef = useRef<HTMLDivElement>(null)

  const { weeks } = useMemo(() => getMonthData(viewYear, viewMonth), [viewYear, viewMonth])

  const tasksByDate = useMemo(() => {
    const map = new Map<string, DailyTask[]>()
    tasks.forEach((t) => {
      if (t.date) {
        const existing = map.get(t.date) || []
        existing.push(t)
        map.set(t.date, existing)
      }
    })
    return map
  }, [tasks])

  useEffect(() => {
    // Only scroll if today is in the current view
    if (viewYear === today.getFullYear() && viewMonth === today.getMonth()) {
      if (scrollRef.current && todayRef.current) {
        // use a short timeout to let rendering settle
        setTimeout(() => {
          if (scrollRef.current && todayRef.current) {
            const container = scrollRef.current
            const el = todayRef.current
            const scrollLeft = el.offsetLeft - (container.clientWidth / 2) + (el.clientWidth / 2)
            container.scrollTo({ left: scrollLeft, behavior: 'smooth' })
          }
        }, 50)
      }
    }
  }, [viewYear, viewMonth, today])

  const goPrev = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1)
      setViewMonth(11)
    } else {
      setViewMonth((m) => m - 1)
    }
  }

  const goNext = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1)
      setViewMonth(0)
    } else {
      setViewMonth((m) => m + 1)
    }
  }

  const goToday = () => {
    setViewYear(today.getFullYear())
    setViewMonth(today.getMonth())
  }

  const monthName = new Date(viewYear, viewMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="tasks-calendar-view">
      <div className="calendar-nav">
        <h3>{monthName}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button type="button" className="calendar-nav-btn" onClick={goToday} style={{ padding: '0 10px', fontSize: 11, fontWeight: 600, width: 'auto' }}>
            Today
          </button>
          <div className="calendar-nav-arrows">
            <button type="button" className="calendar-nav-btn" onClick={goPrev} aria-label="Previous month">
              <ChevronLeft size={14} />
            </button>
            <button type="button" className="calendar-nav-btn" onClick={goNext} aria-label="Next month">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="calendar-scroll-area" ref={scrollRef}>
        <div className="calendar-grid">
          {DAY_NAMES.map((d) => (
            <div key={d} className="calendar-day-header">{d}</div>
          ))}

          {weeks.flat().map((dayNum, idx) => {
            let actualMonth = viewMonth
            let actualYear = viewYear

            if (idx < 7 && dayNum > 20) {
              actualMonth -= 1
              if (actualMonth < 0) {
                actualMonth = 11
                actualYear -= 1
              }
            } else if (idx > 20 && dayNum < 15) {
              actualMonth += 1
              if (actualMonth > 11) {
                actualMonth = 0
                actualYear += 1
              }
            }

            const dateObj = new Date(actualYear, actualMonth, dayNum)
            const isCurrentMonth = dateObj.getMonth() === viewMonth
            const isToday =
              dateObj.getFullYear() === today.getFullYear() &&
              dateObj.getMonth() === today.getMonth() &&
              dateObj.getDate() === today.getDate()

            const dateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`
            const dayTasks = tasksByDate.get(dateStr) || []
            const visibleTasks = dayTasks.slice(0, 3)
            const remaining = dayTasks.length - visibleTasks.length

            return (
              <div
                key={idx}
                ref={isToday ? todayRef : null}
                className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`}
              >
                <div className="day-number">{dayNum}</div>
                {isCurrentMonth && (
                  <div className="calendar-day-tasks">
                    {visibleTasks.map((t) => {
                      const storedCat = t.category as TaskCategory | undefined
                      const detected = detectCategory(t.title)
                      const category = (storedCat && storedCat in CATEGORY_COLORS) ? storedCat : detected
                      const blockColor = CATEGORY_COLORS[category] || CATEGORY_COLORS.General

                      return (
                        <div
                          key={t.id}
                          className={`calendar-task-block ${t.completed ? 'is-completed' : ''}`}
                          style={{ background: blockColor }}
                          onClick={(e) => { e.stopPropagation(); onSelect(t) }}
                          title={t.title}
                        >
                          {t.title}
                        </div>
                      )
                    })}
                    {remaining > 0 && (
                      <span className="calendar-task-more">+{remaining} more</span>
                    )}
                  </div>
                )}
              </div>
            )
        })}
        </div>
      </div>
    </div>
  )
}
