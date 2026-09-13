import { useState } from 'react'
import { BookOpenCheck, CheckSquare, Dumbbell, Plus, Star, Timer, Trophy } from 'lucide-react'
import type { MindEntry, MindSummary } from '../mind-types'

type EvidenceLockerCardProps = {
  wins: MindEntry[]
  autoEvidence: Pick<MindSummary, 'focusMinutes' | 'tasksCompleted' | 'workouts' | 'learnings'> | null
  onAddWin: (text: string) => void
}

function EvidenceLockerCard({ wins, autoEvidence, onAddWin }: EvidenceLockerCardProps) {
  const [draft, setDraft] = useState('')

  const evidenceItems = [
    { icon: Timer, value: autoEvidence ? autoEvidence.focusMinutes : '—', label: 'focus min' },
    { icon: CheckSquare, value: autoEvidence ? autoEvidence.tasksCompleted : '—', label: 'tasks' },
    { icon: Dumbbell, value: autoEvidence ? autoEvidence.workouts : '—', label: 'workouts' },
    { icon: BookOpenCheck, value: autoEvidence ? autoEvidence.learnings : '—', label: 'learnings' },
  ]

  const addWin = () => {
    const text = draft.trim()
    if (!text) return
    onAddWin(text)
    setDraft('')
  }

  return (
    <section className="mind-card mind-card--evidence mind-tint-peach" aria-label="Evidence locker">
      <Trophy className="mind-card-watermark" size={104} strokeWidth={1.3} aria-hidden="true" />
      <div className="mind-card-head">
        <span className="mind-card-icon">
          <Trophy size={16} />
        </span>
        <div>
          <h2 className="mind-card-title">Evidence locker</h2>
          <p className="mind-card-sub">For the days you doubt yourself</p>
        </div>
      </div>

      <ul className="mind-wins">
        {wins.map((win) => (
          <li key={win.id} className="mind-win">
            <Star size={12} className="mind-win-star" />
            <span>{win.text}</span>
          </li>
        ))}
      </ul>

      <div className="mind-win-add">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addWin()
            }
          }}
          placeholder="Log a win, however small"
        />
        <button type="button" onClick={addWin} disabled={!draft.trim()} aria-label="Add win">
          <Plus size={14} />
        </button>
      </div>

      <div className="mind-auto-evidence">
        <span className="mind-auto-evidence-label">You showed up this week:</span>
        <div className="mind-auto-evidence-strip">
          {evidenceItems.map(({ icon: Icon, value, label }) => (
            <span key={label} className="mind-auto-evidence-item">
              <Icon size={12} />
              <strong>{value}</strong> {label}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

export { EvidenceLockerCard }
