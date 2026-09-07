// Canonical types now live in lib/api.ts (mirrors the `mind_entries` collection +
// MindController). Re-exported here so components keep importing from mind-types.
export type {
  MindEntry,
  MindEntryType,
  MindEntryStatus,
  MindValueTag,
  MindDistortionTag,
  MindSummary,
  MindLane,
  MindIntrusiveCategory,
  MindWorryOutcome,
  MindWorrySeverity,
  MindWorryPrediction,
  MindIntrusiveMeta,
  MindSpiralLog,
  MindWorryLedger,
  MindLoopRadarDay,
} from '../../../lib/api'

import type {
  MindValueTag,
  MindDistortionTag,
  MindEntry,
  MindIntrusiveCategory,
} from '../../../lib/api'

export const MIND_VALUE_TAGS: MindValueTag[] = [
  'Coding',
  'Growth',
  'Calm',
  'Confidence',
  'Devotion',
  'Joy',
  'Fulfilment',
]

export const MIND_DISTORTION_TAGS: MindDistortionTag[] = [
  'Catastrophizing',
  'Mind-reading',
  'All-or-nothing',
  'Fortune-telling',
  'Labeling',
]

/**
 * Coarse buckets for an intrusive thought. Blunt on purpose — a richer taxonomy would
 * invite the user to work out which one it "really" is, and that analysis is the
 * compulsion the lane exists to avoid.
 */
export const INTRUSIVE_CATEGORIES: { value: MindIntrusiveCategory; label: string }[] = [
  { value: 'DOUBT', label: 'Doubt' },
  { value: 'HARM', label: 'Harm' },
  { value: 'IMMORAL', label: 'Immoral' },
  { value: 'UNNAMED', label: 'Rather not say' },
]

export const PARK_OPTIONS = [
  { label: 'Tomorrow', days: 1 },
  { label: 'In 3 days', days: 3 },
  { label: 'Next week', days: 7 },
] as const

export const AFFIRMATIONS = [
  'I solve hard problems — my track record says so.',
  'I am not my thoughts. I am the one who notices them.',
  'Progress over perfection. I shipped yesterday; I can ship today.',
  'Calm is a skill, and every breath here is a rep.',
  'The worry that feels certain today is the one I release next week.',
]

export function mindIsoDate(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function mindAddDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + days)
  return mindIsoDate(d)
}

export function mindFormatDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

// For full timestamps (e.g. resolvedAt), unlike mindFormatDay which expects a bare date.
export function mindFormatTimestamp(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

let seedCounter = 0
function seedId(): string {
  seedCounter += 1
  return `mind-seed-${seedCounter}`
}

export function buildSeedEntries(today: string): MindEntry[] {
  const now = new Date().toISOString()
  return [
    {
      id: seedId(),
      type: 'THOUGHT',
      text: "I'll never be good enough for a senior role.",
      status: 'OPEN',
      date: today,
      createdAt: now,
    },
    {
      id: seedId(),
      type: 'THOUGHT',
      text: 'Everyone at standup could tell I was nervous.',
      status: 'OPEN',
      date: today,
      createdAt: now,
    },
    {
      id: seedId(),
      type: 'THOUGHT',
      text: 'What if the calendar sync breaks in production?',
      status: 'CONVERTED',
      linkedTaskId: 'demo-task-1',
      date: today,
      createdAt: now,
      resolvedAt: now,
    },
    {
      id: seedId(),
      type: 'THOUGHT',
      text: 'I wasted the whole weekend.',
      reframedText: 'I rested — and rest is part of the work. I still logged two learnings.',
      distortionTag: 'All-or-nothing',
      status: 'RESOLVED',
      date: today,
      createdAt: now,
      resolvedAt: now,
    },
    {
      id: seedId(),
      type: 'THOUGHT',
      text: 'Am I falling behind my peers?',
      status: 'PARKED',
      reviewDate: mindAddDays(today, 3),
      wasParked: true,
      date: today,
      createdAt: now,
    },
    {
      id: seedId(),
      type: 'THOUGHT',
      text: 'Did I say something wrong in that review comment?',
      status: 'PARKED',
      reviewDate: mindAddDays(today, 1),
      wasParked: true,
      date: today,
      createdAt: now,
    },
    {
      id: seedId(),
      type: 'WIN',
      text: 'Fixed the recurrence bug everyone was avoiding.',
      status: 'OPEN',
      pinned: true,
      date: today,
      createdAt: now,
    },
    {
      id: seedId(),
      type: 'WIN',
      text: 'Ran 5k without stopping.',
      status: 'OPEN',
      date: today,
      createdAt: now,
    },
  ]
}
