// The Quiet Path's scenery: small things beside the trail (flowers, birches, ferns,
// willows, cedars, mist…) and a landmark for each chapter. Pure SVG, drawn at the scene's
// pixel scale; motion classes live in quiet-path.css.

import { cn } from '@/lib/utils'
import { seeded } from './path-layout'

const FLOWER_COLORS = ['#ff8fb0', '#ffcb3d', '#a07cff', '#52b4ff', '#ffffff']

export function Decor({ kind, i, big }: { kind: string; i: number; big: number }) {
  const s = (0.8 + seeded(i, 9) * 0.5) * big
  switch (kind) {
    case 'flower':
      return (
        <g transform={`scale(${s})`}>
          <line x1="0" y1="0" x2="0" y2="-10" stroke="#5a9a5f" strokeWidth="1.6" />
          <circle cx="0" cy="-12" r="4" fill={FLOWER_COLORS[i % FLOWER_COLORS.length]} />
          <circle cx="0" cy="-12" r="1.6" fill="#fff3c4" />
        </g>
      )
    case 'tuft':
      return <path className="qp-tuft" d="M-7 0 q2 -9 4 0 q2 -7 4 0 q2 -10 4 0" transform={`scale(${s})`} />
    case 'bush':
      return (
        <g transform={`scale(${s})`}>
          <circle cx="-7" cy="-8" r="9" fill="#6fb37c" />
          <circle cx="6" cy="-9" r="10" fill="#5aa46b" />
          <circle cx="0" cy="-15" r="3" fill="#ff8fb0" />
        </g>
      )
    case 'birch':
      return (
        <g transform={`scale(${s})`} className="qp-sway">
          <rect x="-2.6" y="-46" width="5.2" height="46" rx="2" fill="#f4f1ea" />
          <path d="M-2.6 -36 h3 M-.5 -26 h3 M-2.6 -14 h2.6" stroke="#4a4a4a" strokeWidth="1.6" />
          <ellipse cx="0" cy="-52" rx="15" ry="18" fill="#b5dd84" />
          <ellipse cx="-6" cy="-46" rx="9" ry="10" fill="#c8e79a" />
        </g>
      )
    case 'fern':
      return (
        <g transform={`scale(${s})`} className="qp-sway">
          {[-50, -25, 0, 25, 50].map((a) => (
            <path key={a} d="M0 0 C -3 -8, -2 -16, 0 -22 C 2 -16, 3 -8, 0 0 Z" fill="#3f9c63" transform={`rotate(${a})`} />
          ))}
        </g>
      )
    case 'mushroom':
      return (
        <g transform={`scale(${s * 0.9})`}>
          <rect x="-2" y="-8" width="4" height="8" rx="1.5" fill="#fff3e0" />
          <path d="M-7 -7 C -7 -15, 7 -15, 7 -7 Z" fill="#ff6f95" />
          <circle cx="-2.5" cy="-10.5" r="1.2" fill="#ffffff" />
        </g>
      )
    case 'willow':
      return (
        <g transform={`scale(${s})`} className="qp-sway">
          <rect x="-3" y="-34" width="6" height="34" rx="2.5" fill="#8a6a4a" />
          <path d="M-22 -18 C -22 -48, 22 -48, 22 -18 C 18 -10, 14 -4, 12 -2 C 10 -14, 6 -24, 0 -26 C -6 -24, -10 -14, -12 -2 C -14 -4, -18 -10, -22 -18 Z" fill="#8cc97a" />
        </g>
      )
    case 'reeds':
      return (
        <g transform={`scale(${s})`} className="qp-sway">
          <path d="M-4 0 V -18 M0 0 V -24 M4 0 V -16" stroke="#5a8f5a" strokeWidth="1.8" strokeLinecap="round" />
          <rect x="-1.6" y="-30" width="3.2" height="8" rx="1.6" fill="#8a6a4a" />
        </g>
      )
    case 'cairn':
      return (
        <g transform={`scale(${s})`}>
          <ellipse cx="0" cy="-4" rx="10" ry="5" fill="#a4ab9c" />
          <ellipse cx="0" cy="-11" rx="7.5" ry="4" fill="#b9bfb2" />
          <ellipse cx="0" cy="-17" rx="5" ry="3" fill="#cfd4c8" />
        </g>
      )
    case 'boulder':
      return <ellipse cx="0" cy="-5" rx={9 * s} ry={6 * s} fill="#a9b3a2" />
    case 'cedar':
      return (
        <g transform={`scale(${s})`} className="qp-sway">
          <rect x="-2.6" y="-14" width="5.2" height="14" fill="#7a5a3e" />
          <path d="M0 -70 L -16 -36 L 16 -36 Z M0 -54 L -20 -18 L 20 -18 Z M0 -38 L -24 -8 L 24 -8 Z" fill="#3f7f5c" />
        </g>
      )
    case 'mist':
      return (
        <g className="qp-mist-puff" transform={`scale(${s})`}>
          <ellipse cx="0" cy="-6" rx="26" ry="9" />
          <ellipse cx="10" cy="-12" rx="14" ry="8" />
        </g>
      )
    case 'alpine':
      return (
        <g transform={`scale(${s})`}>
          <line x1="0" y1="0" x2="0" y2="-7" stroke="#5a9a5f" strokeWidth="1.4" />
          <circle cx="0" cy="-8" r="3" fill={i % 2 ? '#a07cff' : '#ffffff'} />
        </g>
      )
    case 'rock':
      return <path d={`M-12 0 L -6 -12 L 4 -14 L 12 0 Z`} transform={`scale(${s})`} fill="#b3b9bf" />
    case 'snow':
      return <ellipse cx="0" cy="-2" rx={14 * s} ry={4 * s} fill="#ffffff" opacity="0.9" />
    // Small things that move — butterflies, dragonflies, a fish, birds — so the path is lived in.
    case 'butterfly':
      return (
        <g className="qp-critter qp-butterfly" style={{ animationDelay: `${-(i % 7) * 1.3}s` }}>
          <g transform={`scale(${s})`}>
            <path className="qp-wing qp-wing--l" d="M0 -14 C -8 -24, -14 -16, -8 -12 C -14 -8, -8 -2, 0 -10 Z" fill={FLOWER_COLORS[(i + 1) % 4]} />
            <path className="qp-wing qp-wing--r" d="M0 -14 C 8 -24, 14 -16, 8 -12 C 14 -8, 8 -2, 0 -10 Z" fill={FLOWER_COLORS[(i + 1) % 4]} />
            <line x1="0" y1="-16" x2="0" y2="-8" stroke="#3b3f6b" strokeWidth="1.6" strokeLinecap="round" />
          </g>
        </g>
      )
    case 'dragonfly':
      return (
        <g className="qp-critter qp-dragonfly" style={{ animationDelay: `${-(i % 5) * 1.7}s` }}>
          <g transform={`scale(${s})`}>
            <ellipse className="qp-wing" cx="-6" cy="-18" rx="7" ry="2.4" fill="#dff3ff" opacity="0.85" />
            <ellipse className="qp-wing" cx="6" cy="-18" rx="7" ry="2.4" fill="#dff3ff" opacity="0.85" />
            <line x1="0" y1="-22" x2="0" y2="-6" stroke="#2fc4be" strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="0" cy="-23" r="2.2" fill="#179f99" />
          </g>
        </g>
      )
    case 'fish':
      return (
        <g className="qp-critter qp-fish" style={{ animationDelay: `${-(i % 4) * 2.1}s` }}>
          <g transform={`scale(${s})`}>
            <path d="M-8 -4 C -4 -10, 6 -10, 9 -4 C 6 2, -4 2, -8 -4 Z" fill="#ff9f5a" />
            <path d="M-8 -4 L -14 -9 L -13 1 Z" fill="#e0742c" />
            <circle cx="5" cy="-5" r="1" fill="#2a2140" />
          </g>
        </g>
      )
    case 'bird':
      return (
        <g className="qp-critter qp-bird" style={{ animationDelay: `${-(i % 6) * 1.9}s` }}>
          <path d={`M-9 -30 q 4.5 -5 9 0 q 4.5 -5 9 0`} transform={`scale(${s})`} stroke="#5d6b78" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </g>
      )
    default:
      return null
  }
}

