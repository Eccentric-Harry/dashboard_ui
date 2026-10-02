import { useState } from 'react'
import type { CampSeason, CampSeasonWeek } from '@/types/goals'
import { cn } from '@/lib/utils'
import { isoWeek, weekRangeLabel } from '../goal-format'
import { Moss } from './camp-characters'
import { Pip } from './pip'
import type { PipMood } from '../buddy-brain'
import type { PipStage } from '../pip-growth'

type SeasonMapProps = {
  season: CampSeason
  vertical: boolean
  pip: { mood: PipMood; stage: PipStage; wear?: { hat?: string | null; neck?: string | null; face?: string | null } }
}

const SEASON_TITLE: Record<CampSeason['name'], string> = {
  winter: 'Winter',
  spring: 'Spring',
  summer: 'Summer',
  autumn: 'Autumn',
}

const MOSS_LINES = [
  'Slow is still forward. Look how far the path has come.',
  'Every week leaves a mark. The quiet ones are rest stops — every good trail has them.',
  'I’ve mapped a great many trails. This one’s a good one.',
  'Don’t mind the fog ahead. We’ll draw it in when we get there.',
]

type Mark = 'landmark' | 'small' | 'rest' | 'before' | 'now' | 'ahead'
const LANDMARKS = ['oak', 'windmill', 'lighthouse', 'balloon', 'peak', 'cottage'] as const

function markOf(w: CampSeasonWeek): Mark {
  if (w.future) return 'ahead'
  if (w.goals > 0 && w.kept >= w.goals) return 'landmark'
  if (w.current) return 'now'
  if (w.goals === 0) return 'before'
  if (w.kept > 0) return 'small'
  return 'rest'
}

function Landmark({ kind }: { kind: (typeof LANDMARKS)[number] }) {
  switch (kind) {
    case 'oak':
      return (
        <g className="sm-art">
          <rect x="-4" y="-22" width="8" height="22" rx="3" fill="#9c6536" />
          <circle cx="0" cy="-34" r="16" fill="#58ac6b" />
          <circle cx="-11" cy="-26" r="10" fill="#7fcf8f" />
          <circle cx="11" cy="-27" r="11" fill="#3f8a52" />
          <circle cx="5" cy="-38" r="3" fill="#ff6f95" />
        </g>
      )
    case 'windmill':
      return (
        <g className="sm-art">
          <path d="M-10 0 L-6 -34 L6 -34 L10 0 Z" fill="#fffaf0" stroke="#c98e57" strokeWidth="2" />
          <path d="M-7 -34 L0 -42 L7 -34 Z" fill="#ff6f95" />
          <rect x="-3" y="-12" width="6" height="12" rx="2" fill="#9c6536" />
          <g className="sm-blades" transform="translate(0 -34)">
            {[0, 90, 180, 270].map((a) => (
              <path key={a} d="M0 0 L3 -22 L-3 -22 Z" fill="#c98e57" transform={`rotate(${a})`} />
            ))}
            <circle r="3" fill="#6e4a33" />
          </g>
        </g>
      )
    case 'lighthouse':
      return (
        <g className="sm-art">
          <circle className="sm-glow" cx="0" cy="-40" r="14" fill="#ffd34d" opacity="0.35" />
          <path d="M-8 0 L-5 -34 L5 -34 L8 0 Z" fill="#fffaf0" stroke="#de4772" strokeWidth="1.6" />
          <path d="M-7.2 -10 L7.2 -10 L6.3 -18 L-6.3 -18 Z M-5.6 -26 L5.6 -26 L5.2 -32 L-5.2 -32 Z" fill="#ff6f95" />
          <rect x="-6" y="-42" width="12" height="8" rx="2" fill="#ffcb3d" />
          <path d="M-8 -42 L0 -49 L8 -42 Z" fill="#de4772" />
        </g>
      )
    case 'balloon':
      return (
        <g className="sm-art sm-float">
          <path d="M-14 -40 C -14 -58, 14 -58, 14 -40 C 14 -30, 4 -24, 3 -20 L -3 -20 C -4 -24, -14 -30, -14 -40 Z" fill="#ffcb3d" />
          <path d="M-5 -55 C -9 -46, -6 -28, -3 -20 L 3 -20 C 6 -28, 9 -46, 5 -55 C 3 -56, -3 -56, -5 -55 Z" fill="#ff6f95" />
          <path d="M-3 -20 L -4 -12 M 3 -20 L 4 -12" stroke="#9c6536" strokeWidth="1.4" />
          <rect x="-5" y="-12" width="10" height="7" rx="2" fill="#c98e57" />
        </g>
      )
    case 'peak':
      return (
        <g className="sm-art">
          <path d="M-22 0 L0 -40 L22 0 Z" fill="#a29ab3" />
          <path d="M-8 -26 L0 -40 L8 -26 L4 -22 L0 -26 L-4 -22 Z" fill="#ffffff" />
          <path d="M14 0 L24 -20 L34 0 Z" fill="#c3bad9" />
          <line x1="0" y1="-40" x2="0" y2="-52" stroke="#6e4a33" strokeWidth="1.8" />
          <path d="M0 -52 L 10 -48 L 0 -44 Z" fill="#ff6f95" />
        </g>
      )
    case 'cottage':
      return (
        <g className="sm-art">
          <rect x="-14" y="-18" width="28" height="18" rx="2" fill="#fffaf0" stroke="#c98e57" strokeWidth="1.6" />
          <path d="M-18 -17 L0 -32 L18 -17 Z" fill="#e0674a" />
          <rect x="-4" y="-10" width="8" height="10" rx="1.5" fill="#9c6536" />
          <rect x="6" y="-14" width="6" height="5" rx="1" fill="#ffd34d" />
          <rect x="8" y="-34" width="5" height="9" fill="#9c6536" />
          <circle className="sm-smoke" cx="11" cy="-40" r="3" fill="#ffffff" opacity="0.7" />
        </g>
      )
  }
}

