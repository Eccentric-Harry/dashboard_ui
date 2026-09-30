// Fantastical-style quick entry: "Gym tomorrow 7am for 45m every Mon" →
// title "Gym", next Monday, 07:00–07:45, weekly. Matched phrases are cut out of
// the title so what's left reads as a name. Pure and deterministic (today is
// passed in) so it can be unit tested.

import type { CalendarRecurrence } from '@/types/calendar'

export type ParseKind = 'date' | 'time' | 'duration' | 'repeat' | 'allDay'

export type ParsedEntry = {
  /** The text with every recognised phrase removed. */
  title: string
  date?: string
  /** Minutes from midnight. */
  start?: number
  end?: number
  duration?: number
  allDay?: boolean
  recurrence?: CalendarRecurrence
  /** What was recognised, in reading order — shown as chips under the title. */
  found: ParseKind[]
}

const WEEKDAYS: [RegExp, number][] = [
  [/^sun(day)?$/, 0],
  [/^mon(day)?$/, 1],
  [/^tue(s|sday)?$/, 2],
  [/^wed(nesday)?$/, 3],
  [/^thu(r|rs|rsday)?$/, 4],
  [/^fri(day)?$/, 5],
  [/^sat(urday)?$/, 6],
]
const WEEKDAY_SRC = 'sun(?:day)?|mon(?:day)?|tue(?:s|sday)?|wed(?:nesday)?|thu(?:r|rs|rsday)?|fri(?:day)?|sat(?:urday)?'
const MONTH_SRC = 'jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?'
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addDays(base: Date, n: number) {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate())
  d.setDate(d.getDate() + n)
  return d
}

function weekdayIndex(word: string) {
  const w = word.toLowerCase()
  return WEEKDAYS.find(([re]) => re.test(w))?.[1] ?? -1
}

/** Next date falling on `weekday`; today counts unless `skipToday`. */
function nextWeekday(today: Date, weekday: number, skipToday = false) {
  let diff = (weekday - today.getDay() + 7) % 7
  if (diff === 0 && skipToday) diff = 7
  return addDays(today, diff)
}

function toMinutes(hourText: string, minuteText: string | undefined, meridiem: string | undefined) {
  let h = Number(hourText)
  const m = minuteText ? Number(minuteText) : 0
  if (Number.isNaN(h) || m > 59) return null
  const mer = meridiem?.toLowerCase()[0]
  if (mer) {
    if (h < 1 || h > 12) return null
    if (mer === 'p' && h !== 12) h += 12
    if (mer === 'a' && h === 12) h = 0
  } else if (h > 23) {
    return null
  }
  return h * 60 + m
}

/** A bare "at 5" has no meridiem — read it the way people usually mean it. */
function guessHour(h: number) {
  if (h >= 13 || h === 0) return h * 60
  if (h === 12) return 12 * 60
  return (h <= 7 ? h + 12 : h) * 60
}

type Match = { kind: ParseKind; index: number; length: number }

