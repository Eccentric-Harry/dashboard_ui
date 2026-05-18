import { useState, useEffect, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { fetchLearningsForRange } from '../../../../lib/api'

export function CalendarSelectorCard({ selectedDate, onSelectDate }: { selectedDate: string, onSelectDate: (date: string) => void }) {
  // Parse initial date safely
  const initialDate = useMemo(() => {
    const d = new Date(selectedDate)
    return d.toString() !== 'Invalid Date' ? d : new Date()
  }, [selectedDate])

  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth())
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear())
  const [highlightedDates, setHighlightedDates] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  // Sync state if selectedDate changes from outside (e.g. from context or popstate)
  useEffect(() => {
    const d = new Date(selectedDate)
    if (d.toString() !== 'Invalid Date') {
      setCurrentMonth(d.getMonth())
      setCurrentYear(d.getFullYear())
    }
  }, [selectedDate])

  // Generate calendar grid (fixed 42 days / 6 weeks layout for zero height shift)
  const { gridDays, rangeStart, rangeEnd } = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1)
    const firstDayOfWeek = firstDay.getDay() // 0 (Sun) to 6 (Sat)
    
    const numDaysCurrent = new Date(currentYear, currentMonth + 1, 0).getDate()
    const numDaysPrev = new Date(currentYear, currentMonth, 0).getDate()

    const days: Date[] = []

    // Leading days from previous month
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      // Adjust year/month correctly
      const d = new Date(currentYear, currentMonth - 1, numDaysPrev - i)
      days.push(d)
    }

    // Current month days
    for (let i = 1; i <= numDaysCurrent; i++) {
      days.push(new Date(currentYear, currentMonth, i))
    }

    // Trailing days from next month to make exactly 42 days
    const trailingCount = 42 - days.length
    for (let i = 1; i <= trailingCount; i++) {
      days.push(new Date(currentYear, currentMonth + 1, i))
    }

    // Format ISO dates, manually ensuring timezone-agnostic local date strings
    const pad = (n: number) => n.toString().padStart(2, '0')
    const formatLocalISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

    const rangeStart = formatLocalISO(days[0])
    const rangeEnd = formatLocalISO(days[days.length - 1])

    return { gridDays: days, rangeStart, rangeEnd }
  }, [currentMonth, currentYear])

  // Fetch range learnings to highlight active dates
  useEffect(() => {
    let active = true
    async function loadHighlights() {
      setLoading(true)
      try {
        const res = await fetchLearningsForRange(rangeStart, rangeEnd)
        if (active && res && res.data) {
          const datesSet = new Set<string>(res.data.map((item: any) => {
            // Safely parse date and split YYYY-MM-DD
            if (typeof item.date === 'string') {
              return item.date.split('T')[0]
            }
            const itemDate = new Date(item.date)
            return itemDate.toString() !== 'Invalid Date' ? itemDate.toISOString().split('T')[0] : item.date
          }))
          setHighlightedDates(datesSet)
        }
      } catch (err) {
        console.error('Failed to load learning highlights for calendar', err)
      } finally {
        if (active) setLoading(false)
      }
    }
    loadHighlights()
    return () => { active = false }
  }, [rangeStart, rangeEnd])

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(prev => prev - 1)
    } else {
      setCurrentMonth(prev => prev - 1)
    }
  }

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(prev => prev + 1)
    } else {
      setCurrentMonth(prev => prev + 1)
    }
  }

  const monthName = new Date(currentYear, currentMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const pad = (n: number) => n.toString().padStart(2, '0')
  const formatLocalISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

  return (
    <div className="calendar-selector-card" style={{
      background: 'rgba(255, 255, 255, 0.4)',
      borderRadius: '24px',
      padding: '24px',
      border: '1px solid rgba(255, 255, 255, 0.6)',
      backdropFilter: 'blur(16px)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.03)'
    }}>
      {/* Month Selection Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#101312', margin: 0 }}>
          {monthName}
        </h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {loading && <Loader2 className="spinner animate-spin" size={14} style={{ color: '#526057', marginRight: '4px' }} />}
          <button
            type="button"
            onClick={handlePrevMonth}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(255, 255, 255, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#333b37',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.background = 'white'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.5)'; }}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(255, 255, 255, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#333b37',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.background = 'white'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.5)'; }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Weekday Labels */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '8px',
        marginBottom: '8px'
      }}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
          <div key={idx} style={{
            textAlign: 'center',
            fontSize: '12px',
            color: '#526057',
            fontWeight: 600,
            paddingBottom: '4px'
          }}>
            {day}
          </div>
        ))}
      </div>

      {/* Day Buttons Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '8px'
      }}>
        {gridDays.map((d, i) => {
          const isoStr = formatLocalISO(d)
          const isSelected = selectedDate === isoStr
          const isCurrentMonth = d.getMonth() === currentMonth
          const hasLearnings = highlightedDates.has(isoStr)

          const style: any = {
            aspectRatio: '1/1',
            borderRadius: '12px',
            border: 'none',
            background: isSelected ? '#1a7a4a' : (isCurrentMonth ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.15)'),
            color: isSelected ? 'white' : (isCurrentMonth ? '#4a5550' : '#889890'),
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: isSelected ? 700 : 500,
            transition: 'all 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: isSelected ? '0 4px 12px rgba(26, 122, 74, 0.3)' : 'none',
            position: 'relative',
            opacity: isCurrentMonth ? 1 : 0.65
          }

          return (
            <button
              key={i}
              type="button"
              onClick={() => {
                onSelectDate(isoStr)
                // Automatically switch month/year if they clicked a trailing/leading day
                if (d.getMonth() !== currentMonth) {
                  setCurrentMonth(d.getMonth())
                  setCurrentYear(d.getFullYear())
                }
              }}
              style={style}
              onMouseEnter={e => {
                if (!isSelected) {
                  e.currentTarget.style.background = 'white'
                  e.currentTarget.style.transform = 'scale(1.05)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.03)'
                }
              }}
              onMouseLeave={e => {
                if (!isSelected) {
                  e.currentTarget.style.background = isCurrentMonth ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.15)'
                  e.currentTarget.style.transform = 'scale(1)'
                  e.currentTarget.style.boxShadow = 'none'
                }
              }}
            >
              <span>{d.getDate()}</span>
              {/* Glowing emerald green indicator dot below day number */}
              {hasLearnings && (
                <span style={{
                  position: 'absolute',
                  bottom: '4px',
                  width: '5px',
                  height: '5px',
                  borderRadius: '50%',
                  background: isSelected ? 'white' : '#106c3d',
                  boxShadow: isSelected ? 'none' : '0 0 6px #106c3d'
                }} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
