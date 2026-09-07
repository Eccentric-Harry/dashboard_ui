import { useRef, useState } from 'react'
import {
  ArrowRight,
  Brain,
  CalendarClock,
  CheckCircle,
  CircleDashed,
  CloudOff,
  HelpCircle,
  ListTodo,
  MessageCircleHeart,
  Sparkles,
  Waves,
  Wind,
} from 'lucide-react'
import { cn } from '../../../../lib/utils'
import type { MindDistortionTag, MindEntry, MindIntrusiveCategory, MindLane } from '../mind-types'
import { MIND_DISTORTION_TAGS, INTRUSIVE_CATEGORIES, PARK_OPTIONS } from '../mind-types'
import { DefusionDrill } from './defusion-drill'
import { UrgeTimer } from './urge-timer'

/**
 * The inbox asks what a thought *is* before it offers anything to do with it.
 *
 * This is the whole point of the card. A worry gets better when it is examined,
 * predicted and checked against reality; an intrusive thought gets worse every time it
 * is examined, because examining it is the compulsion. Offering the same four buttons
 * to both — as this card used to — quietly hands the user the wrong tool for half of
 * what lands here.
 */

const HELP_SEEN_KEY = 'mind_triage_help_seen'

const LANES: { lane: MindLane; label: string; icon: typeof ListTodo; hint: string }[] = [
  { lane: 'PROBLEM', label: 'Problem', icon: ListTodo, hint: 'Something you can actually act on now.' },
  { lane: 'WORRY', label: 'Worry', icon: HelpCircle, hint: 'A "what if" about the future.' },
  { lane: 'INTRUSIVE', label: 'Intrusive', icon: CloudOff, hint: 'Unwanted, not yours, nothing to engage with.' },
]

type TriageStripProps = {
  onPick: (lane: MindLane) => void
  showHelp: boolean
  /** Only the first untriaged card renders the toggle — one per card is just repetition. */
  canToggleHelp: boolean
  onToggleHelp: () => void
}

/**
 * The lane picker, compact.
 *
 * Each lane used to carry its own explanatory line, which is fine on the first thought
 * and pure noise on the fourth — three untriaged thoughts filled a phone screen with the
 * same three captions repeated. The definitions are onboarding, not steady state, so
 * they collapse into one legend that shows itself until it has been dismissed once and
 * stays one tap away after that.
 *
 * The open/closed state is owned by the card, not by each strip: it is one preference,
 * and dismissing it on the first thought should not leave it sitting under the second.
 * Both the toggle and the legend itself render only on the first untriaged card —
 * repeating the definitions under every thought is the noise this rework removed.
 */
