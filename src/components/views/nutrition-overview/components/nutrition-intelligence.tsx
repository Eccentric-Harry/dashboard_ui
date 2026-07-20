// Nutrition Intelligence — renders the shared engine's nutrition insights:
// protein-gap hero, macro-composition ring, week-vs-week strip, adherence
// heatmap, protein-efficiency leaderboard, and the Patterns-style insight
// rows. All math lives in lib/insights; this file only fetches and renders.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Flame, Leaf, RefreshCw } from 'lucide-react'
import { cn } from '../../../../lib/utils'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { fetchFoodEntries, fetchHydrationRange, fetchNutritionSummary, getUserProfile } from '../../../../lib/api'
import type { UserProfile } from '../../../../lib/api'
import type { Insight } from '../../../../lib/insights/engine'
import { isoDate, shortDay } from '../../../../lib/insights/engine'
import {
  adherenceDays,
  buildNutritionDays,
  loggedDayCount,
  macroSplit,
  nutritionInsights,
  proteinGapSummary,
  proteinLeaderboard,
  weekComparison,
  weeklyQuests,
} from '../../../../lib/insights/nutrition'
import type { AdherenceDay, FoodEntryLike, HydrationDayLike, NutritionEngineInput } from '../../../../lib/insights/nutrition'
import { useCountUp } from '../../../../hooks/use-count-up'
import { InsightList } from '../../../ui/insight-list'
import './nutrition-intelligence.css'

const WINDOW_DAYS = 30

const extractEntries = (response: unknown): FoodEntryLike[] => {
  if (Array.isArray(response)) return response as FoodEntryLike[]
  const payload = response as {
    data?: FoodEntryLike[] | { entries?: FoodEntryLike[]; foodEntries?: FoodEntryLike[] }
    entries?: FoodEntryLike[]
  }
  if (Array.isArray(payload?.data)) return payload.data
  if (payload?.data && Array.isArray(payload.data.entries)) return payload.data.entries
  if (payload?.data && Array.isArray(payload.data.foodEntries)) return payload.data.foodEntries
  if (Array.isArray(payload?.entries)) return payload.entries
  return []
}

const extractHydration = (response: unknown): HydrationDayLike[] => {
  const payload = response as { data?: { date: string; waterIntakeMl?: number; targetMl?: number }[] }
  if (!Array.isArray(payload?.data)) return []
  return payload.data.map((d) => ({
    date: d.date,
    waterIntakeMl: d.waterIntakeMl ?? 0,
    targetMl: d.targetMl ?? 0,
  }))
}

interface GoalFallback {
  proteinGoal?: number
  calorieGoal?: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CHART_TOOLTIP = ({ active, payload, label }: any) =>
  active && payload?.length ? (
    <div className="ntr-intel-tooltip">
      {label}: {Math.round(payload[0].value)}g
    </div>
  ) : null

function NutritionIntelligence() {
  const today = isoDate()
  const [entries, setEntries] = useState<FoodEntryLike[] | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [goalFallback, setGoalFallback] = useState<GoalFallback>({})
  const [hydration, setHydration] = useState<HydrationDayLike[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const leaderboardRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setFailed(false)
    const [entriesRes, profileRes, summaryRes, hydrationRes] = await Promise.allSettled([
      fetchFoodEntries(WINDOW_DAYS),
      getUserProfile(),
      fetchNutritionSummary(today),
      fetchHydrationRange(WINDOW_DAYS),
    ])
    if (entriesRes.status === 'fulfilled') {
      setEntries(extractEntries(entriesRes.value))
    } else {
      setEntries(null)
      setFailed(true)
    }
    // Profile is optional (guest mode has no profile endpoint) — targets fall
    // back to the nutrition summary's goals.
    setProfile(profileRes.status === 'fulfilled' ? profileRes.value.data : null)
    if (summaryRes.status === 'fulfilled') {
      const summary = (summaryRes.value as { data?: GoalFallback })?.data
      setGoalFallback({ proteinGoal: summary?.proteinGoal, calorieGoal: summary?.calorieGoal })
    }
    // Hydration is a nice-to-have for the insights list — never blocks the section.
    setHydration(hydrationRes.status === 'fulfilled' ? extractHydration(hydrationRes.value) : null)
    setLoading(false)
  }, [today])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  const input = useMemo<NutritionEngineInput | null>(() => {
    if (!entries) return null
    return {
      today,
      days: buildNutritionDays(entries, today, WINDOW_DAYS),
      proteinGoal:
        profile?.dynamicTargets?.calculatedProtein ??
        profile?.targetProtein ??
        goalFallback.proteinGoal ??
        null,
      calorieTarget:
        profile?.dynamicTargets?.calculatedCalories ??
        profile?.targetCalories ??
        goalFallback.calorieGoal ??
        null,
      tdee: profile?.tdee ?? null,
      fitnessGoal: profile?.fitnessGoal ?? null,
      hydration,
    }
  }, [entries, profile, goalFallback, hydration, today])

