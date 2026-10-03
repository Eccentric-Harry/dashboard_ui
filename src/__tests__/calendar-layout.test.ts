import { describe, expect, it } from 'vitest'

import type { CalendarItem } from '@/types/calendar'
import { fetchRange, gridDays, isoWeek, rangeHeading, stepDate, toISODate, viewDates } from '@/features/calendar/calendar-dates'
import { dayLoad, freeSlots, itemStatus, layoutDay, minutesByCategory, splitNotes } from '@/features/calendar/calendar-layout'
import { guessCategory } from '@/features/calendar/calendar-icons'

let seq = 0
const block = (startTime: string | undefined, endTime?: string, extra: Partial<CalendarItem> = {}): CalendarItem => ({
  id: `b${++seq}`,
  date: '2026-10-04',
  title: `Block ${seq}`,
  startTime,
  endTime,
  ...extra,
})

describe('layoutDay', () => {
  it('gives a lone block the full width', () => {
    const [p] = layoutDay([block('09:00', '10:00')])
    expect(p).toMatchObject({ col: 0, span: 1, cols: 1, start: 540, end: 600 })
  })

  it('splits only the blocks that actually clash', () => {
    const a = block('09:00', '10:00')
    const b = block('09:30', '10:30')
    const lone = block('14:00', '15:00')
    const placed = layoutDay([lone, b, a])
    const byId = (id?: string) => placed.find((p) => p.item.id === id)!
    expect(byId(a.id)).toMatchObject({ col: 0, cols: 2, span: 1 })
    expect(byId(b.id)).toMatchObject({ col: 1, cols: 2, span: 1 })
    // An afternoon block on the same day is not squeezed by the morning clash.
    expect(byId(lone.id)).toMatchObject({ col: 0, cols: 1, span: 1 })
  })

  it('widens a block into columns that stay free for its whole length', () => {
    const long = block('09:00', '12:00')
    const early = block('09:00', '09:30')
    const late = block('11:00', '11:30')
    const short = block('09:45', '10:00')
    const placed = layoutDay([long, early, late, short])
    const byId = (id?: string) => placed.find((p) => p.item.id === id)!
    // long takes col 0; early and late share col 1; short lands in col 1 too (early has ended).
    expect(byId(long.id)).toMatchObject({ col: 0, cols: 2 })
    expect(byId(early.id)).toMatchObject({ col: 1, span: 1 })
  })

  it('keeps tiny back-to-back blocks from overprinting via the minimum drawn height', () => {
    const a = block('09:00', '09:10')
    const b = block('09:10', '09:20')
    expect(layoutDay([a, b]).every((p) => p.cols === 1)).toBe(true)
    expect(layoutDay([a, b], 25).every((p) => p.cols === 2)).toBe(true)
  })

  it('ignores all-day items and reads a missing end as an hour', () => {
    const placed = layoutDay([block(undefined, undefined, { allDay: true }), block('08:00')])
    expect(placed).toHaveLength(1)
    expect(placed[0]).toMatchObject({ start: 480, end: 540 })
  })

  it('treats 23:59 as midnight', () => {
    expect(layoutDay([block('23:00', '23:59')])[0].end).toBe(1440)
  })
})

describe('day summaries', () => {
  it('counts booked time without cancelled blocks or reminder moments', () => {
    const items = [
      block('09:00', '10:30'),
      block('11:00', '12:00', { cancelled: true }),
      block('13:00', undefined, { itemType: 'REMINDER' }),
      block(undefined, undefined, { allDay: true }),
    ]
    expect(dayLoad(items)).toEqual({ count: 3, minutes: 90 })
  })

  it('finds the open stretches between blocks', () => {
    const items = [block('09:00', '10:00'), block('09:30', '11:00'), block('13:00', '13:20')]
    expect(freeSlots(items, 8 * 60, 15 * 60, 30)).toEqual([
      { start: 480, end: 540 },
      { start: 660, end: 780 },
      { start: 800, end: 900 },
    ])
  })

  it('totals planned minutes per category', () => {
    const totals = minutesByCategory([
      block('09:00', '10:00', { category: 'Work' }),
      block('10:00', '10:30', { category: 'Work' }),
      block('18:00', '19:00'),
    ])
    expect(totals.get('Work')).toBe(90)
    expect(totals.get('Personal')).toBe(60)
  })

  it('tells live, past, upcoming and done apart', () => {
    const now = 10 * 60
    expect(itemStatus(block('09:30', '10:30'), '2026-10-04', now)).toBe('live')
    expect(itemStatus(block('08:00', '09:00'), '2026-10-04', now)).toBe('past')
    expect(itemStatus(block('11:00', '12:00'), '2026-10-04', now)).toBe('upcoming')
    expect(itemStatus(block('11:00', '12:00', { completed: true }), '2026-10-04', now)).toBe('done')
    expect(itemStatus(block('11:00', '12:00', { date: '2026-10-03' }), '2026-10-04', now)).toBe('past')
  })

  it('splits notes into prose and a checklist', () => {
    expect(splitNotes('Agenda first\n- [ ] Slides\n- [x] Room booked')).toEqual({
      prose: 'Agenda first',
      checklist: [
        { text: 'Slides', done: false },
        { text: 'Room booked', done: true },
      ],
    })
  })
})

describe('calendar dates', () => {
  // Sunday, 4 Oct 2026
  const SUNDAY = '2026-10-04'

  it('draws the right columns for each grid view', () => {
    expect(gridDays('day', SUNDAY).map(toISODate)).toEqual([SUNDAY])
    expect(gridDays('workweek', '2026-10-07').map(toISODate)).toEqual(['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09'])
    const week = gridDays('week', '2026-10-07').map(toISODate)
    expect(week[0]).toBe(SUNDAY)
    expect(week).toHaveLength(7)
  })

  it('fetches a range that covers both the view and the mini month', () => {
    const r = fetchRange('week', '2026-10-30')
    expect(r.start <= '2026-09-27').toBe(true) // October's grid starts Sun 27 Sep
    expect(r.end >= '2026-11-07').toBe(true) // and the 4-week block runs past it
    const agenda = fetchRange('agenda', '2026-10-25')
    expect(agenda.end >= '2026-11-14').toBe(true)
  })

  it('steps by the view and clamps month ends', () => {
    expect(stepDate('week', SUNDAY, 1)).toBe('2026-10-11')
    expect(stepDate('workweek', SUNDAY, -1)).toBe('2026-09-27')
    expect(stepDate('month', '2027-01-31', 1)).toBe('2027-02-28')
  })

  it('labels weeks and ranges', () => {
    expect(isoWeek(new Date(2026, 9, 4))).toBe(40)
    expect(rangeHeading('week', SUNDAY)).toEqual({ eyebrow: 'Week 40 · Oct 4 – 10', title: 'October', year: '2026' })
    expect(viewDates('month', SUNDAY)).toHaveLength(31)
  })
})

describe('guessCategory', () => {
  it('files quick-add titles by their words', () => {
    expect(guessCategory('Gym')).toBe('Health')
    expect(guessCategory('Standup with the team')).toBe('Work')
    expect(guessCategory('Pay rent')).toBe('Finance')
    expect(guessCategory('Dinner with Riya')).toBe('Social')
    expect(guessCategory('Water the plants')).toBe('Personal')
  })
})
