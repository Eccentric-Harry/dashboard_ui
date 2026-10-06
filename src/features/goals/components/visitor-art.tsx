// The visitors, drawn in the cast's style (camp-characters.tsx): an 80 × 80 box, feet on
// y≈74 over a soft shadow, candy fills with their own colours in every theme, and one
// silhouette each — Bun's ears, Bristle's spikes, Puddle's round little body, Fawn's
// legs, Ember's ringed tail, Nimbus's puffs, Comet's whale curve. `.vz-*` motion lives
// in camp-magic.css and stops under reduced motion.

import type { ReactElement } from 'react'
import { cn } from '@/lib/utils'
import type { VisitorId } from '../camp-visitors'

const INK = '#2a2140'

function Eyes({ y = 40, left = 32, right = 48, r = 3.2 }: { y?: number; left?: number; right?: number; r?: number }) {
  return (
    <g className="vz-eyes">
      <ellipse cx={left} cy={y} rx={r} ry={r * 1.2} fill={INK} />
      <ellipse cx={right} cy={y} rx={r} ry={r * 1.2} fill={INK} />
      <circle cx={left + 1.1} cy={y - 1.3} r={r * 0.38} fill="#ffffff" />
      <circle cx={right + 1.1} cy={y - 1.3} r={r * 0.38} fill="#ffffff" />
    </g>
  )
}

function Cheeks({ y = 47, left = 25, right = 55 }: { y?: number; left?: number; right?: number }) {
  return (
    <>
      <ellipse cx={left} cy={y} rx="3.6" ry="2.3" fill="#ff8fa8" opacity="0.6" />
      <ellipse cx={right} cy={y} rx="3.6" ry="2.3" fill="#ff8fa8" opacity="0.6" />
    </>
  )
}

function Bun() {
  return (
    <>
      <g className="vz-ear vz-ear--l">
        <path d="M28 34 C 20 18, 22 2, 28 2 C 34 2, 36 18, 34 34 Z" fill="#fff4e8" />
        <path d="M29 30 C 25 18, 26 8, 29 8 C 32 8, 32 18, 32 30 Z" fill="#ffb3c4" />
      </g>
      <g className="vz-ear vz-ear--r">
        <path d="M46 34 C 46 18, 50 3, 56 4 C 62 6, 56 22, 52 34 Z" fill="#fff4e8" />
        <path d="M48 30 C 49 19, 52 10, 55 10 C 58 11, 54 21, 51 30 Z" fill="#ffb3c4" />
      </g>
      <ellipse cx="40" cy="58" rx="20" ry="16" fill="#fff4e8" />
      <circle cx="40" cy="42" r="15" fill="#fff4e8" />
      <circle cx="58" cy="64" r="5" fill="#ffffff" />
      <Eyes y={41} left={34} right={46} r={2.6} />
      <Cheeks y={47} left={29} right={51} />
      <path d="M38.6 46 L 41.4 46 L 40 47.8 Z" fill="#ff8fa8" />
      <path d="M40 47.8 q -2 2 -3.6 1 M40 47.8 q 2 2 3.6 1" stroke={INK} strokeWidth="1.1" fill="none" strokeLinecap="round" />
      <ellipse cx="32" cy="72" rx="5" ry="2.6" fill="#f0e2d0" />
      <ellipse cx="48" cy="72" rx="5" ry="2.6" fill="#f0e2d0" />
    </>
  )
}

function Bristle() {
  const spikes = Array.from({ length: 11 }, (_, i) => {
    const a = Math.PI * (1.02 + (i / 10) * 0.96)
    const x = 40 + Math.cos(a) * 24
    const y = 56 + Math.sin(a) * 20
    const tx = 40 + Math.cos(a) * 34
    const ty = 56 + Math.sin(a) * 30
    return `M${x - Math.sin(a) * 4} ${y + Math.cos(a) * 4} L${tx} ${ty} L${x + Math.sin(a) * 4} ${y - Math.cos(a) * 4} Z`
  }).join(' ')
  return (
    <>
      <path d={spikes} fill="#8a5a3c" />
      <path d="M12 64 C 12 40, 68 36, 68 64 C 68 72, 12 72, 12 64 Z" fill="#a8714b" />
      <path d="M22 66 C 22 50, 52 46, 60 58 C 64 64, 62 72, 52 72 L 30 72 C 24 72, 22 70, 22 66 Z" fill="#f6dcc0" />
      <Eyes y={57} left={38} right={50} r={2.4} />
      <ellipse cx="33" cy="63" rx="3" ry="2" fill="#ff8fa8" opacity="0.6" />
      <ellipse cx="55" cy="63" rx="3" ry="2" fill="#ff8fa8" opacity="0.6" />
      <circle cx="61" cy="60" r="3.2" fill={INK} />
      <path d="M42 64 q 2 2 4 0" stroke={INK} strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <ellipse cx="30" cy="73" rx="4.4" ry="2.2" fill="#8a5a3c" />
      <ellipse cx="50" cy="73" rx="4.4" ry="2.2" fill="#8a5a3c" />
    </>
  )
}