  // Memoized on the data window — recomputes only when data changes or on ↻.
  const derived = useMemo(() => {
    if (!input) return null
    return {
      insights: nutritionInsights(input),
      gap: proteinGapSummary(input),
      split: macroSplit(input),
      adherence: adherenceDays(input, 14),
      weeks: weekComparison(input),
      leaderboard: proteinLeaderboard(input, 6),
      loggedLast7: loggedDayCount(input, 7),
      quests: weeklyQuests(input),
    }
  }, [input])

  const heroSeries = useMemo(
    () =>
      (input?.days.slice(-14) ?? []).map((d) => ({
        day: shortDay(d.date),
        grams: d.protein,
      })),
    [input],
  )

  const heroAvg = useCountUp(derived?.gap?.avg7 ?? 0)

  const handleAction = useCallback((insight: Insight) => {
    if (insight.id === 'ntr-protein-gap') {
      leaderboardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [])

  if (loading) {
    return (
      <section className="ntr-intel" aria-label="Nutrition intelligence loading">
        <SectionHead onRefresh={load} />
        <div className="ntr-intel-grid">
          <div className="ntr-card ntr-intel-hero">
            <div className="skeleton-shimmer skeleton-rect" style={{ width: 160, height: 40, borderRadius: 8 }} />
            <div className="skeleton-shimmer skeleton-rect" style={{ width: '85%', height: 14, marginTop: 12, borderRadius: 6 }} />
            <div className="skeleton-shimmer skeleton-rect" style={{ height: 110, marginTop: 16, borderRadius: 14 }} />
          </div>
          <div className="ntr-card ntr-intel-side">
            <div className="skeleton-shimmer skeleton-circle" style={{ width: 110, height: 110, margin: '18px auto' }} />
            <div className="skeleton-shimmer skeleton-rect" style={{ width: '70%', height: 12, margin: '0 auto', borderRadius: 6 }} />
          </div>
        </div>
      </section>
    )
  }

  if (failed || !input || !derived) {
    return (
      <section className="ntr-intel" aria-label="Nutrition intelligence">
        <SectionHead onRefresh={load} />
        <div className="ntr-card ntr-intel-empty">
          <p>Couldn't load your food history for insights.</p>
          <button type="button" className="ntr-pill" onClick={() => void load()}>
            Try again
          </button>
        </div>
      </section>
    )
  }

  // Low-data state: a friendly nudge, never a wall of zeros or fake insights.
  if (derived.loggedLast7 < 3) {
    return (
      <section className="ntr-intel" aria-label="Nutrition intelligence">
        <SectionHead onRefresh={load} />
        <div className="ntr-card ntr-intel-empty">
          <p>
            Log a few more days and I'll start spotting patterns — {derived.loggedLast7}/7 so far.
          </p>
          <span className="ntr-intel-progress" aria-hidden="true">
            <i style={{ width: `${(derived.loggedLast7 / 7) * 100}%` }} />
          </span>
        </div>
      </section>
    )
  }

  const { gap, split, adherence, weeks, leaderboard, insights, quests } = derived
  const listInsights = insights.filter((i) => i.id !== 'ntr-protein-gap')
  const pctOfGoal = gap ? Math.round((gap.avg7 / gap.goal) * 100) : null
  const onTrack = pctOfGoal != null && pctOfGoal >= 95

  const ringData = split
    ? split.carbsPct != null
      ? [
          { name: 'Protein', value: split.proteinPct, color: '#8aa832' },
          { name: 'Carbs', value: split.carbsPct, color: '#5d87ad' },
          { name: 'Fat', value: split.fatPct ?? 0, color: '#bd8a44' },
        ]
      : [
          { name: 'Protein', value: split.proteinPct, color: '#8aa832' },
          { name: 'Other', value: 100 - split.proteinPct, color: '#dde1d6' },
        ]
    : []

  return (
    <section className="ntr-intel" aria-label="Nutrition intelligence">
      <SectionHead onRefresh={load} />

      {/* ── Weekly quests — three deterministic goals over the last 7 days ── */}
      {quests.length > 0 && (
        <div className="ntr-quests" role="list" aria-label="Weekly quests">
          {quests.map((quest) => {
            const ratio = Math.min(quest.done / quest.target, 1)
            const complete = quest.done >= quest.target
            return (
              <article key={quest.id} className="ntr-quest" role="listitem">
                <div className="ntr-quest-head">
                  <span>{quest.label}</span>
                  <b className={cn(complete && 'is-done')}>
                    {complete ? '✓' : `${quest.done}/${quest.target}`}
                  </b>
                </div>
                <span className="ntr-quest-bar" aria-hidden="true">
                  <i style={{ width: `${ratio * 100}%` }} />
                </span>
              </article>
            )
          })}
        </div>
      )}

      <div className="ntr-intel-grid">
        {/* ── Flagship: chronic protein gap ── */}
        {gap && (
          <article className={`ntr-card ntr-intel-hero${onTrack ? ' is-ontrack' : ''}`}>
            <Leaf className="ntr-intel-glyph" aria-hidden="true" />
            <div className="ntr-intel-hero-top">
              <div>
                <p className="ntr-eyebrow">Protein · 7-day average</p>
                <div className="ntr-intel-big">
                  <strong>{Math.round(heroAvg)}g</strong>
                  <span className={`ntr-intel-goal-pill${onTrack ? ' ok' : ''}`}>
                    {pctOfGoal}% of {gap.goal}g goal
                  </span>
                </div>
              </div>
              {gap.avg30 != null && (
                <div className="ntr-intel-hero-side">
                  <span>30-day avg</span>
                  <b>{gap.avg30}g</b>
                </div>
              )}
            </div>
            <p className="ntr-intel-headline">
              {onTrack
                ? `Right at your goal — you hit ${gap.goal}g on ${gap.hitDays7} of the last ${gap.loggedDays7} logged days.`
                : `You've hit your goal ${gap.hitDays7} of the last ${gap.loggedDays7} logged days. Small, repeatable additions close this.`}
            </p>
            <div className="ntr-intel-spark">
              {isMounted && (
                <ResponsiveContainer width="99%" height="100%" minWidth={0} minHeight={0}>
                  <AreaChart data={heroSeries} margin={{ top: 14, right: 10, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="intelProteinFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#cfe965" stopOpacity={0.45} />
                        <stop offset="95%" stopColor="#cfe965" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      interval={1}
                      tick={{ fill: 'rgba(23, 27, 21, 0.45)', fontSize: 9, fontWeight: 650 }}
                    />
                    <Tooltip
                      content={<CHART_TOOLTIP />}
                      cursor={{ stroke: 'rgba(23, 27, 21, 0.14)', strokeWidth: 1, strokeDasharray: '4 5' }}
                    />
                    <ReferenceLine
                      y={gap.goal}
                      stroke="rgba(23, 27, 21, 0.3)"
                      strokeDasharray="5 6"
                      label={{
                        position: 'insideTopRight',
                        value: `GOAL ${gap.goal}G`,
                        fill: 'rgba(23, 27, 21, 0.5)',
                        fontSize: 8.5,
                        fontWeight: 800,
                        letterSpacing: '0.06em',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="grams"
                      stroke="#7e9c2c"
                      strokeWidth={2.2}
                      fill="url(#intelProteinFill)"
                      isAnimationActive={isMounted && !window.matchMedia('(prefers-reduced-motion: reduce)').matches}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </article>
        )}

        {/* ── Macro composition ring + week-over-week ── */}
        <div className="ntr-intel-side-stack">
          {split && (
            <article className="ntr-card ntr-intel-ring">
              <p className="ntr-eyebrow">Macro mix · avg share of calories</p>
              <div className="ntr-intel-ring-body">
                <div className="ntr-intel-ring-chart">
                  {isMounted && (
                    <ResponsiveContainer width="99%" height="100%" minWidth={0} minHeight={0}>
                      <PieChart>
                        <Pie
                          data={ringData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius="62%"
                          outerRadius="88%"
                          stroke="none"
                          isAnimationActive={false}
                        >
                          {ringData.map((seg) => (
                            <Cell key={seg.name} fill={seg.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                  <div className="ntr-intel-ring-center">
                    <b>{split.proteinPct}%</b>
                    <span>protein</span>
                  </div>
                </div>
                <ul className="ntr-intel-ring-legend">
                  {ringData.map((seg) => (
                    <li key={seg.name}>
                      <i style={{ background: seg.color }} />
                      {seg.name} <b>{seg.value}%</b>
                    </li>
                  ))}
                  <li className="ntr-intel-band-note">healthy protein band: 15–25%</li>
                </ul>
              </div>
            </article>
          )}

          {weeks && (
            <article className="ntr-card ntr-intel-weeks">
              <p className="ntr-eyebrow">This week vs last</p>
              <div className="ntr-intel-weeks-row">
                <WeekDelta
                  label="protein/day"
                  current={weeks.protein.current}
                  previous={weeks.protein.previous}
                  unit="g"
                  goodWhen="up"
                />
                <WeekDelta
                  label="kcal/day"
                  current={weeks.calories.current}
                  previous={weeks.calories.previous}
                  unit=""
                  goodWhen="down"
                />
                <WeekDelta
                  label="days logged"
                  current={weeks.loggedDays.current}
                  previous={weeks.loggedDays.previous}
                  unit=""
                  goodWhen="up"
                />
              </div>
            </article>
          )}
        </div>

        {/* ── Adherence bars ── */}
        <article className="ntr-card ntr-intel-heatmap">
          <div className="ntr-intel-heat-head">
            <p className="ntr-eyebrow">Goal adherence · last 14 days</p>
            <div className="ntr-intel-heat-legend">
              <span><i className="calories" /> calories</span>
              <span><i className="protein" /> protein</span>
              <span><i className="target" /> target</span>
            </div>
          </div>
          {isMounted && (
            <AdherenceBars
              days={adherence}
              today={today}
              calorieTarget={input.calorieTarget}
              proteinGoal={input.proteinGoal}
            />
          )}
        </article>

        {/* ── Protein efficiency leaderboard ── */}
        {leaderboard.length > 0 && (
          <article className="ntr-card ntr-intel-board" ref={leaderboardRef}>
            <p className="ntr-eyebrow">Best protein-for-calories · from your log</p>
            <ol className="ntr-intel-board-list">
              {leaderboard.map((food, i) => (
                <li key={food.name}>
                  <span className="ntr-intel-rank">{i + 1}</span>
                  <div className="ntr-intel-board-name">
                    <b>{food.name}</b>
                    <small>logged {food.timesLogged}× · ~{food.avgProtein}g per serving</small>
                  </div>
                  <span className="ntr-intel-board-score">
                    <b>{food.proteinPer100kcal}g</b>
                    <small>per 100 kcal</small>
                  </span>
                </li>
              ))}
            </ol>
          </article>
        )}

        {/* ── Everything else the engine found ── */}
        {listInsights.length > 0 && (
          <article className="ntr-card ntr-intel-list">
            <p className="ntr-eyebrow">Patterns</p>
            <InsightList insights={listInsights} onAction={handleAction} className="ntr-intel-list-grid" />
          </article>
        )}
      </div>
    </section>
  )
}

function SectionHead({ onRefresh }: { onRefresh: () => void | Promise<void> }) {
  return (
    <header className="ntr-intel-head">
      <div>
        <p className="ntr-eyebrow">Intelligence</p>
        <h2 className="ntr-intel-title">What your food is telling you</h2>
      </div>
      <div className="ntr-intel-head-right">
        <span className="ntr-pill">last {WINDOW_DAYS} days</span>
        <button
          type="button"
          className="ntr-intel-refresh"
          onClick={() => void onRefresh()}
          aria-label="Refresh insights"
        >
          <RefreshCw size={13} />
        </button>
      </div>
    </header>
  )
}

function WeekDelta({
  label,
  current,
  previous,
  unit,
  goodWhen,
}: {
  label: string
  current: number
  previous: number
  unit: string
  goodWhen: 'up' | 'down'
}) {
  const delta = current - previous
  const tone =
    delta === 0 ? 'flat' : (delta > 0) === (goodWhen === 'up') ? 'good' : 'watch'
  return (
    <div className={`ntr-intel-week-delta tone-${tone}`}>
      <b>
        {current.toLocaleString()}
        {unit}
      </b>
      <span className="delta">
        {delta === 0 ? '—' : `${delta > 0 ? '▲' : '▼'} ${Math.abs(delta).toLocaleString()}${unit}`}
      </span>
      <small>{label}</small>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CALORIE_TOOLTIP = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as AdherenceDay
  return (
    <div className="ntr-intel-tooltip">
      {d.logged ? `${Math.round(d.calories)} kcal` : 'not logged'}
      {d.calorieTarget ? ` · target ${d.calorieTarget}` : ''}
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PROTEIN_TOOLTIP = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as AdherenceDay
  return (
    <div className="ntr-intel-tooltip">
      {d.logged ? `${Math.round(d.protein)}g protein` : 'not logged'}
      {d.proteinGoal ? ` · goal ${d.proteinGoal}g` : ''}
    </div>
  )
}

/** Two stacked bar panels sharing the day axis: calories vs its target, protein vs its goal. */
function AdherenceBars({
  days,
  today,
  calorieTarget,
  proteinGoal,
}: {
  days: AdherenceDay[]
  today: string
  calorieTarget: number | null
  proteinGoal: number | null
}) {
  if (days.length === 0) return null
  const calorieScored = days.filter((d) => d.calorieHit != null)
  const calorieHits = calorieScored.filter((d) => d.calorieHit).length
  const proteinScored = days.filter((d) => d.proteinHit != null)
  const proteinHits = proteinScored.filter((d) => d.proteinHit).length

  return (
    <div className="ntr-intel-bars">
      <div className="ntr-intel-bar-panel">
        <div className="ntr-intel-bar-panel-head">
          <span className="ntr-intel-bar-panel-label"><Flame size={11} /> Calories <small>at/under target</small></span>
          <span className={cn('ntr-heat-score', calorieScored.length > 0 && calorieHits >= calorieScored.length / 2 && 'is-good')}>
            {calorieScored.length > 0 ? `${calorieHits}/${calorieScored.length}` : '—'}
          </span>
        </div>
        <div className="ntr-intel-bar-chart">
          <ResponsiveContainer width="99%" height="100%" minWidth={0} minHeight={0}>
            <BarChart data={days} margin={{ top: 10, right: 8, left: 8, bottom: 0 }} barCategoryGap="28%">
              <XAxis dataKey="date" hide />
              <YAxis
                hide
                domain={[0, (max: number) => Math.max(max, calorieTarget ?? 0) * 1.15]}
              />
              <Tooltip content={<CALORIE_TOOLTIP />} cursor={{ fill: 'rgba(23, 27, 21, 0.05)' }} />
              {calorieTarget && (
                <ReferenceLine
                  y={calorieTarget}
                  stroke="rgba(23, 27, 21, 0.32)"
                  strokeDasharray="5 5"
                  label={{
                    position: 'insideTopRight',
                    value: `TARGET ${calorieTarget}`,
                    fill: 'rgba(23, 27, 21, 0.5)',
                    fontSize: 8.5,
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                  }}
                />
              )}
              <Bar dataKey="calories" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                {days.map((d) => (
                  <Cell
                    key={d.date}
                    fill={!d.logged ? 'rgba(23, 27, 21, 0.08)' : d.calorieHit === false ? 'rgba(224, 149, 76, 0.42)' : '#e0954c'}
                    stroke={d.date === today ? 'rgba(23, 27, 21, 0.4)' : 'none'}
                    strokeWidth={d.date === today ? 1.5 : 0}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="ntr-intel-bar-panel">
        <div className="ntr-intel-bar-panel-head">
          <span className="ntr-intel-bar-panel-label"><Leaf size={11} /> Protein <small>at/over goal</small></span>
          <span className={cn('ntr-heat-score', proteinScored.length > 0 && proteinHits >= proteinScored.length / 2 && 'is-good')}>
            {proteinScored.length > 0 ? `${proteinHits}/${proteinScored.length}` : '—'}
          </span>
        </div>
        <div className="ntr-intel-bar-chart">
          <ResponsiveContainer width="99%" height="100%" minWidth={0} minHeight={0}>
            <BarChart data={days} margin={{ top: 10, right: 8, left: 8, bottom: 0 }} barCategoryGap="28%">
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                interval={1}
                tickFormatter={(v: string) => shortDay(v)[0]}
                tick={{ fill: 'rgba(23, 27, 21, 0.45)', fontSize: 9, fontWeight: 650 }}
              />
              <YAxis
                hide
                domain={[0, (max: number) => Math.max(max, proteinGoal ?? 0) * 1.15]}
              />
              <Tooltip content={<PROTEIN_TOOLTIP />} cursor={{ fill: 'rgba(23, 27, 21, 0.05)' }} />
              {proteinGoal && (
                <ReferenceLine
                  y={proteinGoal}
                  stroke="rgba(23, 27, 21, 0.32)"
                  strokeDasharray="5 5"
                  label={{
                    position: 'insideTopRight',
                    value: `GOAL ${proteinGoal}G`,
                    fill: 'rgba(23, 27, 21, 0.5)',
                    fontSize: 8.5,
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                  }}
                />
              )}
              <Bar dataKey="protein" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                {days.map((d) => (
                  <Cell
                    key={d.date}
                    fill={!d.logged ? 'rgba(23, 27, 21, 0.08)' : d.proteinHit === false ? 'rgba(126, 156, 44, 0.38)' : '#7e9c2c'}
                    stroke={d.date === today ? 'rgba(23, 27, 21, 0.4)' : 'none'}
                    strokeWidth={d.date === today ? 1.5 : 0}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

export { NutritionIntelligence }