function SmallMark({ seed }: { seed: number }) {
  return seed % 2 === 0 ? (
    <g className="sm-art">
      <circle cx="-6" cy="-8" r="8" fill="#7fcf8f" />
      <circle cx="6" cy="-9" r="9" fill="#58ac6b" />
      <circle cx="1" cy="-14" r="2.4" fill="#ffcb3d" />
    </g>
  ) : (
    <g className="sm-art">
      {[-8, 0, 8].map((x, i) => (
        <g key={x} transform={`translate(${x} ${-6 - (i % 2) * 4})`}>
          <line x1="0" y1="0" x2="0" y2="8" stroke="#3f8a52" strokeWidth="1.6" />
          <circle cx="0" cy="-1" r="3.6" fill={['#ff6f95', '#a07cff', '#52b4ff'][i]} />
          <circle cx="0" cy="-1" r="1.4" fill="#fff6d6" />
        </g>
      ))}
    </g>
  )
}

function RestStop() {
  return (
    <g className="sm-art">
      <path d="M-12 0 L0 -18 L12 0 Z" fill="#ff8f6b" />
      <path d="M0 -18 L-3 0 L3 0 Z" fill="#e0674a" />
      <text x="10" y="-18" fontSize="9" fontWeight="800" fill="#7a6f8c" fontFamily="'Sour Gummy', Nunito, sans-serif">
        z
      </text>
    </g>
  )
}

/** Catmull-Rom through the waypoints, as cubic Béziers. */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return ''
  let d = `M${pts[0].x} ${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 }
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 }
    d += ` C${c1.x.toFixed(1)} ${c1.y.toFixed(1)}, ${c2.x.toFixed(1)} ${c2.y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
  }
  return d
}

const shortDay = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

/**
 * Moss's map of the season. One waypoint per week on a winding trail: a week where every
 * goal was kept grows a landmark, a week with some kept grows a bush or flowers, a quiet
 * week is a rest stop (every good trail has them), and the weeks ahead are fog. Pip stands
 * on this week. Nothing on the map is ever crossed out.
 */
