import { useState } from 'react'
import { calendarDays, mockTasksData } from '../data'

function CalendarCard() {
  const daysInMonth = 30 // April has 30 days
  const startOffset = 2 // April 2026 starts on a Wednesday (Monday=0)
  const today = 30 // Currently April 30th
  
  const [selectedDate, setSelectedDate] = useState<number>(today)
  
  const tasks = mockTasksData[selectedDate] || []

  // Mock data markers mapped to dates instead of arbitrary grid index
  const highlightedDates = [2, 9, 14, 16, 23, 27, 30]
  const stripedDates = [4, 11, 18, 25]

  return (
    <section className="calendar-panel">
      <div className="calendar-grid">
        {calendarDays.map((day, i) => (
          <b key={i}>{day}</b>
        ))}
        {Array.from({ length: 35 }, (_, index) => {
          const dateNumber = index - startOffset + 1
          const isCurrentMonth = dateNumber > 0 && dateNumber <= daysInMonth
          const isActive = isCurrentMonth && dateNumber === selectedDate
          
          const isSelected = isCurrentMonth && highlightedDates.includes(dateNumber)
          const isStriped = isCurrentMonth && stripedDates.includes(dateNumber)

          return (
            <span
              key={index}
              onClick={() => isCurrentMonth && setSelectedDate(dateNumber)}
              className={`${isSelected ? 'selected' : ''} ${isStriped ? 'striped' : ''} ${isActive ? 'active-date' : ''}`}
              style={{
                cursor: isCurrentMonth ? 'pointer' : 'default',
                visibility: isCurrentMonth ? 'visible' : 'hidden',
                position: 'relative'
              }}
            >
              {isCurrentMonth ? (dateNumber < 10 ? `0${dateNumber}` : dateNumber) : ''}
            </span>
          )
        })}
      </div>
      <div className="scale-card">
        {tasks.length > 0 ? (
          <div className="tasks-list">
            {tasks.map((task, i) => (
              <div key={i} className="task-item">
                <div className="task-time">{task.time}</div>
                <div className="task-title">{task.title}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-tasks">No tasks for today.</div>
        )}
      </div>
    </section>
  )
}

export { CalendarCard }
