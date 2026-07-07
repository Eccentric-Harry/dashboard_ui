import { useRef, useState } from 'react'
import {
  ArrowRight,
  Brain,
  CalendarClock,
  CheckCircle,
  ListTodo,
  MessageCircleHeart,
  Sparkles,
  Wind,
} from 'lucide-react'
import { cn } from '../../../../lib/utils'
import type { MindDistortionTag, MindEntry } from '../mind-types'
import { MIND_DISTORTION_TAGS, PARK_OPTIONS } from '../mind-types'

type ThoughtCardProps = {
  entry: MindEntry
  isReleasing: boolean
  onDo: (id: string) => void
  onPark: (id: string, days: number) => void
  onRelease: (id: string) => void
  onReframeSave: (id: string, reframedText: string, distortionTag: MindDistortionTag | null) => void
}

function ThoughtCard({ entry, isReleasing, onDo, onPark, onRelease, onReframeSave }: ThoughtCardProps) {
  const [mode, setMode] = useState<'idle' | 'reframe'>('idle')
  const [step, setStep] = useState(0)
  const [distortion, setDistortion] = useState<MindDistortionTag | null>(null)
  const [evidence, setEvidence] = useState('')
  const [advice, setAdvice] = useState('')
  const [parkOpen, setParkOpen] = useState(false)

  const startReframe = () => {
    setMode('reframe')
    setStep(0)
    setParkOpen(false)
  }

  const cancelReframe = () => {
    setMode('idle')
    setStep(0)
    setEvidence('')
    setAdvice('')
    setDistortion(null)
  }

  const saveReframe = () => {
    const reframed = advice.trim()
    if (!reframed) return
    onReframeSave(entry.id, reframed, distortion)
    cancelReframe()
  }

  return (
    <article className={cn('mind-thought-card', isReleasing && 'is-releasing')}>
      <p className="mind-thought-text">“{entry.text}”</p>

      {mode === 'idle' && (
        <div className="mind-thought-actions">
          <button type="button" className="mind-chip mind-chip--do" onClick={() => onDo(entry.id)}>
            <ListTodo size={12} />
            Do
          </button>
          <button type="button" className="mind-chip mind-chip--reframe" onClick={startReframe}>
            <MessageCircleHeart size={12} />
            Reframe
          </button>
          <div className="mind-park-wrap">
            <button
              type="button"
              className={cn('mind-chip mind-chip--park', parkOpen && 'is-open')}
              onClick={() => setParkOpen((v) => !v)}
            >
              <CalendarClock size={12} />
              Park
            </button>
            {parkOpen && (
              <div className="mind-park-menu" role="menu">
                <span className="mind-park-menu-title">Worry about it later</span>
                {PARK_OPTIONS.map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setParkOpen(false)
                      onPark(entry.id, option.days)
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button type="button" className="mind-chip mind-chip--release" onClick={() => onRelease(entry.id)}>
            <Wind size={12} />
            Release
          </button>
        </div>
      )}

      {mode === 'reframe' && (
        <div className="mind-reframe">
          <div className="mind-reframe-steps" aria-hidden="true">
            {[0, 1, 2].map((s) => (
              <span key={s} className={cn('mind-reframe-step-dot', step >= s && 'is-done')} />
            ))}
          </div>

          {step === 0 && (
            <div className="mind-reframe-pane">
              <p className="mind-reframe-question">Does this thought have a familiar shape?</p>
              <div className="mind-reframe-tags">
                {MIND_DISTORTION_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className={cn('mind-tag', distortion === tag && 'is-active')}
                    onClick={() => setDistortion(distortion === tag ? null : tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="mind-reframe-pane">
              <p className="mind-reframe-question">What's the evidence — for it, and against it?</p>
              <textarea
                className="mind-reframe-input"
                rows={2}
                value={evidence}
                onChange={(e) => setEvidence(e.target.value)}
                placeholder="For: … Against: …"
              />
            </div>
          )}

          {step === 2 && (
            <div className="mind-reframe-pane">
              <p className="mind-reframe-question">What would you tell a friend who thought this?</p>
              <textarea
                className="mind-reframe-input"
                rows={2}
                value={advice}
                onChange={(e) => setAdvice(e.target.value)}
                placeholder="Be as kind to yourself as you'd be to them…"
              />
            </div>
          )}

          <div className="mind-reframe-controls">
            <button type="button" className="mind-ghost-btn" onClick={cancelReframe}>
              Not now
            </button>
            {step < 2 ? (
              <button type="button" className="mind-solid-btn" onClick={() => setStep(step + 1)}>
                Next
                <ArrowRight size={12} />
              </button>
            ) : (
              <button type="button" className="mind-solid-btn" onClick={saveReframe} disabled={!advice.trim()}>
                <CheckCircle size={12} />
                Keep the kinder version
              </button>
            )}
          </div>
        </div>
      )}
    </article>
  )
}

type MindInboxCardProps = {
  openThoughts: MindEntry[]
  closedLoops: MindEntry[]
  releasingIds: ReadonlySet<string>
  stats: { captured: number; converted: number; reframed: number; released: number }
  onCapture: (text: string) => void
  onDo: (id: string) => void
  onPark: (id: string, days: number) => void
  onRelease: (id: string) => void
  onReframeSave: (id: string, reframedText: string, distortionTag: MindDistortionTag | null) => void
}

function MindInboxCard({
  openThoughts,
  closedLoops,
  releasingIds,
  stats,
  onCapture,
  onDo,
  onPark,
  onRelease,
  onReframeSave,
}: MindInboxCardProps) {
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  const capture = () => {
    const text = draft.trim()
    if (!text) return
    onCapture(text)
    setDraft('')
    inputRef.current?.focus()
  }

  return (
    <section className="mind-card mind-card--inbox" aria-label="Mind inbox">
      <div className="mind-card-head">
        <span className="mind-card-icon">
          <Brain size={16} />
        </span>
        <div>
          <h2 className="mind-card-title">Mind inbox</h2>
          <p className="mind-card-sub">Put it down here, not in your head</p>
        </div>
      </div>

      <div className="mind-capture">
        <textarea
          ref={inputRef}
          className="mind-capture-input"
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              capture()
            }
          }}
          placeholder="What's circling in your head?"
        />
        <button type="button" className="mind-capture-send" onClick={capture} disabled={!draft.trim()} aria-label="Capture thought">
          <ArrowRight size={16} />
        </button>
      </div>

      <div className="mind-thought-stack">
        {openThoughts.length === 0 && (
          <div className="mind-empty">
            <Sparkles size={16} />
            <p>Nothing circling right now. That's not empty — that's quiet.</p>
          </div>
        )}
        {openThoughts.map((entry) => (
          <ThoughtCard
            key={entry.id}
            entry={entry}
            isReleasing={releasingIds.has(entry.id)}
            onDo={onDo}
            onPark={onPark}
            onRelease={onRelease}
            onReframeSave={onReframeSave}
          />
        ))}
      </div>

      {closedLoops.length > 0 && (
        <div className="mind-closed-loops">
          {closedLoops.map((entry) => (
            <p key={entry.id} className="mind-closed-loop">
              <CheckCircle size={12} />
              <span className="mind-closed-loop-text">
                “{entry.text}”{' '}
                <em>
                  {entry.status === 'CONVERTED'
                    ? '— became a task. It has a home now.'
                    : '— reframed into something kinder.'}
                </em>
              </span>
            </p>
          ))}
        </div>
      )}

      <div className="mind-loop-stats" aria-label="This week's loop">
        <span className="mind-stat-pill">{stats.captured} captured</span>
        <span className="mind-stat-pill">{stats.converted} became tasks</span>
        <span className="mind-stat-pill">{stats.reframed} reframed</span>
        <span className="mind-stat-pill">{stats.released} released</span>
      </div>
    </section>
  )
}

export { MindInboxCard }
