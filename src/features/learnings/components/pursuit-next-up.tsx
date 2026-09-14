import { useState } from 'react'
import { Check, Clock, CornerDownRight, Pencil, Play, Plus, Sparkles, Target, Timer, X } from 'lucide-react'
import type { LearningPursuit } from '@/types/learnings'
import { countLeaves, formatMinutes, suggestedSessionMinutes, sumEstimates, type NextStep } from '../pursuit-tree'
import './pursuit-next-up.css'

interface PursuitNextUpProps {
  pursuit: LearningPursuit
  next: NextStep
  /** A focus session is running or paused on this very step. */
  isFocusing: boolean
  onStartFocus: (minutes: number) => void
  onLearn: () => void
  onMarkDone: () => void
  onSaveResumeNote: (note: string) => void
}

/**
 * The main pursuit's current step — the "pick up where I left off" surface. Parents
 * key it by step id, so its local edit state resets when the step moves on.
 */
export function PursuitNextUp({ pursuit, next, isFocusing, onStartFocus, onLearn, onMarkDone, onSaveResumeNote }: PursuitNextUpProps) {
  const { step, trail } = next
  const [editingNote, setEditingNote] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')

  const leaves = countLeaves(pursuit.steps)
  const remaining = sumEstimates(pursuit.steps, true)
  const sessionMinutes = suggestedSessionMinutes(step)

  const startEditing = () => {
    setNoteDraft(step.resumeNote ?? '')
    setEditingNote(true)
  }

  return (
    <section className="pursuit-next-up" aria-label="Up next">
      <div className="pnu-head">
        <span className="pnu-eyebrow">
          <Target size={12} strokeWidth={2.4} />
          Up next
        </span>
        <span className="pnu-meta">
          <span className="pnu-meta-title">{pursuit.title}</span>
          <i aria-hidden="true">·</i>
          <span>{leaves.done}/{leaves.total} steps</span>
          {remaining.minutes > 0 && (
            <>
              <i aria-hidden="true">·</i>
              <span>≈{formatMinutes(remaining.minutes)} left</span>
            </>
          )}
        </span>
      </div>

      {trail.length > 0 && <p className="pnu-trail">{trail.map((t) => t.text).join(' › ')}</p>}
      <h4 className="pnu-step">{step.text}</h4>
      {step.note && <p className="pnu-note">{step.note}</p>}

      {(step.estimateMinutes || step.spentMinutes) ? (
        <div className="pnu-chips">
          {step.estimateMinutes ? (
            <span className="pnu-chip">
              <Clock size={11} />
              {formatMinutes(step.estimateMinutes)} planned
            </span>
          ) : null}
          {step.spentMinutes ? (
            <span className="pnu-chip">
              <Timer size={11} />
              {formatMinutes(step.spentMinutes)} logged
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="pnu-resume">
        {editingNote ? (
          <form
            className="pnu-resume-form"
            onSubmit={(e) => {
              e.preventDefault()
              onSaveResumeNote(noteDraft.trim())
              setEditingNote(false)
            }}
          >
            <input
              autoFocus
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setEditingNote(false)}
              maxLength={300}
              placeholder="Where did you stop? What's next?"
              aria-label="Where you left off"
            />
            <button type="submit" className="pnu-icon-btn is-save" aria-label="Save note">
              <Check size={13} strokeWidth={2.6} />
            </button>
            <button type="button" className="pnu-icon-btn" onClick={() => setEditingNote(false)} aria-label="Cancel">
              <X size={13} strokeWidth={2.6} />
            </button>
          </form>
        ) : step.resumeNote ? (
          <button type="button" className="pnu-resume-body" onClick={startEditing} title="Edit note">
            <CornerDownRight size={13} className="pnu-resume-icon" />
            <span className="pnu-resume-copy">
              <span className="pnu-resume-label">Where you left off</span>
              <span className="pnu-resume-text">{step.resumeNote}</span>
            </span>
            <Pencil size={11} className="pnu-resume-edit" />
          </button>
        ) : (
          <button type="button" className="pnu-resume-empty" onClick={startEditing}>
            <Plus size={11} />
            Note where you left off
          </button>
        )}
      </div>

      <div className="pnu-actions">
        {isFocusing ? (
          <span className="pnu-focusing">
            <i aria-hidden="true" />
            Focusing on this step
          </span>
        ) : (
          <button type="button" className="pnu-btn is-primary" onClick={() => onStartFocus(sessionMinutes)}>
            <Play size={11} fill="currentColor" strokeWidth={0} />
            Start focus · {formatMinutes(sessionMinutes)}
          </button>
        )}
        <button type="button" className="pnu-btn" onClick={onLearn}>
          <Sparkles size={13} />
          Learn with AI
        </button>
        <button type="button" className="pnu-btn is-quiet" onClick={onMarkDone}>
          <Check size={13} strokeWidth={2.6} />
          Mark done
        </button>
      </div>
    </section>
  )
}
