import { useEffect, useRef, useState } from 'react'
import { CheckSquare, Inbox, MessageCircle, PenLine, Send, Trophy } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../../../lib/utils'
import { formatRelativeTime } from '../home-types'

export type QuickCaptureMode = 'task' | 'thought' | 'win' | 'learning'

const MODES: { id: QuickCaptureMode; label: string; icon: LucideIcon; placeholder: string; hint: string }[] = [
  { id: 'task', label: 'Task', icon: CheckSquare, placeholder: 'What needs doing?', hint: 'Goes to today’s tasks' },
  { id: 'thought', label: 'Thought', icon: MessageCircle, placeholder: 'What’s on your mind?', hint: 'Goes to your Mind inbox' },
  { id: 'win', label: 'Win', icon: Trophy, placeholder: 'What went well?', hint: 'Filed in your evidence locker' },
]

const MODE_ICON: Record<'task' | 'thought' | 'win', LucideIcon> = {
  task: CheckSquare,
  thought: MessageCircle,
  win: Trophy,
}

export type RecentCapture = {
  id: string
  mode: 'task' | 'thought' | 'win'
  text: string
  /** ISO timestamp — drives the "Xm ago" label and the sort order. */
  at: string
}

// Same face vocabulary as the Mind route's check-in strip — one meaning app-wide.
const MOOD_LABELS = ['Heavy', 'Low', 'Okay', 'Good', 'Light'] as const

const MOUTHS: Record<number, string> = {
  1: 'M10 21.5 Q15 16.5 20 21.5',
  2: 'M10 20.5 Q15 18.2 20 20.5',
  3: 'M10.5 20 L19.5 20',
  4: 'M10 18 Q15 22.5 20 18',
  5: 'M9.5 17 Q15 24.5 20.5 17',
}

function MoodFace({ level }: { level: number }) {
  return (
    <svg viewBox="0 0 30 30" className="home-face" aria-hidden="true">
      <circle cx="11" cy="12.5" r="1.7" className="home-face-eye" />
      <circle cx="19" cy="12.5" r="1.7" className="home-face-eye" />
      <path d={MOUTHS[level]} className="home-face-mouth" />
    </svg>
  )
}

type QuickCaptureCardProps = {
  onCapture: (mode: QuickCaptureMode, text: string) => Promise<void>
  /** Bumps when the header quick-add wants to preselect a mode and focus the input. */
  focusRequest: { mode: QuickCaptureMode; nonce: number } | null
  /** Today's saved mood (1–5) from the daily log, if any. */
  moodScore: number | null
  onMood: (score: number) => Promise<void>
  /** Latest task/thought/win entries, newest first — fills the card's footer space. */
  recentCaptures: RecentCapture[]
}

function QuickCaptureCard({ onCapture, focusRequest, moodScore, onMood, recentCaptures }: QuickCaptureCardProps) {
  const [mode, setMode] = useState<QuickCaptureMode>('task')
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [localMood, setLocalMood] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!focusRequest) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode(focusRequest.mode)
    inputRef.current?.focus()
  }, [focusRequest])

  const active = MODES.find((m) => m.id === mode) ?? MODES[0]
  const shownMood = localMood ?? moodScore

  const submit = async () => {
    const trimmed = text.trim()
    if (!trimmed || saving) return
    setSaving(true)
    try {
      await onCapture(mode, trimmed)
      setText('')
      inputRef.current?.focus()
    } finally {
      setSaving(false)
    }
  }

  const pickMood = (value: number) => {
    setLocalMood(value)
    onMood(value).catch(() => setLocalMood(null))
  }

  return (
    <section className="home-card home-card--capture" aria-label="Quick capture">
      <PenLine className="home-card-glyph" aria-hidden="true" />
      <header className="home-card-head">
        <div className="home-card-heading">
          <span className="home-card-ic" aria-hidden="true">
            <PenLine size={14} strokeWidth={2.4} />
          </span>
          <div>
            <span className="home-card-eyebrow">Quick capture</span>
            <h2 className="home-card-title">Get it out of your head</h2>
          </div>
        </div>
      </header>

      <div className="home-capture-modes" role="tablist" aria-label="Capture destination">
        {MODES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={mode === id}
            className={cn('home-capture-mode', `home-capture-mode--${id}`, mode === id && 'is-active')}
            onClick={() => {
              setMode(id)
              inputRef.current?.focus()
            }}
          >
            <Icon size={13} strokeWidth={2.4} />
            {label}
          </button>
        ))}
      </div>

      <div className="home-capture-input-row">
        <input
          ref={inputRef}
          type="text"
          value={text}
          maxLength={300}
          placeholder={active.placeholder}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void submit()
          }}
        />
        <button
          type="button"
          className="home-capture-send"
          disabled={!text.trim() || saving}
          onClick={() => void submit()}
          aria-label={`Capture ${active.label}`}
        >
          <Send size={15} strokeWidth={2.2} />
        </button>
      </div>
      <small className="home-capture-hint">{active.hint}</small>

      <div className="home-capture-recent">
        <span className="home-card-eyebrow">Recently captured</span>
        {recentCaptures.length > 0 ? (
          <ul className="home-capture-recent-list">
            {recentCaptures.map((item) => {
              const Icon = MODE_ICON[item.mode]
              return (
                <li key={item.id} className={cn('home-capture-recent-item', `home-capture-recent-item--${item.mode}`)}>
                  <span className="home-capture-recent-ic" aria-hidden="true">
                    <Icon size={12} strokeWidth={2.4} />
                  </span>
                  <span className="home-capture-recent-text">{item.text}</span>
                  <span className="home-capture-recent-time">{formatRelativeTime(item.at)}</span>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="home-capture-recent-empty">
            <Inbox size={13} strokeWidth={2.2} aria-hidden="true" />
            Nothing captured yet today.
          </p>
        )}
      </div>

      <div className="home-capture-mood">
        <div className="home-capture-mood-text">
          <span className="home-card-eyebrow">Mood check-in</span>
          <p>{shownMood ? `Today feels ${MOOD_LABELS[shownMood - 1].toLowerCase()}.` : 'How’s the head today?'}</p>
        </div>
        <div className="home-capture-mood-faces" role="group" aria-label="Mood check-in">
          {MOOD_LABELS.map((label, index) => {
            const value = index + 1
            return (
              <button
                key={label}
                type="button"
                aria-label={`Mood: ${label}`}
                aria-pressed={shownMood === value}
                className={cn('home-face-btn', `home-face-btn--${value}`, shownMood === value && 'is-active')}
                onClick={() => pickMood(value)}
              >
                <MoodFace level={value} />
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export { QuickCaptureCard }