/** The landmark for a place, drawn beside the path. */
export function Landmark({ chapter, reached }: { chapter: number; reached: boolean }) {
  const lit = reached ? 'is-reached' : 'is-ahead'
  const body = (() => {
    switch (chapter) {
      case 1:
        return (
          <g>
            <rect x="-30" y="-56" width="6" height="56" rx="2" fill="#9c6536" />
            <rect x="24" y="-56" width="6" height="56" rx="2" fill="#9c6536" />
            <path d="M-36 -54 Q 0 -74 36 -54" stroke="#9c6536" strokeWidth="7" fill="none" strokeLinecap="round" />
            <path d="M-20 -60 Q 0 -66 20 -60" stroke="#58ac6b" strokeWidth="4" fill="none" strokeLinecap="round" />
            <circle cx="-12" cy="-63" r="3" fill="#ff8fb0" />
            <circle cx="10" cy="-64" r="3" fill="#ffcb3d" />
          </g>
        )
      case 10:
        return (
          <g>
            <rect x="-26" y="-18" width="52" height="7" rx="3" fill="#c98e57" />
            <rect x="-26" y="-30" width="52" height="6" rx="3" fill="#c98e57" />
            <path d="M-20 -11 V 0 M20 -11 V 0 M-20 -24 V -18 M20 -24 V -18" stroke="#9c6536" strokeWidth="4" strokeLinecap="round" />
          </g>
        )
      case 2:
        return (
          <g>
            {[-24, 24].map((x) => (
              <g key={x} transform={`translate(${x} 0)`}>
                <rect x="-3" y="-62" width="6" height="62" rx="2" fill="#f4f1ea" />
                <path d="M-3 -48 h3 M0 -34 h3 M-3 -20 h3" stroke="#4a4a4a" strokeWidth="1.6" />
              </g>
            ))}
            <path d="M-24 -60 Q 0 -86 24 -60" stroke="#b5dd84" strokeWidth="12" fill="none" strokeLinecap="round" />
          </g>
        )
      case 3:
        return (
          <g>
            <ellipse cx="0" cy="-6" rx="34" ry="11" fill="#7cc9d6" />
            <ellipse cx="-6" cy="-8" rx="10" ry="3" fill="#ffffff" opacity="0.5" />
            {[-40, -28, 28, 40].map((x, k) => (
              <g key={x} transform={`translate(${x} ${-4 - (k % 2) * 4})`}>
                {[-40, -15, 15, 40].map((a) => (
                  <path key={a} d="M0 0 C -3 -9, -2 -18, 0 -24 C 2 -18, 3 -9, 0 0 Z" fill="#3f9c63" transform={`rotate(${a})`} />
                ))}
              </g>
            ))}
          </g>
        )
      case 4:
        return (
          <g>
            <path d="M-46 -8 Q 0 -40 46 -8" stroke="#c98e57" strokeWidth="9" fill="none" strokeLinecap="round" />
            <path d="M-40 -16 Q 0 -46 40 -16" stroke="#9c6536" strokeWidth="2.4" fill="none" />
            {[-30, -15, 0, 15, 30].map((x) => (
              <line key={x} x1={x} y1={-15 - (30 - Math.abs(x)) * 0.6} x2={x} y2={-25 - (30 - Math.abs(x)) * 0.6} stroke="#9c6536" strokeWidth="2" />
            ))}
          </g>
        )
      case 6:
        return (
          <g>
            <ellipse cx="0" cy="-10" rx="70" ry="20" fill="#7cc0dc" />
            <ellipse cx="-20" cy="-14" rx="20" ry="4" fill="#ffffff" opacity="0.45" />
            <rect x="34" y="-16" width="36" height="6" rx="2" fill="#c98e57" />
            {[-38, -10, 16].map((x, k) => (
              <g key={x} className="qp-float" transform={`translate(${x} ${-14 + (k % 2) * 4})`} style={{ animationDelay: `${-k * 0.8}s` }}>
                <circle className="qp-lantern-glow" cx="0" cy="-6" r="10" />
                <rect x="-4" y="-11" width="8" height="10" rx="3" fill="#ffcb3d" />
              </g>
            ))}
          </g>
        )
      case 7:
        return (
          <g>
            {[-30, 0, 30].map((x, k) => (
              <g key={x} transform={`translate(${x} ${k === 1 ? -6 : 0}) scale(${k === 1 ? 1.25 : 1})`}>
                <rect x="-3" y="-16" width="6" height="16" fill="#7a5a3e" />
                <path d="M0 -84 L -18 -44 L 18 -44 Z M0 -64 L -23 -22 L 23 -22 Z M0 -44 L -27 -10 L 27 -10 Z" fill="#2f6f4f" />
              </g>
            ))}
          </g>
        )
      case 8:
        return (
          <g>
            {[-22, 22].map((x) => (
              <line key={x} x1={x} y1="0" x2={x} y2="-50" stroke="#9c6536" strokeWidth="3" strokeLinecap="round" />
            ))}
            <path d="M-22 -48 Q 0 -38 22 -48" stroke="#8a7a62" strokeWidth="1.2" fill="none" />
            {[-14, -5, 4, 13].map((x, k) => (
              <path key={x} className="qp-ribbon" d={`M${x} ${-44 + Math.abs(x) * 0.15} l3 0 l-1.5 12 Z`} fill={['#ff8fb0', '#52b4ff', '#ffcb3d', '#3fcb91'][k]} style={{ animationDelay: `${-k * 0.4}s` }} />
            ))}
            <g className="qp-mist-puff">
              <ellipse cx="-30" cy="-6" rx="30" ry="9" />
              <ellipse cx="30" cy="-10" rx="26" ry="8" />
            </g>
          </g>
        )
      case 9:
        return (
          <g>
            <ellipse cx="0" cy="-5" rx="18" ry="7" fill="#a4ab9c" />
            <ellipse cx="0" cy="-15" rx="13" ry="6" fill="#b9bfb2" />
            <ellipse cx="0" cy="-24" rx="9" ry="5" fill="#cfd4c8" />
            <line x1="0" y1="-28" x2="0" y2="-64" stroke="#7a5a3e" strokeWidth="2.6" />
            <path d="M0 -64 L 18 -58 L 0 -52 Z" fill="#ff8fb0" />
            <path className="qp-bell" d="M-7 -40 C -7 -50, 7 -50, 7 -40 L 9 -36 L -9 -36 Z" fill="#ffcb3d" />
          </g>
        )
      default:
        return (
          <g>
            <ellipse cx="0" cy="-5" rx="14" ry="6" fill="#a4ab9c" />
            <ellipse cx="0" cy="-13" rx="10" ry="5" fill="#b9bfb2" />
            <ellipse cx="0" cy="-20" rx="6" ry="4" fill="#cfd4c8" />
          </g>
        )
    }
  })()
  return <g className={cn('qp-landmark', lit)}>{body}</g>
}

