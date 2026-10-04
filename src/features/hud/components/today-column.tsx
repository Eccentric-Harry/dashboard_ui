// Left gutter — TODAY: time, what's next, and the work in front of you.
//
// The command-center half of the HUD. Three questions, one card each, each
// answerable at a glance: what time is it and how much of the day is left; what's
// happening now and next (Notion Calendar's menu bar, Fantastical's list); and am I
// focusing. Every card opens the route it summarises.

import { Pause, Play } from 'lucide-react'
import type { AppPath } from '@/app/routes'
import type { CalendarItem } from '@/types/calendar'
import { compareItems, isTimed, itemSpan } from '@/features/calendar/calendar-layout'
import { formatShortTime } from '@/features/calendar/calendar-time'
import { localToday } from '@/lib/finance-ledger'
import { focusActions, useFocusStore } from '@/store/focus-store'
import { useHudStore } from '@/store/hud-store'
import { cn } from '@/lib/utils'
import { HudCard, HudMeter } from './hud-primitives'
import { localTimeZone, timeZoneCity } from '../hud-format'
import { isoWeek } from '@/features/calendar/calendar-dates'
import type { HudDensity } from '../use-gutter-space'

type Navigate = (path: AppPath, search?: string) => void

const dayLabel = (now: Date) => now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })

/** "2h 14m", "38m". */
function spanText(minutes: number): string {
  const m = Math.max(0, Math.round(minutes))
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  const rest = m % 60
  return rest ? `${h}h ${rest}m` : `${h}h`
}

function inWords(minutes: number): string {
  if (minutes < 1) return 'now'
  return `in ${spanText(minutes)}`
}

// ── Clock ─────────────────────────────────────────────────────────────────────

function ClockCard({ now }: { now: Date }) {
  const hours = now.getHours()
  const minutesOfDay = hours * 60 + now.getMinutes() + now.getSeconds() / 60
  const left = 24 * 60 - minutesOfDay
  const h12 = hours % 12 === 0 ? 12 : hours % 12

  return (
    <HudCard label={dayLabel(now)} meta={timeZoneCity(localTimeZone())} className="hud-panel--clock">
      <p className="hud-clock">
        <span className="hud-clock-hm">
          {h12}:{String(now.getMinutes()).padStart(2, '0')}
        </span>
        <span className="hud-clock-side">
          <span className="hud-clock-s">{String(now.getSeconds()).padStart(2, '0')}</span>
          <span className="hud-clock-ap">{hours < 12 ? 'AM' : 'PM'}</span>
        </span>
      </p>
      <HudMeter ratio={minutesOfDay / (24 * 60)} tone="idle" />
      <p className="hud-foot">
        <span>{spanText(left)} left today</span>
        <span>Week {isoWeek(now)}</span>
      </p>
    </HudCard>
  )
}

// ── Up next ───────────────────────────────────────────────────────────────────

