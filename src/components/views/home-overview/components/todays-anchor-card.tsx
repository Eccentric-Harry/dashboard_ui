import { useEffect, useRef, useState } from 'react'
import { Anchor, Check, Pencil, X } from 'lucide-react'
import type { MindAnchorOutcome } from '../../../../lib/api'
import { cn } from '../../../../lib/utils'

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

// The /mind focus tag is deliberately not surfaced here — Home shows the one
// thing, nothing else. The tag is still preserved on save (see handleSaveAnchor).
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

  return (
    <section className="home-card home-card--anchor" aria-label="Today's anchor">
      <Anchor className="home-card-glyph" aria-hidden="true" />
      <span className="home-anchor-ic" aria-hidden="true">
        <Anchor size={16} strokeWidth={2.2} />
      </span>

      <div className="home-anchor-body">
        <span className="home-card-eyebrow">
          Today's anchor
          {saving && <em className="home-anchor-saving">saving</em>}
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
              {intention ? `“${intention}”` : "What's the one thing today?"}
            </span>
            <Pencil size={11} strokeWidth={2.4} className="home-anchor-pencil" aria-hidden="true" />
          </button>
        )}

        {intention ? (
          <div className="home-anchor-review">
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

            <div className="home-anchor-note">
              <div className="home-anchor-note-head">
                <span className="home-anchor-note-label">Notes</span>
                {!isNoteEditing && (
                  <button type="button" className="home-anchor-note-btn" onClick={startNoteEdit}>
                    <Pencil size={11} strokeWidth={2.5} />
                    {note ? 'Edit' : 'Add'}
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
                    rows={3}
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
              ) : note ? (
                <p className="home-anchor-note-text">{note}</p>
              ) : (
                <button type="button" className="home-anchor-note-placeholder" onClick={startNoteEdit}>
                  Jot down context, blockers, or how it went…
                </button>
              )}
            </div>
          </div>
        ) : (
          <p className="home-anchor-foot">Name it and the day has a spine.</p>
        )}
      </div>
    </section>
  )
}

export { TodaysAnchorCard }
