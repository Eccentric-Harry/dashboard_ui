import { Flame } from 'lucide-react'
import { cn } from '../../../../lib/utils'
import type { HabitStrip } from '../habit-strips'
import { weekdayLetter } from '../home-types'

type MomentumCardProps = {
  loading: boolean
  strips: HabitStrip[]
  weekDates: string[]
}

function MomentumCard({ loading, strips, weekDates }: MomentumCardProps) {
  const anyActivity = strips.some((strip) => strip.days.some(Boolean))

  return (
    <section className="home-card home-card--momentum" aria-label="Momentum">
      <Flame className="home-card-glyph" aria-hidden="true" />
      <header className="home-card-head">
        <div>
          <span className="home-card-eyebrow">Momentum</span>
          <h2 className="home-card-title">Showing up</h2>
        </div>
      </header>

      {loading ? (
        <div className="home-card-body">
          <span className="home-skel home-skel--line" />
          <span className="home-skel home-skel--line" />
          <span className="home-skel home-skel--line" />
        </div>
      ) : !anyActivity ? (
        <div className="home-card-empty">
          <p>Every streak starts with one dot. Log anything today and it shows up here.</p>
        </div>
      ) : (
        <div className="home-habit-grid">
          <div className="home-habit-row home-habit-row--legend" aria-hidden="true">
            <span />
            <div className="home-habit-dots">
              {weekDates.map((date) => (
                <small key={date}>{weekdayLetter(date)}</small>
              ))}
            </div>
            <span />
          </div>
          {strips.map((strip) => {
            const Icon = strip.icon
            return (
              <div key={strip.id} className="home-habit-row">
                <span className="home-habit-label">
                  <Icon size={13} />
                  {strip.label}
                </span>
                <div className="home-habit-dots">
                  {strip.days.map((active, index) => (
                    <i key={weekDates[index]} className={cn('home-habit-dot', active && 'is-active')} />
                  ))}
                </div>
                <span className={cn('home-habit-streak', strip.streak > 0 && 'is-lit')}>
                  <Flame size={11} />
                  {strip.streak}
                  {strip.streakUnit ?? 'd'}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

export { MomentumCard }
