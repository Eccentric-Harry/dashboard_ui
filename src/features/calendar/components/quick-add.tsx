import { useMemo, useState, type CSSProperties, type RefObject } from 'react'
import { CalendarPlus, CornerDownLeft, Loader2 } from 'lucide-react'

import type { CalendarItemPayload } from '@/types/calendar'
import { cn } from '@/lib/utils'
import { colorForCategory } from '../calendar-colors'
import { parseISODate, relativeDay } from '../calendar-dates'
import { guessCategory } from '../calendar-icons'
import { DAY_MINUTES, DEFAULT_BLOCK_MINUTES, formatMinuteRange, minutesToTime } from '../calendar-time'
import { parseEntry } from '../natural-language'

type Props = {
  /** Where an entry with no day in it lands. */
  defaultDate: string
  todayIso: string
  inputRef: RefObject<HTMLInputElement | null>
  onCreate: (payload: CalendarItemPayload) => Promise<boolean>
  /** Shift+Enter: carry the text into the full composer instead. */
  onExpand: (text: string) => void
}

const REPEAT_LABEL = { DAILY: 'Daily', WEEKLY: 'Weekly', MONTHLY: 'Monthly', NONE: '' } as const

/**
 * Fantastical-style quick entry: type it how you'd say it, see what was
 * understood, press Enter. Anything with a time becomes an event on the grid;
 * anything without one becomes an all-day task on its day.
 */
export function QuickAdd({ defaultDate, todayIso, inputRef, onCreate, onExpand }: Props) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [today] = useState(() => new Date())

  const draft = useMemo(() => {
    if (!text.trim()) return null
    const parsed = parseEntry(text, today)
    const title = parsed.title || text.trim()
    const date = parsed.date ?? defaultDate
    const timed = parsed.start != null && !parsed.allDay
    const start = parsed.start ?? 0
    const end = timed ? Math.min(DAY_MINUTES, parsed.end ?? start + (parsed.duration ?? DEFAULT_BLOCK_MINUTES)) : 0
    const category = guessCategory(title)
    const payload: CalendarItemPayload = {
      title,
      date,
      itemType: timed ? 'EVENT' : 'TASK',
      category,
      color: colorForCategory(category),
      allDay: !timed,
      startTime: timed ? minutesToTime(start) : undefined,
      endTime: timed ? minutesToTime(end) : undefined,
      recurrenceFrequency: parsed.recurrence ?? 'NONE',
    }
    return { payload, timed, start, end }
  }, [text, today, defaultDate])

  const submit = async () => {
    if (!draft || busy || !draft.payload.title) return
    setBusy(true)
    const ok = await onCreate(draft.payload)
    setBusy(false)
    if (ok) setText('')
  }

  const p = draft?.payload
  return (
    <div className={cn('cv-quick', text && 'is-typing')}>
      <label className="cv-quick-field">
        <CalendarPlus size={14} strokeWidth={2.2} className="cv-quick-ic" aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          value={text}
          maxLength={160}
          placeholder="Add “Gym tomorrow 7am”"
          aria-label="Quick add"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.shiftKey) {
              e.preventDefault()
              if (text.trim()) onExpand(text)
              setText('')
            } else if (e.key === 'Enter') {
              e.preventDefault()
              void submit()
            } else if (e.key === 'Escape') {
              setText('')
              e.currentTarget.blur()
            }
          }}
        />
        {busy ? (
          <Loader2 size={13} className="cv-quick-go animate-spin" />
        ) : (
          text && (
            <button type="button" className="cv-quick-go" onClick={() => void submit()} aria-label="Add">
              <CornerDownLeft size={13} strokeWidth={2.4} />
            </button>
          )
        )}
      </label>
      {p && (
        <div className="cv-quick-preview" aria-live="polite">
          <span className="cv-quick-chip is-cat" style={{ '--ev': colorForCategory(p.category ?? 'Personal') } as CSSProperties}>
            {p.category}
          </span>
          <span className="cv-quick-chip">{relativeDay(p.date, todayIso)}</span>
          <span className="cv-quick-chip">{draft.timed ? formatMinuteRange(draft.start, draft.end) : 'All-day task'}</span>
          {p.recurrenceFrequency && p.recurrenceFrequency !== 'NONE' && (
            <span className="cv-quick-chip">
              {p.recurrenceFrequency === 'WEEKLY'
                ? `Every ${parseISODate(p.date).toLocaleDateString('en-US', { weekday: 'short' })}`
                : REPEAT_LABEL[p.recurrenceFrequency]}
            </span>
          )}
          <span className="cv-quick-hint">
            <kbd>↵</kbd> add · <kbd>⇧↵</kbd> more
          </span>
        </div>
      )}
    </div>
  )
}
