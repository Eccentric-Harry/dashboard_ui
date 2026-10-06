// Hoot, the camp's night keeper — a small owl on a branch at the left edge of the sky,
// and the fireflies over the meadow. Both are drawn from this week's real check-ins:
//   · every day a goal was hit is one star in Hoot's chart, joined in the order they
//     were lit, so the week becomes a constellation with a name;
//   · after golden hour, that many fireflies drift over the grass.
// Nothing here judges: an empty sky is "not lit yet", never "missed". Hoot naps by day
// (the chart still opens) and is awake at golden hour and night.

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Sunrise } from 'lucide-react'
import type { CampFirstLight, GoalProgressView } from '@/types/goals'
import { cn } from '@/lib/utils'
import { addDays } from '../goal-format'
import { goalColor } from '../goal-palette'
import type { SkyPhase } from '../sky-phase'
import { GoalIcon } from './goal-icon'

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const

/** Hoot names each week's shape; the week decides which, so a name never changes mid-week. */
const NAMES = [
  'The Little Lantern', 'The Paper Boat', 'The Sleepy Fox', 'The Kettle', 'The Long Walk',
  'The Sprout', 'The Open Door', 'The Kite', 'The Teacup', 'The Quiet Bell', 'The Acorn', 'The Ladder',
] as const

type Star = { goal: number; day: number; title: string }

const hash = (s: string) => [...s].reduce((h, c) => (Math.imul(31, h) + c.charCodeAt(0)) | 0, 0)

/** Every hit day this week, in the order it was lit (day, then goal). */
function weekStars(goals: GoalProgressView[]): Star[] {
  const stars: Star[] = []
  goals.forEach((view, g) =>
    view.week.days.forEach((cell, d) => {
      if (cell.hit && !cell.beforeStart) stars.push({ goal: g, day: d, title: view.goal.title })
    }),
  )
  return stars.sort((a, b) => a.day - b.day || a.goal - b.goal)
}

function hootLine(stars: Star[], todayIdx: number, awake: boolean): string {
  if (stars.length === 0) return awake ? 'The sky’s still dark this week. Your first check-in lights the first star.' : 'Hoo… oh, hello. No stars yet this week — plenty of nights left.'
  const perDay = DAYS.map((_, d) => stars.filter((s) => s.day === d).length)
  const brightest = perDay.indexOf(Math.max(...perDay))
  const tonight = perDay[todayIdx] ?? 0
  if (tonight > 0 && brightest === todayIdx) return `Tonight’s the brightest night of the week — ${tonight} ${tonight === 1 ? 'star' : 'stars'}. I’ll keep watch.`
  if (tonight > 0) return `${tonight} new ${tonight === 1 ? 'star' : 'stars'} tonight. ${DAY_NAMES[brightest]} still shines brightest.`
  return `${stars.length} ${stars.length === 1 ? 'star' : 'stars'} so far. ${DAY_NAMES[brightest]} shines brightest.`
}