function TriageStrip({ onPick, showHelp, canToggleHelp, onToggleHelp }: TriageStripProps) {
  return (
    <div className="mind-triage">
      <div className="mind-triage-head">
        <span className="mind-triage-question">What is this?</span>
        {canToggleHelp && (
          <button type="button" className="mind-triage-help" onClick={onToggleHelp} aria-expanded={showHelp}>
            {showHelp ? 'Got it' : "What's the difference?"}
          </button>
        )}
      </div>

      <div className="mind-triage-options">
        {LANES.map(({ lane, label, icon: Icon }) => (
          <button
            key={lane}
            type="button"
            className={`mind-lane-btn mind-lane-btn--${lane.toLowerCase()}`}
            onClick={() => onPick(lane)}
          >
            <Icon size={12} className="mind-lane-icon" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {showHelp && canToggleHelp && (
        <dl className="mind-triage-legend">
          {LANES.map(({ lane, label, hint }) => (
            <div key={lane} className="mind-triage-legend-row">
              <dt>{label}</dt>
              <dd>{hint}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}

type ThoughtCardProps = {
  entry: MindEntry
  isReleasing: boolean
  showTriageHelp: boolean
  canToggleTriageHelp: boolean
  onToggleTriageHelp: () => void
  onSetLane: (id: string, lane: MindLane) => void
  onDo: (id: string) => void
  onPark: (id: string, days: number, fearedOutcome: string, probability: number | null) => void
  onRelease: (id: string) => void
  onNoticed: (id: string, category: MindIntrusiveCategory) => void
  onReframeSave: (id: string, reframedText: string, distortionTag: MindDistortionTag | null) => void
}

function ThoughtCard({
  entry,
  isReleasing,
  showTriageHelp,
  canToggleTriageHelp,
  onToggleTriageHelp,
  onSetLane,
  onDo,
  onPark,
  onRelease,
  onNoticed,
  onReframeSave,
}: ThoughtCardProps) {
  const [mode, setMode] = useState<'idle' | 'reframe' | 'park' | 'defuse'>('idle')
  const [step, setStep] = useState(0)
  const [distortion, setDistortion] = useState<MindDistortionTag | null>(null)
  const [evidence, setEvidence] = useState('')
  const [advice, setAdvice] = useState('')
  const [fearedOutcome, setFearedOutcome] = useState('')
  const [probability, setProbability] = useState(60)
  const [parkDays, setParkDays] = useState<number>(PARK_OPTIONS[0].days)
  const [category, setCategory] = useState<MindIntrusiveCategory>('UNNAMED')

  /**
   * The sentence as it was when this card first mounted, before triage sealed it.
   *
   * Sealing is about never meeting the thought again on some future day's list — not
   * about hiding it in the same breath the user typed it. The drill only works on the
   * actual words, so hold them for the life of this card and let them die with it:
   * never persisted, never re-fetched.
   */
  const [originalText] = useState<string | null>(entry.text)

  const startReframe = () => {
    setMode('reframe')
    setStep(0)
  }

  const cancel = () => {
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
    cancel()
  }

  const savePark = () => {
    onPark(entry.id, parkDays, fearedOutcome.trim(), fearedOutcome.trim() ? probability : null)
    cancel()
  }

  // A sealed entry has no text on a normal read, and is never meant to be met again.
  const body = entry.textSealed ? 'A thought you sealed. You do not need to read it again.' : `“${entry.text ?? ''}”`

  return (
    <article className={cn('mind-thought-card', isReleasing && 'is-releasing', entry.lane && `is-lane-${entry.lane.toLowerCase()}`)}>
      <p className={cn('mind-thought-text', entry.textSealed && 'is-sealed')}>{body}</p>

      {!entry.lane && mode === 'idle' && (
        <TriageStrip
          onPick={(lane) => onSetLane(entry.id, lane)}
          showHelp={showTriageHelp}
          canToggleHelp={canToggleTriageHelp}
          onToggleHelp={onToggleTriageHelp}
        />
      )}

      {entry.lane === 'PROBLEM' && mode === 'idle' && (
        <div className="mind-thought-actions">
          <button type="button" className="mind-chip mind-chip--do" onClick={() => onDo(entry.id)}>
            <ListTodo size={12} />
            Make it a task
          </button>
          <button type="button" className="mind-chip mind-chip--release" onClick={() => onRelease(entry.id)}>
            <Wind size={12} />
            Release
          </button>
        </div>
      )}

      {entry.lane === 'WORRY' && mode === 'idle' && (
        <div className="mind-thought-actions">
          <button type="button" className="mind-chip mind-chip--park" onClick={() => setMode('park')}>
            <CalendarClock size={12} />
            Park it
          </button>
          <button type="button" className="mind-chip mind-chip--reframe" onClick={startReframe}>
            <MessageCircleHeart size={12} />
            Reframe
          </button>
          <button type="button" className="mind-chip mind-chip--do" onClick={() => onDo(entry.id)}>
            <ListTodo size={12} />
            Actually actionable
          </button>
          <button type="button" className="mind-chip mind-chip--release" onClick={() => onRelease(entry.id)}>
            <Wind size={12} />
            Release
          </button>
        </div>
      )}

      {/*
        The intrusive lane is deliberately impoverished — no reframe, no park, no
        follow-up question. Every one of those would be an invitation to engage, and
        engaging is what keeps the thought circling.
      */}
      {entry.lane === 'INTRUSIVE' && mode === 'idle' && (
        <div className="mind-intrusive-lane">
          <div className="mind-intrusive-cats" role="group" aria-label="What kind of thought">
            {INTRUSIVE_CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                className={cn('mind-tag mind-tag--quiet', category === c.value && 'is-active')}
                onClick={() => setCategory(c.value)}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="mind-thought-actions">
            <button
              type="button"
              className="mind-chip mind-chip--noticed"
              onClick={() => onNoticed(entry.id, category)}
            >
              <CircleDashed size={12} />
              Noticed. Moving on.
            </button>
            <button type="button" className="mind-chip mind-chip--defuse" onClick={() => setMode('defuse')}>
              <Waves size={12} />
              Let it dissolve
            </button>
          </div>
        </div>
      )}

      {mode === 'defuse' && (
        <DefusionDrill
          text={entry.text ?? originalText}
          onDone={() => {
            setMode('idle')
            onNoticed(entry.id, category)
          }}
        />
      )}

      {mode === 'park' && (
        <div className="mind-park-form">
          <p className="mind-reframe-question">What are you afraid will happen?</p>
          <input
            className="mind-reframe-input"
            value={fearedOutcome}
            onChange={(e) => setFearedOutcome(e.target.value)}
            placeholder="In one line — optional, but it's what makes the ledger work"
          />

          {fearedOutcome.trim() && (
            <label className="mind-prob">
              <span className="mind-prob-label">
                How likely does it feel right now? <strong>{probability}%</strong>
              </span>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={probability}
                onChange={(e) => setProbability(Number(e.target.value))}
                className="mind-prob-slider"
              />
              <span className="mind-prob-hint">Go with the gut number, not the reasonable one.</span>
            </label>
          )}

          <div className="mind-park-when" role="group" aria-label="Come back to it">
            {PARK_OPTIONS.map((option) => (
              <button
                key={option.label}
                type="button"
                className={cn('mind-tag', parkDays === option.days && 'is-active')}
                onClick={() => setParkDays(option.days)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="mind-reframe-controls">
            <button type="button" className="mind-ghost-btn" onClick={cancel}>
              Not now
            </button>
            <button type="button" className="mind-solid-btn" onClick={savePark}>
              <CalendarClock size={12} />
              Park it
            </button>
          </div>
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
            <button type="button" className="mind-ghost-btn" onClick={cancel}>
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
  noticedToday: number
  noticedCapped: boolean
  onCapture: (text: string) => void
  onQuickNotice: () => void
  onLogUrge: (waitedSeconds: number, faded: boolean) => void
  onSetLane: (id: string, lane: MindLane) => void
  onDo: (id: string) => void
  onPark: (id: string, days: number, fearedOutcome: string, probability: number | null) => void
  onRelease: (id: string) => void
  onNoticed: (id: string, category: MindIntrusiveCategory) => void
  onReframeSave: (id: string, reframedText: string, distortionTag: MindDistortionTag | null) => void
}

function MindInboxCard({
  openThoughts,
  closedLoops,
  releasingIds,
  stats,
  noticedToday,
  noticedCapped,
  onCapture,
  onQuickNotice,
  onLogUrge,
  onSetLane,
  onDo,
  onPark,
  onRelease,
  onNoticed,
  onReframeSave,
}: MindInboxCardProps) {
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const [showTriageHelp, setShowTriageHelp] = useState(() => {
    try {
      return localStorage.getItem(HELP_SEEN_KEY) !== 'true'
    } catch {
      return false
    }
  })

  const toggleTriageHelp = () => {
    setShowTriageHelp((open) => {
      if (open) {
        try {
          localStorage.setItem(HELP_SEEN_KEY, 'true')
        } catch {
          /* private mode — the legend reappears next session, which is harmless */
        }
      }
      return !open
    })
  }

  const firstUntriagedId = openThoughts.find((e) => !e.lane)?.id

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

      {/*
        The one-tap path, and deliberately the easy one: for a thought the user never
        wants to type out, nothing is stored but the fact that it passed through.
        Counted, not collected.
      */}
      <div className="mind-notice-strip">
        <button type="button" className="mind-notice-btn" onClick={onQuickNotice} disabled={noticedCapped}>
          <CircleDashed size={13} />
          An intrusive thought just passed
        </button>
        <span className="mind-notice-meta">
          {noticedCapped
            ? 'Lots today. That’s okay — nothing more to log.'
            : noticedToday > 0
              ? `${noticedToday} noticed today, and let go`
              : 'One tap. Nothing to write.'}
        </span>

        <UrgeTimer onLog={onLogUrge} />
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
            showTriageHelp={showTriageHelp}
            canToggleTriageHelp={entry.id === firstUntriagedId}
            onToggleTriageHelp={toggleTriageHelp}
            onSetLane={onSetLane}
            onDo={onDo}
            onPark={onPark}
            onRelease={onRelease}
            onNoticed={onNoticed}
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
