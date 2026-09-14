import type { PursuitStep } from '@/types/learnings'
import { cn } from '@/lib/utils'
import { findStepById, milestoneProgress } from '../../pursuit-tree'
import { MilestoneRing } from './milestone-ring'

interface MilestoneNavigatorProps {
  steps: PursuitStep[]
  /** The milestone scrolled into view. */
  activeId: string | null
  nextStepId: string | null
  onJump: (stepId: string) => void
}

/**
 * Outline of every milestone with its progress. Docked beside the curriculum on
 * desktop; a row of swipeable chips above it on phones.
 */
export function MilestoneNavigator({ steps, activeId, nextStepId, onJump }: MilestoneNavigatorProps) {
  const finished = steps.filter((step) => step.isCompleted).length

  return (
    <nav className="learnings-card pw-nav" aria-labelledby="pw-nav-title">
      <div className="pw-nav-head">
        <h2 id="pw-nav-title" className="pw-eyebrow">Milestones</h2>
        <span className="pw-nav-count">{finished}/{steps.length} done</span>
      </div>
      <ol className="pw-nav-list">
        {steps.map((step, i) => {
          const { done, total } = milestoneProgress(step)
          const holdsNext = Boolean(nextStepId && findStepById([step], nextStepId))
          const active = step.id === activeId
          return (
            <li key={step.id}>
              <button
                type="button"
                className={cn('pw-nav-item', active && 'is-active', step.isCompleted && 'is-done', holdsNext && 'has-next')}
                aria-current={active ? 'location' : undefined}
                onClick={() => onJump(step.id)}
                title={step.text}
              >
                <MilestoneRing done={done} total={total} label={i + 1} size={26} />
                <span className="pw-nav-text">
                  <span className="pw-nav-title">{step.text}</span>
                  <span className="pw-nav-sub">
                    <span>{done}/{total}</span>
                    {holdsNext && <span className="pw-next-tag">Next</span>}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
