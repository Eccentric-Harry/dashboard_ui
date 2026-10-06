// The camp's weather and its festivals (camp-calendar.ts decides which).
//   SeasonFall  — autumn leaves, winter snow, spring petals, summer dandelion seeds,
//                 drifting down the sky and vanishing behind the hill.
//   Fireworks   — festival nights: soft candy bursts high in the sky.
//   Balloons    — the birthday: balloons that rise past the lanterns all day.
//   FestivalGround — what a festival puts on the grass: a row of diyas and a rangoli for
//                 Diwali, a cake for the birthday, a little "2027"-style year sign at New Year.
// All of it is decoration: no pointer events, nothing to read, nothing that judges.
// Motion lives in camp-magic.css and stops under reduced motion.

import type { CSSProperties } from 'react'
import type { CampSeasonName } from '@/types/goals'
import type { CampFestival } from '../camp-calendar'

type Particle = { left: number; delay: number; dur: number; size: number; sway: number; hue: number }

/** A stable scatter — the same every render, no randomness to re-roll. */
function scatter(n: number, seed: number): Particle[] {
  return Array.from({ length: n }, (_, i) => {
    const k = (i + 1) * (seed + 7)
    return {
      left: (k * 37) % 100,
      delay: -((k * 1.37) % 14),
      dur: 10 + ((k * 3) % 9),
      size: 0.7 + ((k * 13) % 7) / 10,
      sway: 18 + ((k * 11) % 30),
      hue: k % 3,
    }
  })
}

const COUNTS: Record<CampSeasonName, number> = { autumn: 12, winter: 26, spring: 14, summer: 8 }
const LEAF = ['#e8833a', '#d9572b', '#f2b33d'] as const
const PETAL = ['#ffc4d6', '#ffb0c8', '#ffe1ea'] as const

