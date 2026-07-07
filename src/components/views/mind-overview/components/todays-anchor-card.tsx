import { Anchor, RefreshCw } from 'lucide-react'
import { cn } from '../../../../lib/utils'
import type { MindValueTag } from '../mind-types'
import { MIND_VALUE_TAGS } from '../mind-types'

type TodaysAnchorCardProps = {
  intention: string
  onIntentionChange: (value: string) => void
  valueTag: MindValueTag | null
  onValueTagChange: (tag: MindValueTag | null) => void
  affirmation: string
  onNextAffirmation: () => void
}

function TodaysAnchorCard({
  intention,
  onIntentionChange,
  valueTag,
  onValueTagChange,
  affirmation,
  onNextAffirmation,
}: TodaysAnchorCardProps) {
  return (
    <section className="mind-card mind-card--anchor mind-tint-butter" aria-label="Today's anchor">
      <Anchor className="mind-card-watermark" size={104} strokeWidth={1.3} aria-hidden="true" />
      <div className="mind-card-head">
        <span className="mind-card-icon">
          <Anchor size={16} />
        </span>
        <div>
          <h2 className="mind-card-title">Today's anchor</h2>
          <p className="mind-card-sub">One intention, held lightly</p>
        </div>
      </div>

      <input
        type="text"
        className="mind-anchor-input"
        value={intention}
        onChange={(e) => onIntentionChange(e.target.value)}
        placeholder="What matters today?"
      />

      <div className="mind-anchor-values" role="group" aria-label="Value focus">
        {MIND_VALUE_TAGS.map((tag) => (
          <button
            key={tag}
            type="button"
            className={cn('mind-tag mind-tag--value', valueTag === tag && 'is-active')}
            aria-pressed={valueTag === tag}
            onClick={() => onValueTagChange(valueTag === tag ? null : tag)}
          >
            {tag}
          </button>
        ))}
      </div>

      <div className="mind-affirmation">
        <p className="mind-affirmation-text">“{affirmation}”</p>
        <button type="button" className="mind-ghost-btn" onClick={onNextAffirmation} aria-label="Another affirmation">
          <RefreshCw size={12} />
        </button>
      </div>
    </section>
  )
}

export { TodaysAnchorCard }
