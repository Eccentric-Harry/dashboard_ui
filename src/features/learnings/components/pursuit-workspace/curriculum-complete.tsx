import { ArrowRight, ChevronLeft } from 'lucide-react'
import type { LearningPursuit } from '@/types/learnings'
import { countLeaves, formatMinutes, hasMilestones, sumSpent } from '../../pursuit-tree'
import { NotionIcon } from '../notion-icon'

interface CurriculumCompleteProps {
  /** The pursuit as it was when its last step was ticked — the server has already moved it. */
  pursuit: LearningPursuit
  /** What to pick up next, if anything is left in the queue. */
  nextPursuit: LearningPursuit | null
  onBack: () => void
  onOpenPursuit: (pursuitId: string) => void
}

export function CurriculumComplete({ pursuit, nextPursuit, onBack, onOpenPursuit }: CurriculumCompleteProps) {
  const { total } = countLeaves(pursuit.steps)
  const logged = sumSpent(pursuit.steps)
  const summary = [
    hasMilestones(pursuit.steps) ? `${pursuit.steps.length} milestones` : null,
    `${total} ${total === 1 ? 'step' : 'steps'}`,
    logged > 0 ? `${formatMinutes(logged)} of focus` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <section className="learnings-card pw-state pw-complete" aria-labelledby="pw-complete-title">
      <span className="pw-complete-badge" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M6 12.5l4 4 8-9" pathLength={1} />
        </svg>
      </span>
      <p className="pw-eyebrow is-accent">Curriculum complete</p>
      <h1 id="pw-complete-title" className="pw-state-title">{pursuit.title}</h1>
      <p className="pw-state-meta">{summary}</p>
      <p className="pw-state-copy">It's in All Learnings now, along with the takeaways you captured on the way.</p>

      <div className="pw-state-actions">
        {nextPursuit && (
          <button type="button" className="pnu-btn is-primary" onClick={() => onOpenPursuit(nextPursuit.id)}>
            <span className="pw-continue-title">Continue with {nextPursuit.title}</span>
            <ArrowRight size={13} />
          </button>
        )}
        <button type="button" className={nextPursuit ? 'pnu-btn' : 'pnu-btn is-primary'} onClick={onBack}>
          <ChevronLeft size={13} />
          Back to Learnings
        </button>
        {pursuit.notionUrl && (
          <a className="pnu-btn is-quiet group" href={pursuit.notionUrl} target="_blank" rel="noopener noreferrer">
            <NotionIcon size={13} />
            Notion note
          </a>
        )}
      </div>
    </section>
  )
}
