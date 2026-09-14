// "Plan with AI": builds a tightly constrained prompt the user pastes into any chat
// assistant, and parses the JSON reply back into an editable outline.
//
// The prompt is deliberately strict — without limits, assistants return 60-item
// curricula that are more overwhelming than no plan at all. The parser is
// deliberately forgiving — replies arrive wrapped in prose, in ```json fences,
// with trailing commas, or with "children"/"subSteps" instead of "steps".
import type { PursuitStepInput } from '@/types/learnings'
import { MAX_STEP_DEPTH, MAX_TOTAL_STEPS } from './pursuit-tree'

export const PURSUIT_CATEGORIES = ['Development', 'Frontend', 'Backend', 'Architecture', 'Computer Science']

export type PursuitLevel = 'new' | 'basics' | 'intermediate'
export type PursuitTimeframe = 'weekend' | 'two-weeks' | 'month' | 'quarter'

export const LEVEL_OPTIONS: { value: PursuitLevel; label: string; prompt: string }[] = [
  { value: 'new', label: 'Brand new', prompt: 'complete beginner — assume no prior knowledge of this topic' },
  { value: 'basics', label: 'Know the basics', prompt: 'I know the basics — skip introductions and setup' },
  { value: 'intermediate', label: 'Intermediate', prompt: 'intermediate — I use this already and want depth and gaps filled' },
]

export const TIMEFRAME_OPTIONS: {
  value: PursuitTimeframe
  label: string
  prompt: string
  topLevel: [number, number]
  maxItems: number
}[] = [
  { value: 'weekend', label: 'A weekend', prompt: 'a weekend (~8 hours)', topLevel: [3, 5], maxItems: 18 },
  { value: 'two-weeks', label: '2 weeks', prompt: 'about 2 weeks, an hour a day', topLevel: [4, 6], maxItems: 28 },
  { value: 'month', label: 'A month', prompt: 'about a month, an hour a day', topLevel: [5, 7], maxItems: 36 },
  { value: 'quarter', label: '3 months', prompt: 'about 3 months, a few hours a week', topLevel: [6, 8], maxItems: 45 },
]

export interface PursuitPromptOptions {
  topic: string
  level: PursuitLevel
  timeframe: PursuitTimeframe
  goal?: string
}

export function buildPursuitPrompt({ topic, level, timeframe, goal }: PursuitPromptOptions): string {
  const levelText = LEVEL_OPTIONS.find((o) => o.value === level)?.prompt ?? ''
  const tf = TIMEFRAME_OPTIONS.find((o) => o.value === timeframe) ?? TIMEFRAME_OPTIONS[1]
  const [minTop, maxTop] = tf.topLevel

  return `I'm learning something new and want a step-by-step plan I can tick off in my tracker. Reply with ONLY a JSON object — no text before or after it.

Topic: ${topic.trim() || '(describe the topic here)'}
My level: ${levelText}
Time I can give it: ${tf.prompt}${goal?.trim() ? `\nMy goal: ${goal.trim()}` : ''}

Rules — follow all of them:
1. ${minTop}–${maxTop} top-level steps, in the order I should do them. Each is a milestone I can finish in one or a few sittings.
2. Give a step sub-steps only when it truly splits into distinct pieces — then 2–5 of them, never exactly 1.
3. Maximum ${MAX_STEP_DEPTH} levels (step → sub-step → sub-sub-step). Use the third level rarely.
4. At most ${tf.maxItems} items in total, counting every level. Fewer, meatier steps beat a long list.
5. Every "text" starts with a verb and stays under 70 characters. Good: "Build a to-do app with useReducer". Bad: "useReducer".
6. Prefer doing over reading: most steps should produce something (code, notes, a diagram, an answer).
7. Add a "note" (under 110 characters) only when it helps — what "done" looks like, or a common trap. Otherwise leave it out.
8. No numbering, links, time estimates or emojis inside the text.
9. Skip anything someone at my level already knows.
10. Give every step that has NO sub-steps an "estimateMinutes": realistic focused minutes for someone at my level — one of 15, 30, 45, 60, 90 or 120. Most of my sessions are about an hour, so split anything longer than 120 into sub-steps. Leave it off steps that have sub-steps.

Use exactly this shape (the nested key is "steps" at every level):
{
  "title": "Short pursuit name, under 50 characters",
  "category": "One or two words, e.g. Frontend, Backend, System Design",
  "steps": [
    {
      "text": "Verb-first step",
      "note": "Optional",
      "steps": [
        { "text": "Verb-first sub-step", "estimateMinutes": 30 },
        { "text": "Verb-first sub-step", "estimateMinutes": 45 }
      ]
    },
    { "text": "Verb-first step without sub-steps", "estimateMinutes": 60 }
  ]
}`
}

// ── Parsing ────────────────────────────────────────────────────────────────