export function parseEntry(text: string, today: Date, disabled: ParseKind[] = []): ParsedEntry {
  const out: ParsedEntry = { title: text, found: [] }
  const hits: Match[] = []
  let work = text
  const on = (kind: ParseKind) => !disabled.includes(kind)

  // Blank out a match (same length) so later patterns can't re-read it and
  // indexes into the original string stay valid.
  const take = (kind: ParseKind, re: RegExp): RegExpExecArray | null => {
    const m = re.exec(work)
    if (!m) return null
    hits.push({ kind, index: m.index, length: m[0].length })
    work = work.slice(0, m.index) + ' '.repeat(m[0].length) + work.slice(m.index + m[0].length)
    return m
  }

  if (on('allDay') && take('allDay', /\ball[- ]day\b/i)) out.allDay = true

  if (on('repeat')) {
    let m: RegExpExecArray | null
    if (take('repeat', /\b(?:every\s*day|daily|every\s+weekday)\b/i)) out.recurrence = 'DAILY'
    else if ((m = take('repeat', new RegExp(`\\bevery\\s+(${WEEKDAY_SRC})\\b`, 'i')))) {
      out.recurrence = 'WEEKLY'
      if (on('date')) out.date = toISO(nextWeekday(today, weekdayIndex(m[1])))
    } else if (take('repeat', /\b(?:every\s+week|weekly)\b/i)) out.recurrence = 'WEEKLY'
    else if (take('repeat', /\b(?:every\s+month|monthly)\b/i)) out.recurrence = 'MONTHLY'
  }

  if (on('date') && !out.date) {
    let m: RegExpExecArray | null
    if (take('date', /\b(?:the\s+)?day\s+after\s+tomorrow\b/i)) out.date = toISO(addDays(today, 2))
    else if (take('date', /\b(?:tomorrow|tmrw|tmr)\b/i)) out.date = toISO(addDays(today, 1))
    else if (take('date', /\b(?:today|tonight)\b/i)) out.date = toISO(today)
    else if ((m = take('date', /\bin\s+(\d{1,2})\s+(days?|weeks?)\b/i))) {
      const n = Number(m[1]) * (m[2].toLowerCase().startsWith('w') ? 7 : 1)
      out.date = toISO(addDays(today, n))
    } else if ((m = take('date', new RegExp(`\\b(?:on\\s+)?(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH_SRC})\\b`, 'i')))) {
      out.date = monthDay(today, Number(m[1]), m[2])
    } else if ((m = take('date', new RegExp(`\\b(?:on\\s+)?(${MONTH_SRC})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`, 'i')))) {
      out.date = monthDay(today, Number(m[2]), m[1])
    } else if ((m = take('date', new RegExp(`\\b(?:on\\s+)?(next\\s+)?(${WEEKDAY_SRC})\\b`, 'i')))) {
      out.date = toISO(nextWeekday(today, weekdayIndex(m[2]), Boolean(m[1])))
    }
    if (out.date === undefined) delete out.date
  }

  if (on('time') && !out.allDay) {
    let m: RegExpExecArray | null
    // Ranges first: "2-3pm", "9 to 11am", "14:00–15:30", "from 6pm until 8pm".
    if ((m = take('time', /\b(?:from\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm|a|p)?\s*(?:-|–|to|until|till)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm|a|p)?\b/i))) {
      const [, h1, m1, mer1, h2, m2, mer2] = m
      const explicit = mer1 || mer2 || m1 || m2
      const end = toMinutes(h2, m2, mer2)
      let start = toMinutes(h1, m1, mer1 ?? (mer2 && !m1 && Number(h1) <= 12 ? mer2 : undefined))
      if (start != null && end != null && !mer1 && mer2 && start >= end) start = toMinutes(h1, m1, /^p/i.test(mer2) ? 'am' : 'pm')
      if (explicit && start != null && end != null && end > start) {
        out.start = start
        out.end = end
      } else {
        hits.pop()
        work = work.slice(0, m.index) + m[0] + work.slice(m.index + m[0].length)
      }
    }
    if (out.start == null) {
      if ((m = take('time', /(?:\bat\s+|@\s*)?\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|a|p)\b/i))) {
        const t = toMinutes(m[1], m[2], m[3])
        if (t != null) out.start = t
      } else if ((m = take('time', /(?:\bat\s+|@\s*)?\b([01]?\d|2[0-3]):([0-5]\d)\b/))) {
        out.start = Number(m[1]) * 60 + Number(m[2])
      } else if ((m = take('time', /(?:\bat\s+|@\s*)(\d{1,2})\b(?!\s*(?:min|m\b|h\b|hr|hour))/i))) {
        out.start = guessHour(Number(m[1]))
      } else if (take('time', /\b(?:at\s+)?noon\b/i)) out.start = 12 * 60
      else if (take('time', /\b(?:in\s+the\s+)?morning\b/i)) out.start = 9 * 60
      else if (take('time', /\b(?:in\s+the\s+)?afternoon\b/i)) out.start = 14 * 60
      else if (take('time', /\b(?:in\s+the\s+)?evening\b/i)) out.start = 18 * 60
    }
  }

  if (on('duration')) {
    let m: RegExpExecArray | null
    if ((m = take('duration', /\bfor\s+(\d+(?:\.\d+)?)\s*(?:h|hrs?|hours?)\s*(?:(\d{1,2})\s*(?:m|mins?|minutes?))?\b/i))) {
      out.duration = Math.round(Number(m[1]) * 60 + (m[2] ? Number(m[2]) : 0))
    } else if ((m = take('duration', /\bfor\s+(\d{1,3})\s*(?:m|mins?|minutes?)\b/i))) {
      out.duration = Number(m[1])
    } else if (take('duration', /\bfor\s+(?:an?|one)\s+hour\b/i)) out.duration = 60
    else if (take('duration', /\bfor\s+half\s+an?\s+hour\b/i)) out.duration = 30
    if (out.duration != null && (out.duration <= 0 || out.duration > 24 * 60)) delete out.duration
  }

  if (out.start != null && out.end == null && out.duration != null) {
    out.end = Math.min(24 * 60, out.start + out.duration)
  }

  hits.sort((a, b) => a.index - b.index)
  out.found = [...new Set(hits.map((h) => h.kind))]
  out.title = cleanTitle(work)
  return out
}

function monthDay(today: Date, day: number, monthWord: string) {
  const month = MONTHS.indexOf(monthWord.slice(0, 3).toLowerCase())
  if (month < 0 || day < 1 || day > 31) return undefined
  let d = new Date(today.getFullYear(), month, day)
  if (d.getMonth() !== month) return undefined
  if (d < new Date(today.getFullYear(), today.getMonth(), today.getDate())) d = new Date(today.getFullYear() + 1, month, day)
  return toISO(d)
}

/** Drop the connectives a removed phrase leaves stranded ("Lunch at", "Call on"). */
function cleanTitle(text: string) {
  let t = text.replace(/\s+/g, ' ').trim()
  for (let i = 0; i < 3; i++) {
    t = t
      .replace(/\s+(?:at|on|from|for|by|@|,|-|–)$/i, '')
      .replace(/^(?:at|on|from|for|@|,|-|–)\s+/i, '')
      .replace(/\s+(?:at|on|for|@)\s+(?=(?:at|on|for|@)\b)/gi, ' ')
      .trim()
  }
  return t.replace(/[\s,;:–-]+$/, '').trim()
}

/** A typed clock time: "9", "930", "9:30", "9p", "9:30 pm", "21:15" → minutes, or null. */
export function parseClock(text: string): number | null {
  const t = text.trim().toLowerCase().replace(/\s+/g, '').replace(/\./g, '')
  if (t === 'noon') return 12 * 60
  if (t === 'midnight') return 0
  const m = /^(\d{1,2})(?::?(\d{2}))?(am|pm|a|p|m)?$/.exec(t)
  if (!m) return null
  const mer = m[3] === 'm' ? undefined : m[3]
  return toMinutes(m[1], m[2], mer)
}
