import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { AlertTriangle, CircleCheck } from 'lucide-react'

import type { CalendarItem } from '@/types/calendar'
import { cn } from '@/lib/utils'
import { DAY_MINUTES, SNAP_MINUTES, formatShortTime, snapMinutes, timeToMinutes } from '../../calendar-time'

type Props = {
  /** The day's other timed blocks (the one being edited already excluded). */
  others: CalendarItem[]
  start: number
  end: number
  onChange: (start: number, end: number) => void
  /** Minute of the day for the now tick, when the day is today. */
  now?: number
}

type Span = { title: string; start: number; end: number }

/**
 * Structured-style "see your day" strip inside the composer: every other block
 * that day as a quiet bar, this block in the accent colour. Click empty track
 * to drop the block there; drag it to slide it. Snaps to 15 minutes.
 */
export function DayGlance({ others, start, end, onChange, now }: Props) {
  const trackRef = useRef<HTMLDivElement | null>(null)
  const [dragging, setDragging] = useState(false)
  const grab = useRef(0)

  const spans: Span[] = others
    .filter((o) => o.startTime && !o.allDay && !o.cancelled)
    .map((o) => {
      const s = timeToMinutes(o.startTime!)
      return { title: o.title, start: s, end: o.endTime ? Math.max(s + 15, timeToMinutes(o.endTime)) : s + 60 }
    })
    .sort((a, b) => a.start - b.start)

  // Waking hours by default, widened to fit anything outside them.
  const lo = Math.floor(Math.min(6 * 60, start, ...spans.map((s) => s.start)) / 60) * 60
  const hi = Math.ceil(Math.max(23 * 60, end, ...spans.map((s) => s.end)) / 60) * 60
  const range = Math.max(60, Math.min(DAY_MINUTES, hi) - lo)
  const pct = (m: number) => `${((m - lo) / range) * 100}%`
  const duration = end - start

  const minuteAt = (clientX: number) => {
    const rect = trackRef.current!.getBoundingClientRect()
    return lo + ((clientX - rect.left) / rect.width) * range
  }

  const place = (rawStart: number) => {
    const s = Math.max(0, Math.min(DAY_MINUTES - duration, snapMinutes(rawStart)))
    if (s !== start) onChange(s, s + duration)
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const m = minuteAt(e.clientX)
    const onBlock = m >= start && m <= end
    grab.current = onBlock ? m - start : duration / 2
    if (!onBlock) place(m - grab.current)
    setDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const overlaps = spans.filter((s) => s.start < end && s.end > start)
  const next = spans.find((s) => s.start >= end)
  const prev = [...spans].reverse().find((s) => s.end <= start)

  let status: { tone: 'warn' | 'calm'; text: string }
  if (overlaps.length) {
    status = {
      tone: 'warn',
      text: `Overlaps ${overlaps.slice(0, 2).map((o) => `“${o.title}”`).join(' and ')}${overlaps.length > 2 ? ` +${overlaps.length - 2}` : ''}`,
    }
  } else if (!spans.length) {
    status = { tone: 'calm', text: 'Nothing else planned this day' }
  } else if (next) {
    status = { tone: 'calm', text: `Free until ${formatShortTime(next.start)} · then “${next.title}”` }
  } else {
    status = { tone: 'calm', text: `Clear for the rest of the day${prev ? ` after “${prev.title}”` : ''}` }
  }

  const ticks: number[] = []
  for (let h = Math.ceil(lo / 360) * 360; h <= lo + range; h += 360) ticks.push(h)

  return (
    <div className="cal-glance">
      <div
        ref={trackRef}
        className={cn('cal-glance-track', dragging && 'is-dragging')}
        onPointerDown={onPointerDown}
        onPointerMove={(e) => dragging && place(minuteAt(e.clientX) - grab.current)}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
        role="slider"
        aria-label="Block position in the day"
        aria-valuemin={0}
        aria-valuemax={DAY_MINUTES}
        aria-valuenow={start}
        aria-valuetext={`${formatShortTime(start)} to ${formatShortTime(end)}`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault()
            place(start + (e.key === 'ArrowRight' ? SNAP_MINUTES : -SNAP_MINUTES))
          }
        }}
      >
        {ticks.map((t) => (
          <span key={t} className="cal-glance-tick" style={{ left: pct(t) }} />
        ))}
        {spans.map((s, i) => (
          <span
            key={i}
            className={cn('cal-glance-span', s.start < end && s.end > start && 'is-clash')}
            style={{ left: pct(s.start), width: `calc(${pct(s.end)} - ${pct(s.start)})` }}
            title={`${s.title} · ${formatShortTime(s.start)}–${formatShortTime(s.end)}`}
          />
        ))}
        {now != null && now >= lo && now <= lo + range && <span className="cal-glance-now" style={{ left: pct(now) }} />}
        <span className="cal-glance-block" style={{ left: pct(start), width: `calc(${pct(end)} - ${pct(start)})` }} />
      </div>
      <div className="cal-glance-scale" aria-hidden="true">
        {ticks.map((t) => (
          <span key={t} style={{ left: pct(t) }}>{formatShortTime(t).replace(' ', '').toLowerCase()}</span>
        ))}
      </div>
      <p className={cn('cal-glance-status', `is-${status.tone}`)}>
        {status.tone === 'warn' ? <AlertTriangle size={12} strokeWidth={2.4} /> : <CircleCheck size={12} strokeWidth={2.4} />}
        <span>{status.text}</span>
      </p>
    </div>
  )
}
