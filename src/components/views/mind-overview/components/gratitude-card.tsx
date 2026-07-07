import { useState } from 'react'
import { Heart, Plus, Sprout } from 'lucide-react'
import type { MindEntry } from '../mind-types'

type GratitudeCardProps = {
  gratitude: MindEntry[]
  onAddGratitude: (text: string) => void
}

function GratitudeCard({ gratitude, onAddGratitude }: GratitudeCardProps) {
  const [draft, setDraft] = useState('')

  const add = () => {
    const text = draft.trim()
    if (!text) return
    onAddGratitude(text)
    setDraft('')
  }

  return (
    <section className="mind-card mind-card--gratitude mind-tint-rose" aria-label="Gratitude">
      <Heart className="mind-card-watermark" size={104} strokeWidth={1.3} aria-hidden="true" />
      <div className="mind-card-head">
        <span className="mind-card-icon">
          <Heart size={16} />
        </span>
        <div>
          <h2 className="mind-card-title">Three good things</h2>
          <p className="mind-card-sub">Small things count — they count most</p>
        </div>
      </div>

      <div className="mind-win-add">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          placeholder="What are you grateful for today?"
        />
        <button type="button" onClick={add} disabled={!draft.trim()} aria-label="Add gratitude">
          <Plus size={14} />
        </button>
      </div>

      {gratitude.length === 0 ? (
        <div className="mind-empty">
          <Sprout size={16} />
          <p>Nothing noted yet. One line is enough to shift a day.</p>
        </div>
      ) : (
        <ul className="mind-gratitude-list">
          {gratitude.map((item) => (
            <li key={item.id} className="mind-gratitude-item">
              <Sprout size={12} />
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export { GratitudeCard }
