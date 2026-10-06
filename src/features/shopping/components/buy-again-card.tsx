import { History, Plus, X } from 'lucide-react'
import type { ShoppingSuggestion } from '@/types/shopping'
import { categoryLook, categoryTone } from '../shopping-categories'

interface BuyAgainCardProps {
  suggestions: ShoppingSuggestion[]
  onAdd: (suggestion: ShoppingSuggestion) => void
  onForget: (suggestion: ShoppingSuggestion) => void
}

/** What you usually buy and don't have on the list — one tap puts it back. Learned, never preset. */
function BuyAgainCard({ suggestions, onAdd, onForget }: BuyAgainCardProps) {
  return (
    <section className="shopping-card shopping-again" aria-label="Buy again">
      <header className="shopping-side-head">
        <History size={14} strokeWidth={2.3} />
        <h2>Buy again</h2>
      </header>
      {suggestions.length === 0 ? (
        <p className="shopping-side-empty">Things you add often will show up here.</p>
      ) : (
        <ul className="shopping-again-list">
          {suggestions.map((suggestion) => {
            const look = categoryLook(suggestion.category)
            const Icon = look.icon
            return (
              <li key={suggestion.name} className="shopping-again-item">
                <button type="button" className="shopping-again-add" onClick={() => onAdd(suggestion)} title={`Add ${suggestion.name}`}>
                  <span className="shopping-again-icon" style={categoryTone(look, '26')} aria-hidden="true">
                    <Icon size={12} strokeWidth={2.4} />
                  </span>
                  <span className="shopping-again-name">{suggestion.name}</span>
                  <Plus size={13} strokeWidth={2.6} className="shopping-again-plus" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="shopping-again-forget"
                  onClick={() => onForget(suggestion)}
                  aria-label={`Stop suggesting ${suggestion.name}`}
                  title="Stop suggesting"
                >
                  <X size={11} strokeWidth={2.6} />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export { BuyAgainCard }