function Puddle() {
  return (
    <>
      <path d="M38 22 C 36 14, 42 12, 44 18" stroke="#f3b62e" strokeWidth="3" fill="none" strokeLinecap="round" />
      <ellipse cx="42" cy="56" rx="22" ry="17" fill="#ffd84d" />
      <circle cx="38" cy="36" r="14" fill="#ffd84d" />
      <path className="vz-wing" d="M48 52 C 60 50, 62 62, 54 66 C 50 62, 46 58, 48 52 Z" fill="#f3b62e" />
      <path d="M62 50 C 68 48, 70 52, 66 56 Z" fill="#f3b62e" />
      <Eyes y={34} left={32} right={44} r={2.6} />
      <ellipse cx="27" cy="40" rx="3" ry="2" fill="#ff8fa8" opacity="0.6" />
      <ellipse cx="49" cy="40" rx="3" ry="2" fill="#ff8fa8" opacity="0.6" />
      <path className="vz-bill" d="M33 40 C 36 38, 42 38, 45 40 C 43 44, 35 44, 33 40 Z" fill="#ff9f5a" />
      <path d="M32 72 l -4 3 h 8 Z M48 72 l -4 3 h 8 Z" fill="#ff9f5a" />
    </>
  )
}

function Fawn() {
  return (
    <>
      <path d="M28 62 L 26 76 M34 64 L 34 76 M50 64 L 50 76 M56 62 L 58 76" stroke="#b86f3f" strokeWidth="3.4" strokeLinecap="round" />
      <ellipse cx="42" cy="56" rx="19" ry="11" fill="#d98a52" />
      <circle cx="36" cy="52" r="1.8" fill="#fff4e0" />
      <circle cx="44" cy="50" r="1.6" fill="#fff4e0" />
      <circle cx="50" cy="55" r="1.8" fill="#fff4e0" />
      <circle cx="41" cy="58" r="1.4" fill="#fff4e0" />
      <path d="M60 50 C 64 46, 66 48, 64 52 Z" fill="#fff4e0" />
      <path d="M26 54 C 22 46, 22 38, 26 32" stroke="#d98a52" strokeWidth="9" fill="none" strokeLinecap="round" />
      <path className="vz-ear vz-ear--l" d="M18 26 C 10 22, 10 18, 16 18 C 20 20, 22 22, 22 26 Z" fill="#d98a52" />
      <path className="vz-ear vz-ear--r" d="M34 24 C 40 18, 44 18, 42 22 C 40 26, 38 26, 36 28 Z" fill="#d98a52" />
      <path d="M24 20 C 22 14, 18 12, 16 8 M24 20 C 26 14, 24 10, 26 6 M32 20 C 34 14, 38 12, 40 8 M32 20 C 30 14, 32 10, 30 6" stroke="#8a5a3c" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <ellipse cx="28" cy="30" rx="11" ry="9.5" fill="#e09a63" />
      <path d="M20 34 C 20 40, 34 40, 34 34 C 30 36, 24 36, 20 34 Z" fill="#fff4e0" />
      <Eyes y={28} left={24} right={33} r={2.2} />
      <circle cx="27" cy="36" r="1.8" fill={INK} />
    </>
  )
}

function Ember() {
  return (
    <>
      <g className="vz-tail">
        <path d="M54 62 C 70 62, 76 50, 72 40 C 68 30, 60 34, 62 42 C 64 50, 58 56, 52 56 Z" fill="#d9572b" />
        <path d="M70 36 l -6 4 M73 45 l -7 2 M70 54 l -6 -1" stroke="#8a2f17" strokeWidth="3.4" strokeLinecap="round" />
      </g>
      <ellipse cx="40" cy="60" rx="17" ry="13" fill="#d9572b" />
      <path d="M28 68 C 30 74, 50 74, 52 68 C 48 66, 32 66, 28 68 Z" fill="#5a2a1a" />
      <path d="M22 26 L 24 16 L 32 22 Z M58 26 L 56 16 L 48 22 Z" fill="#d9572b" />
      <path d="M24 24 L 25 19 L 29 22 Z M56 24 L 55 19 L 51 22 Z" fill="#fff4e0" />
      <circle cx="40" cy="38" r="17" fill="#e86a3a" />
      <path d="M26 36 C 28 30, 34 30, 36 34 C 34 40, 28 42, 26 36 Z M54 36 C 52 30, 46 30, 44 34 C 46 40, 52 42, 54 36 Z" fill="#fff4e0" />
      <path d="M33 44 C 36 50, 44 50, 47 44 C 44 42, 36 42, 33 44 Z" fill="#fff4e0" />
      <Eyes y={38} left={33} right={47} r={2.5} />
      <circle cx="40" cy="45" r="1.8" fill={INK} />
    </>
  )
}

