// Right gutter — PULSE: how today is going, in numbers you already track.
//
// Three cards: the day's rings (calories, protein, water — Activity-rings style, one
// glance), the month's money (what's left of the budget and what that means a day),
// and outside (weather, air, sunset) once there's a location. Real readings only:
// a slice that hasn't loaded shows a dash, never a plausible number.

import { createElement, useEffect } from 'react'
import { MapPin } from 'lucide-react'
import type { AppPath } from '@/app/routes'
import { inr } from '@/lib/insights/engine'
import { ambientActions, useAmbientStore } from '@/store/ambient-store'
import { useHudStore } from '@/store/hud-store'
import { HudCard, HudMeter, HudRings, type HudTone } from './hud-primitives'
import { describeAqi, describeWeatherCode, weatherIcon } from '../wmo-codes'
import { formatTemperature } from '../hud-format'
import type { HudDensity } from '../use-gutter-space'

type Navigate = (path: AppPath, search?: string) => void

/** Refresh cadence for the ambient snapshot; the store still enforces its own TTL. */
const AMBIENT_POLL_MS = 5 * 60_000

/** Desaturated hues from the route palettes — never neon. */
const HUE = { calories: '#c08a3e', protein: '#5b9478', water: '#5689b8' } as const

const fmt = (n: number) => Math.round(n).toLocaleString('en-IN')

// ── Today's rings ─────────────────────────────────────────────────────────────

function RingsCard({ onNavigate }: { onNavigate: Navigate }) {
  const nutrition = useHudStore.use.nutrition().data
  const hydration = useHudStore.use.hydration().data
  const cal = nutrition ? { value: nutrition.todayTotalCalories, goal: nutrition.calorieGoal } : null
  const pro = nutrition ? { value: nutrition.todayTotalProtein, goal: nutrition.proteinGoal } : null
  const water = hydration ? { value: hydration.waterIntakeMl, goal: hydration.targetMl } : null
  const ratio = (r: { value: number; goal: number } | null) => (r && r.goal > 0 ? r.value / r.goal : 0)

  const rows = [
    { key: 'calories', label: 'Calories', hue: HUE.calories, r: cal, text: cal ? `${fmt(cal.value)} / ${fmt(cal.goal)}` : '—' },
    { key: 'protein', label: 'Protein', hue: HUE.protein, r: pro, text: pro ? `${fmt(pro.value)} / ${fmt(pro.goal)} g` : '—' },
    {
      key: 'water',
      label: 'Water',
      hue: HUE.water,
      r: water,
      text: water ? `${(water.value / 1000).toFixed(1)} / ${(water.goal / 1000).toFixed(1)} L` : '—',
    },
  ]

  return (
    <HudCard label="Today" grow onOpen={() => onNavigate('/nutrition')} openLabel="Open nutrition" className="hud-panel--rings">
      <div className="hud-rings-wrap">
        <HudRings rings={rows.map((row) => ({ key: row.key, ratio: ratio(row.r), hue: row.hue }))} />
      </div>
      <ul className="hud-legend">
        {rows.map((row) => (
          <li key={row.key}>
            <i style={{ background: row.hue }} aria-hidden="true" />
            <span className="hud-legend-label">{row.label}</span>
            <span className="hud-legend-value">{row.text}</span>
          </li>
        ))}
      </ul>
    </HudCard>
  )
}

// ── Money ─────────────────────────────────────────────────────────────────────