function SeasonMap({ season, vertical, pip }: SeasonMapProps) {
  const [picked, setPicked] = useState<string | null>(null)
  const weeks = season.weeks
  const n = weeks.length
  const W = vertical ? 340 : 1000
  const H = vertical ? 70 + n * 78 : 360
  const pts = weeks.map((_, i) =>
    vertical
      ? { x: W / 2 + 92 * Math.sin(i * 0.95 + 0.4), y: 54 + i * 78 }
      : { x: 64 + (i * (W - 128)) / Math.max(1, n - 1), y: 200 + 82 * Math.sin(i * 0.95 + 0.4) },
  )
  const nowIndex = weeks.findIndex((w) => w.current)
  const split = nowIndex >= 0 ? nowIndex : weeks.filter((w) => !w.future).length - 1
  const pastPath = smoothPath(pts.slice(0, Math.max(1, split + 1)))
  const futurePath = smoothPath(pts.slice(Math.max(0, split)))
  const landmarks = weeks.filter((w) => markOf(w) === 'landmark').length
  const sofar = weeks.filter((w) => !w.future).length
  const line = MOSS_LINES[(isoWeek(weeks[Math.max(0, split)]?.weekStart ?? season.start) + season.key.length) % MOSS_LINES.length]
  const pickedWeek = weeks.find((w) => w.weekStart === picked)

  return (
    <section className={cn('sm', vertical && 'sm--vertical')} aria-labelledby="sm-title">
      <header className="sm-head">
        <div>
          <h2 id="sm-title" className="bk-title">
            {SEASON_TITLE[season.name]} {season.key.slice(-4)}
          </h2>
          <p className="sm-sub">
            Week {sofar} of {n} · {landmarks} {landmarks === 1 ? 'landmark' : 'landmarks'} so far
          </p>
        </div>
        <div className="sm-moss">
          <Moss className="sm-moss-face" talking />
          <p>
            <span className="sm-moss-name">Moss, cartographer</span>“{line}”
          </p>
        </div>
      </header>

      <div className="sm-paper">
        <svg className="sm-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Map of ${SEASON_TITLE[season.name]}: ${landmarks} landmarks across ${sofar} weeks so far`}>
          {/* A few hand-drawn hills and a river for the paper to feel like a place. */}
          {!vertical && (
            <g className="sm-terrain">
              <path d="M0 330 C 120 300, 200 320, 300 300 S 520 290, 620 312 S 860 300, 1000 318" />
              <path className="sm-river" d="M420 360 C 440 320, 400 280, 430 240 S 470 170, 450 120 S 470 40, 500 0" />
              <path d="M120 96 l18 -28 l18 28 M150 96 l12 -18 l12 18 M820 70 l20 -30 l20 30" />
              {[
                [260, 70],
                [300, 92],
                [640, 60],
                [700, 330],
                [90, 330],
                [560, 344],
              ].map(([x, y]) => (
                <g key={`${x}-${y}`} className="sm-tree" transform={`translate(${x} ${y})`}>
                  <path d="M0 0 l-7 0 l7 -16 l7 16 Z" />
                  <line x1="0" y1="0" x2="0" y2="5" />
                </g>
              ))}
              <g className="sm-compass" transform="translate(940 300)">
                <circle r="22" />
                <path d="M0 -18 L5 0 L0 18 L-5 0 Z" />
                <path className="sm-compass-n" d="M0 -18 L5 0 L-5 0 Z" />
                <text y="-26" textAnchor="middle">N</text>
              </g>
            </g>
          )}
          <path className="sm-trail sm-trail--past" d={pastPath} />
          <path className="sm-trail sm-trail--ahead" d={futurePath} />

          {weeks.map((w, i) => {
            const { x, y } = pts[i]
            const mark = markOf(w)
            return (
              <g
                key={w.weekStart}
                className={cn('sm-stop', `sm-stop--${mark}`, picked === w.weekStart && 'is-picked')}
                transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}
                style={{ ['--i' as string]: i }}
                onClick={() => setPicked((p) => (p === w.weekStart ? null : w.weekStart))}
              >
                <title>
                  {`Week of ${weekRangeLabel(w.weekStart)}: ${
                    w.future ? 'still ahead' : w.goals === 0 ? 'before camp' : `${w.kept} of ${w.goals} kept`
                  }`}
                </title>
                <circle className="sm-dot" r={mark === 'ahead' ? 4 : 6} />
                <g transform={`translate(0 -8) scale(${vertical ? 1.1 : 1.45})`}>
                  {mark === 'landmark' && <Landmark kind={LANDMARKS[isoWeek(w.weekStart) % LANDMARKS.length]} />}
                  {mark === 'small' && <SmallMark seed={isoWeek(w.weekStart)} />}
                  {mark === 'rest' && <RestStop />}
                  {mark === 'before' && <ellipse className="sm-stone" cx="0" cy="-3" rx="7" ry="4.5" />}
                  {mark === 'ahead' && (
                    <g className="sm-fog">
                      <ellipse cx="-9" cy="-4" rx="13" ry="8" />
                      <ellipse cx="6" cy="-9" rx="12" ry="9" />
                      <ellipse cx="12" cy="-2" rx="9" ry="6" />
                    </g>
                  )}
                </g>
                {w.current && (
                  <g className="sm-pip">
                    <Pip mood={pip.mood} size={50} x={-25} y={-92} stage={pip.stage} wear={pip.wear} />
                  </g>
                )}
                <text className="sm-label" y={vertical ? 4 : 22} x={vertical ? 16 : 0} textAnchor={vertical ? 'start' : 'middle'}>
                  {w.current ? 'Now' : shortDay(w.weekStart)}
                </text>
              </g>
            )
          })}
        </svg>
        {pickedWeek && (
          <p className="sm-note" aria-live="polite">
            <strong>{weekRangeLabel(pickedWeek.weekStart)}</strong>{' '}
            {pickedWeek.future
              ? 'is still ahead — fog for now.'
              : pickedWeek.goals === 0
                ? 'was before the camp began.'
                : pickedWeek.kept >= pickedWeek.goals
                  ? `— every goal kept (${pickedWeek.kept} of ${pickedWeek.goals}). A landmark!`
                  : pickedWeek.kept > 0
                    ? `— ${pickedWeek.kept} of ${pickedWeek.goals} kept.`
                    : pickedWeek.current
                      ? '— still going. Plenty of week left.'
                      : '— a rest stop. Those count as part of the trail too.'}
          </p>
        )}
      </div>

      <ul className="sm-legend">
        <li>
          <i className="sm-key sm-key--landmark" /> every goal kept
        </li>
        <li>
          <i className="sm-key sm-key--small" /> some kept
        </li>
        <li>
          <i className="sm-key sm-key--rest" /> a rest stop
        </li>
        <li>
          <i className="sm-key sm-key--ahead" /> still ahead
        </li>
      </ul>
    </section>
  )
}

export { SeasonMap }
