import { useMemo, useState, type KeyboardEvent, type RefObject } from 'react'
import { ArrowRight, ArrowUp, Gift, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { guessCategory, parseQuickAdd, SHOPPING_CATEGORY_LABELS, SHOPPING_MAX_BATCH } from '@/lib/shopping'
import { looksLikeLink } from '@/lib/wishlist'
import { SHOPPING_CATEGORY_ORDER, type ShoppingCategoryKey, type ShoppingItemPayload, type ShoppingSuggestion } from '@/types/shopping'
import { categoryLook, categoryTone } from '../shopping-categories'

interface AddBarProps {
  inputRef: RefObject<HTMLInputElement | null>
  /** Remembered items — the autocomplete reads these. */
  suggestions: ShoppingSuggestion[]
  /** Resolves false when the server refused the items, so the typed text can come back. */
  onAdd: (items: ShoppingItemPayload[]) => Promise<boolean>
  /** A product link was pasted: hand it to the wishlist. */
  onLink: (url: string) => void
}

const PREVIEW_LIMIT = 8
const AUTOCOMPLETE_LIMIT = 5

/**
 * The one place groceries are typed. Several can go in at once ("milk, 2 kg tomatoes, bread"):
 * each becomes a chip showing its quantity and the aisle it will land in, and that aisle can be
 * changed per item before adding — there is no sticky "file everything under X" mode to forget
 * about. A single word autocompletes from what has been bought before; a pasted product link
 * is offered to the wishlist instead.
 */
function AddBar({ inputRef, suggestions, onAdd, onLink }: AddBarProps) {
  const [text, setText] = useState('')
  /** Per-chip aisle overrides, by chip position; cleared whenever the text changes. */
  const [aisles, setAisles] = useState<Record<number, ShoppingCategoryKey>>({})
  const [highlight, setHighlight] = useState(0)
  const [completeOpen, setCompleteOpen] = useState(true)

  const link = looksLikeLink(text) ? text.trim() : null
  const parsed = useMemo(() => (link ? [] : parseQuickAdd(text)), [text, link])
  // What each chip shows: a changed aisle, else the best local guess (what was bought before,
  // then the name). Only a changed aisle is sent — otherwise the server files it, and the
  // server also knows aisles the user taught it that "Buy again" no longer lists.
  const items = parsed.map((item, index) => ({
    payload: aisles[index] ? { ...item, category: aisles[index] } : item,
    category:
      aisles[index] ??
      suggestions.find((s) => s.name.toLowerCase() === item.name.toLowerCase())?.category ??
      guessCategory(item.name),
  }))

  // Autocomplete only while a single name is being typed.
  const query = !link && !/[,;\n]/.test(text) ? text.trim().toLowerCase() : ''
  const matches = useMemo(() => {
    if (query.length < 2) return []
    const starts = suggestions.filter((s) => s.name.toLowerCase().startsWith(query))
    const contains = suggestions.filter((s) => !s.name.toLowerCase().startsWith(query) && s.name.toLowerCase().includes(query))
    return [...starts, ...contains].filter((s) => s.name.toLowerCase() !== query).slice(0, AUTOCOMPLETE_LIMIT)
  }, [query, suggestions])
  const showComplete = completeOpen && matches.length > 0

  const change = (value: string) => {
    setText(value)
    setAisles({})
    setHighlight(0)
    setCompleteOpen(true)
  }

  const submit = async (payloads: ShoppingItemPayload[]) => {
    if (payloads.length === 0) return
    const typed = text
    change('')
    const ok = await onAdd(payloads)
    if (!ok) setText((current) => current || typed)
    inputRef.current?.focus()
  }

  const pick = (suggestion: ShoppingSuggestion) => void submit([{ name: suggestion.name, category: suggestion.category }])

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!showComplete) {
      if (event.key === 'Escape') change('')
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlight((h) => (h + 1) % (matches.length + 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlight((h) => (h - 1 + matches.length + 1) % (matches.length + 1))
    } else if (event.key === 'Escape') {
      setCompleteOpen(false)
    } else if (event.key === 'Enter' && highlight > 0) {
      event.preventDefault()
      pick(matches[highlight - 1])
    }
  }

  return (
    <div className="shopping-add">
      <form
        className="shopping-add-bar"
        onSubmit={(event) => {
          event.preventDefault()
          if (link) {
            onLink(link)
            change('')
            return
          }
          void submit(items.map((item) => item.payload))
        }}
      >
        <Plus size={17} strokeWidth={2.4} className="shopping-add-glyph" aria-hidden="true" />
        <input
          ref={inputRef}
          className="shopping-add-input"
          type="text"
          value={text}
          onChange={(event) => change(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => window.setTimeout(() => setCompleteOpen(false), 120)}
          onFocus={() => setCompleteOpen(true)}
          placeholder="Add milk, 2 kg tomatoes, bread…"
          aria-label="Add groceries"
          aria-autocomplete="list"
          aria-expanded={showComplete}
          aria-controls="shopping-complete"
          autoComplete="off"
          enterKeyHint="done"
          maxLength={600}
        />
        <button type="submit" className="shopping-add-submit" disabled={!link && items.length === 0} aria-label={link ? 'Add to wishlist' : 'Add to list'}>
          <ArrowUp size={16} strokeWidth={2.75} />
        </button>

        {showComplete && (
          <ul className="shopping-complete" id="shopping-complete" role="listbox" aria-label="Bought before">
            {matches.map((suggestion, index) => {
              const look = categoryLook(suggestion.category)
              const Icon = look.icon
              return (
                <li key={suggestion.name}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={highlight === index + 1}
                    className={cn('shopping-complete-option', highlight === index + 1 && 'is-active')}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setHighlight(index + 1)}
                    onClick={() => pick(suggestion)}
                  >
                    <span className="shopping-complete-icon" style={categoryTone(look, '26')}>
                      <Icon size={12} strokeWidth={2.4} />
                    </span>
                    <span className="shopping-complete-name">{suggestion.name}</span>
                    <span className="shopping-complete-meta">{look.label}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </form>

      {link ? (
        <div className="shopping-link-offer">
          <Gift size={14} strokeWidth={2.3} />
          <span>That looks like a product link.</span>
          <button type="button" onClick={() => { onLink(link); change('') }}>
            Add to wishlist <ArrowRight size={13} strokeWidth={2.4} />
          </button>
        </div>
      ) : items.length > 0 && !showComplete && (
        <div className="shopping-preview" aria-live="polite">
          {items.slice(0, PREVIEW_LIMIT).map(({ payload: item, category }, index) => {
            const look = categoryLook(category)
            const Icon = look.icon
            return (
              <span key={`${item.name}-${index}`} className="shopping-preview-chip" style={categoryTone(look, '1c', true)}>
                <Icon size={11} strokeWidth={2.4} />
                <b>{item.name}</b>
                {item.quantity && <i>{item.quantity}</i>}
                <label className="shopping-preview-aisle" title="Change aisle">
                  <em>{SHOPPING_CATEGORY_LABELS[category]}</em>
                  <select
                    value={category}
                    onChange={(event) => setAisles((prev) => ({ ...prev, [index]: event.target.value as ShoppingCategoryKey }))}
                    aria-label={`Aisle for ${item.name}`}
                  >
                    {SHOPPING_CATEGORY_ORDER.map((key) => (
                      <option key={key} value={key}>
                        {SHOPPING_CATEGORY_LABELS[key]}
                      </option>
                    ))}
                  </select>
                </label>
              </span>
            )
          })}
          {items.length > PREVIEW_LIMIT && <span className="shopping-preview-more">+{items.length - PREVIEW_LIMIT} more</span>}
          {items.length >= SHOPPING_MAX_BATCH && <span className="shopping-preview-more">That&rsquo;s the most at once</span>}
          <span className="shopping-preview-hint">Enter to add</span>
        </div>
      )}
    </div>
  )
}

export { AddBar }
