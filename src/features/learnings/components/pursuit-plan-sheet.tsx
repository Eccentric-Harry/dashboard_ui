import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Star, X } from 'lucide-react'
import type { LearningPursuit, PursuitStep } from '@/types/learnings'
import { PursuitMilestoneBar } from './pursuit-milestone-bar'
import { PursuitStepTree, type StepEditPatch } from './pursuit-step-tree'
import { countLeaves, formatMinutes, sumEstimates, sumSpent } from '../pursuit-tree'
import './create-pursuit-modal.css'
import './pursuit-plan.css'

interface PursuitPlanSheetProps {
  pursuit: LearningPursuit
  isMain: boolean
  currentStepId?: string | null
  onClose: () => void
  onToggle: (stepId: string) => void
  onEdit: (stepId: string, patch: StepEditPatch) => void
  onDelete: (step: PursuitStep) => void
  onAdd: (text: string, parentId?: string) => Promise<boolean>
  onLearn: (stepId: string) => void
}

/**
 * The full step tree on its own layer: a floating side sheet on desktop, a bottom sheet
 * on phones. The queue card stays compact and the page stays visible behind it.
 */
export function PursuitPlanSheet({ pursuit, isMain, currentStepId, onClose, onToggle, onEdit, onDelete, onAdd, onLearn }: PursuitPlanSheetProps) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const { done, total } = countLeaves(pursuit.steps)
  const percentage = total > 0 ? Math.round((done / total) * 100) : 0
  const remaining = sumEstimates(pursuit.steps, true)
  const logged = sumSpent(pursuit.steps)

  useEffect(() => {
    closeRef.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      // A modal opened from inside the sheet (Learn with AI) handles its own Escape.
      if (e.key === 'Escape' && !document.querySelector('.pursuit-modal')) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return createPortal(
    <div className="plan-sheet-backdrop" role="presentation" onClick={onClose}>
      <aside
        className="plan-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-sheet-title"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="plan-sheet-grabber" aria-hidden="true" />
        <header className="plan-sheet-header">
          <div className="plan-sheet-heading">
            <p className="plan-sheet-eyebrow">
              {pursuit.category}
              {isMain && (
                <span className="pursuit-main-badge">
                  <Star size={8} fill="currentColor" strokeWidth={0} />
                  Main
                </span>
              )}
            </p>
            <h2 id="plan-sheet-title" className="plan-sheet-title">{pursuit.title}</h2>
            {pursuit.goal && <p className="plan-sheet-goal">{pursuit.goal}</p>}
          </div>
          <button ref={closeRef} type="button" className="pursuit-close" onClick={onClose} aria-label="Close plan">
            <X size={16} />
          </button>
        </header>

        <div className="plan-sheet-stats">
          <div className="plan-stat">
            <span className="plan-stat-value">{percentage}%</span>
            <span className="plan-stat-label">complete</span>
          </div>
          <div className="plan-stat">
            <span className="plan-stat-value">{done}/{total}</span>
            <span className="plan-stat-label">steps done</span>
          </div>
          {remaining.minutes > 0 && (
            <div className="plan-stat">
              <span className="plan-stat-value">≈{formatMinutes(remaining.minutes)}</span>
              <span className="plan-stat-label">left</span>
            </div>
          )}
          {logged > 0 && (
            <div className="plan-stat">
              <span className="plan-stat-value">{formatMinutes(logged)}</span>
              <span className="plan-stat-label">logged</span>
            </div>
          )}
        </div>

        <div className="plan-sheet-progress">
          <PursuitMilestoneBar steps={pursuit.steps} currentStepId={currentStepId} large />
        </div>

        <div className="plan-sheet-body">
          <PursuitStepTree
            pursuit={pursuit}
            currentStepId={currentStepId}
            onToggle={onToggle}
            onEdit={onEdit}
            onDelete={onDelete}
            onAdd={onAdd}
            onLearn={onLearn}
          />
        </div>
      </aside>
    </div>,
    document.body,
  )
}
