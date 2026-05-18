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
    const pad = (n: number) => n.toString().padStart(2, '0')
    const today = new Date()
    return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
  })

  const [refreshTrigger, setRefreshTrigger] = useState(0)

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
        <CalendarSelectorCard selectedDate={selectedDate} onSelectDate={setSelectedDate} refreshTrigger={refreshTrigger} />
        <LearningDetailsCard selectedDate={selectedDate} onRefresh={() => setRefreshTrigger(prev => prev + 1)} />
      </div>
    </section>
  )
}

export { LearningsOverviewDashboard }