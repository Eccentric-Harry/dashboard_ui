import { describe, expect, it } from 'vitest'

import { parseClock, parseEntry } from '@/features/calendar/natural-language'

// Wednesday, 30 Sep 2026
const TODAY = new Date(2026, 8, 30)
const parse = (text: string) => parseEntry(text, TODAY)

describe('parseEntry', () => {
  it('reads a day, a time and a length, and leaves a clean title', () => {
    const p = parse('Gym tomorrow at 7am for 45m')
    expect(p).toMatchObject({ title: 'Gym', date: '2026-10-01', start: 420, end: 465, duration: 45 })
    expect(p.found).toEqual(['date', 'time', 'duration'])
  })

  it('reads ranges and borrows the meridiem from the end', () => {
    expect(parse('Standup 2-3pm')).toMatchObject({ title: 'Standup', start: 840, end: 900 })
    expect(parse('Lunch 11-1PM')).toMatchObject({ start: 660, end: 780 })
    expect(parse('Deep work 9 to 11am')).toMatchObject({ start: 540, end: 660 })
    expect(parse('Review 14:00–15:30')).toMatchObject({ start: 840, end: 930 })
  })

  it('does not mistake plain numbers for times', () => {
    const p = parse('Read 2 chapters')
    expect(p.start).toBeUndefined()
    expect(p.title).toBe('Read 2 chapters')
    expect(parse('Room 2-3 cleanup').start).toBeUndefined()
  })

  it('guesses a sensible half of the day for a bare "at"', () => {
    expect(parse('Call mom at 5').start).toBe(17 * 60)
    expect(parse('Walk at 8').start).toBe(8 * 60)
  })

  it('reads weekdays, next weekdays and month dates', () => {
    expect(parse('Dentist friday 4pm').date).toBe('2026-10-02')
    expect(parse('Retro wed').date).toBe('2026-09-30')
    expect(parse('Retro next wed').date).toBe('2026-10-07')
    expect(parse('Trip on 12 oct').date).toBe('2026-10-12')
    expect(parse('Tax filing Mar 5').date).toBe('2027-03-05')
    expect(parse('Review in 2 weeks').date).toBe('2026-10-14')
  })

  it('reads repeats, and "every <weekday>" also picks the first date', () => {
    expect(parse('Journal every day 10pm')).toMatchObject({ title: 'Journal', recurrence: 'DAILY', start: 1320 })
    expect(parse('Plan week every mon 9am')).toMatchObject({ title: 'Plan week', recurrence: 'WEEKLY', date: '2026-10-05' })
    expect(parse('Rent monthly')).toMatchObject({ title: 'Rent', recurrence: 'MONTHLY' })
  })

  it('reads all-day and skips times then', () => {
    expect(parse('Birthday party all day tomorrow')).toMatchObject({ title: 'Birthday party', allDay: true, date: '2026-10-01' })
  })

  it('leaves words that only contain a weekday alone', () => {
    expect(parse('Wedding planning').date).toBeUndefined()
    expect(parse('Sunset walk').date).toBeUndefined()
  })

  it('honours dismissed kinds', () => {
    const p = parseEntry('Monday review 10am', TODAY, ['date'])
    expect(p.date).toBeUndefined()
    expect(p.title).toBe('Monday review')
    expect(p.start).toBe(600)
  })
})

describe('parseClock', () => {
  it('reads the ways people type a time', () => {
    expect(parseClock('9')).toBe(540)
    expect(parseClock('930')).toBe(570)
    expect(parseClock('9:30 pm')).toBe(1290)
    expect(parseClock('9p')).toBe(1260)
    expect(parseClock('21:15')).toBe(1275)
    expect(parseClock('12am')).toBe(0)
    expect(parseClock('noon')).toBe(720)
    expect(parseClock('25:00')).toBeNull()
    expect(parseClock('soon')).toBeNull()
  })
})
