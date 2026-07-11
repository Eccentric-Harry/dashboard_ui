// Shared deterministic insights engine — the single place where Finance,
// Nutrition, and Home derive explainable findings from already-fetched data.
// Plain math only (means, deltas, least-squares projection, Pearson): no ML,
// no network calls, no LLM. Every rule is threshold-gated — below its minimum
// sample or effect size it returns nothing rather than fabricating a finding.
//
// UI components never do math: they render `Insight[]` plus the typed chart
// payloads exported by ./nutrition and ./finance.

export type InsightDomain = 'finance' | 'nutrition' | 'mind' | 'cross'

export type InsightKind =
  | 'trend'
  | 'forecast'
  | 'anomaly'
  | 'streak'
  | 'efficiency'
  | 'composition'
  | 'win'

/**
 * Color semantics (enforced by the UI):
 * urgent = red, over-budget/destructive only; watch = calm amber;
 * positive = green, genuine wins only; neutral = accent highlight.
 * Data gaps are always `neutral` nudges, never failing scores.
 */
export type InsightSentiment = 'positive' | 'neutral' | 'watch' | 'urgent'

export type InsightConfidence = 'low' | 'medium' | 'high'

/** Semantic icon keys, mapped to Lucide components by the rendering layer. */
export type InsightIcon =
  | 'protein'
  | 'calories'
  | 'balance'
  | 'timing'
  | 'streak'
  | 'scale'
  | 'wallet'
  | 'forecast'
  | 'category'
  | 'subscription'
  | 'lending'
  | 'anomaly'
  | 'trophy'
  | 'log'
  | 'income'
  | 'hydration'
  | 'thought'
  | 'sleep'
  | 'focus'
  | 'tasks'
  | 'mood'

export interface InsightMetric {
  value: number
  unit: string
  delta?: number
  deltaDir?: 'up' | 'down'
}

export interface InsightAction {
  label: string
  route: string
}

export interface Insight {
  id: string
  domain: InsightDomain
  kind: InsightKind
  sentiment: InsightSentiment
  icon: InsightIcon
  /** One-sentence plain-language finding. */
  title: string
  /** The numbers behind it — shown by the "Why?" expand. */
  detail: string
  metric?: InsightMetric
  /** Optional mini-series for a sparkline. */
  spark?: number[]
  /** e.g. "based on 6 of 7 days" / "last 30 days". */
  sampleWindow: string
  action?: InsightAction
  confidence: InsightConfidence
  /** Normalized |effect| used only for ranking within a sentiment tier. */
  effect: number
}

// ---------- Math helpers (pure) ----------

export const sum = (values: number[]): number => values.reduce((a, b) => a + b, 0)

export const mean = (values: number[]): number =>
  values.length === 0 ? 0 : sum(values) / values.length

export const median = (values: number[]): number => {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

/** Percent change from `from` to `to`; null when `from` is 0. */
export const pctChange = (from: number, to: number): number | null =>
  from === 0 ? null : ((to - from) / Math.abs(from)) * 100

export const movingAvg = (series: number[], window: number): number[] =>
  series.map((_, i) => {
    const start = Math.max(0, i - window + 1)
    return mean(series.slice(start, i + 1))
  })

/**
 * Least-squares fit over `series` (x = 0..n-1). Returns the value the fitted
 * line predicts at index `projectTo` — used to project a cumulative
 * month-to-date series to the end of the period. Null under 3 points.
 */
export function linearProjection(series: number[], projectTo: number): number | null {
  const n = series.length
  if (n < 3) return null
  const meanX = (n - 1) / 2
  const meanY = mean(series)
  let cov = 0
  let varX = 0
  for (let i = 0; i < n; i++) {
    cov += (i - meanX) * (series[i] - meanY)
    varX += (i - meanX) ** 2
  }
  if (varX === 0) return null
  const slope = cov / varX
  return meanY + slope * (projectTo - meanX)
}

export function pearson(xs: number[], ys: number[]): number | null {
  const n = Math.min(xs.length, ys.length)
  if (n < 3) return null
  const meanX = mean(xs.slice(0, n))
  const meanY = mean(ys.slice(0, n))
  let cov = 0
  let varX = 0
  let varY = 0
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX
    const dy = ys[i] - meanY
    cov += dx * dy
    varX += dx * dx
    varY += dy * dy
  }
  if (varX === 0 || varY === 0) return null
  return cov / Math.sqrt(varX * varY)
}

