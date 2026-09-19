import { useEffect, useMemo, useRef, useState } from 'react'
import { Anchor, Check, Contrast, Pencil, Plus, RotateCcw } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { MindAnchorOutcome, MindEntry } from '@/types/mind'
import { cn } from '@/lib/utils'
import { lastNDates } from '../home-types'

type TodaysAnchorCardProps = {
  today: string
  /** Today's intention text, '' when none is set yet. */
  intention: string
  /** Freeform notes kept against the anchor — context, blockers, how it went. */
  note: string
  /** Recorded outcome for today's anchor, or null. */
  outcome: MindAnchorOutcome | null
  /** Every INTENTION entry the page has — the track below reads the last 14 days of it. */
  history: MindEntry[]
  saving: boolean
  onSave: (text: string) => Promise<void>
  /** Persists a note and/or outcome change onto today's anchor entry. */
  onSaveMeta: (patch: { note?: string; outcome?: MindAnchorOutcome | '' }) => Promise<void>
}

const OUTCOMES: { id: MindAnchorOutcome; label: string; icon: LucideIcon }[] = [
  { id: 'ACHIEVED', label: 'Achieved', icon: Check },
  { id: 'PARTIAL', label: 'Partial', icon: Contrast },
  { id: 'MISSED', label: 'Missed', icon: RotateCcw },
]

// Once the day is called, the eyebrow says how it went — never a verdict in
// red, and a miss is framed as tomorrow's start rather than a failure.
const OUTCOME_PHRASES: Record<MindAnchorOutcome, string> = {
  ACHIEVED: 'Landed, nicely done',
  PARTIAL: 'Part of the way there',
  MISSED: 'A fresh go tomorrow',
}

const TRACK_DAYS = 14

/** What one day of the track shows: the call if it was made, else whether an anchor was set. */
type TrackState = 'achieved' | 'partial' | 'missed' | 'open' | 'none'

const STATE_LABEL: Record<TrackState, string> = {
  achieved: 'Achieved',
  partial: 'Partial',
  missed: 'Missed',
  open: 'Anchor set, not called',
  none: 'No anchor',
}

type TrackDay = { date: string; state: TrackState; text: string | null }

function trackState(entry: MindEntry | undefined): TrackState {
  if (!entry) return 'none'
  if (entry.outcome === 'ACHIEVED') return 'achieved'
  if (entry.outcome === 'PARTIAL') return 'partial'
  if (entry.outcome === 'MISSED') return 'missed'
  return 'open'
}

const dayTitle = (iso: string, today: string) =>
  iso === today
    ? 'Today'
    : new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })

/**
 * Today's one thing, in the Hydration card's grammar: the intention is the big
 * figure, fourteen days of anchors are the segmented track under it (one cell
 * per day, filled by how it landed), and how today landed is the row of soft
 * buttons at the foot. The /mind focus tag is deliberately not surfaced here —
 * it is still preserved on save (see handleSaveAnchor).
 */
