import type { CSSProperties } from 'react'
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
          {strips.map((strip, rowIndex) => {
            const Icon = strip.icon
            return (
              <div key={strip.id} className={cn('home-habit-row', `home-habit--${strip.id}`)}>
                <span className="home-habit-label">
                  <i className="home-habit-chip" aria-hidden="true">
                    <Icon size={13} strokeWidth={2.4} />
                  </i>
                  {strip.label}
                </span>
                <div className="home-habit-dots">
                  {strip.days.map((active, index) => (
                    <i
                      key={weekDates[index]}
                      className={cn('home-habit-cell', active && 'is-active')}
                      style={{ '--cell-delay': `${(rowIndex * 7 + index) * 22}ms` } as CSSProperties}
                      title={`${weekDates[index]}${active ? '' : ' — not logged'}`}
                    />
                  ))}
                </div>
                <span className={cn('home-habit-streak', strip.streak > 0 && 'is-lit')}>
                  <Flame size={11} strokeWidth={2.4} fill={strip.streak > 0 ? 'currentColor' : 'none'} />
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
