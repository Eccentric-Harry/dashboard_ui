import { useEffect, useRef, useState } from 'react'
import { Anchor, Check, PenLine, Pencil, X } from 'lucide-react'
import type { MindAnchorOutcome } from '@/types/mind'
import { cn } from '@/lib/utils'

type TodaysAnchorCardProps = {
  /** Today's intention text, '' when none is set yet. */
  intention: string
  /** Freeform notes kept against the anchor — context, blockers, how it went. */
  note: string
  /** Recorded outcome for today's anchor, or null. */
  outcome: MindAnchorOutcome | null
  saving: boolean
  onSave: (text: string) => Promise<void>
  /** Persists a note and/or outcome change onto today's anchor entry. */
  onSaveMeta: (patch: { note?: string; outcome?: MindAnchorOutcome | '' }) => Promise<void>
}

const OUTCOMES: { id: MindAnchorOutcome; label: string }[] = [
  { id: 'ACHIEVED', label: 'Achieved' },
  { id: 'PARTIAL', label: 'Partial' },
  { id: 'MISSED', label: 'Missed' },
]

// The title reflects how the day went once it's been called — never a verdict
// in red, and a miss is framed as tomorrow's start rather than a failure.
const OUTCOME_TITLES: Record<MindAnchorOutcome, string> = {
  ACHIEVED: 'Landed — nicely done',
  PARTIAL: 'Part of the way there',
  MISSED: 'A fresh go tomorrow',
}

// Same head grammar as the other three bento cells, then one inset panel the
// intention owns. The /mind focus tag is deliberately not surfaced here — it is
// still preserved on save (see handleSaveAnchor).
function TodaysAnchorCard({ intention, note, outcome, saving, onSave, onSaveMeta }: TodaysAnchorCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [isNoteEditing, setIsNoteEditing] = useState(false)
  const [noteDraft, setNoteDraft] = useState(note)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const noteRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (isEditing) inputRef.current?.focus()
  }, [isEditing])

  useEffect(() => {
    if (isNoteEditing) noteRef.current?.focus()
  }, [isNoteEditing])

  // Pull in a note changed elsewhere, but never while the user is editing it.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!isNoteEditing) setNoteDraft(note)
  }, [note, isNoteEditing])

  const startEditing = () => {
    setDraft(intention)
    setIsEditing(true)
  }

  const commit = () => {
    const trimmed = draft.trim()
    setIsEditing(false)
    if (!trimmed || trimmed === intention) return
    void onSave(trimmed)
  }

  const startNoteEdit = () => {
    setNoteDraft(note)
    setIsNoteEditing(true)
  }

  const saveNote = () => {
    const trimmed = noteDraft.trim()
    setIsNoteEditing(false)
    if (trimmed === note.trim()) return
    void onSaveMeta({ note: trimmed })
  }

  const cancelNote = () => {
    setNoteDraft(note)
    setIsNoteEditing(false)
  }

  const pickOutcome = (next: MindAnchorOutcome) => {
    void onSaveMeta({ outcome: outcome === next ? '' : next })
  }

  const title = !intention ? 'Name the one thing' : outcome ? OUTCOME_TITLES[outcome] : 'The one thing today'

  return (
    <section className={cn('home-card home-card--anchor', !intention && 'is-empty')} aria-label="Today's anchor">
      <header className="home-card-head">
        <div>
          <span className="home-card-eyebrow">
            Today's anchor
            {saving && <em className="home-anchor-saving">saving</em>}
          </span>
          <h2 className="home-card-title">{title}</h2>
        </div>
        {intention && !note && !isNoteEditing && (
          <button type="button" className="home-btn-quiet" onClick={startNoteEdit}>
            <PenLine size={11} strokeWidth={2.5} />
            Add a note
          </button>
        )}
      </header>

      <div className="home-anchor-panel">
        <div className="home-anchor-main">
          <Anchor className="home-anchor-watermark" aria-hidden="true" />
          <span className="home-anchor-ic" aria-hidden="true">
            <Anchor size={18} strokeWidth={2.2} />
          </span>

          {isEditing ? (
            <div className="home-anchor-edit">
              <input
                ref={inputRef}
                type="text"
                value={draft}
                maxLength={140}
                placeholder="What's the one thing today?"
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commit()
                  if (e.key === 'Escape') setIsEditing(false)
                }}
              />
              <button type="button" className="home-anchor-done" onMouseDown={(e) => e.preventDefault()} onClick={commit}>
                <Check size={12} strokeWidth={2.6} />
                Done
              </button>
            </div>
          ) : (
            <button type="button" className="home-anchor-display" onClick={startEditing}>
              <span className={cn('home-anchor-quote', !intention && 'is-empty')}>
                {intention || "What's the one thing today?"}
              </span>
              <Pencil size={12} strokeWidth={2.4} className="home-anchor-pencil" aria-hidden="true" />
            </button>
          )}
        </div>

        {intention && (isNoteEditing || note) ? (
          <div className="home-anchor-note">
            <div className="home-anchor-note-head">
              <span className="home-anchor-note-label">Notes</span>
              {!isNoteEditing && (
                <button type="button" className="home-anchor-note-btn" onClick={startNoteEdit}>
                  <Pencil size={11} strokeWidth={2.5} />
                  Edit
                </button>
              )}
            </div>

            {isNoteEditing ? (
              <>
                <textarea
                  ref={noteRef}
                  className="home-anchor-note-input"
                  value={noteDraft}
                  maxLength={500}
                  rows={2}
                  placeholder="Context, blockers, or how it went…"
                  onChange={(e) => setNoteDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') cancelNote()
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveNote()
                  }}
                />
                <div className="home-anchor-note-actions">
                  <button type="button" className="home-anchor-note-save" onClick={saveNote}>
                    <Check size={12} strokeWidth={2.8} />
                    Save
                  </button>
                  <button type="button" className="home-anchor-note-cancel" onClick={cancelNote}>
                    <X size={12} strokeWidth={2.8} />
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <p className="home-anchor-note-text">{note}</p>
            )}
          </div>
        ) : null}

        {intention ? (
          <div className="home-anchor-outcomes" role="group" aria-label="How did the anchor land?">
            {OUTCOMES.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                aria-pressed={outcome === id}
                className={cn('home-anchor-outcome', `home-anchor-outcome--${id.toLowerCase()}`, outcome === id && 'is-active')}
                onClick={() => pickOutcome(id)}
              >
                {label}
              </button>
            ))}
          </div>
        ) : (
          <p className="home-anchor-foot">Name it and the day has a spine.</p>
        )}
      </div>
    </section>
  )
}

export { TodaysAnchorCard }
