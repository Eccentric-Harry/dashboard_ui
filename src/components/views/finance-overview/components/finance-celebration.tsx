// Finance confetti — fires when money actually goes right: a loan you'd written
// off comes back, a bill finally clears, an instalment is behind you.
//
// Adapted from home-overview's ConfettiBurst rather than shared with it: the
// palettes differ on purpose (finance stays inside the route's sage/clay range
// where Home uses its brighter lime), and Home's copy is coupled to
// `.home-confetti` styling. Same physics, same 20 pieces, same escape hatch.

import { useEffect, useState, type CSSProperties } from 'react'

type ConfettiPiece = {
  id: number
  left: number
  delay: number
  duration: number
  color: string
  rotate: number
  drift: number
}

type FinanceCelebrationProps = {
  /** Bump this number to fire a new burst. 0 never fires. */
  trigger: number
}

// The route's own palette — sage, clay, sand, muted violet from CATEGORY_COLORS
// — rather than generic party brights, which would look pasted on over the
// desaturated ground.
const COLORS = ['#4b7a63', '#9cc4a9', '#f3cf8e', '#a9b0e8', '#d98b6a', '#8fb8da']
const PIECE_COUNT = 20

function FinanceCelebration({ trigger }: FinanceCelebrationProps) {
  const [pieces, setPieces] = useState<ConfettiPiece[] | null>(null)

  useEffect(() => {
    if (trigger === 0) return
    // Suppressed at the source, not just in CSS: with reduced motion the pieces
    // are never mounted at all, so there is no DOM churn to hide.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPieces(
      Array.from({ length: PIECE_COUNT }, (_, id) => ({
        id,
        left: 6 + Math.random() * 88,
        delay: Math.random() * 200,
        duration: 1100 + Math.random() * 700,
        color: COLORS[id % COLORS.length],
        rotate: 180 + Math.random() * 360,
        drift: (Math.random() - 0.5) * 140,
      })),
    )
    const timer = window.setTimeout(() => setPieces(null), 2000)
    return () => window.clearTimeout(timer)
  }, [trigger])

  if (!pieces) return null

  return (
    <div className="fin-confetti" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="fin-confetti-piece"
          style={
            {
              left: `${p.left}%`,
              background: p.color,
              animationDelay: `${p.delay}ms`,
              animationDuration: `${p.duration}ms`,
              '--rotate': `${p.rotate}deg`,
              '--drift': `${p.drift}px`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}

export { FinanceCelebration }
