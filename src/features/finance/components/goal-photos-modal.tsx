// Curating a goal's photos: pick the cover, drop the shots that don't pull you, and bring
// more in by link — a product page replaces the set with its own photos, an image link adds
// that one. The pick-your-cover step is the point: choosing the colour you'll actually buy
// makes it yours before it is.

import { createElement, useEffect, useState } from 'react'
import { Link2, Loader2, RotateCcw, Search, Star, Trash2, X } from 'lucide-react'
import type { GoalPhoto, SavingsGoal } from '@/types/finance'
import { useConfirmClose } from '@/hooks/use-confirm-close'
import type { GoalColor } from '@/lib/finance-goals'
import { cn } from '@/lib/utils'
import { goalIcon } from '../goal-icons'

interface GoalPhotosModalProps {
  isOpen: boolean
  goal: SavingsGoal
  color: GoalColor
  /** The photos are the app's built-in set (goal-presets.ts): shown, not curated. */
  builtIn: boolean
  finding: boolean
  /** Look the official page up by name again (null when that can't work, e.g. guest mode). */
  onFindByName: (() => void) | null
  /** Fetch from a pasted link; resolves true when it worked. */
  onFetch: (url: string) => Promise<boolean>
  /** Save the new order (first = cover); resolves true when it worked. */
  onSave: (photoUrls: string[]) => Promise<boolean>
  onClose: () => void
}