function Nimbus() {
  return (
    <>
      <path d="M28 66 v 9 M36 68 v 8 M46 68 v 8 M54 66 v 9" stroke="#5b4a6f" strokeWidth="3.4" strokeLinecap="round" />
      <g className="vz-fluff">
        {(
          [
            [24, 54, 11], [36, 46, 13], [50, 46, 13], [60, 56, 11], [44, 60, 14], [30, 62, 11], [56, 64, 9],
          ] as const
        ).map(([x, y, r]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill="#ffffff" />
        ))}
        <circle cx="38" cy="40" r="4" fill="#eef4ff" />
        <circle cx="52" cy="42" r="3" fill="#eef4ff" />
      </g>
      <ellipse cx="22" cy="46" rx="11" ry="10" fill="#5b4a6f" />
      <ellipse cx="13" cy="42" rx="5" ry="2.6" fill="#5b4a6f" transform="rotate(-20 13 42)" />
      <circle cx="20" cy="35" r="5" fill="#ffffff" />
      <circle cx="26" cy="34" r="4.4" fill="#ffffff" />
      <ellipse cx="19" cy="46" rx="2" ry="2.5" fill="#ffffff" />
      <ellipse cx="26" cy="46" rx="2" ry="2.5" fill="#ffffff" />
      <circle cx="19.4" cy="46.4" r="1.3" fill={INK} />
      <circle cx="26.4" cy="46.4" r="1.3" fill={INK} />
    </>
  )
}

function Comet() {
  return (
    <>
      <path className="vz-tail" d="M60 40 C 70 36, 74 26, 78 24 C 76 34, 74 38, 76 46 C 72 42, 66 42, 60 44 Z" fill="#6c7cf0" />
      <path d="M4 44 C 4 28, 26 22, 44 26 C 56 28, 64 36, 62 44 C 60 54, 44 58, 28 58 C 14 58, 4 54, 4 44 Z" fill="#6c7cf0" />
      <path d="M8 48 C 18 56, 44 58, 60 46 C 56 56, 40 60, 26 60 C 16 60, 10 56, 8 48 Z" fill="#c9d0ff" />
      <path d="M14 52 h 34 M16 55 h 28" stroke="#a8b2ff" strokeWidth="1.2" strokeLinecap="round" />
      <path className="vz-wing" d="M30 50 C 34 60, 40 64, 44 62 C 42 56, 38 52, 30 50 Z" fill="#5161d6" />
      <circle cx="18" cy="40" r="2.6" fill={INK} />
      <circle cx="18.8" cy="39" r="0.9" fill="#ffffff" />
      <ellipse cx="14" cy="46" rx="3" ry="1.8" fill="#ff8fa8" opacity="0.6" />
      {(
        [
          [30, 32, 1.4], [40, 30, 1], [50, 34, 1.3], [36, 38, 0.9], [46, 40, 1.1],
        ] as const
      ).map(([x, y, r]) => (
        <circle key={`${x}-${y}`} className="vz-star" cx={x} cy={y} r={r} fill="#fff6c4" />
      ))}
      <path d="M22 26 C 20 18, 24 12, 22 6 M26 26 C 28 20, 26 14, 30 10" stroke="#c9d0ff" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.8" />
    </>
  )
}

const ART: Record<VisitorId, () => ReactElement> = { bun: Bun, bristle: Bristle, puddle: Puddle, fawn: Fawn, ember: Ember, nimbus: Nimbus, comet: Comet }

/** A visitor. `silhouette` draws them as a dark shape for the guestbook's empty pages. */
function VisitorArt({ id, className, silhouette, talking }: { id: VisitorId; className?: string; silhouette?: boolean; talking?: boolean }) {
  const Art = ART[id]
  return (
    <svg
      className={cn('vz', `vz--${id}`, silhouette && 'is-silhouette', talking && 'is-talking', className)}
      viewBox="0 0 80 80"
      aria-hidden="true"
    >
      {id !== 'comet' && <ellipse className="vz-shadow" cx="40" cy="76" rx="18" ry="3" />}
      <g className="vz-rig">
        <Art />
      </g>
    </svg>
  )
}

export { VisitorArt }