function MoneyCard({ now, onNavigate }: { now: Date; onNavigate: Navigate }) {
  const spending = useHudStore.use.spending().data
  const budget = spending?.monthlyBudget ?? 0
  const left = spending?.budgetRemaining ?? 0
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysLeft = daysInMonth - now.getDate() + 1
  const over = left < 0
  const tone: HudTone = over ? 'bad' : spending && spending.budgetUtilization > 0.85 ? 'watch' : 'good'
  const monthName = now.toLocaleDateString('en-US', { month: 'long' })

  return (
    <HudCard label={monthName} onOpen={() => onNavigate('/finance')} openLabel="Open finance" className="hud-panel--money">
      {!spending ? (
        <p className="hud-big">—</p>
      ) : budget <= 0 ? (
        <>
          <p className="hud-big">
            {inr(spending.totalSpent)}
            <small>spent</small>
          </p>
          <p className="hud-foot">
            <span>No monthly budget set</span>
          </p>
        </>
      ) : (
        <>
          <p className={`hud-big hud-tone-${over ? 'bad' : 'idle'}`}>
            {inr(Math.abs(left))}
            <small>{over ? 'over budget' : 'left to spend'}</small>
          </p>
          <HudMeter ratio={budget ? (budget - Math.max(0, left)) / budget : 0} tone={tone} />
          <p className="hud-foot">
            <span>{over ? `of ${inr(budget)}` : `≈ ${inr(left / daysLeft)} a day · ${daysLeft} day${daysLeft === 1 ? '' : 's'}`}</span>
          </p>
        </>
      )}
    </HudCard>
  )
}

// ── Outside ───────────────────────────────────────────────────────────────────

function OutsideCard({ now }: { now: Date }) {
  const coords = useAmbientStore.use.coords()
  const gate = useAmbientStore.use.gate()
  const snapshot = useAmbientStore.use.snapshot()

  // Stale-while-revalidate: the store no-ops until its own TTL has passed.
  useEffect(() => {
    void ambientActions.ensureFresh()
    const timer = window.setInterval(() => {
      if (!document.hidden) void ambientActions.ensureFresh()
    }, AMBIENT_POLL_MS)
    return () => window.clearInterval(timer)
  }, [])

  // A refused location isn't asked about again — the card just steps aside.
  if (!coords) {
    if (gate === 'denied' || gate === 'unavailable') return null
    return (
      <HudCard label="Outside" className="hud-panel--outside">
        <p className="hud-note">Weather, air and sunset for where you are.</p>
        <button
          type="button"
          className="hud-chip-btn"
          onClick={() => void ambientActions.enableLocation()}
          disabled={gate === 'prompting'}
        >
          <MapPin size={11} strokeWidth={2.4} aria-hidden="true" />
          {gate === 'prompting' ? 'Waiting…' : 'Use my location'}
        </button>
      </HudCard>
    )
  }

  const weather = snapshot?.weather
  if (!weather) {
    return (
      <HudCard label="Outside" className="hud-panel--outside">
        <p className="hud-big">—</p>
      </HudCard>
    )
  }
  const condition = describeWeatherCode(weather.weatherCode, weather.isDay)
  const aqi = describeAqi(snapshot.air?.usAqi)
  const sunEvent = now.getTime() < weather.sunriseAt ? { label: 'Sunrise', at: weather.sunriseAt } : { label: 'Sunset', at: weather.sunsetAt }

  return (
    <HudCard label="Outside" meta={condition.label} className="hud-panel--outside">
      <div className="hud-weather">
        {createElement(weatherIcon(weather.weatherCode, weather.isDay), { size: 26, strokeWidth: 1.8, className: 'hud-weather-ic' })}
        <span className="hud-weather-temp">{formatTemperature(weather.temperatureC)}</span>
        <span className="hud-weather-range">
          H {formatTemperature(weather.highC)}
          <br />L {formatTemperature(weather.lowC)}
        </span>
      </div>
      <p className="hud-foot">
        {aqi && <span className={`hud-tone-${aqi.tone}`}>AQI {snapshot.air?.usAqi} · {aqi.band}</span>}
        <span>
          {sunEvent.label} {new Date(sunEvent.at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
        </span>
      </p>
    </HudCard>
  )
}

export function PulseColumn({ now, density, onNavigate }: { now: Date; density: HudDensity; onNavigate: Navigate }) {
  return (
    <div className="hud-column hud-column--pulse is-filled">
      <RingsCard onNavigate={onNavigate} />
      <MoneyCard now={now} onNavigate={onNavigate} />
      {density !== 'minimal' && <OutsideCard now={now} />}
    </div>
  )
}
