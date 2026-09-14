import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MilestoneRingProps {
  done: number
  total: number
  /** Shown inside the ring until the milestone is complete (its number). */
  label?: string | number
  size?: number
}

const STROKE = 2.25

/** A milestone's progress: a ring that fills as steps finish, then turns solid with a check. */
export function MilestoneRing({ done, total, label, size = 28 }: MilestoneRingProps) {
  const radius = (size - STROKE) / 2
  const circumference = 2 * Math.PI * radius
  const ratio = total > 0 ? Math.min(1, done / total) : 0
  const complete = total > 0 && done >= total
  const center = size / 2

  return (
    <span
      className={cn('pw-ring', complete && 'is-complete', done === 0 && 'is-empty')}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox={`0 0 ${size} ${size}`}>
        <circle className="pw-ring-track" cx={center} cy={center} r={radius} />
        <circle
          className="pw-ring-fill"
          cx={center}
          cy={center}
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </svg>
      <span className="pw-ring-label">
        {complete ? <Check size={Math.round(size * 0.46)} strokeWidth={3} /> : label}
      </span>
    </span>
  )
}
