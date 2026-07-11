// Mind rules for the shared insights engine. Input is the THOUGHT-type entries
// the Mind route already fetches (or Home's lightweight `/mind/entries?type=THOUGHT`
// slice); output is threshold-gated `Insight[]` plus the chart payloads the Mind
// Intelligence panel renders. All math lives here — UI only renders.
//
// Tone guardrail (see design/MIND_WELLNESS_PLAN.md §2): every rule describes a
// *pattern*, never a diagnosis or a label. Higher capture volume is never framed
// as a bad sign — externalizing more is the point of the tab, not a symptom.
// Gaps and gentle nudges stay `neutral`/`watch` (calm amber); `urgent` is never
// used here, matching the "never guilt" rule.

import type { Insight } from './engine'
import { confidenceFrom, lastNDates, rankInsights } from './engine'
import type { MindDistortionTag, MindEntry } from '../api'

// ---------- Inputs ----------

export interface MindDay {
  date: string
  entries: MindEntry[]
}

export interface MindEngineInput {
  today: string
  /** Ascending day series, one entry per day in the window; build with buildMindDays. */
  days: MindDay[]
  windowDays: number
}

/** Build the ascending day series for the `windowDays` ending at `today` from raw THOUGHT entries. */
export function buildMindDays(entries: MindEntry[], today: string, windowDays: number): MindDay[] {
  const byDate = new Map<string, MindEntry[]>()
  for (const entry of entries) {
    if (entry.type !== 'THOUGHT') continue
    const date = entry.date?.slice(0, 10)
    if (!date) continue
    const list = byDate.get(date)
    if (list) list.push(entry)
    else byDate.set(date, [entry])
  }
  return lastNDates(windowDays, today).map((date) => ({ date, entries: byDate.get(date) ?? [] }))
}

const windowEntries = (input: MindEngineInput): MindEntry[] => input.days.flatMap((d) => d.entries)

// ---------- Chart payloads ----------

export interface TriageComposition {
  total: number
  converted: number
  reframed: number
  parked: number
  released: number
  stillOpen: number
}

/** Current-status breakdown of everything captured in the window — how thoughts actually get handled. */
export function triageComposition(input: MindEngineInput): TriageComposition {
  const entries = windowEntries(input)
  return {
    total: entries.length,
    converted: entries.filter((e) => e.status === 'CONVERTED').length,
    reframed: entries.filter((e) => e.status === 'RESOLVED').length,
    parked: entries.filter((e) => e.status === 'PARKED').length,
    released: entries.filter((e) => e.status === 'RELEASED').length,
    stillOpen: entries.filter((e) => e.status === 'OPEN').length,
  }
}

export interface DistortionCount {
  tag: MindDistortionTag
  count: number
}

