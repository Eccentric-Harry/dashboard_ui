import { useEffect, useRef, useState } from 'react'
import { Anchor, Check, Pencil } from 'lucide-react'
import { cn } from '../../../../lib/utils'

type TodaysAnchorCardProps = {
  /** Today's intention text, '' when none is set yet. */
  intention: string
  saving: boolean
  onSave: (text: string) => Promise<void>
}

// The /mind focus tag is deliberately not surfaced here — Home shows the one
// thing, nothing else. The tag is still preserved on save (see handleSaveAnchor).
function TodaysAnchorCard({ intention, saving, onSave }: TodaysAnchorCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (isEditing) inputRef.current?.focus()
  }, [isEditing])

  const startEditing = () => {
    setDraft(intention)
    setIsEditing(true)
  }

  const commit = () => {
    const trimmed = draft.trim()
    setIsEditing(false)
    if (!trimmed || trimmed === intention) return
    void onSave(trimmed)
  }

  return (
    <section className="home-card home-card--anchor" aria-label="Today's anchor">
      <Anchor className="home-card-glyph" aria-hidden="true" />
      <span className="home-anchor-ic" aria-hidden="true">
        <Anchor size={16} strokeWidth={2.2} />
      </span>

      <div className="home-anchor-body">
        <span className="home-card-eyebrow">
          Today's anchor
          {saving && <em className="home-anchor-saving">saving</em>}
        </span>

        {isEditing ? (
          <div className="home-anchor-edit">
            <input
              ref={inputRef}
              type="text"
              value={draft}
              maxLength={140}
              placeholder="What's the one thing today?"
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commit()
                if (e.key === 'Escape') setIsEditing(false)
              }}
            />
            <button type="button" className="home-anchor-done" onMouseDown={(e) => e.preventDefault()} onClick={commit}>
              <Check size={12} strokeWidth={2.6} />
              Done
            </button>
          </div>
        ) : (
          <button type="button" className="home-anchor-display" onClick={startEditing}>
            <span className={cn('home-anchor-quote', !intention && 'is-empty')}>
              {intention ? `“${intention}”` : "What's the one thing today?"}
            </span>
            <Pencil size={11} strokeWidth={2.4} className="home-anchor-pencil" aria-hidden="true" />
          </button>
        )}

        <p className="home-anchor-foot">
          {intention ? 'Everything else bends around this.' : 'Name it and the day has a spine.'}
        </p>
      </div>
    </section>
  )
}

export { TodaysAnchorCard }
