import { useState } from 'react'
import { Anchor, RefreshCw, Pencil, Check } from 'lucide-react'
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
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [isPickingTag, setIsPickingTag] = useState(false)
  const [isAddingTag, setIsAddingTag] = useState(false)
  const [newTagText, setNewTagText] = useState('')

  const startEditing = () => {
    setDraft(intention)
    setIsEditing(true)
    setIsPickingTag(false)
  }

  const finishEditing = () => {
    onIntentionChange(draft.trim())
    setIsEditing(false)
  }

  const submitTag = () => {
    const val = newTagText.trim()
    if (val) {
      onAddTag(val)
      onValueTagChange(val)
      setNewTagText('')
    }
    setIsAddingTag(false)
    setIsPickingTag(false)
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

      {/* Intention: quote display (click to edit) or inline edit mode */}
      {isEditing ? (
        <div className="mind-anchor-edit-row">
          <input
            type="text"
            className="mind-anchor-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="What matters today?"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') finishEditing()
              if (e.key === 'Escape') setIsEditing(false)
            }}
          />
          <button type="button" className="mind-solid-btn" onClick={finishEditing}>
            <Check size={12} />
            Done
          </button>
        </div>
      ) : (
        <div
          className="mind-anchor-display"
          role="button"
          tabIndex={0}
          onClick={startEditing}
          onKeyDown={(e) => e.key === 'Enter' && startEditing()}
          aria-label={intention ? `Intention: ${intention}. Click to edit.` : 'Set your intention for today'}
        >
          {intention ? (
            <p className="mind-anchor-quote">"{intention}"</p>
          ) : (
            <p className={cn('mind-anchor-quote', 'mind-anchor-quote--empty')}>What matters today?</p>
          )}
          <button
            type="button"
            className="mind-anchor-edit-btn"
            onClick={(e) => { e.stopPropagation(); startEditing() }}
            aria-label="Edit intention"
            tabIndex={-1}
          >
            <Pencil size={11} />
          </button>
        </div>
      )}

      {/* Focus tag: show only the active one (or a "Set focus" prompt) */}
      <div className="mind-anchor-tag-area">
        {valueTag ? (
          <>
            <span className="mind-anchor-active-tag">
              <span aria-hidden="true">●</span>
              {valueTag}
              <button
                type="button"
                className="mind-anchor-tag-clear"
                onClick={() => { onValueTagChange(null); setIsPickingTag(false) }}
                aria-label={`Clear focus: ${valueTag}`}
              >
                ×
              </button>
            </span>
            <button
              type="button"
              className="mind-anchor-tag-change-btn"
              onClick={() => setIsPickingTag((p) => !p)}
              aria-expanded={isPickingTag}
            >
              {isPickingTag ? 'close' : 'change ▾'}
            </button>
          </>
        ) : (
          <button
            type="button"
            className="mind-anchor-set-focus-btn"
            onClick={() => setIsPickingTag((p) => !p)}
            aria-expanded={isPickingTag}
          >
            {isPickingTag ? '▲ close' : '+ Set focus'}
          </button>
        )}
      </div>

      {/* Tag picker — inline, only when isPickingTag */}
      {isPickingTag && (
        <div className="mind-anchor-tag-picker" role="group" aria-label="Choose focus tag">
          {availableTags.map((tag) => {
            const isDefault = MIND_VALUE_TAGS.includes(tag as any)
            return (
              <button
                key={tag}
                type="button"
                className={cn('mind-tag mind-tag--value', valueTag === tag && 'is-active')}
                aria-pressed={valueTag === tag}
                onClick={() => {
                  onValueTagChange(valueTag === tag ? null : tag)
                  setIsPickingTag(false)
                }}
              >
                {tag}
                {!isDefault && (
                  <span
                    className="mind-tag-delete"
                    role="button"
                    aria-label={`Delete custom tag ${tag}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemoveTag(tag)
                    }}
                  >
                    &times;
                  </span>
                )}
              </button>
            )
          })}
          {isAddingTag ? (
            <form
              onSubmit={(e) => { e.preventDefault(); submitTag() }}
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
                onBlur={() => setTimeout(submitTag, 150)}
              />
            </form>
          ) : (
            <button
              type="button"
              className="mind-tag mind-tag--add"
              onClick={() => setIsAddingTag(true)}
              aria-label="Add custom tag"
            >
              + Tag
            </button>
          )}
        </div>
      )}

      {/* Affirmation */}
      <div className="mind-affirmation">
        <p className="mind-affirmation-text">"{affirmation}"</p>
        <button type="button" className="mind-ghost-btn" onClick={onNextAffirmation} aria-label="Another affirmation">
          <RefreshCw size={12} />
        </button>
      </div>
    </section>
  )
}

export { TodaysAnchorCard }
