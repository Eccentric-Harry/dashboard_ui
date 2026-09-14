import type { CSSProperties } from 'react'
import type { PursuitStep } from '@/types/learnings'
import { cn } from '@/lib/utils'
import { childrenOf, countLeaves, findStepById } from '../pursuit-tree'
import './pursuit-plan.css'

interface PursuitMilestoneBarProps {
  steps: PursuitStep[]
  /** Tints the segment holding this step. */
  currentStepId?: string | null
  large?: boolean
}

/**
 * One segment per top-level step, sized by how many leaves it holds and filled by how
 * many are done — progress and plan shape in a single glance.
 */
export function PursuitMilestoneBar({ steps, currentStepId, large }: PursuitMilestoneBarProps) {
  const overall = countLeaves(steps)
  if (steps.length === 0) return null

  return (
    <div
      className={cn('plan-milestones', large && 'is-large')}
      role="img"
      aria-label={`${overall.done} of ${overall.total} steps done across ${steps.length} milestones`}
    >
      {steps.map((step) => {
        const { done, total } = childrenOf(step).length > 0
          ? countLeaves(childrenOf(step))
          : { done: step.isCompleted ? 1 : 0, total: 1 }
        const fill = total > 0 ? Math.round((done / total) * 100) : 0
        const isCurrent = Boolean(currentStepId && findStepById([step], currentStepId))
        return (
          <span
            key={step.id}
            className={cn('plan-milestone', fill === 100 && 'is-done', isCurrent && 'is-current')}
            style={{ flexGrow: total, '--fill': `${fill}%` } as CSSProperties}
            title={`${step.text} — ${done}/${total}`}
          >
            <i />
          </span>
        )
      })}
    </div>
  )
}
