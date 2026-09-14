import { useState } from 'react'
import { Check, ChevronLeft, NotebookPen, Play, Sparkles, Target, X } from 'lucide-react'
import type { LearningPursuit } from '@/types/learnings'
import { cn } from '@/lib/utils'
import { formatMinutes, suggestedSessionMinutes, type NextStep } from '../../pursuit-tree'
import { FocusPill } from './focus-pill'
import { PursuitSwitcher } from './pursuit-switcher'

interface StickyActionBarProps {
  /** Pinned over scrolling content, so it needs its own surface. */
  stuck: boolean
  /** Up next has scrolled out of view. */
  condensed: boolean
  pursuit: LearningPursuit
  pursuits: LearningPursuit[]
  next: NextStep | null
  sessionActive: boolean
  onBack: () => void
  onSelectPursuit: (pursuitId: string) => void
  onStartFocus: (minutes: number) => void
  onLearn: () => void
  onMarkDone: () => void
  onSaveResumeNote: (note: string) => void
}

/**
 * Pinned to the top of the workspace. At rest it's the way back plus the pursuit
 * switcher; once Up next scrolls away it condenses into Up next's step and actions,
 * so they stay one tap away anywhere in a long curriculum. Both states share one
 * fixed height, so switching never shifts the page.
 */
export function StickyActionBar({
  stuck,
  condensed,
  pursuit,
  pursuits,
  next,
  sessionActive,
  onBack,
  onSelectPursuit,
  onStartFocus,
  onLearn,
  onMarkDone,
  onSaveResumeNote,
}: StickyActionBarProps) {
  const [noteDraft, setNoteDraft] = useState<string | null>(null)
  const showCondensed = condensed && next !== null
  const minutes = next ? suggestedSessionMinutes(next.step) : 45

  return (
    <div className={cn('pw-bar', (stuck || showCondensed) && 'is-stuck', showCondensed && 'is-condensed')}>
      <span className="pw-bar-surface" aria-hidden="true" />

      <div className="pw-bar-layer is-rest" inert={showCondensed}>
        <button type="button" className="pw-chip-btn pw-back" onClick={onBack}>
          <ChevronLeft size={15} strokeWidth={2.4} />
          Learnings
        </button>
        <div className="pw-bar-end">
          <FocusPill />
          <PursuitSwitcher pursuits={pursuits} currentId={pursuit.id} onSelect={onSelectPursuit} />
        </div>
      </div>

      {next && (
        <div className="pw-bar-layer is-condensed" inert={!showCondensed}>
          <button type="button" className="pw-chip-btn pw-back is-icon" onClick={onBack} title="Back to Learnings" aria-label="Back to Learnings">
            <ChevronLeft size={16} strokeWidth={2.4} />
          </button>

          {showCondensed && noteDraft !== null ? (
            <form
              className="pw-bar-note"
              onSubmit={(e) => {
                e.preventDefault()
                onSaveResumeNote(noteDraft.trim())
                setNoteDraft(null)
              }}
            >
              <input
                autoFocus
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && setNoteDraft(null)}
                maxLength={300}
                placeholder="Where did you stop? What's next?"
                aria-label="Where you left off"
              />
              <button type="submit" className="pw-act is-save" title="Save note" aria-label="Save note">
                <Check size={14} strokeWidth={2.6} />
              </button>
              <button type="button" className="pw-act" onClick={() => setNoteDraft(null)} title="Cancel" aria-label="Cancel">
                <X size={14} strokeWidth={2.6} />
              </button>
            </form>
          ) : (
            <>
              <div className="pw-bar-now">
                <span className="pw-bar-eyebrow">
                  <Target size={11} strokeWidth={2.4} />
                  Up next
                </span>
                <span className="pw-bar-step" title={next.step.text}>{next.step.text}</span>
              </div>
              <div className="pw-bar-actions">
                {sessionActive ? (
                  <FocusPill compact />
                ) : (
                  <button
                    type="button"
                    className="pnu-btn is-primary pw-bar-btn"
                    onClick={() => onStartFocus(minutes)}
                    title={`Start focus · ${formatMinutes(minutes)}`}
                    aria-label={`Start focus, ${formatMinutes(minutes)}`}
                  >
                    <Play size={11} fill="currentColor" strokeWidth={0} />
                    <span className="pw-btn-label">Start focus · {formatMinutes(minutes)}</span>
                  </button>
                )}
                <button type="button" className="pnu-btn pw-bar-btn" onClick={onLearn} title="Learn with AI" aria-label="Learn with AI">
                  <Sparkles size={13} />
                  <span className="pw-btn-label">Learn with AI</span>
                </button>
                <button
                  type="button"
                  className="pnu-btn is-quiet pw-bar-btn"
                  onClick={() => setNoteDraft(next.step.resumeNote ?? '')}
                  title="Note where you left off"
                  aria-label="Note where you left off"
                >
                  <NotebookPen size={13} />
                </button>
                <button type="button" className="pnu-btn is-quiet pw-bar-btn" onClick={onMarkDone} title="Mark done" aria-label="Mark done">
                  <Check size={13} strokeWidth={2.6} />
                  <span className="pw-btn-label">Mark done</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
