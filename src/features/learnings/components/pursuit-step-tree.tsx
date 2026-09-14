import { useState, type CSSProperties } from 'react'
import { Check, ChevronRight, CornerDownRight, Loader2, Pencil, Plus, Sparkles, Trash2, X } from 'lucide-react'
import type { LearningPursuit, PursuitStep } from '@/types/learnings'
import { cn } from '@/lib/utils'
import { ESTIMATE_OPTIONS, MAX_STEP_DEPTH, childrenOf, countLeaves, formatMinutes } from '../pursuit-tree'
import './pursuit-step-tree.css'

export interface StepEditPatch {
  text: string
  /** null clears the estimate. */
  estimateMinutes: number | null
}

interface PursuitStepTreeProps {
  pursuit: LearningPursuit
  /** Highlights the step Up next points at. */
  currentStepId?: string | null
  onToggle: (stepId: string) => void
  onEdit: (stepId: string, patch: StepEditPatch) => void
  onDelete: (step: PursuitStep) => void
  /** Resolves true once the step is saved, so the input can clear for the next one. */
  onAdd: (text: string, parentId?: string) => Promise<boolean>
  onLearn?: (stepId: string) => void
}

type AddingState = { parentId: string | null; text: string; busy: boolean }
type EditingState = { id: string; text: string; estimate: number | null; isLeaf: boolean }

const estimateChoices = (current: number | null) =>
  current && !ESTIMATE_OPTIONS.includes(current) ? [...ESTIMATE_OPTIONS, current].sort((a, b) => a - b) : ESTIMATE_OPTIONS