function SeasonFall({ season }: { season: CampSeasonName }) {
  const flakes = scatter(COUNTS[season], season.length)
  return (
    <div className={`season-fall season-fall--${season}`} aria-hidden="true">
      {flakes.map((p, i) => (
        <span
          key={i}
          className="sf-drop"
          style={{ left: `${p.left}%`, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`, ['--sway' as string]: `${p.sway}px` } as CSSProperties}
        >
          <span className="sf-sway" style={{ animationDuration: `${3 + (i % 3)}s`, animationDelay: `${p.delay / 3}s` }}>
            {season === 'autumn' && (
              <svg className="sf-leaf" viewBox="0 0 20 20" style={{ width: 16 * p.size }}>
                <path d="M10 1 C 16 5, 18 12, 10 19 C 2 12, 4 5, 10 1 Z" fill={LEAF[p.hue]} />
                <path d="M10 3 L 10 18" stroke="rgba(90,40,10,0.35)" strokeWidth="1" />
              </svg>
            )}
            {season === 'spring' && <i className="sf-petal" style={{ width: 9 * p.size, height: 6 * p.size, background: PETAL[p.hue] }} />}
            {season === 'winter' && <i className="sf-flake" style={{ width: 5 * p.size, height: 5 * p.size }} />}
            {season === 'summer' && (
              <svg className="sf-seed" viewBox="0 0 20 24" style={{ width: 14 * p.size }}>
                <path d="M10 12 L 10 23" stroke="#fffaf0" strokeWidth="1" />
                {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
                  <path key={a} d="M10 12 L 10 3" stroke="#fffaf0" strokeWidth="0.9" transform={`rotate(${a} 10 12)`} opacity="0.85" />
                ))}
              </svg>
            )}
          </span>
        </span>
      ))}
    </div>
  )
}

const BURSTS = [
  { x: 18, y: 18, c: '#ff8fb1', d: 0 },
  { x: 72, y: 12, c: '#ffd84d', d: 1.3 },
  { x: 44, y: 26, c: '#8fd3ff', d: 2.4 },
  { x: 86, y: 30, c: '#c3a6ff', d: 3.6 },
  { x: 30, y: 8, c: '#7ee0b0', d: 4.7 },
  { x: 60, y: 34, c: '#ffb070', d: 5.6 },
] as const

function Fireworks() {
  return (
    <div className="fireworks" aria-hidden="true">
      {BURSTS.map((b, i) => (
        <span key={i} className="fw-burst" style={{ left: `${b.x}%`, top: `${b.y}%`, animationDelay: `${b.d}s`, ['--fw' as string]: b.c } as CSSProperties}>
          {Array.from({ length: 12 }, (_, r) => (
            <i key={r} style={{ transform: `rotate(${r * 30}deg)` }} />
          ))}
        </span>
      ))}
    </div>
  )
}

const BALLOONS = [
  { x: 8, c: '#ff6f95', d: 0, s: 1 },
  { x: 23, c: '#ffcb3d', d: 3.2, s: 0.85 },
  { x: 41, c: '#52b4ff', d: 6.1, s: 1.1 },
  { x: 57, c: '#a07cff', d: 1.6, s: 0.9 },
  { x: 76, c: '#3fcb91', d: 4.4, s: 1 },
  { x: 91, c: '#ff9f5a', d: 7.4, s: 0.8 },
] as const

function Balloons() {
  return (
    <div className="balloons" aria-hidden="true">
      {BALLOONS.map((b, i) => (
        <svg key={i} className="balloon" viewBox="0 0 30 60" style={{ left: `${b.x}%`, animationDelay: `${-b.d}s`, width: 30 * b.s }}>
          <path d="M15 34 C 13 42, 18 48, 14 58" stroke="rgba(255,255,255,0.7)" strokeWidth="1" fill="none" />
          <path d="M15 2 C 26 2, 29 14, 26 22 C 23 30, 18 33, 15 34 C 12 33, 7 30, 4 22 C 1 14, 4 2, 15 2 Z" fill={b.c} />
          <path d="M13 34 L 17 34 L 15 37 Z" fill={b.c} />
          <ellipse cx="10" cy="11" rx="3" ry="5" fill="#ffffff" opacity="0.4" transform="rotate(-20 10 11)" />
        </svg>
      ))}
    </div>
  )
}

/** The sky's part of a festival: fireworks after dark, balloons for the birthday. */
function FestivalSky({ festival, night }: { festival: CampFestival; night: boolean }) {
  return (
    <>
      {festival === 'birthday' && <Balloons />}
      {night && <Fireworks />}
    </>
  )
}

function Diya({ i }: { i: number }) {
  return (
    <svg className="diya" viewBox="0 0 32 32" style={{ animationDelay: `${-(i * 0.37) % 2}s` }}>
      <ellipse className="diya-glow" cx="16" cy="14" rx="12" ry="12" />
      <path className="diya-flame" d="M16 4 C 20 9, 20 13, 16 16 C 12 13, 12 9, 16 4 Z" />
      <path d="M3 18 C 6 27, 26 27, 29 18 C 22 20, 10 20, 3 18 Z" fill="#c8643a" />
      <path d="M3 18 C 10 20, 22 20, 29 18 C 26 16, 6 16, 3 18 Z" fill="#9e4422" />
      <path d="M8 22 q2 2 4 0 q2 2 4 0 q2 2 4 0 q2 2 4 0" stroke="#ffcb3d" strokeWidth="1" fill="none" />
    </svg>
  )
}

/** A rangoli: concentric candy petals, seen a little from above. */
function Rangoli() {
  const ring = (n: number, r: number, rx: number, ry: number, fill: string, rot = 0) =>
    Array.from({ length: n }, (_, i) => (
      <ellipse key={`${r}-${i}`} cx="0" cy={-r} rx={rx} ry={ry} fill={fill} transform={`rotate(${rot + (i * 360) / n})`} />
    ))
  return (
    <svg className="rangoli" viewBox="-60 -60 120 120" aria-hidden="true">
      <circle r="56" fill="#ffffff" opacity="0.18" />
      {ring(16, 44, 6, 11, '#ff6f95')}
      {ring(16, 44, 3, 6, '#ffd84d', 11.25)}
      {ring(12, 30, 6, 10, '#52b4ff')}
      {ring(8, 16, 6, 10, '#ffcb3d', 22.5)}
      <circle r="9" fill="#a07cff" />
      <circle r="4" fill="#fff6d6" />
      {ring(24, 54, 1.6, 1.6, '#ffffff')}
    </svg>
  )
}

function Cake() {
  return (
    <svg className="bday-cake" viewBox="0 0 80 70" aria-hidden="true">
      <ellipse cx="40" cy="66" rx="32" ry="4" fill="rgba(0,0,0,0.12)" />
      <rect x="12" y="40" width="56" height="24" rx="6" fill="#ffd6e2" />
      <path d="M12 46 C 18 52, 24 44, 30 50 C 36 56, 42 44, 48 50 C 54 56, 60 44, 68 48 L 68 44 C 68 41, 66 40, 62 40 L 18 40 C 14 40, 12 41, 12 44 Z" fill="#fffaf0" />
      <rect x="20" y="22" width="40" height="20" rx="5" fill="#ff8fb1" />
      <path d="M20 28 C 26 32, 30 26, 36 30 C 42 34, 46 26, 52 30 C 56 32, 60 28, 60 28 L 60 26 C 60 24, 58 22, 56 22 L 24 22 C 22 22, 20 24, 20 26 Z" fill="#fffaf0" />
      {[30, 40, 50].map((x) => (
        <g key={x}>
          <rect x={x - 1.6} y="10" width="3.2" height="12" rx="1.2" fill={x === 40 ? '#52b4ff' : '#ffcb3d'} />
          <path className="bday-flame" d={`M${x} 2 C ${x + 3} 5, ${x + 3} 8, ${x} 10 C ${x - 3} 8, ${x - 3} 5, ${x} 2 Z`} fill="#ff9f5a" />
        </g>
      ))}
      <circle cx="26" cy="54" r="1.6" fill="#52b4ff" />
      <circle cx="40" cy="57" r="1.6" fill="#3fcb91" />
      <circle cx="54" cy="54" r="1.6" fill="#ffcb3d" />
    </svg>
  )
}

/** What a festival puts on the ground. */
function FestivalGround({ festival, year }: { festival: CampFestival; year: number }) {
  if (festival === 'diwali') {
    return (
      <div className="festival-ground festival-ground--diwali" aria-hidden="true">
        <div className="diya-row">
          {Array.from({ length: 13 }, (_, i) => (
            <Diya key={i} i={i} />
          ))}
        </div>
        <Rangoli />
      </div>
    )
  }
  if (festival === 'birthday') {
    return (
      <div className="festival-ground festival-ground--birthday" aria-hidden="true">
        <Cake />
      </div>
    )
  }
  return (
    <div className="festival-ground festival-ground--new-year" aria-hidden="true">
      <span className="ny-sign">
        <b>{festival === 'new-year-eve' ? year + 1 : year}</b>
        <small>{festival === 'new-year-eve' ? 'almost here' : 'happy new year'}</small>
      </span>
    </div>
  )
}

export { Balloons, FestivalGround, FestivalSky, Fireworks, SeasonFall }