/** Hoot, the night owl. All crescents and ovals — the moon's shape language. */
function Hoot({ awake, talking }: { awake: boolean; talking: boolean }) {
  return (
    <svg className={cn('hoot', awake ? 'is-awake' : 'is-asleep', talking && 'is-talking')} viewBox="0 0 120 110" aria-hidden="true">
      {/* The branch, reaching in from the edge of the world */}
      <path d="M-6 92 C 30 86, 70 90, 118 82" stroke="#6b4a3a" strokeWidth="7" strokeLinecap="round" fill="none" />
      <path d="M84 86 C 92 76, 100 74, 108 76" stroke="#6b4a3a" strokeWidth="3.4" strokeLinecap="round" fill="none" />
      <ellipse cx="110" cy="74" rx="7" ry="4" fill="#7fc28a" transform="rotate(-24 110 74)" />
      <ellipse cx="18" cy="84" rx="6" ry="3.4" fill="#7fc28a" transform="rotate(18 18 84)" />
      <g className="hoot-rig">
        {/* Body */}
        <ellipse cx="56" cy="58" rx="26" ry="30" fill="#8a7ad6" />
        <ellipse cx="56" cy="66" rx="17" ry="19" fill="#d9d0ff" />
        <path d="M48 62 q3 3 6 0 M58 62 q3 3 6 0 M53 70 q3 3 6 0 M47 76 q3 3 6 0 M59 76 q3 3 6 0" stroke="#a99be8" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        {/* Wings */}
        <path className="hoot-wing hoot-wing--l" d="M31 50 C 22 60, 24 78, 34 84 C 36 70, 36 60, 31 50 Z" fill="#6c5cc0" />
        <path className="hoot-wing hoot-wing--r" d="M81 50 C 90 60, 88 78, 78 84 C 76 70, 76 60, 81 50 Z" fill="#6c5cc0" />
        {/* Ear tufts */}
        <path d="M36 34 L 32 18 L 46 30 Z M76 34 L 80 18 L 66 30 Z" fill="#6c5cc0" />
        {/* Night cap */}
        <path d="M34 34 C 40 14, 72 10, 84 26 C 92 34, 98 22, 100 30 C 92 38, 80 34, 78 32 Z" fill="#5b5fd6" />
        <rect x="32" y="30" width="48" height="7" rx="3.5" fill="#fff3e0" />
        <path className="hoot-pom" transform="translate(100 30)" d="M0 -6 L1.8 -2 6 -1.8 2.7 1 3.7 5.2 0 3 -3.7 5.2 -2.7 1 -6 -1.8 -1.8 -2 Z" fill="#ffcb3d" />
        {/* Face discs */}
        <circle cx="45" cy="48" r="11" fill="#f6f1ff" />
        <circle cx="67" cy="48" r="11" fill="#f6f1ff" />
        <g className="hoot-eyes-open">
          <circle cx="45" cy="48" r="6.4" fill="#2a2140" />
          <circle cx="67" cy="48" r="6.4" fill="#2a2140" />
          <circle cx="47" cy="45.6" r="2.2" fill="#ffffff" />
          <circle cx="69" cy="45.6" r="2.2" fill="#ffffff" />
          <circle cx="43" cy="50" r="1" fill="#ffffff" opacity="0.7" />
          <circle cx="65" cy="50" r="1" fill="#ffffff" opacity="0.7" />
        </g>
        <g className="hoot-eyes-shut">
          <path d="M39 49 q6 5 12 0 M61 49 q6 5 12 0" stroke="#2a2140" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        </g>
        <ellipse cx="38" cy="58" rx="4" ry="2.4" fill="#ff8fa8" opacity="0.55" />
        <ellipse cx="74" cy="58" rx="4" ry="2.4" fill="#ff8fa8" opacity="0.55" />
        <path className="hoot-beak" d="M52 55 L 56 63 L 60 55 Z" fill="#ffb347" />
        {/* Toes */}
        <path d="M46 87 v5 M50 87 v5 M62 87 v5 M66 87 v5" stroke="#ffb347" strokeWidth="2.6" strokeLinecap="round" />
      </g>
      <g className="hoot-z">
        <text x="88" y="16">z</text>
        <text x="98" y="6">z</text>
      </g>
    </svg>
  )
}