/** One editable row in the outline editor — the tree is flattened by depth. */
export interface OutlineRow {
  key: string
  text: string
  note: string
  /** 0-based: 0 = step, 1 = sub-step, 2 = sub-sub-step. */
  depth: number
  /** Planned minutes; only meaningful on leaf rows. */
  estimate: number | null
}

export interface ParsedPursuitPlan {
  title: string
  category: string
  rows: OutlineRow[]
  /** Non-fatal adjustments made while importing, shown to the user. */
  warnings: string[]
}

export type ParseResult = { ok: true; plan: ParsedPursuitPlan } | { ok: false; error: string }

const CHILD_KEYS = ['steps', 'children', 'subSteps', 'substeps', 'sub_steps', 'subtasks', 'items'] as const
const TEXT_KEYS = ['text', 'title', 'name', 'step', 'task'] as const
const NOTE_KEYS = ['note', 'description', 'details', 'why', 'done'] as const
const ESTIMATE_KEYS = ['estimateMinutes', 'estimate', 'minutes', 'durationMinutes', 'duration', 'time'] as const

/** Reads 45, "45", "45 min", "1.5h" or "1h 30m" as minutes; anything else is no estimate. */
function pickEstimate(obj: Record<string, unknown>): number | null {
  for (const key of ESTIMATE_KEYS) {
    const value = obj[key]
    let minutes: number | null = null
    if (typeof value === 'number') minutes = value
    else if (typeof value === 'string') {
      const hours = value.match(/(\d+(?:\.\d+)?)\s*h/i)
      const mins = value.match(/(\d+)\s*m(?!o)/i)
      if (hours || mins) minutes = (hours ? parseFloat(hours[1]) * 60 : 0) + (mins ? parseInt(mins[1], 10) : 0)
      else if (/^\s*\d+\s*$/.test(value)) minutes = parseInt(value, 10)
    }
    if (minutes && Number.isFinite(minutes) && minutes > 0) return Math.min(600, Math.round(minutes))
  }
  return null
}

let rowCounter = 0
export const newRowKey = () => `row-${Date.now().toString(36)}-${(rowCounter++).toString(36)}`

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

function pickString(obj: Record<string, unknown>, keys: readonly string[]): string {
  for (const key of keys) {
    const value = obj[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

function pickChildren(obj: Record<string, unknown>): unknown[] {
  for (const key of CHILD_KEYS) {
    if (Array.isArray(obj[key])) return obj[key] as unknown[]
  }
  return []
}

/** Removes list markers an assistant sometimes adds despite being told not to. */
const cleanText = (text: string) => text.replace(/^\s*(?:[-*•]|\d+[.)]|step\s+\d+[:.)-]?)\s*/i, '').trim()

/** Pulls the JSON value out of a reply that may include prose or code fences. */
function extractJson(raw: string): string | null {
  const fenced = raw.match(/```(?:json|JSON)?\s*([\s\S]*?)```/)
  const source = fenced ? fenced[1] : raw
  const start = source.search(/[{[]/)
  if (start < 0) return null
  const open = source[start]
  const close = open === '{' ? '}' : ']'
  const end = source.lastIndexOf(close)
  if (end <= start) return null
  return source
    .slice(start, end + 1)
    .replace(/[“”]/g, '"') // smart quotes from chat apps
    .replace(/,\s*([}\]])/g, '$1') // trailing commas
}

export function parsePursuitJson(raw: string): ParseResult {
  if (!raw.trim()) return { ok: false, error: 'Paste the AI reply to preview it.' }

  const json = extractJson(raw)
  if (!json) return { ok: false, error: "Couldn't find any JSON in that text — make sure you copied the whole reply." }

  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    return { ok: false, error: 'The JSON looks incomplete or broken. If the reply got cut off, ask the AI to "continue" and paste the full thing.' }
  }

  const root = isRecord(data) ? data : { steps: data }
  const topSteps = pickChildren(root)
  if (topSteps.length === 0) return { ok: false, error: 'No steps found. The JSON needs a "steps" list.' }

  const rows: OutlineRow[] = []
  let flattened = 0
  let truncated = false

  const walk = (items: unknown[], depth: number) => {
    for (const item of items) {
      if (rows.length >= MAX_TOTAL_STEPS) {
        truncated = true
        return
      }
      const obj = typeof item === 'string' ? { text: item } : isRecord(item) ? item : null
      if (!obj) continue
      const text = cleanText(pickString(obj, TEXT_KEYS))
      if (!text) continue
      // Anything deeper than the limit is kept, just lifted onto the deepest level.
      if (depth >= MAX_STEP_DEPTH) flattened += 1
      rows.push({
        key: newRowKey(),
        text,
        note: pickString(obj, NOTE_KEYS),
        depth: Math.min(depth, MAX_STEP_DEPTH - 1),
        estimate: pickEstimate(obj),
      })
      walk(pickChildren(obj), depth + 1)
    }
  }
  walk(topSteps, 0)

  if (rows.length === 0) return { ok: false, error: 'The steps are empty — each one needs a "text".' }

  const warnings: string[] = []
  if (flattened > 0) {
    warnings.push(`${flattened} item${flattened === 1 ? ' was' : 's were'} nested deeper than ${MAX_STEP_DEPTH} levels and moved up to level ${MAX_STEP_DEPTH}.`)
  }
  if (truncated) warnings.push(`Only the first ${MAX_TOTAL_STEPS} steps were kept.`)

  return {
    ok: true,
    plan: {
      title: pickString(root, ['title', 'name', 'topic']),
      category: pickString(root, ['category']),
      rows,
      warnings,
    },
  }
}

