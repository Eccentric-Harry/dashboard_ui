import { useState } from 'react'
import { Anchor, RefreshCw } from 'lucide-react'
import { cn } from '../../../../lib/utils'
import { MIND_VALUE_TAGS } from '../mind-types'

type TodaysAnchorCardProps = {
  intention: string
  onIntentionChange: (value: string) => void
  valueTag: string | null
  onValueTagChange: (tag: string | null) => void
  availableTags: string[]
  onAddTag: (tag: string) => void
  onRemoveTag: (tag: string) => void
  saving?: boolean
  affirmation: string
  onNextAffirmation: () => void
}

function TodaysAnchorCard({
  intention,
  onIntentionChange,
  valueTag,
  onValueTagChange,
  availableTags,
  onAddTag,
  onRemoveTag,
  saving = false,
  affirmation,
  onNextAffirmation,
}: TodaysAnchorCardProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newTagText, setNewTagText] = useState('')

  const submitTag = () => {
    const val = newTagText.trim()
    if (val) {
      onAddTag(val)
      onValueTagChange(val) // Auto-select the newly added tag
      setNewTagText('')
    }
    setIsAdding(false)
  }

  return (
    <section className="mind-card mind-card--anchor mind-tint-butter" aria-label="Today's anchor">
      <Anchor className="mind-card-watermark" size={104} strokeWidth={1.3} aria-hidden="true" />
      <div className="mind-card-head">
        <span className="mind-card-icon">
          <Anchor size={16} />
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <h2 className="mind-card-title">Today's anchor</h2>
            {saving && (
              <span className="mind-saving-badge">
                <span className="mind-saving-dot animate-pulse" />
                saving
              </span>
            )}
          </div>
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
        {availableTags.map((tag) => {
          const isDefault = MIND_VALUE_TAGS.includes(tag as any)
          return (
            <button
              key={tag}
              type="button"
              className={cn('mind-tag mind-tag--value', valueTag === tag && 'is-active')}
              aria-pressed={valueTag === tag}
              onClick={() => onValueTagChange(valueTag === tag ? null : tag)}
            >
              {tag}
              {!isDefault && (
                <span
                  className="mind-tag-delete"
                  role="button"
                  aria-label={`Delete custom tag ${tag}`}
                  onClick={(e) => {
                    e.stopPropagation() // Don't trigger tag selection
                    onRemoveTag(tag)
                  }}
                >
                  &times;
                </span>
              )}
            </button>
          )
        })}

        {isAdding ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              submitTag()
            }}
            className="mind-tag-form"
          >
            <input
              type="text"
              className="mind-tag-input-field"
              value={newTagText}
              onChange={(e) => setNewTagText(e.target.value)}
              placeholder="Tag name..."
              maxLength={15}
              autoFocus
              onBlur={() => {
                // Short timeout to allow clicking and submitting, or submit on blur
                setTimeout(submitTag, 150)
              }}
            />
          </form>
        ) : (
          <button
            type="button"
            className="mind-tag mind-tag--add"
            onClick={() => setIsAdding(true)}
            aria-label="Add custom tag"
          >
            + Tag
          </button>
        )}
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
