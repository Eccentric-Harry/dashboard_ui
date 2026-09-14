import type { ReactNode } from 'react'
import { Plus } from 'lucide-react'
import type { PursuitStep } from '@/types/learnings'
import { cn } from '@/lib/utils'
import { childrenOf } from '../../pursuit-tree'
import { AddStepForm } from './add-step-form'
import { sectionDomId, stepBodyId } from './curriculum-ids'
import { StepRow, type CurriculumContext } from './step-row'

/** Animated fold. Closed content stays mounted (so it can animate) but leaves the tab order. */
function Collapse({ open, id, children }: { open: boolean; id: string; children: ReactNode }) {
  return (
    <div id={id} className={cn('pw-collapse', open && 'is-open')} inert={!open}>
      <div className="pw-collapse-inner">{children}</div>
    </div>
  )
}

interface StepBranchProps {
  step: PursuitStep
  depth: number
  ctx: CurriculumContext
}

/** A step and everything nested under it. */
export function StepBranch({ step, depth, ctx }: StepBranchProps) {
  const children = childrenOf(step)
  const adding = ctx.addingParentId === step.id
  const open = children.length > 0 && ctx.isOpen(step.id)

  return (
    <li className="pw-branch">
      <StepRow step={step} depth={depth} variant="row" ctx={ctx} />
      {(children.length > 0 || adding) && (
        <Collapse open={open || adding} id={stepBodyId(step.id)}>
          {children.length > 0 && (
            <ul className="pw-steps is-nested">
              {children.map((child) => (
                <StepBranch key={child.id} step={child} depth={depth + 1} ctx={ctx} />
              ))}
            </ul>
          )}
          {adding && (
            <div className="pw-steps is-nested">
              <AddStepForm
                placeholder="New sub-step"
                onSubmit={(text) => ctx.onAdd(text, step.id)}
                onClose={() => ctx.setAddingParentId(null)}
              />
            </div>
          )}
        </Collapse>
      )}
    </li>
  )
}

interface MilestoneSectionProps {
  step: PursuitStep
  /** 1-based position in the plan. */
  index: number
  ctx: CurriculumContext
}

/** One top-level step as its own card: a header with progress, then its steps. */
export function MilestoneSection({ step, index, ctx }: MilestoneSectionProps) {
  const children = childrenOf(step)
  const hasChildren = children.length > 0
  const adding = ctx.addingParentId === step.id
  const open = hasChildren && ctx.isOpen(step.id)

  return (
    <section
      id={sectionDomId(step.id)}
      className={cn('learnings-card pw-section', step.isCompleted && 'is-done', !hasChildren && 'is-single', (open || adding) && 'is-open')}
    >
      <StepRow step={step} depth={0} variant="head" index={index} ctx={ctx} />
      {(hasChildren || adding) && (
        <Collapse open={open || adding} id={stepBodyId(step.id)}>
          <div className="pw-section-steps">
            {hasChildren && (
              <ul className="pw-steps">
                {children.map((child) => (
                  <StepBranch key={child.id} step={child} depth={1} ctx={ctx} />
                ))}
              </ul>
            )}
            {adding ? (
              <AddStepForm
                placeholder={hasChildren ? 'New step' : 'First sub-step'}
                onSubmit={(text) => ctx.onAdd(text, step.id)}
                onClose={() => ctx.setAddingParentId(null)}
              />
            ) : (
              <button type="button" className="pw-add-trigger" onClick={() => ctx.setAddingParentId(step.id)}>
                <Plus size={13} />
                Add step
              </button>
            )}
          </div>
        </Collapse>
      )}
    </section>
  )
}