// ── Outline rows ───────────────────────────────────────────────────────────
// The editor keeps the tree as a flat list with depths (easy Enter/Tab/Shift+Tab
// semantics); the invariant is depth[0] = 0 and depth[i] <= depth[i-1] + 1.

export const createEmptyRow = (depth = 0): OutlineRow => ({ key: newRowKey(), text: '', note: '', depth, estimate: null })

/** A row is a parent when the next row sits deeper. */
export const rowHasChildren = (rows: OutlineRow[], index: number) =>
  index + 1 < rows.length && rows[index + 1].depth > rows[index].depth

/** A parent's time is the sum of the leaf estimates in its subtree. */
export function subtreeEstimate(rows: OutlineRow[], index: number): number {
  let total = 0
  const end = subtreeEnd(rows, index)
  for (let i = index + 1; i < end; i += 1) {
    if (!rowHasChildren(rows, i) && rows[i].estimate) total += rows[i].estimate ?? 0
  }
  return total
}

/** Restores the depth invariant after a removal or paste. */
export function normalizeRows(rows: OutlineRow[]): OutlineRow[] {
  let prev = -1
  return rows.map((row) => {
    const depth = Math.max(0, Math.min(row.depth, prev + 1, MAX_STEP_DEPTH - 1))
    prev = depth
    return depth === row.depth ? row : { ...row, depth }
  })
}

/** Index one past the last descendant of rows[index]. */
export function subtreeEnd(rows: OutlineRow[], index: number): number {
  let end = index + 1
  while (end < rows.length && rows[end].depth > rows[index].depth) end += 1
  return end
}

export function canIndent(rows: OutlineRow[], index: number): boolean {
  if (index === 0 || rows[index].depth > rows[index - 1].depth) return false
  const deepest = Math.max(...rows.slice(index, subtreeEnd(rows, index)).map((r) => r.depth))
  return deepest + 1 <= MAX_STEP_DEPTH - 1
}

/** Moves a row together with its descendants one level in or out. */
export function shiftSubtree(rows: OutlineRow[], index: number, delta: 1 | -1): OutlineRow[] {
  const end = subtreeEnd(rows, index)
  return rows.map((row, i) => (i >= index && i < end ? { ...row, depth: row.depth + delta } : row))
}

/** Splits a pasted multi-line list ("- a\n  - b") into rows, reading nesting from indentation. */
export function rowsFromPlainText(text: string, baseDepth: number): OutlineRow[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim())
  const indents = lines.map((line) => (line.match(/^[ \t]*/)?.[0] ?? '').replace(/\t/g, '  ').length)
  const minIndent = Math.min(...indents)
  const steps = [...new Set(indents.map((n) => n - minIndent).filter((n) => n > 0))].sort((a, b) => a - b)
  return lines.map((line, i) => {
    const level = steps.indexOf(indents[i] - minIndent) + 1
    return { key: newRowKey(), text: cleanText(line), note: '', depth: baseDepth + level, estimate: null }
  })
}

export function rowsToInputs(rows: OutlineRow[]): PursuitStepInput[] {
  const root: PursuitStepInput[] = []
  // stack[d] is the list that a row at depth d appends to.
  const stack: PursuitStepInput[][] = [root]
  const cleaned = normalizeRows(rows.filter((r) => r.text.trim()))
  cleaned.forEach((row, index) => {
    const input: PursuitStepInput = { text: row.text.trim(), children: [] }
    if (row.note.trim()) input.note = row.note.trim()
    if (row.estimate && !rowHasChildren(cleaned, index)) input.estimateMinutes = row.estimate
    stack.length = row.depth + 1
    stack[row.depth].push(input)
    stack.push(input.children ?? [])
  })
  return root
}

export function outlineStats(rows: OutlineRow[]): { count: number; levels: number; minutes: number } {
  const filled = rows.filter((r) => r.text.trim())
  const minutes = rows.reduce((sum, row, i) => (row.estimate && !rowHasChildren(rows, i) ? sum + row.estimate : sum), 0)
  return { count: filled.length, levels: filled.length ? Math.max(...filled.map((r) => r.depth)) + 1 : 0, minutes }
}
