import type { LucideIcon } from 'lucide-react'

type StatCardProps = {
  label: string
  value: string
  unit: string
  icon: LucideIcon
  iconClass: string
}

function StatCard({ label, value, unit, icon: Icon, iconClass }: StatCardProps) {
  return (
    <div className="workouts-card workouts-stat-card">
      <div className={`workouts-stat-icon ${iconClass}`}>
        <Icon size={15} strokeWidth={2.2} />
      </div>
      <p>{label}</p>
      <strong>
        {value}
        <small>{unit}</small>
      </strong>
    </div>
  )
}

export { StatCard }