// ---------- Date helpers (local-time ISO, no Date-string parsing pitfalls) ----------

export function isoDate(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + days)
  return isoDate(d)
}

/** The n dates ending at endIso, ascending. */
export const lastNDates = (n: number, endIso: string): string[] =>
  Array.from({ length: n }, (_, i) => addDaysIso(endIso, i - (n - 1)))

export const monthKeyOf = (iso: string): string => iso.slice(0, 7)

export function daysInMonth(monthKey: string): number {
  const [y, m] = monthKey.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

/** Days of `monthKey` already elapsed as of `todayIso`, inclusive; clamped to [0, daysInMonth]. */
export function daysElapsedInMonth(monthKey: string, todayIso: string): number {
  const todayMonth = monthKeyOf(todayIso)
  if (todayMonth > monthKey) return daysInMonth(monthKey)
  if (todayMonth < monthKey) return 0
  return Number(todayIso.slice(8, 10))
}

/** Days of `monthKey` remaining as of `todayIso`, including today. */
export function daysLeftInMonth(monthKey: string, todayIso: string): number {
  return daysInMonth(monthKey) - daysElapsedInMonth(monthKey, todayIso) + (monthKeyOf(todayIso) === monthKey ? 1 : 0)
}

export const isWeekend = (iso: string): boolean => {
  const day = new Date(`${iso}T00:00:00`).getDay()
  return day === 0 || day === 6
}

export const shortDay = (iso: string): string =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short' })

export const monthLabel = (monthKey: string): string =>
  new Date(`${monthKey}-01T00:00:00`).toLocaleDateString('en-US', { month: 'long' })

// ---------- Formatting ----------

export const inr = (n: number): string => `₹${Math.round(n).toLocaleString('en-IN')}`

// ---------- Confidence, ranking, promotion ----------

/** Deterministic confidence from sample size and effect strength. */
export function confidenceFrom(sampleSize: number, effect: number): InsightConfidence {
  if (sampleSize >= 7 && effect >= 0.2) return 'high'
  if (sampleSize >= 5 && effect >= 0.1) return 'medium'
  return 'low'
}

const SENTIMENT_PRIORITY: Record<InsightSentiment, number> = {
  urgent: 3,
  watch: 2,
  positive: 1,
  neutral: 0,
}

/** Sort by sentiment priority (urgent > watch > positive > neutral), then |effect|. */
export function rankInsights(insights: Insight[]): Insight[] {
  return [...insights].sort((a, b) => {
    const bySentiment = SENTIMENT_PRIORITY[b.sentiment] - SENTIMENT_PRIORITY[a.sentiment]
    return bySentiment !== 0 ? bySentiment : b.effect - a.effect
  })
}

/**
 * Rank and cap the list, guaranteeing at least one positive/win in any list
 * of 3+ when one exists — the digest should never be all-negative.
 */
export function pickTop(insights: Insight[], max: number): Insight[] {
  const ranked = rankInsights(insights)
  const visible = ranked.slice(0, max)
  if (visible.length >= 3 && !visible.some((i) => i.sentiment === 'positive')) {
    const positive = ranked.find((i) => i.sentiment === 'positive')
    if (positive) return [...visible.slice(0, max - 1), positive]
  }
  return visible
}

/**
 * The subset worth bubbling up to Home: urgent findings always qualify;
 * otherwise only high-confidence ones. Capped at `max` across domains.
 */
export function promoteForHome(insights: Insight[], max = 2): Insight[] {
  return rankInsights(
    insights.filter((i) => i.sentiment === 'urgent' || i.confidence === 'high'),
  ).slice(0, max)
}