function UpNextCard({ now, density, onNavigate }: { now: Date; density: HudDensity; onNavigate: Navigate }) {
  const agenda = useHudStore.use.agenda()
  const today = localToday()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const items: CalendarItem[] = agenda.data ?? []
  const open = items.filter((i) => !i.cancelled)
  const todays = open.filter((i) => i.date === today)
  const timed = todays.filter((i) => isTimed(i) && !i.completed).sort(compareItems)
  const live = timed.filter((i) => {
    const { start, end } = itemSpan(i)
    return nowMinutes >= start && nowMinutes < end
  })
  const coming = timed.filter((i) => itemSpan(i).start > nowMinutes)
  const tomorrow = open.filter((i) => i.date > today && isTimed(i) && !i.completed).sort(compareItems)
  const tasks = todays.filter((i) => i.itemType === 'TASK')
  const tasksDone = tasks.filter((i) => i.completed).length
  // A tall column carries on into tomorrow; the list fades out rather than clipping a row.
  const maxRows = density === 'minimal' ? 4 : 9
  const rows = coming.slice(0, Math.max(0, maxRows - live.length * 2))
  const tomorrowRows = tomorrow.slice(0, Math.max(0, maxRows - live.length * 2 - rows.length - 1))
  const loading = !agenda.loaded && !agenda.hasErrors && !agenda.data

  return (
    <HudCard label="Up next" grow onOpen={() => onNavigate('/calendar')} openLabel="Open calendar" className="hud-panel--next">
      {loading ? (
        <div className="hud-skeleton" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
      ) : agenda.hasErrors && !agenda.data ? (
        <p className="hud-note">Couldn’t load your calendar.</p>
      ) : (
        <>
          {live.map((item) => {
            const { start, end } = itemSpan(item)
            return (
              <div key={item.occurrenceId ?? item.id ?? item.title} className="hud-live">
                <span className="hud-live-tag">Now</span>
                <b className="hud-live-title">{item.title}</b>
                <span className="hud-live-meta">ends {formatShortTime(end)} · {spanText(end - nowMinutes)} left</span>
                <HudMeter ratio={(nowMinutes - start) / Math.max(1, end - start)} tone="good" />
              </div>
            )
          })}

          {live.length === 0 && rows.length === 0 && (
            <p className="hud-empty">
              <b>Nothing else on the calendar today.</b>
            </p>
          )}

          {(rows.length > 0 || tomorrowRows.length > 0) && (
            <ul className="hud-agenda">
              {rows.map((item, i) => {
                const { start } = itemSpan(item)
                return (
                  <li key={item.occurrenceId ?? item.id ?? `${item.title}-${start}`} className={cn(i === 0 && live.length === 0 && 'is-first')}>
                    <span className="hud-agenda-time">{formatShortTime(start)}</span>
                    <span className="hud-agenda-title">{item.title}</span>
                    {i === 0 && <span className="hud-agenda-in">{inWords(start - nowMinutes)}</span>}
                  </li>
                )
              })}
              {tomorrowRows.length > 0 && (
                <li className="hud-agenda-day" aria-hidden="true">
                  Tomorrow
                </li>
              )}
              {tomorrowRows.map((item) => {
                const { start } = itemSpan(item)
                return (
                  <li key={`t-${item.occurrenceId ?? item.id ?? `${item.title}-${start}`}`} className="is-later">
                    <span className="hud-agenda-time">{formatShortTime(start)}</span>
                    <span className="hud-agenda-title">{item.title}</span>
                  </li>
                )
              })}
            </ul>
          )}

          <div className="hud-tasks">
            <p className="hud-foot">
              <span>{tasks.length ? `Tasks · ${tasksDone} of ${tasks.length} done` : 'No tasks due today'}</span>
            </p>
            {tasks.length > 0 && <HudMeter ratio={tasksDone / tasks.length} tone="good" />}
          </div>
        </>
      )}
    </HudCard>
  )
}

// ── Focus ─────────────────────────────────────────────────────────────────────

function FocusCard({ onNavigate }: { onNavigate: Navigate }) {
  const session = useFocusStore.use.session()
  const remainingMs = useFocusStore.use.remainingSeconds()
  const focus = useHudStore.use.focus()
  const todayMinutes = (focus.data ?? []).reduce((sum, d) => sum + (d.totalMinutes ?? 0), 0)
  const sessions = (focus.data ?? []).reduce((sum, d) => sum + (d.sessions ?? 0), 0)
  const active = session && (session.status === 'RUNNING' || session.status === 'PAUSED')

  if (active) {
    const totalMs = session.durationMinutes * 60_000
    const left = Math.max(0, Math.ceil(remainingMs / 1000))
    const mm = Math.floor(left / 60)
    const ss = left % 60
    const paused = session.status === 'PAUSED'
    return (
      <HudCard label="Focus" meta={paused ? 'Paused' : 'In session'} onOpen={() => onNavigate('/learnings')} openLabel="Open learnings" className="hud-panel--focus">
        <p className="hud-focus-time">
          {mm}:{String(ss).padStart(2, '0')}
        </p>
        <p className="hud-focus-what">{session.activePursuit}</p>
        <HudMeter ratio={totalMs ? 1 - remainingMs / totalMs : 0} tone="good" />
        <button
          type="button"
          className="hud-chip-btn"
          onClick={(event) => {
            event.stopPropagation()
            void (paused ? focusActions.resume() : focusActions.pause())
          }}
        >
          {paused ? <Play size={11} strokeWidth={2.6} /> : <Pause size={11} strokeWidth={2.6} />}
          {paused ? 'Resume' : 'Pause'}
        </button>
      </HudCard>
    )
  }

  return (
    <HudCard label="Focus" onOpen={() => onNavigate('/learnings')} openLabel="Start a focus session in learnings" className="hud-panel--focus">
      <p className="hud-big">
        {todayMinutes > 0 ? spanText(todayMinutes) : '0m'}
        <small>focused today</small>
      </p>
      <p className="hud-foot">
        <span>{sessions > 0 ? `${sessions} session${sessions === 1 ? '' : 's'}` : 'Start one from a pursuit'}</span>
      </p>
    </HudCard>
  )
}

export function TodayColumn({ now, density, onNavigate }: { now: Date; density: HudDensity; onNavigate: Navigate }) {
  return (
    <div className="hud-column hud-column--today is-filled">
      <ClockCard now={now} />
      <UpNextCard now={now} density={density} onNavigate={onNavigate} />
      {density !== 'minimal' && <FocusCard onNavigate={onNavigate} />}
    </div>
  )
}