/** Ranked frequency of distortion tags among reframed thoughts in the window. */
export function distortionFrequency(input: MindEngineInput): DistortionCount[] {
  const counts = new Map<MindDistortionTag, number>()
  for (const entry of windowEntries(input)) {
    if (!entry.distortionTag) continue
    counts.set(entry.distortionTag, (counts.get(entry.distortionTag) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
}

export interface CaptureTrendDay {
  date: string
  captured: number
}

/** Daily capture counts for the last `days` days — powers the trend bar/sparkline. */
export function captureTrend(input: MindEngineInput, days = 14): CaptureTrendDay[] {
  return input.days.slice(-days).map((d) => ({ date: d.date, captured: d.entries.length }))
}

export type TimeOfDayBucket = 'Morning' | 'Afternoon' | 'Evening' | 'Late night'

export interface TimeOfDayShare {
  bucket: TimeOfDayBucket
  count: number
  pct: number
}

const bucketOf = (hour: number): TimeOfDayBucket => {
  if (hour >= 5 && hour < 11) return 'Morning'
  if (hour >= 11 && hour < 17) return 'Afternoon'
  if (hour >= 17 && hour < 22) return 'Evening'
  return 'Late night'
}

/** Share of captures by time-of-day bucket (local time), from entries with a createdAt timestamp. */
export function timeOfDayShare(input: MindEngineInput): TimeOfDayShare[] {
  const timed = windowEntries(input).filter((e) => e.createdAt)
  const counts = new Map<TimeOfDayBucket, number>([
    ['Morning', 0],
    ['Afternoon', 0],
    ['Evening', 0],
    ['Late night', 0],
  ])
  for (const entry of timed) {
    const hour = new Date(entry.createdAt as string).getHours()
    const bucket = bucketOf(hour)
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1)
  }
  const total = timed.length
  return [...counts.entries()].map(([bucket, count]) => ({
    bucket,
    count,
    pct: total > 0 ? Math.round((count / total) * 100) : 0,
  }))
}

// ---------- Rules ----------

function distortionPatternRule(input: MindEngineInput): Insight | null {
  const ranked = distortionFrequency(input)
  const sampleSize = ranked.reduce((s, d) => s + d.count, 0)
  if (sampleSize < 3) return null
  const top = ranked[0]
  const share = Math.round((top.count / sampleSize) * 100)
  const effect = Math.min(1, top.count / sampleSize)
  return {
    id: 'mnd-distortion-pattern',
    domain: 'mind',
    kind: 'composition',
    sentiment: 'neutral',
    icon: 'thought',
    title: `When you reframe, "${top.tag}" shows up most — ${top.count} of your last ${sampleSize} tagged reframes. Naming the pattern in the moment tends to loosen its grip.`,
    detail: ranked.map((d) => `${d.tag}: ${d.count}`).join(' · ') + ` — ${share}% of tagged reframes this window.`,
    sampleWindow: `based on ${sampleSize} tagged reframes`,
    action: { label: 'Reframe a thought', route: '/mind' },
    confidence: confidenceFrom(sampleSize, effect),
    effect,
  }
}

function triageCompositionRule(input: MindEngineInput): Insight | null {
  const c = triageComposition(input)
  if (c.total < 5) return null
  const actionableShare = Math.round((c.converted / c.total) * 100)
  const sampleWindow = `based on ${c.total} thoughts, last ${input.windowDays} days`
  const detail = `Do ${c.converted} · Reframe ${c.reframed} · Park ${c.parked} · Release ${c.released} · Still open ${c.stillOpen} (of ${c.total} captured).`

  if (actionableShare >= 35) {
    return {
      id: 'mnd-triage-mix',
      domain: 'mind',
      kind: 'composition',
      sentiment: 'positive',
      icon: 'thought',
      title: `${actionableShare}% of what you capture turns into a real task — a lot of what circles is genuinely actionable, not just noise.`,
      detail,
      sampleWindow,
      confidence: confidenceFrom(c.total, actionableShare / 100),
      effect: Math.min(1, actionableShare / 100 + 0.1),
    }
  }
  const closed = c.converted + c.reframed + c.released
  const closedShare = Math.round((closed / c.total) * 100)
  return {
    id: 'mnd-triage-mix',
    domain: 'mind',
    kind: 'composition',
    sentiment: 'neutral',
    icon: 'thought',
    title: `Of ${c.total} thoughts captured, ${closedShare}% have been triaged (task, reframe, or release) — ${c.stillOpen} are still sitting open.`,
    detail,
    sampleWindow,
    confidence: confidenceFrom(c.total, closedShare / 100),
    effect: closedShare / 200,
  }
}

function openBacklogRule(input: MindEngineInput): Insight | null {
  const now = Date.now()
  const stale = windowEntries(input).filter((e) => {
    if (e.status !== 'OPEN' || !e.createdAt) return false
    const ageHours = (now - new Date(e.createdAt).getTime()) / (1000 * 60 * 60)
    return ageHours >= 72
  })
  if (stale.length < 2) return null
  return {
    id: 'mnd-open-backlog',
    domain: 'mind',
    kind: 'streak',
    sentiment: 'neutral',
    icon: 'thought',
    title: `${stale.length} thoughts have been open for a few days. No pressure — even a quick Park or Release tends to feel lighter than carrying them.`,
    detail: `${stale.length} OPEN thoughts older than 72 hours, out of ${windowEntries(input).filter((e) => e.status === 'OPEN').length} currently open.`,
    sampleWindow: `last ${input.windowDays} days`,
    action: { label: 'Open the inbox', route: '/mind' },
    confidence: 'medium',
    effect: Math.min(1, stale.length / 10),
  }
}

/**
 * `wasParked` is set server-side the moment a thought is first parked and never
 * cleared again (unlike `reviewDate`, which resets when a parked worry
 * resurfaces to OPEN) — so this is a complete count of every thought that ever
 * passed through the worry parking lot, not just the ones released without
 * reopening.
 */
function parkingLotRule(input: MindEngineInput): Insight | null {
  const entries = windowEntries(input)
  const resolvedFromPark = entries.filter(
    (e) => e.wasParked === true && (e.status === 'RELEASED' || e.status === 'CONVERTED' || e.status === 'RESOLVED'),
  )
  if (resolvedFromPark.length >= 2) {
    const releasedShare = Math.round(
      (resolvedFromPark.filter((e) => e.status === 'RELEASED').length / resolvedFromPark.length) * 100,
    )
    if (releasedShare >= 50) {
      return {
        id: 'mnd-parking-resolution',
        domain: 'mind',
        kind: 'win',
        sentiment: 'positive',
        icon: 'thought',
        title: `${releasedShare}% of the worries you've parked turned out not to need action when it came time to deal with them.`,
        detail: `${resolvedFromPark.length} parked worries resolved directly (without re-opening); ${resolvedFromPark.filter((e) => e.status === 'RELEASED').length} were released, the rest became tasks or reframes.`,
        sampleWindow: `last ${input.windowDays} days`,
        confidence: confidenceFrom(resolvedFromPark.length, 0.2),
        effect: 0.2,
      }
    }
  }
  const currentlyParked = entries.filter((e) => e.status === 'PARKED')
  if (currentlyParked.length >= 2) {
    return {
      id: 'mnd-parking-lot',
      domain: 'mind',
      kind: 'win',
      sentiment: 'positive',
      icon: 'thought',
      title: `You have ${currentlyParked.length} worries parked for later — deciding not to deal with something right now, on purpose, is a real coping skill, not avoidance.`,
      detail: `${currentlyParked.length} thoughts currently in PARKED status, each with a set review date.`,
      sampleWindow: `as of today`,
      confidence: 'medium',
      effect: 0.12,
    }
  }
  return null
}

function timeOfDayRule(input: MindEngineInput): Insight | null {
  const shares = timeOfDayShare(input)
  const total = shares.reduce((s, b) => s + b.count, 0)
  if (total < 8) return null
  const top = [...shares].sort((a, b) => b.count - a.count)[0]
  if (top.pct < 40) return null
  const idea =
    top.bucket === 'Late night'
      ? ' A short wind-down ritual before then might catch some of it earlier.'
      : ''
  return {
    id: 'mnd-time-of-day',
    domain: 'mind',
    kind: 'composition',
    sentiment: 'neutral',
    icon: 'timing',
    title: `Most of what circles arrives in the ${top.bucket.toLowerCase()} — ${top.count} of your last ${total} thoughts.${idea}`,
    detail: shares.map((b) => `${b.bucket}: ${b.pct}%`).join(' · '),
    sampleWindow: `last ${input.windowDays} days`,
    confidence: confidenceFrom(total, top.pct / 100),
    effect: top.pct / 150,
  }
}

function captureTrendRule(input: MindEngineInput): Insight | null {
  if (input.days.length < 14) return null
  const current = input.days.slice(-7).reduce((s, d) => s + d.entries.length, 0)
  const previous = input.days.slice(-14, -7).reduce((s, d) => s + d.entries.length, 0)
  // Only ever frame more externalizing as a positive habit — a drop simply doesn't fire.
  if (previous === 0 || current <= previous) return null
  const pct = Math.round(((current - previous) / previous) * 100)
  if (pct < 20) return null
  return {
    id: 'mnd-capture-trend',
    domain: 'mind',
    kind: 'trend',
    sentiment: 'positive',
    icon: 'thought',
    title: `You captured ${current} thoughts this week vs ${previous} last week — you're catching more before it loops, which is the whole point of this tab.`,
    detail: `${current} thoughts captured in the last 7 days vs ${previous} in the 7 days before.`,
    metric: { value: current, unit: 'thoughts', delta: current - previous, deltaDir: 'up' },
    sampleWindow: 'last 14 days',
    confidence: confidenceFrom(7, pct / 100),
    effect: Math.min(1, pct / 100),
  }
}

/** Always try to surface one genuine win; never manufacture one. */
function closingLoopWinRule(input: MindEngineInput): Insight | null {
  const last7 = input.days.slice(-7)
  const closedPerDay = last7.map((d) => ({
    date: d.date,
    closed: d.entries.filter((e) => e.status === 'CONVERTED' || e.status === 'RESOLVED' || e.status === 'RELEASED').length,
  }))
  const totalClosed = closedPerDay.reduce((s, d) => s + d.closed, 0)
  if (totalClosed >= 3) {
    const best = closedPerDay.reduce((a, b) => (b.closed > a.closed ? b : a))
    return {
      id: 'mnd-win-closed-loops',
      domain: 'mind',
      kind: 'win',
      sentiment: 'positive',
      icon: 'thought',
      title: `You closed the loop on ${totalClosed} thoughts this week — turned into tasks, reframed, or let go.`,
      detail: `${totalClosed} thoughts moved to Do/Reframe/Release across the last 7 days; best day was ${best.closed} on ${best.date}.`,
      sampleWindow: 'last 7 days',
      confidence: 'high',
      effect: Math.min(1, totalClosed / 15),
    }
  }
  const reframed = windowEntries(input).filter((e) => e.status === 'RESOLVED').length
  if (reframed >= 1) {
    return {
      id: 'mnd-win-reframed',
      domain: 'mind',
      kind: 'win',
      sentiment: 'positive',
      icon: 'thought',
      title: `${reframed} thought${reframed === 1 ? '' : 's'} reframed into something kinder this window — that's a real rep for your mind, not a small thing.`,
      detail: `${reframed} thoughts moved to a reframed, RESOLVED state in the last ${input.windowDays} days.`,
      sampleWindow: `last ${input.windowDays} days`,
      confidence: 'medium',
      effect: 0.15,
    }
  }
  return null
}

/** All mind insights that pass their thresholds, ranked. */
export function mindInsights(input: MindEngineInput): Insight[] {
  const insights = [
    distortionPatternRule(input),
    triageCompositionRule(input),
    openBacklogRule(input),
    parkingLotRule(input),
    timeOfDayRule(input),
    captureTrendRule(input),
    closingLoopWinRule(input),
  ].filter((i): i is Insight => i != null)
  return rankInsights(insights)
}