export function GoalPhotosModal({ isOpen, goal, color, builtIn, finding, onFindByName, onFetch, onSave, onClose }: GoalPhotosModalProps) {
  const photos = goal.showcase?.photos ?? []
  const [order, setOrder] = useState<GoalPhoto[]>(photos)
  const [link, setLink] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    /* eslint-disable react-hooks/set-state-in-effect */
    setOrder(goal.showcase?.photos ?? [])
    setLink('')
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [isOpen, goal.showcase])

  const dirty = order.map((p) => p.url).join('|') !== photos.map((p) => p.url).join('|')
  const { requestClose, dialog: confirmCloseDialog } = useConfirmClose(dirty || Boolean(link.trim()), onClose)
  if (!isOpen) return null

  const makeCover = (url: string) => setOrder((prev) => [...prev.filter((p) => p.url === url), ...prev.filter((p) => p.url !== url)])
  const remove = (url: string) => setOrder((prev) => prev.filter((p) => p.url !== url))

  const fetchLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!link.trim() || finding) return
    if (await onFetch(link.trim())) setLink('')
  }

  const save = async () => {
    setSaving(true)
    const done = await onSave(order.map((p) => p.url))
    setSaving(false)
    if (done) onClose()
  }

  return (
    <>
      <div className="finance-modal-backdrop" role="presentation" onClick={requestClose}>
        <div
          className={cn('finance-modal-popover add-tx-modal fin-form-modal fin-goal-modal fin-goal-photos-modal', `fin-goal--${color}`)}
          role="dialog"
          aria-modal="true"
          aria-label={`Photos — ${goal.name}`}
          onClick={(e) => e.stopPropagation()}
        >
          <button type="button" className="finance-modal-close" onClick={requestClose} aria-label="Close">
            <X size={15} />
          </button>

          <h2 className="fin-form-title fin-goal-money-title">
            <span className="fin-goal-title-ic" aria-hidden="true">
              {createElement(goalIcon(goal), { size: 15, strokeWidth: 2.4 })}
            </span>
            Photos <em>· {goal.name}</em>
          </h2>

          <form className="fin-goal-link-row" onSubmit={fetchLink}>
            <label className="fin-goal-link-field">
              <Link2 size={14} strokeWidth={2.4} aria-hidden="true" />
              <input
                type="url"
                inputMode="url"
                placeholder="Paste a product page or an image link"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                aria-label="Product page or image link"
                autoFocus={order.length === 0}
              />
            </label>
            <button type="submit" className="fin-goal-primary" disabled={!link.trim() || finding}>
              {finding ? <Loader2 size={14} className="spinner" /> : 'Fetch'}
            </button>
          </form>
          <p className="fin-goal-link-hint">
            {builtIn
              ? `These are built-in photos of the ${goal.name}. Paste a product page to use its photos instead — your reasons stay.`
              : 'A product page brings its own photos and highlights (your reasons stay). An image link adds that one photo.'}
            {onFindByName && !builtIn && (
              <>
                {' '}
                <button type="button" className="fin-text-btn" onClick={onFindByName} disabled={finding}>
                  {order.length ? <RotateCcw size={10} strokeWidth={2.6} /> : <Search size={10} strokeWidth={2.6} />}
                  {order.length ? 'find them again' : `find photos for ${goal.name}`}
                </button>
              </>
            )}
          </p>

          {order.length > 0 ? (
            <ul className="fin-goal-photo-grid" aria-label="Photos — the first is the cover">
              {order.map((photo, i) => (
                <li key={photo.url} className={cn(i === 0 && 'is-cover', photo.tone === 'LIGHT' ? 'is-light' : 'is-dark')}>
                  <img src={photo.url} alt="" loading="lazy" referrerPolicy="no-referrer" draggable={false} />
                  {builtIn ? (
                    i === 0 && (
                      <span className="fin-goal-photo-badge">
                        <Star size={10} strokeWidth={2.6} /> Cover
                      </span>
                    )
                  ) : i === 0 ? (
                    <span className="fin-goal-photo-badge">
                      <Star size={10} strokeWidth={2.6} /> Cover
                    </span>
                  ) : (
                    <button type="button" className="fin-goal-photo-act is-cover" onClick={() => makeCover(photo.url)} aria-label="Make this the cover" title="Make cover">
                      <Star size={12} strokeWidth={2.4} />
                    </button>
                  )}
                  {!builtIn && (
                    <button type="button" className="fin-goal-photo-act is-remove" onClick={() => remove(photo.url)} aria-label="Remove photo" title="Remove">
                      <Trash2 size={12} strokeWidth={2.4} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="fin-goal-empty">
              {photos.length ? 'Every photo removed — saving clears the showcase.' : 'No photos yet. Paste a link above to bring some in.'}
            </p>
          )}

          {builtIn ? (
            <button type="button" className="add-tx-submit is-quiet" onClick={onClose}>
              Done
            </button>
          ) : (
            <button type="button" className="add-tx-submit" onClick={save} disabled={!dirty || saving}>
              {saving ? <Loader2 className="spinner" size={18} /> : dirty ? `Save ${order.length} photo${order.length === 1 ? '' : 's'}` : 'Tap a star to pick the cover'}
            </button>
          )}
        </div>
      </div>
      {confirmCloseDialog}
    </>
  )
}

interface GoalReasonModalProps {
  isOpen: boolean
  goal: SavingsGoal
  color: GoalColor
  onSave: (reason: string) => Promise<boolean>
  onClose: () => void
}

/** One reason, in the user's own words — what they'll read when the money is wanted elsewhere. */
export function GoalReasonModal({ isOpen, goal, color, onSave, onClose }: GoalReasonModalProps) {
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    if (isOpen) setText('')
  }, [isOpen])

  const { requestClose, dialog: confirmCloseDialog } = useConfirmClose(Boolean(text.trim()), onClose)
  if (!isOpen) return null

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    setSaving(true)
    const done = await onSave(text.trim())
    setSaving(false)
    if (done) onClose()
  }

  return (
    <>
      <div className="finance-modal-backdrop" role="presentation" onClick={requestClose}>
        <div
          className={cn('finance-modal-popover add-tx-modal fin-form-modal fin-goal-modal fin-goal-reason-modal', `fin-goal--${color}`)}
          role="dialog"
          aria-modal="true"
          aria-label={`Why you want ${goal.name}`}
          onClick={(e) => e.stopPropagation()}
        >
          <button type="button" className="finance-modal-close" onClick={requestClose} aria-label="Close">
            <X size={15} />
          </button>
          <h2 className="fin-form-title fin-goal-money-title">
            <span className="fin-goal-title-ic" aria-hidden="true">
              {createElement(goalIcon(goal), { size: 15, strokeWidth: 2.4 })}
            </span>
            Why you want it <em>· {goal.name}</em>
          </h2>
          <form className="add-tx-form fin-form" onSubmit={submit}>
            <div className="form-group">
              <label htmlFor="fin-goal-reason">In your own words</label>
              <textarea
                id="fin-goal-reason"
                rows={3}
                maxLength={140}
                placeholder={goal.kind === 'TRIP' ? 'e.g. First trip with everyone since college' : 'e.g. Low-light photos of the trip that actually look like the trip'}
                value={text}
                onChange={(e) => setText(e.target.value)}
                autoFocus
              />
              <small className="fin-form-hint">It shows on the goal — the line you'll read when the money's tempted elsewhere.</small>
            </div>
            <button type="submit" className="add-tx-submit" disabled={!text.trim() || saving}>
              {saving ? <Loader2 className="spinner" size={18} /> : 'Add reason'}
            </button>
          </form>
        </div>
      </div>
      {confirmCloseDialog}
    </>
  )
}
