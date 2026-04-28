type RingProgressProps = {
  label: string
  value: number
  target: number
  color: string
  unit: string
  active?: boolean
  onSelect?: () => void
}

function RingProgress({ label, value, target, color, unit, active, onSelect }: RingProgressProps) {
  const radius = 44
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(value / target, 1)
  const dashOffset = circumference - progress * circumference

  return (
    <button
      type="button"
      className={`nutrition-ring ${active ? 'active' : ''}`}
      style={{ '--ring-color': color } as CSSProperties}
      onClick={onSelect}
      aria-pressed={active}
    >
      <svg viewBox="0 0 108 108" aria-hidden="true">
        <circle cx="54" cy="54" r={radius} className="track" />
        <circle
          cx="54"
          cy="54"
          r={radius}
          className="value"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <span>
        <b>{Math.round(progress * 100)}%</b>
        <small>{label}</small>
        <em>
          {value}/{target}
          {unit}
        </em>
      </span>
    </button>
  )
}

export { RingProgress }
import type { CSSProperties } from 'react'
