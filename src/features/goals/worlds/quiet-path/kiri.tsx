import { cn } from '@/lib/utils'

type KiriProps = {
  className?: string
  /** Eyes closed, breathing slowly — during the breathing practice. */
  resting?: boolean
  talking?: boolean
  /** Placement when nested inside another SVG (the path scene). */
  x?: number
  y?: number
  width?: number
  height?: number
}

/**
 * Kiri, the heron who keeps the Quiet Path. Tall, still and soft-edged — long lines where
 * Pip is all circles — standing in the shallows. Kiri speaks rarely and only about the
 * path. Motion lives in quiet-path.css (`.kiri-*`): a slow breath, a head that dips now
 * and then; all of it stops under reduced motion.
 */
function Kiri({ className, resting, talking, x, y, width, height }: KiriProps) {
  return (
    <svg
      className={cn('kiri', resting && 'is-resting', talking && 'is-talking', className)}
      viewBox="0 0 90 130"
      x={x}
      y={y}
      width={width}
      height={height}
      overflow="visible"
      aria-hidden="true"
    >
      <ellipse className="kiri-shadow" cx="46" cy="125" rx="22" ry="3.4" />
      <g className="kiri-ripples">
        <ellipse cx="46" cy="124" rx="14" ry="2.4" />
      </g>
      {/* Legs */}
      <path d="M44 86 L42 123 M52 86 L56 106 L50 112" stroke="#c9915e" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M36 124 L42 123 L48 124" stroke="#c9915e" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <g className="kiri-body">
        {/* Tail plumes */}
        <path d="M66 74 C 76 78, 82 86, 84 94 C 76 90, 70 86, 64 82 Z" fill="#7f95ad" />
        {/* Body */}
        <path d="M30 70 C 30 56, 50 50, 64 60 C 72 66, 72 80, 62 86 C 52 92, 34 90, 30 80 Z" fill="#a8bdd3" />
        <path className="kiri-wing" d="M42 62 C 56 58, 70 64, 72 76 C 64 82, 52 84, 44 78 C 40 74, 39 67, 42 62 Z" fill="#8aa1ba" />
        <path d="M46 70 C 54 70, 62 73, 66 77" stroke="#6f86a0" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        {/* Chest */}
        <path d="M30 70 C 30 78, 33 86, 40 88 C 36 82, 35 74, 36 66 Z" fill="#eef2f6" />
      </g>
      <g className="kiri-head">
        {/* Neck: a long S */}
        <path d="M36 66 C 26 56, 40 46, 34 36 C 31 31, 28 28, 28 24" stroke="#eef2f6" strokeWidth="8" strokeLinecap="round" fill="none" />
        <path d="M37 62 C 30 55, 39 47, 35 39" stroke="#c9d6e3" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.8" />
        {/* Head */}
        <ellipse cx="29" cy="20" rx="8.5" ry="7" fill="#f4f7fa" />
        {/* Crest */}
        <path d="M30 15 C 38 12, 46 13, 52 16 C 45 16, 39 17, 33 19 Z" fill="#2a2140" />
        {/* Beak */}
        <path d="M22 19 L 2 23 L 22 23.5 Z" fill="#ffcb3d" />
        <path d="M22 21.6 L 4 23 L 22 23.5 Z" fill="#e0a92a" />
        {/* Eye: open dot, or a calm closed arc */}
        <g className="kiri-eye-open">
          <circle cx="27.5" cy="18.4" r="1.9" fill="#2a2140" />
          <circle cx="28.1" cy="17.8" r="0.6" fill="#ffffff" />
        </g>
        <path className="kiri-eye-closed" d="M25.4 18.6 Q 27.6 20.6 29.8 18.6" stroke="#2a2140" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <ellipse cx="31" cy="23" rx="2.6" ry="1.6" fill="#ff8fa8" opacity="0.45" />
      </g>
    </svg>
  )
}

export { Kiri }
