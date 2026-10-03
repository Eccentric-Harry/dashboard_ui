// A savings goal's mark: its icon in a soft disc, ringed by how full it is — the label on
// the envelope (Soman & Cheema: labelled savings get raided least). Lucide, like every
// category icon on /finance. The ring and the icon take the goal's hue from the
// `.fin-goal--<color>` class on an ancestor.

import { createElement, type CSSProperties } from 'react'
import type { LucideIcon } from 'lucide-react'

interface GoalJarProps {
  icon: LucideIcon
  /** 0–1, or null for an open goal with no target (the ring stays empty). */
  progress: number | null
  size?: number
  /** Thicker ring for hero sizes. */
  stroke?: number
}

function GoalJar({ icon, progress, size = 40, stroke = 3.5 }: GoalJarProps) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const p = progress == null ? 0 : Math.min(1, Math.max(0, progress))
  return (
    <span className="fin-jar" style={{ '--jar': `${size}px` } as CSSProperties} aria-hidden="true">
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        <circle className="fin-jar-track" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} />
        {p > 0 && (
          <circle
            className="fin-jar-fill"
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeDasharray={c}
            strokeDashoffset={c * (1 - p)}
          />
        )}
      </svg>
      <span className="fin-jar-face">
        {/* createElement, not a capitalised local: the icon is data (react-hooks/static-components). */}
        {createElement(icon, { size: Math.round(size * 0.4), strokeWidth: 2.2 })}
      </span>
    </span>
  )
}

export { GoalJar }
