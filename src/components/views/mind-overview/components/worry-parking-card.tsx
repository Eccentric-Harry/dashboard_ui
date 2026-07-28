import { useState } from 'react'
import { CalendarClock, ChevronDown, ChevronUp, Cloud, History, Inbox, Wind } from 'lucide-react'
import type { MindEntry } from '../mind-types'
import { mindFormatDay, mindFormatTimestamp } from '../mind-types'

type WorryParkingCardProps = {
  parked: MindEntry[]
  released: MindEntry[]
  onBringBack: (id: string) => void
  onRelease: (id: string) => void
}

function WorryParkingCard({ parked, released, onBringBack, onRelease }: WorryParkingCardProps) {
  const [showHistory, setShowHistory] = useState(false)
  const sortedReleased = [...released].sort((a, b) =>
    (b.resolvedAt ?? b.createdAt ?? '').localeCompare(a.resolvedAt ?? a.createdAt ?? ''),
  )

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

      <div className="mind-parked-history">
        <button
          type="button"
          className="mind-parked-history-toggle"
          onClick={() => setShowHistory((s) => !s)}
          disabled={sortedReleased.length === 0}
        >
          <History size={12} />
          {sortedReleased.length === 0
            ? 'Nothing released yet — history is empty.'
            : `${sortedReleased.length} parked ${sortedReleased.length === 1 ? 'worry' : 'worries'} released without ever coming true.`}
          {sortedReleased.length > 0 && (showHistory ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
        </button>

        {showHistory && sortedReleased.length > 0 && (
          <ul className="mind-parked-history-list">
            {sortedReleased.map((entry) => (
              <li key={entry.id} className="mind-parked-history-item">
                <p className="mind-parked-history-text">“{entry.text}”</p>
                <span className="mind-parked-history-date">
                  Released {entry.resolvedAt ? mindFormatTimestamp(entry.resolvedAt) : 'earlier'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

export { WorryParkingCard }
