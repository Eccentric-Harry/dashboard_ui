import { useMemo } from 'react'

export function CalendarSelectorCard({ selectedDate, onSelectDate }: { selectedDate: string, onSelectDate: (date: string) => void }) {
  const daysInMonth = useMemo(() => {
    // Generate a calendar grid for the current month
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth()
    
    // Total days in the current month
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate()
    
    return Array.from({ length: daysInCurrentMonth }).map((_, i) => {
      const d = new Date(year, month, i + 1)
      return d
    })
  }, [])

  return (
    <div className="calendar-selector-card" style={{ background: 'rgba(255, 255, 255, 0.4)', borderRadius: '24px', padding: '24px', border: '1px solid rgba(255, 255, 255, 0.6)'}}>
      <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#101312', marginBottom: '24px' }}>Date Selection</h2>
      <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '8px',
      }}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
          <div key={idx} style={{ textAlign: 'center', fontSize: '12px', color: '#526057', fontWeight: 600, marginBottom: '8px' }}>
            {day}
          </div>
        ))}
        {daysInMonth.map((d, i) => {
          const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          const isoStr = d.toISOString().split('T')[0]
          const isSelected = selectedDate === dateStr || selectedDate === isoStr
          
          // Calculate column offset for first day
          const style: any = {
            aspectRatio: '1/1',
            borderRadius: '12px',
            border: 'none',
            background: isSelected ? '#1a7a4a' : 'rgba(255, 255, 255, 0.4)',
            color: isSelected ? 'white' : '#4a5550',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: isSelected ? 700 : 500,
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: isSelected ? '0 4px 12px rgba(26, 122, 74, 0.3)' : 'none',
          }
          
          if (i === 0) {
            style.gridColumnStart = d.getDay() + 1
          }

          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelectDate(isoStr)}
              style={style}
              onMouseEnter={e => { if(!isSelected) { e.currentTarget.style.background = 'white'; e.currentTarget.style.transform = 'scale(1.05)'; } }}
              onMouseLeave={e => { if(!isSelected) { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.4)'; e.currentTarget.style.transform = 'scale(1)'; } }}
            >
              {d.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}