/**
 * The satchel left on the path after each chapter's third stone, holding a pocket card.
 * `closed` until the stones before it are walked, `ready` (the buckle glints and it
 * hops) once they are, `open` after its card has been read.
 */
export function SatchelArt({ state }: { state: 'closed' | 'ready' | 'open' }) {
  return (
    <svg className={cn('qp-satchel-art', `is-${state}`)} viewBox="0 0 64 60" overflow="visible" aria-hidden="true">
      <ellipse cx="32" cy="57" rx="22" ry="3" fill="rgba(42, 33, 64, 0.16)" />
      <path d="M14 22 C 14 6, 50 6, 50 22" stroke="#7a4d28" strokeWidth="4" fill="none" strokeLinecap="round" />
      <rect x="8" y="20" width="48" height="34" rx="9" fill="#c98e57" />
      <rect x="8" y="44" width="48" height="10" rx="5" fill="#a8703f" />
      {state === 'open' && (
        <g className="qp-satchel-card">
          <rect x="17" y="6" width="30" height="24" rx="4" fill="#fffaf0" stroke="#e3cfb2" strokeWidth="1.5" />
          <path d="M22 14 h20 M22 19 h14" stroke="#e3cfb2" strokeWidth="2" strokeLinecap="round" />
        </g>
      )}
      <g className="qp-satchel-flap">
        <path d={state === 'open' ? 'M8 22 C 8 14, 56 14, 56 22 L 56 18 C 56 6, 8 6, 8 18 Z' : 'M8 26 C 8 18, 56 18, 56 26 L 56 34 C 56 40, 8 40, 8 34 Z'} fill="#b47a45" />
        {state !== 'open' && (
          <g>
            <rect x="27" y="31" width="10" height="9" rx="2.4" fill={state === 'ready' ? '#ffcb3d' : '#c9b48a'} />
            <rect x="30" y="34" width="4" height="3" rx="1" fill="#7a4d28" />
          </g>
        )}
      </g>
      {state === 'ready' && <circle className="qp-satchel-glint" cx="40" cy="30" r="2.4" fill="#ffffff" />}
    </svg>
  )
}