/** The week as a star chart: goals are rows, Monday → Sunday are columns. */
function StarChart({ goals, stars, todayIdx }: { goals: GoalProgressView[]; stars: Star[]; todayIdx: number }) {
  const rows = Math.max(goals.length, 1)
  const W = 280
  const H = Math.max(70, rows * 30 + 26)
  const x = (d: number) => 20 + d * ((W - 40) / 6)
  const y = (g: number) => 18 + (rows === 1 ? (H - 40) / 2 : g * ((H - 40) / (rows - 1)))
  const path = stars.map((s, i) => `${i ? 'L' : 'M'}${x(s.day)} ${y(s.goal)}`).join(' ')
  return (
    <svg className="hoot-chart-sky" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${stars.length} stars this week`}>
      {DAYS.map((_, d) => (
        <rect key={d} className={cn('hoot-col', d === todayIdx && 'is-today')} x={x(d) - 14} y={4} width={28} height={H - 26} rx={14} />
      ))}
      {goals.map((_, g) => DAYS.map((__, d) => <circle key={`${g}-${d}`} className="hoot-dust" cx={x(d)} cy={y(g)} r={1.4} />))}
      {stars.length > 1 && <path className="hoot-line" d={path} pathLength={1} />}
      {stars.map((s, i) => (
        <g key={`${s.goal}-${s.day}`} className="hoot-star" style={{ animationDelay: `${0.25 + i * 0.12}s` }} transform={`translate(${x(s.day)} ${y(s.goal)})`}>
          <title>{`${DAY_NAMES[s.day]} · ${s.title}`}</title>
          <circle r="7" className="hoot-star-halo" />
          <path d="M0 -6 L1.8 -1.8 6 -1.6 2.7 1.2 3.7 5.4 0 3.2 -3.7 5.4 -2.7 1.2 -6 -1.6 -1.8 -1.8 Z" />
        </g>
      ))}
      {DAYS.map((d, i) => (
        <text key={i} className={cn('hoot-day', i === todayIdx && 'is-today')} x={x(i)} y={H - 6}>
          {d}
        </text>
      ))}
    </svg>
  )
}

/** Fireflies over the meadow after golden hour — one per star this week, at most 14. */
function Fireflies({ count }: { count: number }) {
  const flies = useMemo(
    () =>
      Array.from({ length: Math.min(count, 14) }, (_, i) => ({
        left: 8 + ((i * 37) % 84),
        top: 58 + ((i * 23) % 26),
        delay: (i * 0.73) % 5,
        dur: 7 + (i % 4) * 1.6,
      })),
    [count],
  )
  return (
    <div className="fireflies" aria-hidden="true">
      {flies.map((f, i) => (
        <span key={i} className="firefly" style={{ left: `${f.left}%`, top: `${f.top}%`, animationDelay: `${f.delay}s`, animationDuration: `${f.dur}s` }} />
      ))}
    </div>
  )
}

type FirstLightPlanProps = {
  goals: GoalProgressView[]
  today: string
  evening: boolean
  pick: CampFirstLight | null
  onPick: (goalId: string | null, date: string) => Promise<void>
}

/**
 * Hoot's first light: in the evening, choose the lantern to light first tomorrow; in the
 * morning (before anything's lit), choose today's. It's a plan, never a promise — the
 * star just marks the lantern, and Pip suggests it first. Tap the chosen one to unpick.
 */
function FirstLightPlan({ goals, today, evening, pick, onPick }: FirstLightPlanProps) {
  const [busy, setBusy] = useState<string | null>(null)
  const date = evening ? addDays(today, 1) : today
  const chosen = pick?.date === date ? pick.goalId : null
  const chosenView = goals.find((g) => g.goal.id === chosen)
  const anyLitToday = goals.some((g) => g.today.hit)

  if (goals.length === 0) return null
  if (!evening && chosenView) {
    return (
      <div className="hoot-first">
        <p className="hoot-first-head">
          <Sunrise size={13} strokeWidth={2.6} aria-hidden="true" /> Today’s first light
        </p>
        <p className="hoot-first-status">
          {chosenView.today.hit ? (
            <>
              <Check size={13} strokeWidth={3} aria-hidden="true" /> {chosenView.goal.title} — lit, just as planned.
            </>
          ) : (
            <>{chosenView.goal.title} has the star. Whenever you’re ready.</>
          )}
        </p>
      </div>
    )
  }
  if (!evening && anyLitToday) return null

  const choose = async (id: string) => {
    setBusy(id)
    try {
      await onPick(chosen === id ? null : id, date)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="hoot-first">
      <p className="hoot-first-head">
        <Sunrise size={13} strokeWidth={2.6} aria-hidden="true" /> {evening ? 'Tomorrow’s first light' : 'This morning’s first light'}
      </p>
      <div className="hoot-first-chips" role="radiogroup" aria-label={evening ? 'The lantern to light first tomorrow' : 'The lantern to light first today'}>
        {goals.map((view) => (
          <button
            key={view.goal.id}
            type="button"
            role="radio"
            aria-checked={chosen === view.goal.id}
            data-color={goalColor(view.goal)}
            data-sound={chosen === view.goal.id ? 'tap' : 'sparkle'}
            className={cn('hoot-chip', chosen === view.goal.id && 'is-chosen')}
            disabled={busy != null}
            onClick={() => void choose(view.goal.id)}
          >
            <GoalIcon icon={view.goal.icon} size={12} strokeWidth={2.6} aria-hidden="true" />
            {view.goal.title}
          </button>
        ))}
      </div>
      <p className="hoot-first-note">
        {chosenView
          ? `Noted. I’ll hang a star on ${chosenView.goal.title} ${evening ? 'at dawn' : 'now'}.`
          : 'Pick one and I’ll hang a star on it. Deciding the night before makes mornings easier.'}
      </p>
    </div>
  )
}

type NightKeeperProps = {
  phase: SkyPhase
  goals: GoalProgressView[]
  weekStart: string
  today: string
  hidden?: boolean
  firstLight: CampFirstLight | null
  onPickFirstLight: (goalId: string | null, date: string) => Promise<void>
}

function NightKeeper({ phase, goals, weekStart, today, hidden, firstLight, onPickFirstLight }: NightKeeperProps) {
  const [opened, setOpen] = useState(false)
  // A sheet opening over the camp closes the chart with it.
  const open = opened && !hidden
  const rootRef = useRef<HTMLDivElement>(null)
  const awake = phase === 'night' || phase === 'golden' || open
  const stars = useMemo(() => weekStars(goals), [goals])
  const todayIdx = Math.max(0, Math.min(6, Math.round((Date.parse(today) - Date.parse(weekStart)) / 86_400_000)))
  const name = NAMES[Math.abs(hash(weekStart)) % NAMES.length]

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <>
      {(phase === 'night' || phase === 'golden') && <Fireflies count={stars.length} />}
      <div ref={rootRef} className={cn('night-keeper', open && 'is-open')}>
        <button
          type="button"
          className="hoot-btn"
          data-sound={open ? 'close' : 'open'}
          aria-expanded={open}
          aria-label={`Hoot the night owl — this week's star chart (${stars.length} stars) and tomorrow's first light`}
          onClick={() => setOpen((o) => !o)}
        >
          <Hoot awake={awake} talking={open} />
          {stars.length > 0 && !open && <span className="hoot-count">{stars.length}</span>}
        </button>
        {open && (
          <section className="hoot-chart" aria-label="Hoot's star chart">
            <header>
              <span className="hoot-chart-kicker">Hoot’s star chart · this week</span>
              <h3>{stars.length >= 3 ? name : stars.length ? 'A constellation, forming' : 'A clear, dark sky'}</h3>
            </header>
            <StarChart goals={goals} stars={stars} todayIdx={todayIdx} />
            {goals.length > 1 && (
              <ul className="hoot-legend">
                {goals.map((view, g) => (
                  <li key={view.goal.id}>
                    <b>{stars.filter((s) => s.goal === g).length}</b> {view.goal.title}
                  </li>
                ))}
              </ul>
            )}
            <p className="hoot-says">{hootLine(stars, todayIdx, awake)}</p>
            <FirstLightPlan goals={goals} today={today} evening={phase === 'golden' || phase === 'night'} pick={firstLight} onPick={onPickFirstLight} />
          </section>
        )}
      </div>
    </>
  )
}

export { NightKeeper }
