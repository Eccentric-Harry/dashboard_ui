import { useState, type AnimationEvent, type CSSProperties, type MouseEvent } from 'react'
import { Check, CheckCheck, ChevronDown, CornerDownRight, Pencil, Play, Plus, Sparkles, Trash2, Undo2, X } from 'lucide-react'
import type { PursuitStep } from '@/types/learnings'
import { cn } from '@/lib/utils'
import type { StepEditPatch } from '../../use-pursuit-actions'
import {
  MAX_STEP_DEPTH,
  childrenOf,
  countLeaves,
  estimateChoices,
  formatMinutes,
  milestoneProgress,
  sumEstimates,
} from '../../pursuit-tree'
import { stepBodyId } from './curriculum-ids'
import { MilestoneRing } from './milestone-ring'

/** Shared state and handlers for every line in the curriculum. */
export interface CurriculumContext {
  nextStepId: string | null
  focusingStepId: string | null
  spotlightId: string | null
  addingParentId: string | null
  isOpen: (stepId: string) => boolean
  setOpen: (stepId: string, open: boolean) => void
  setAddingParentId: (parentId: string | null) => void
  onSpotlightEnd: () => void
  onToggle: (stepId: string) => void
  onEdit: (stepId: string, patch: StepEditPatch) => void
  onDelete: (step: PursuitStep) => void
  onAdd: (text: string, parentId?: string) => Promise<boolean>
  onLearn: (stepId: string) => void
  onFocus: (step: PursuitStep) => void
}

interface StepRowProps {
  step: PursuitStep
  /** Tree depth, 0 = top level. */
  depth: number
  /** `head` draws a milestone's header; `row` a step inside the plan. */
  variant: 'head' | 'row'
  /** Milestone number, for heads. */
  index?: number
  ctx: CurriculumContext
}

type EditingState = { text: string; estimate: number | null }

/** A finished step reports what it took; open work shows plan against actual. */
function timeLabel(step: PursuitStep): string | null {
  const spent = step.spentMinutes ?? 0
  if (step.isCompleted) return spent > 0 ? formatMinutes(spent) : null
  if (spent > 0) return `${formatMinutes(spent)}${step.estimateMinutes ? ` / ${formatMinutes(step.estimateMinutes)}` : ''}`
  return step.estimateMinutes ? formatMinutes(step.estimateMinutes) : null
}

const INTERACTIVE = 'button, a, input, select, textarea, form'

