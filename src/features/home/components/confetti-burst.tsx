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

type ConfettiBurstProps = {
  /** Bump this number to fire a new burst. */
  trigger: number
}

const COLORS = ['#eaff28', '#a9b0e8', '#f3cf8e', '#9cc4a9', '#f0a8ae', '#8fb8da']
const PIECE_COUNT = 20

/** Lightweight DOM confetti — no canvas, no dependency. Fires once per `trigger` bump. */
function ConfettiBurst({ trigger }: ConfettiBurstProps) {
  const [pieces, setPieces] = useState<ConfettiPiece[] | null>(null)

  useEffect(() => {
    if (trigger === 0) return
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
    <div className="home-confetti" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="home-confetti-piece"
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

export { ConfettiBurst }