function TodaysAnchorCard({ today, intention, note, outcome, history, saving, onSave, onSaveMeta }: TodaysAnchorCardProps) {
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

  const track = useMemo<TrackDay[]>(() => {
    const byDate = new Map<string, MindEntry>()
    for (const entry of history) {
      if (!entry.date) continue
      const held = byDate.get(entry.date)
      // Two intentions on one day: the later write is the one Home shows.
      if (!held || (entry.createdAt ?? '') > (held.createdAt ?? '')) byDate.set(entry.date, entry)
    }
    return lastNDates(TRACK_DAYS, today).map((date) => {
      const entry = byDate.get(date)
      return { date, state: trackState(entry), text: entry?.text?.trim() || null }
    })
  }, [history, today])

  const counts = useMemo(() => {
    const tally = { achieved: 0, partial: 0, set: 0 }
    for (const day of track) {
      if (day.state === 'none') continue
      tally.set += 1
      if (day.state === 'achieved') tally.achieved += 1
      if (day.state === 'partial') tally.partial += 1
    }
    return tally
  }, [track])

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

  const trackLabel =
    counts.set === 0
      ? 'No anchors in the last 14 days yet.'
      : `Last 14 days: ${counts.set} anchored, ${counts.achieved} achieved, ${counts.partial} partial.`

  return (
    <section
      className={cn('home-card home-card--anchor', !intention && 'is-empty', isNoteEditing && 'is-note-editing')}
      aria-label="Today's anchor"
    >
      {/* The intention is the card's headline — its hero figure, the way 3.0L is
          Hydration's — so there is no second serif title competing with it. */}
      <header className="home-card-head">
        <div className="hm-anchor-head">
          <span className="home-card-eyebrow">
            Today's anchor
            {outcome && intention && (
              <em className={cn('hm-anchor-status', `is-${outcome.toLowerCase()}`)}> · {OUTCOME_PHRASES[outcome]}</em>
            )}
            {saving && <em className="hm-saving">saving</em>}
          </span>
          {isEditing ? (
            <div className="hm-anchor-edit">
              <input
                ref={inputRef}
                type="text"
                value={draft}
                maxLength={140}
                placeholder="What's the one thing today?"
                aria-label="Today's one thing"
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commit()
                  if (e.key === 'Escape') setIsEditing(false)
                }}
              />
              <button type="button" className="hm-text-btn is-strong" onMouseDown={(e) => e.preventDefault()} onClick={commit}>
                <Check size={12} strokeWidth={2.8} />
                Done
              </button>
            </div>
          ) : (
            <h2 className="home-card-title hm-anchor-title">
              <button
                type="button"
                className={cn('hm-anchor-text', !intention && 'is-placeholder')}
                onClick={startEditing}
                title={intention ? 'Edit today’s anchor' : undefined}
              >
                {intention || "What's the one thing today?"}
              </button>
            </h2>
          )}
        </div>
        {intention && !isEditing && (
          <button type="button" className="hm-icon-btn" onClick={startEditing} aria-label="Edit today's anchor">
            <Pencil size={13} strokeWidth={2.4} />
          </button>
        )}
      </header>

      {intention && !isEditing && (
        <div className="hm-anchor-figure">
          {isNoteEditing ? (
            <div className="hm-anchor-note-edit">
              <textarea
                ref={noteRef}
                value={noteDraft}
                maxLength={500}
                rows={2}
                placeholder="Context, blockers, or how it went…"
                aria-label="Anchor notes"
                onChange={(e) => setNoteDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') cancelNote()
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveNote()
                }}
              />
              <div className="hm-anchor-note-actions">
                <button type="button" className="hm-text-btn is-strong" onClick={saveNote}>
                  <Check size={12} strokeWidth={2.8} />
                  Save note
                </button>
                <button type="button" className="hm-text-btn" onClick={cancelNote}>
                  Cancel
                </button>
              </div>
            </div>
          ) : note ? (
            <button type="button" className="hm-anchor-note" onClick={startNoteEdit} title="Edit note">
              {note}
            </button>
          ) : (
            <button type="button" className="hm-text-btn hm-anchor-add-note" onClick={startNoteEdit}>
              <Plus size={12} strokeWidth={2.6} />
              Add a note
            </button>
          )}
        </div>
      )}

      <div className="hm-anchor-track" role="img" aria-label={trackLabel}>
        {track.map((day) => (
          <span
            key={day.date}
            className={cn('hm-anchor-cell', `is-${day.state}`, day.date === today && 'is-today')}
            title={`${dayTitle(day.date, today)} · ${STATE_LABEL[day.state]}${day.text ? ` — ${day.text.length > 60 ? `${day.text.slice(0, 59)}…` : day.text}` : ''}`}
          >
            <i />
          </span>
        ))}
      </div>

      <div className="hm-anchor-meta">
        {counts.set === 0 ? (
          <span className="hm-anchor-meta-quiet">Name it and the day has a spine.</span>
        ) : (
          <span className="hm-anchor-legend">
            <span className="hm-legend is-achieved"><i aria-hidden="true" />{counts.achieved} achieved</span>
            <span className="hm-legend is-partial"><i aria-hidden="true" />{counts.partial} partial</span>
          </span>
        )}
        <span className="hm-anchor-meta-span">{counts.set} of 14 days anchored</span>
      </div>

      <div className="hm-anchor-actions" role="group" aria-label={intention ? 'How did the anchor land?' : undefined}>
        {intention ? (
          OUTCOMES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={outcome === id}
              className={cn('hm-soft-btn', `hm-outcome--${id.toLowerCase()}`, outcome === id && 'is-active')}
              onClick={() => pickOutcome(id)}
            >
              <Icon size={14} strokeWidth={2.4} />
              {label}
            </button>
          ))
        ) : (
          <button type="button" className="hm-soft-btn is-primary" onClick={startEditing}>
            <Anchor size={14} strokeWidth={2.4} />
            Name today's one thing
          </button>
        )}
      </div>
    </section>
  )
}

export { TodaysAnchorCard }
