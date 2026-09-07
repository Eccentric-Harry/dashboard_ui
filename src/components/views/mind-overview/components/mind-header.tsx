import { Flame } from 'lucide-react'
import { cn } from '../../../../lib/utils'

const MOOD_LABELS = ['Heavy', 'Low', 'Okay', 'Good', 'Light'] as const

// SOS lives in the route footer now, not up here. It has to stay one tap away
// (MIND_WELLNESS_PLAN §2), but a crisis button sitting in peripheral vision on every
// visit sets the tone of the whole page — quiet and reachable beats prominent.

const MOUTHS: Record<number, string> = {
  1: 'M10 21.5 Q15 16.5 20 21.5',
  2: 'M10 20.5 Q15 18.2 20 20.5',
  3: 'M10.5 20 L19.5 20',
  4: 'M10 18 Q15 22.5 20 18',
  5: 'M9.5 17 Q15 24.5 20.5 17',
}

function MoodFace({ level }: { level: number }) {
  return (
    <svg viewBox="0 0 30 30" className="mind-face" aria-hidden="true">
      <circle cx="11" cy="12.5" r="1.7" className="mind-face-eye" />
      <circle cx="19" cy="12.5" r="1.7" className="mind-face-eye" />
      <path d={MOUTHS[level]} className="mind-face-mouth" />
    </svg>
  )
}

type MindHeaderProps = {
  dateIso: string
  mood: number | null
  onMoodSelect: (value: number) => void
  streakDays: number
}

function MindHeader({ dateIso, mood, onMoodSelect, streakDays }: MindHeaderProps) {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const name = (localStorage.getItem('displayName') || 'friend').split(' ')[0]
  const date = new Date(`${dateIso}T00:00:00`)
  const dateLabel = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <header className="mind-header">
      <div className="mind-header-greeting">
        <strong>
          {greeting}, {name}
        </strong>
        <span className="mind-header-sub">{dateLabel} · how's your mind today?</span>
      </div>

      <div className="mind-header-actions">
        <div className="mind-mood" role="group" aria-label="Mood check-in">
          {MOOD_LABELS.map((label, index) => {
            const value = index + 1
            return (
              <button
                key={label}
                type="button"
                aria-label={`Mood: ${label}`}
                aria-pressed={mood === value}
                className={cn('mind-face-btn', `mind-face-btn--${value}`, mood === value && 'is-active')}
                onClick={() => onMoodSelect(value)}
              >
                <MoodFace level={value} />
              </button>
            )
          })}
          <span className={cn('mind-mood-label', mood && 'is-set')}>
            {mood ? MOOD_LABELS[mood - 1] : ''}
          </span>
        </div>

        <span className="mind-streak-chip" title={`${streakDays} days of showing up here`}>
          <Flame size={13} />
          {streakDays}
        </span>
      </div>
    </header>
  )
}

export { MindHeader }