export function PursuitStepTree({ pursuit, currentStepId, onToggle, onEdit, onDelete, onAdd, onLearn }: PursuitStepTreeProps) {
  // Explicit fold choices; otherwise finished parents fold away and open ones stay expanded.
  const [folded, setFolded] = useState<Record<string, boolean>>({})
  const [editing, setEditing] = useState<EditingState | null>(null)
  const [adding, setAdding] = useState<AddingState | null>(null)

  const isFolded = (step: PursuitStep) => folded[step.id] ?? step.isCompleted

  const saveEdit = () => {
    if (editing && editing.text.trim()) {
      onEdit(editing.id, { text: editing.text.trim(), estimateMinutes: editing.isLeaf ? editing.estimate : null })
    }
    setEditing(null)
  }

  const submitAdd = async () => {
    if (!adding || !adding.text.trim() || adding.busy) return
    const current = adding
    setAdding({ ...current, busy: true })
    const ok = await onAdd(current.text.trim(), current.parentId ?? undefined)
    // Stay open after a save so several steps can be added in a row.
    setAdding(ok ? { parentId: current.parentId, text: '', busy: false } : { ...current, busy: false })
  }

  const renderAddInput = (parentId: string | null) =>
    adding && (
      <form
        className="pursuit-step-add-form"
        onSubmit={(e) => {
          e.preventDefault()
          void submitAdd()
        }}
      >
        <CornerDownRight size={12} className="pursuit-step-add-glyph" />
        <input
          autoFocus
          value={adding.text}
          onChange={(e) => setAdding({ ...adding, text: e.target.value })}
          onKeyDown={(e) => e.key === 'Escape' && setAdding(null)}
          placeholder={parentId ? 'New sub-step' : 'New step'}
          maxLength={200}
          aria-label={parentId ? 'New sub-step' : 'New step'}
        />
        <button type="submit" disabled={!adding.text.trim() || adding.busy} title="Save" aria-label="Save step">
          {adding.busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} strokeWidth={3} />}
        </button>
        <button type="button" onClick={() => setAdding(null)} title="Cancel" aria-label="Cancel">
          <X size={12} strokeWidth={3} />
        </button>
      </form>
    )

  const renderSteps = (steps: PursuitStep[], depth: number) => (
    <ul className={cn('pursuit-step-list', depth > 0 && 'is-nested')}>
      {steps.map((step) => {
        const children = childrenOf(step)
        const hasChildren = children.length > 0
        const isStepFolded = hasChildren && isFolded(step)
        const leaves = hasChildren ? countLeaves(children) : null
        const partial = leaves !== null && leaves.done > 0 && !step.isCompleted
        const isEditing = editing?.id === step.id
        const isCurrent = step.id === currentStepId
        const spent = step.spentMinutes ?? 0

        return (
          <li key={step.id} className={cn('pursuit-step', `is-depth-${depth}`)}>
            <div className={cn('pursuit-step-row', step.isCompleted && 'is-done', isCurrent && 'is-current')}>
              {hasChildren ? (
                <button
                  type="button"
                  className={cn('pursuit-step-fold', !isStepFolded && 'is-open')}
                  onClick={() => setFolded((prev) => ({ ...prev, [step.id]: !isStepFolded }))}
                  aria-expanded={!isStepFolded}
                  aria-label={isStepFolded ? 'Show sub-steps' : 'Hide sub-steps'}
                >
                  <ChevronRight size={12} />
                </button>
              ) : (
                <span className="pursuit-step-fold-spacer" />
              )}

              <button
                type="button"
                role="checkbox"
                aria-checked={step.isCompleted ? true : partial ? 'mixed' : false}
                aria-label={step.text}
                className={cn('pursuit-step-check', step.isCompleted && 'is-checked', partial && 'is-partial')}
                style={partial && leaves ? ({ '--pct': Math.round((leaves.done / leaves.total) * 100) } as CSSProperties) : undefined}
                onClick={() => onToggle(step.id)}
                title={hasChildren ? (step.isCompleted ? 'Mark all sub-steps undone' : 'Mark all sub-steps done') : undefined}
              >
                {step.isCompleted && <Check size={10} strokeWidth={3} />}
              </button>

              {isEditing ? (
                <div className="pursuit-step-edit">
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
                  {editing.isLeaf && (
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
                  <button type="button" onClick={saveEdit} title="Save" aria-label="Save">
                    <Check size={12} strokeWidth={3} />
                  </button>
                  <button type="button" onClick={() => setEditing(null)} title="Cancel" aria-label="Cancel">
                    <X size={12} strokeWidth={3} />
                  </button>
                </div>
              ) : (
                <div className="pursuit-step-body">
                  <span className="pursuit-step-text">{step.text}</span>
                  {step.note && <span className="pursuit-step-note">{step.note}</span>}
                </div>
              )}

              {/* Tag, time, counts and actions share one group so narrow screens can drop it under the text. */}
              {!isEditing && (
                <div className="pursuit-step-meta">
                  {isCurrent && !isEditing && <span className="pursuit-step-next-tag">Next</span>}

                  {!hasChildren && !isEditing && (step.isCompleted ? spent > 0 : step.estimateMinutes || spent > 0) ? (
                    <span
                      className="pursuit-step-estimate"
                      title={spent > 0 ? `${formatMinutes(spent)} logged${step.estimateMinutes ? ` of ${formatMinutes(step.estimateMinutes)} planned` : ''}` : 'Planned time'}
                    >
                      {/* A finished step only reports what it took; plan-vs-actual is for open work. */}
                      {step.isCompleted
                        ? formatMinutes(spent)
                        : spent > 0
                          ? `${formatMinutes(spent)}${step.estimateMinutes ? ` / ${formatMinutes(step.estimateMinutes)}` : ''}`
                          : formatMinutes(step.estimateMinutes ?? 0)}
                    </span>
                  ) : null}

                  {leaves && !isEditing && (
                    <span className={cn('pursuit-step-count', step.isCompleted && 'is-done')}>
                      {leaves.done}/{leaves.total}
                    </span>
                  )}

                  {!isEditing && (
                    <div className="pursuit-step-actions">
                      {onLearn && !hasChildren && !step.isCompleted && (
                        <button type="button" className="is-ai" onClick={() => onLearn(step.id)} title="Learn with AI" aria-label="Learn with AI">
                          <Sparkles size={11} />
                        </button>
                      )}
                      {depth < MAX_STEP_DEPTH - 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setFolded((prev) => ({ ...prev, [step.id]: false }))
                            setAdding({ parentId: step.id, text: '', busy: false })
                          }}
                          title="Add sub-step"
                          aria-label="Add sub-step"
                        >
                          <Plus size={11} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setEditing({ id: step.id, text: step.text, estimate: step.estimateMinutes ?? null, isLeaf: !hasChildren })}
                        title="Edit"
                        aria-label="Edit step"
                      >
                        <Pencil size={11} />
                      </button>
                      <button type="button" className="is-danger" onClick={() => onDelete(step)} title="Delete" aria-label="Delete step">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {hasChildren && !isStepFolded && renderSteps(children, depth + 1)}
            {adding?.parentId === step.id && <div className="pursuit-step-list is-nested">{renderAddInput(step.id)}</div>}
          </li>
        )
      })}
    </ul>
  )

  return (
    <div className="pursuit-step-tree">
      {pursuit.steps.length === 0 ? (
        <span className="pursuit-step-empty">No steps yet.</span>
      ) : (
        renderSteps(pursuit.steps, 0)
      )}
      {adding?.parentId === null ? (
        renderAddInput(null)
      ) : (
        <button
          type="button"
          className="pursuit-step-add-root"
          onClick={() => setAdding({ parentId: null, text: '', busy: false })}
        >
          <Plus size={11} />
          Add step
        </button>
      )}
    </div>
  )
}
