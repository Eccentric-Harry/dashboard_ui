import { useEffect, useRef, useState } from 'react'
import { CheckSquare, MessageCircle, PenLine, Send, Trophy } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../../../lib/utils'

export type QuickCaptureMode = 'task' | 'thought' | 'win' | 'learning'

const MODES: { id: QuickCaptureMode; label: string; icon: LucideIcon; placeholder: string; hint: string }[] = [
  { id: 'task', label: 'Task', icon: CheckSquare, placeholder: 'What needs doing?', hint: 'Goes to today’s tasks' },
  { id: 'thought', label: 'Thought', icon: MessageCircle, placeholder: 'What’s on your mind?', hint: 'Goes to your Mind inbox' },
  { id: 'win', label: 'Win', icon: Trophy, placeholder: 'What went well?', hint: 'Filed in your evidence locker' },
]

type QuickCaptureCardProps = {
  onCapture: (mode: QuickCaptureMode, text: string) => Promise<void>
  /** Bumps when the header quick-add wants to preselect a mode and focus the input. */
  focusRequest: { mode: QuickCaptureMode; nonce: number } | null
}

function QuickCaptureCard({ onCapture, focusRequest }: QuickCaptureCardProps) {
  const [mode, setMode] = useState<QuickCaptureMode>('task')
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!focusRequest) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode(focusRequest.mode)
    inputRef.current?.focus()
  }, [focusRequest])

  const active = MODES.find((m) => m.id === mode) ?? MODES[0]

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

  return (
    <section className="home-card home-card--capture" aria-label="Quick capture">
      <PenLine className="home-card-glyph" aria-hidden="true" />
      <header className="home-card-head">
        <div>
          <span className="home-card-eyebrow">Quick capture</span>
          <h2 className="home-card-title">Get it out of your head</h2>
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
    </section>
  )
}

export { QuickCaptureCard }
