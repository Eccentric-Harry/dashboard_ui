import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SHOPPING_CATEGORY_ORDER, type ShoppingCategoryKey, type ShoppingItem, type ShoppingItemPayload } from '@/types/shopping'
import { categoryLook } from '../shopping-categories'

interface EditModalProps {
  item: ShoppingItem | null
  onClose: () => void
  onSave: (id: string, payload: ShoppingItemPayload) => Promise<boolean>
  onRemove: (item: ShoppingItem) => void
}

/** Rename an item, change its quantity or note, or move it to another aisle. Fits the window — no inner scroll. */
function EditModal({ item, onClose, onSave, onRemove }: EditModalProps) {
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [note, setNote] = useState('')
  const [category, setCategory] = useState<ShoppingCategoryKey>('OTHER')
  const [saving, setSaving] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!item) return
    /* eslint-disable react-hooks/set-state-in-effect */
    setName(item.name)
    setQuantity(item.quantity ?? '')
    setNote(item.note ?? '')
    setCategory(item.category)
    setSaving(false)
    /* eslint-enable react-hooks/set-state-in-effect */
    nameRef.current?.select()
  }, [item])

  useEffect(() => {
    if (!item) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [item, onClose])

  if (!item) return null

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim() || saving) return
    setSaving(true)
    const ok = await onSave(item.id, { name: name.trim(), category, quantity: quantity.trim() || null, note: note.trim() || null })
    setSaving(false)
    if (ok) onClose()
  }

  return createPortal(
    <div className="shopping-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="shopping-edit-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Edit ${item.name}`}
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="shopping-modal-close" onClick={onClose} aria-label="Close">
          <X size={15} />
        </button>
        <h2 className="shopping-modal-title">Edit item</h2>

        <form onSubmit={submit} className="shopping-modal-form">
          <label className="shopping-field">
            <span>Name</span>
            <input ref={nameRef} value={name} onChange={(event) => setName(event.target.value)} maxLength={80} autoComplete="off" />
          </label>
          <div className="shopping-field-row">
            <label className="shopping-field">
              <span>Quantity</span>
              <input value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="2 kg" maxLength={24} autoComplete="off" />
            </label>
            <label className="shopping-field">
              <span>Note</span>
              <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="the Amul one" maxLength={120} autoComplete="off" />
            </label>
          </div>

          <div className="shopping-field">
            <span>
              Aisle <small>· remembered for next time</small>
            </span>
            <div className="shopping-chip-grid" role="listbox" aria-label="Aisle">
              {SHOPPING_CATEGORY_ORDER.map((key) => {
                const look = categoryLook(key)
                const Icon = look.icon
                return (
                  <button
                    key={key}
                    type="button"
                    role="option"
                    aria-selected={category === key}
                    className={cn('shopping-cat-chip', category === key && 'is-active')}
                    style={{ '--chip-hue': look.hue } as CSSProperties}
                    onClick={() => setCategory(key)}
                  >
                    <Icon size={12} strokeWidth={2.4} />
                    {look.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="shopping-modal-actions">
            <button
              type="button"
              className="shopping-modal-delete"
              onClick={() => {
                onRemove(item)
                onClose()
              }}
            >
              <Trash2 size={14} strokeWidth={2.2} /> Remove
            </button>
            <button type="submit" className="shopping-modal-save" disabled={!name.trim() || saving}>
              {saving ? <Loader2 className="spinner" size={16} /> : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}

export { EditModal }
