import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Image as ImageIcon, Link2, Loader2, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { looksLikeLink, previewFromUrl } from '@/lib/wishlist'
import type { LinkPreview, WishPriority, WishlistItem, WishlistPayload } from '@/types/wishlist'
import { WishPhoto } from './wish-card'

interface WishModalProps {
  open: boolean
  /** The wish being edited; null to add one. */
  wish: WishlistItem | null
  /** A link to start from (pasted into the grocery bar, or the empty state). */
  initialLink?: string | null
  onClose: () => void
  onSave: (payload: WishlistPayload, id: string | null) => Promise<boolean>
  onPreview: (url: string) => Promise<LinkPreview | null>
  onDelete?: (wish: WishlistItem) => void
}

type Field = 'name' | 'store' | 'price' | 'image'
type ReadState = { kind: 'idle' } | { kind: 'reading'; host: string } | { kind: 'done'; preview: LinkPreview }

const READ_DELAY_MS = 450

const hostOf = (url: string) => {
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/**
 * Add or edit a wish. Paste a product link and the rest fills itself: the store and a name come
 * from the link at once, then the page's own name, photo and price once the server has read it.
 * Nothing the user typed is ever overwritten. When a store blocks the read (Flipkart, Croma), it
 * says so plainly and leaves the price and photo to the user — the photo can be any image
 * address, and it is only ever linked, never saved.
 */
export function WishModal({ open, wish, initialLink, onClose, onSave, onPreview, onDelete }: WishModalProps) {
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')
  const [store, setStore] = useState('')
  const [price, setPrice] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [priority, setPriority] = useState<WishPriority>('WANT')
  const [note, setNote] = useState('')
  const [showImageField, setShowImageField] = useState(false)
  const [read, setRead] = useState<ReadState>({ kind: 'idle' })
  const [saving, setSaving] = useState(false)
  const touched = useRef(new Set<Field>())
  const lastRead = useRef<string | null>(null)
  const linkRef = useRef<HTMLInputElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    /* eslint-disable react-hooks/set-state-in-effect */
    setUrl(wish?.url ?? initialLink ?? '')
    setName(wish?.name ?? '')
    setStore(wish?.store ?? '')
    setPrice(wish?.price != null ? String(wish.price) : '')
    setImageUrl(wish?.imageUrl ?? '')
    setPriority(wish?.priority ?? 'WANT')
    setNote(wish?.note ?? '')
    setShowImageField(false)
    setRead({ kind: 'idle' })
    setSaving(false)
    /* eslint-enable react-hooks/set-state-in-effect */
    touched.current = new Set(wish ? (['name', 'store', 'price', 'image'] as Field[]) : [])
    lastRead.current = wish?.url ?? null
    window.setTimeout(() => (wish ? nameRef : linkRef).current?.focus(), 30)
  }, [open, wish, initialLink])

  /** Writes what a link said into every field the user hasn't typed in. */
  const fill = (preview: LinkPreview) => {
    if (preview.title && !touched.current.has('name')) setName(preview.title)
    if (preview.store && !touched.current.has('store')) setStore(preview.store)
    if (preview.price != null && !touched.current.has('price')) setPrice(String(Math.round(preview.price)))
    if (preview.imageUrl && !touched.current.has('image')) setImageUrl(preview.imageUrl)
  }

  // Read the link a moment after it stops changing.
  useEffect(() => {
    if (!open) return
    const link = url.trim()
    if (!link || !looksLikeLink(link) || link === lastRead.current) return
    const timer = window.setTimeout(async () => {
      lastRead.current = link
      const local = previewFromUrl(link)
      if (local) fill(local)
      setRead({ kind: 'reading', host: hostOf(link) })
      const preview = await onPreview(link)
      if (lastRead.current !== link) return
      if (preview) fill(preview)
      setRead(preview ? { kind: 'done', preview } : { kind: 'idle' })
    }, READ_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [url, open, onPreview])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const edit = (field: Field, setter: (value: string) => void) => (value: string) => {
    touched.current.add(field)
    setter(value)
  }

  if (!open) return null

  const numPrice = Number(price)
  const validPrice = price.trim() === '' || (Number.isFinite(numPrice) && numPrice >= 0)
  const canSave = name.trim().length > 0 && validPrice && !saving

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!canSave) return
    setSaving(true)
    const ok = await onSave(
      {
        name: name.trim(),
        url: url.trim() || null,
        store: store.trim() || null,
        imageUrl: imageUrl.trim() || null,
        price: price.trim() === '' ? null : numPrice,
        priority,
        note: note.trim() || null,
      },
      wish?.id ?? null,
    )
    setSaving(false)
    if (ok) onClose()
  }

  const readNote = () => {
    if (read.kind === 'reading') {
      return (
        <p className="wish-read is-busy">
          <Loader2 size={12} className="spinner" /> Reading {read.host}…
        </p>
      )
    }
    if (read.kind !== 'done') return null
    const { preview } = read
    if (!preview.fetched) {
      return (
        <p className="wish-read is-blocked">
          {preview.store ?? 'This store'} didn&rsquo;t let us read the page — the name is from the link. Add the price, and an
          image address if you&rsquo;d like a photo.
        </p>
      )
    }
    const found = [preview.imageUrl && 'the photo', preview.price != null && 'the price'].filter(Boolean)
    return (
      <p className="wish-read is-ok">
        <Check size={12} strokeWidth={2.8} />
        {found.length ? `Found ${found.join(' and ')}.` : 'Read the page — add the price yourself.'}
        {preview.price == null && found.length > 0 ? ' Add the price yourself.' : ''}
      </p>
    )
  }

  return createPortal(
    <div className="shopping-modal-backdrop" role="presentation" onClick={onClose}>
      <div className="shopping-edit-modal wish-modal" role="dialog" aria-modal="true" aria-label={wish ? `Edit ${wish.name}` : 'Add to wishlist'} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="shopping-modal-close" onClick={onClose} aria-label="Close">
          <X size={15} />
        </button>
        <h2 className="shopping-modal-title">{wish ? 'Edit wish' : 'Add to wishlist'}</h2>

        <form onSubmit={submit} className="shopping-modal-form">
          <label className="shopping-field wish-link-field">
            <span>Product link</span>
            <span className="wish-link-input">
              <Link2 size={14} strokeWidth={2.3} />
              <input
                ref={linkRef}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste from Amazon, Decathlon, Myntra… (optional)"
                inputMode="url"
                autoComplete="off"
                maxLength={2000}
              />
            </span>
            {readNote()}
          </label>

          <div className="wish-modal-grid">
            <div className="wish-modal-photo">
              <WishPhoto wish={{ imageUrl: imageUrl.trim() || null, store: store.trim() || null, name }} />
              <button type="button" className="wish-photo-change" onClick={() => setShowImageField((v) => !v)}>
                <ImageIcon size={12} strokeWidth={2.3} /> {imageUrl ? 'Change photo' : 'Add a photo'}
              </button>
            </div>
            <div className="wish-modal-fields">
              <label className="shopping-field">
                <span>Name</span>
                <input ref={nameRef} value={name} onChange={(e) => edit('name', setName)(e.target.value)} maxLength={120} placeholder="Running shoes" autoComplete="off" />
              </label>
              <div className="shopping-field-row is-even">
                <label className="shopping-field">
                  <span>Price</span>
                  <span className="wish-price-input">
                    <i>₹</i>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="1"
                      value={price}
                      onChange={(e) => edit('price', setPrice)(e.target.value)}
                      placeholder="0"
                      aria-invalid={!validPrice}
                    />
                  </span>
                </label>
                <label className="shopping-field">
                  <span>From</span>
                  <input value={store} onChange={(e) => edit('store', setStore)(e.target.value)} maxLength={60} placeholder="Decathlon, Kondapur" autoComplete="off" />
                </label>
              </div>
              <div className="shopping-field">
                <span>How much do you need it?</span>
                <div className="wish-priority" role="radiogroup" aria-label="Need or want">
                  {(['NEED', 'WANT'] as WishPriority[]).map((p) => (
                    <button key={p} type="button" role="radio" aria-checked={priority === p} className={cn(priority === p && 'is-active')} onClick={() => setPriority(p)}>
                      {p === 'NEED' ? 'Need it' : 'Want it'}
                    </button>
                  ))}
                </div>
                <small className="wish-hint">
                  {priority === 'WANT' ? 'Wants wait 30 days before “time to decide” — most impulse buys fade by then.' : 'Needs skip the cooling-off.'}
                </small>
              </div>
            </div>
          </div>

          {showImageField && (
            <label className="shopping-field">
              <span>Image address</span>
              <input
                value={imageUrl}
                onChange={(e) => edit('image', setImageUrl)(e.target.value)}
                placeholder="Right-click the product photo → Copy image address"
                autoComplete="off"
                maxLength={2000}
              />
            </label>
          )}

          <label className="shopping-field">
            <span>Note</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={280} placeholder="Size 9 · wait for the sale · try it in store" autoComplete="off" />
          </label>

          <div className="shopping-modal-actions">
            {wish && onDelete ? (
              <button type="button" className="shopping-modal-delete" onClick={() => onDelete(wish)}>
                <Trash2 size={14} strokeWidth={2.2} /> Delete
              </button>
            ) : (
              <span />
            )}
            <button type="submit" className="shopping-modal-save" disabled={!canSave}>
              {saving ? <Loader2 className="spinner" size={16} /> : wish ? 'Save' : 'Add to wishlist'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
