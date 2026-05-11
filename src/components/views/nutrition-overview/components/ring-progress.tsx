import type { CSSProperties } from 'react'

type RingProgressProps = {
  label: string
  value: number
  target: number
  color: string
  unit: string
  active?: boolean
  onSelect?: () => void
  centerTextOverride?: string
  hideLabel?: boolean
}

function RingProgress({ label, value, target, color, unit, active, onSelect, centerTextOverride, hideLabel }: RingProgressProps) {
  const radius = 58
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
      <svg viewBox="0 0 128 128" aria-hidden="true">
        <circle cx="64" cy="64" r={radius} className="track" />
        <circle
          cx="64"
          cy="64"
          r={radius}
          className="value"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <span>
        <b>{centerTextOverride || `${Math.round(progress * 100)}%`}</b>
        {!hideLabel && <small>{label}</small>}
        <em>
          {value.toLocaleString()}/{target.toLocaleString()}
          {unit}
        </em>
      </span>
    </button>
  )
}

export { RingProgress }
