import { useEffect, useState } from 'react'
import { LearningsHeader } from './components/learnings-header'
import { CalendarSelectorCard } from './components/calendar-selector-card'
import { LearningDetailsCard } from './components/learning-details-card'
import './learnings-overview.css'

function LearningsOverviewDashboard({ searchParams }: { searchParams: URLSearchParams }) {
  const selectedDateParam = searchParams.get('date')
  const [selectedDate, setSelectedDate] = useState(() => {
    if (selectedDateParam) {
      // If it's something like "Oct 25, 2024", we convert it to ISO "YYYY-MM-DD" back so we have a uniform state
      const d = new Date(selectedDateParam)
      if (d.toString() !== 'Invalid Date') {
        return d.toISOString().split('T')[0]
      }
      return selectedDateParam
    }
    return new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    if (selectedDateParam) {
      const d = new Date(selectedDateParam)
      if (d.toString() !== 'Invalid Date') {
        setSelectedDate(d.toISOString().split('T')[0])
      } else {
        setSelectedDate(selectedDateParam)
      }
    }
  }, [selectedDateParam])

  return (
    <section className="learnings-dashboard" aria-label="Learnings overview dashboard">
      <LearningsHeader />
      <div className="learnings-dashboard-grid">
        <CalendarSelectorCard selectedDate={selectedDate} onSelectDate={setSelectedDate} />
        <LearningDetailsCard selectedDate={selectedDate} />
      </div>
    </section>
  )
}

export { LearningsOverviewDashboard }