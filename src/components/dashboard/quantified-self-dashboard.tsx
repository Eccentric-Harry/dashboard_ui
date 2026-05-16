import { useEffect, useState } from 'react'
import { DashboardStage } from './quantified-self-dashboard/dashboard-stage'
import type { AppPath } from './quantified-self-dashboard/data'
import { InDevelopmentModal } from '../ui/in-development-modal'

type QuantifiedSelfDashboardProps = {
  activePath: AppPath
  onNavigate: (pathname: AppPath) => void
}

function QuantifiedSelfDashboard({ activePath, onNavigate }: QuantifiedSelfDashboardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    if (activePath === '/home') {
      setIsModalOpen(true)
    }
  }, [activePath])

  return (
    <main className="dashboard-shell">
      <DashboardStage activePath={activePath} onNavigate={onNavigate} />
      <InDevelopmentModal 
        open={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false)
          // Optionally auto-navigate back to nutrition if they close it, or let them stay on home.
          // onNavigate('/nutrition')
        }} 
      />
    </main>
  )
}

export { QuantifiedSelfDashboard }