export function StepRow({ step, depth, variant, index, ctx }: StepRowProps) {
  const children = childrenOf(step)
  const hasChildren = children.length > 0
  const leaves = hasChildren ? countLeaves(children) : null
  const done = step.isCompleted
  const partial = leaves !== null && leaves.done > 0 && !done
  const isHead = variant === 'head'
  const isNext = step.id === ctx.nextStepId
  const isFocusing = step.id === ctx.focusingStepId
  const open = hasChildren && ctx.isOpen(step.id)
  const canNest = depth < MAX_STEP_DEPTH - 1

  const [editing, setEditing] = useState<EditingState | null>(null)

  // A step that flips to done plays its check-off once. Adjusting state while rendering
  // (not in an effect) lands the animation in the same frame as the tick.
  const [prevDone, setPrevDone] = useState(done)
  const [celebrating, setCelebrating] = useState(false)
  if (prevDone !== done) {
    setPrevDone(done)
    setCelebrating(done)
  }

  const saveEdit = () => {
    if (editing?.text.trim()) {
      ctx.onEdit(step.id, {
        text: editing.text.trim(),
        ...(hasChildren ? {} : { estimateMinutes: editing.estimate }),
      })
    }
    setEditing(null)
  }

  const handleHeadClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!isHead || !hasChildren || editing) return
    if ((e.target as HTMLElement).closest(INTERACTIVE)) return
    // Selecting a title to copy it shouldn't also fold the milestone.
    if (window.getSelection()?.toString()) return
    ctx.setOpen(step.id, !open)
  }

  const handleAnimationEnd = (e: AnimationEvent<HTMLDivElement>) => {
    if (e.animationName === 'pw-row-flash' || e.animationName === 'pw-head-flash') setCelebrating(false)
    if (e.animationName === 'pw-spotlight') ctx.onSpotlightEnd()
  }

  const progress = milestoneProgress(step)
  const remaining = isHead && hasChildren && !done ? sumEstimates(children, true).minutes : 0
  const time = hasChildren ? (remaining > 0 ? `≈${formatMinutes(remaining)} left` : null) : timeLabel(step)
  const Title = isHead ? 'h3' : 'span'

  const lead = isHead && hasChildren ? (
    <MilestoneRing done={progress.done} total={progress.total} label={index} size={32} />
  ) : (
    <button
      type="button"
      role="checkbox"
      aria-checked={done ? true : partial ? 'mixed' : false}
      aria-label={step.text}
      className={cn('pw-check', done && 'is-checked', partial && 'is-partial')}
      style={partial && leaves ? ({ '--pct': Math.round((leaves.done / leaves.total) * 100) } as CSSProperties) : undefined}
      title={hasChildren ? (done ? 'Mark all sub-steps not done' : 'Mark all sub-steps done') : undefined}
      onClick={() => ctx.onToggle(step.id)}
    >
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M5.2 10.4l3.1 3.1 6.5-6.9" pathLength={1} />
      </svg>
    </button>
  )

  return (
    <div
      className={cn(
        'pw-line',
        isHead ? 'is-head' : 'is-row',
        done && 'is-done',
        isNext && 'is-next',
        isHead && hasChildren && 'is-foldable',
        celebrating && 'is-celebrating',
        ctx.spotlightId === step.id && 'is-spotlight',
        editing && 'is-editing',
      )}
      data-step-id={step.id}
      onClick={handleHeadClick}
      onAnimationEnd={handleAnimationEnd}
    >
      {lead}

      <div className="pw-line-main">
        {editing ? (
          <div className="pw-edit-line">
            <input
              autoFocus
              value={editing.text}
              onChange={(e) => setEditing({ ...editing, text: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveEdit()
                if (e.key === 'Escape') setEditing(null)
              }}
              maxLength={200}
              aria-label="Step text"
            />
            {!hasChildren && (
              <select
                value={editing.estimate ?? ''}
                onChange={(e) => setEditing({ ...editing, estimate: e.target.value ? Number(e.target.value) : null })}
                aria-label="Estimated time"
              >
                <option value="">No estimate</option>
                {estimateChoices(editing.estimate).map((m) => (
                  <option key={m} value={m}>{formatMinutes(m)}</option>
                ))}
              </select>
            )}
            <button type="button" className="pw-act is-save" onClick={saveEdit} title="Save" aria-label="Save">
              <Check size={14} strokeWidth={2.8} />
            </button>
            <button type="button" className="pw-act" onClick={() => setEditing(null)} title="Cancel" aria-label="Cancel">
              <X size={14} strokeWidth={2.8} />
            </button>
          </div>
        ) : (
          <>
            {isHead && index !== undefined && <span className="pw-line-eyebrow">Milestone {index}</span>}
            <Title className="pw-line-text">{step.text}</Title>
            {step.note && <span className="pw-line-note">{step.note}</span>}
            {isNext && step.resumeNote && (
              <span className="pw-line-resume">
                <CornerDownRight size={12} aria-hidden="true" />
                {step.resumeNote}
              </span>
            )}
          </>
        )}
      </div>

      {!editing && (
        <div className="pw-line-meta">
          {isFocusing ? (
            <span className="pw-next-tag is-focusing">
              <i aria-hidden="true" />
              Focusing
            </span>
          ) : isNext ? (
            <span className="pw-next-tag">Next</span>
          ) : null}

          {time && (
            <span
              className="pw-time"
              title={step.spentMinutes && !hasChildren ? `${formatMinutes(step.spentMinutes)} logged` : 'Planned time'}
            >
              {time}
            </span>
          )}

          {leaves && <span className={cn('pw-count', done && 'is-done')}>{leaves.done}/{leaves.total}</span>}

          <div className="pw-line-actions">
            {!hasChildren && !done && !isFocusing && (
              <button type="button" className="pw-act is-accent" onClick={() => ctx.onFocus(step)} title="Focus on this step" aria-label={`Start a focus session on "${step.text}"`}>
                <Play size={12} fill="currentColor" strokeWidth={0} />
              </button>
            )}
            {!hasChildren && !done && (
              <button type="button" className="pw-act is-accent" onClick={() => ctx.onLearn(step.id)} title="Learn with AI" aria-label={`Learn "${step.text}" with AI`}>
                <Sparkles size={13} />
              </button>
            )}
            {isHead && hasChildren && (
              <button
                type="button"
                className="pw-act is-accent"
                onClick={() => ctx.onToggle(step.id)}
                title={done ? 'Mark milestone not done' : 'Mark the whole milestone done'}
                aria-label={done ? 'Mark milestone not done' : 'Mark the whole milestone done'}
              >
                {done ? <Undo2 size={13} /> : <CheckCheck size={14} />}
              </button>
            )}
            {canNest && (
              <button
                type="button"
                className="pw-act"
                onClick={() => {
                  ctx.setOpen(step.id, true)
                  ctx.setAddingParentId(step.id)
                }}
                title={hasChildren ? 'Add sub-step' : 'Break into sub-steps'}
                aria-label={hasChildren ? 'Add sub-step' : 'Break into sub-steps'}
              >
                <Plus size={14} />
              </button>
            )}
            <button
              type="button"
              className="pw-act"
              onClick={() => setEditing({ text: step.text, estimate: step.estimateMinutes ?? null })}
              title="Edit"
              aria-label="Edit step"
            >
              <Pencil size={12} />
            </button>
            <button type="button" className="pw-act is-danger" onClick={() => ctx.onDelete(step)} title="Delete" aria-label="Delete step">
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      )}

      {hasChildren && (
        <button
          type="button"
          className="pw-fold"
          aria-expanded={open}
          aria-controls={stepBodyId(step.id)}
          aria-label={open ? `Collapse "${step.text}"` : `Expand "${step.text}"`}
          onClick={() => ctx.setOpen(step.id, !open)}
        >
          <ChevronDown size={isHead ? 17 : 15} />
        </button>
      )}
    </div>
  )
}
