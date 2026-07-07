import { CalendarClock, Cloud, Inbox, Wind } from 'lucide-react'
import type { MindEntry } from '../mind-types'
import { mindFormatDay } from '../mind-types'

type WorryParkingCardProps = {
  parked: MindEntry[]
  onBringBack: (id: string) => void
  onRelease: (id: string) => void
}

function WorryParkingCard({ parked, onBringBack, onRelease }: WorryParkingCardProps) {
  return (
    <section className="mind-card mind-card--parking mind-tint-mist" aria-label="Worry parking lot">
      <Cloud className="mind-card-watermark" size={104} strokeWidth={1.3} aria-hidden="true" />
      <div className="mind-card-head">
        <span className="mind-card-icon">
          <Cloud size={16} />
        </span>
        <div>
          <h2 className="mind-card-title">Worry parking lot</h2>
          <p className="mind-card-sub">Not now — scheduled for later</p>
        </div>
      </div>

      {parked.length === 0 ? (
        <div className="mind-empty">
          <Wind size={16} />
          <p>The lot is empty. Nothing waiting on you here.</p>
        </div>
      ) : (
        <ul className="mind-parked-list">
          {parked.map((entry) => (
            <li key={entry.id} className="mind-parked-item">
              <p className="mind-parked-text">“{entry.text}”</p>
              <span className="mind-parked-date">
                <CalendarClock size={11} />
                Returns {entry.reviewDate ? mindFormatDay(entry.reviewDate) : 'someday'}
              </span>
              <div className="mind-parked-actions">
                <button type="button" className="mind-ghost-btn" onClick={() => onBringBack(entry.id)}>
                  <Inbox size={12} />
                  Bring back
                </button>
                <button type="button" className="mind-ghost-btn" onClick={() => onRelease(entry.id)}>
                  <Wind size={12} />
                  Release
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mind-parked-footnote">2 parked worries expired last week without ever coming true.</p>
    </section>
  )
}

export { WorryParkingCard }
