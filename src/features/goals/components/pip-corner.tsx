import { useEffect, useMemo, useState } from 'react'
import { Check, Loader2, Pencil, ShoppingBag, Shirt, Sparkles, X } from 'lucide-react'
import type { CampLookPayload, CampView, CampWearSlot } from '@/types/goals'
import { getErrorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'
import type { PipMood } from '../buddy-brain'
import { buddyNameOf, CAMP_ITEMS, campItem, WEAR_SLOTS, type CampItemInfo } from '../camp-catalog'
import { campSound } from '../camp-sound'
import { pipGrowth, type PipStage } from '../pip-growth'
import { CampSheet } from './camp-sheet'
import { DecorThumb } from './camp-decor'
import { Pip } from './pip'

export type PipCornerTab = 'wardrobe' | 'shop'

type PipCornerProps = {
  tab: PipCornerTab | null
  origin: HTMLElement | null
  camp: CampView | undefined
  mood: PipMood
  stage: PipStage
  weeksKept: number
  onTab: (tab: PipCornerTab) => void
  /** Resolves with the new camp, or throws with Fen's reason. */
  onBuy: (itemId: string) => Promise<CampView>
  onLook: (look: CampLookPayload) => Promise<CampView>
  onClose: () => void
}

const FEN_HELLO = [
  'Welcome to Fen’s! Everything’s priced in sparks — and I’m a fox of my word.',
  'Ah, a customer! Have a look. Trying on is free.',
  'Fine goods for a fine camp. Tap anything to see it on your sprout.',
]

const SECTIONS: { slot: CampItemInfo['slot']; label: string }[] = [
  { slot: 'hat', label: 'Hats' },
  { slot: 'neck', label: 'Neck' },
  { slot: 'face', label: 'Face' },
  { slot: 'decor', label: 'For the camp' },
]

/**
 * Pip's corner: the wardrobe, and Fen's cart next door. Pip stands beside the card as a
 * live preview — tap anything in the cart to try it on before spending a spark. Bought
 * clothes go straight on; decorations go out at camp. The buddy's name is edited here too.
 */
function PipCorner({ tab: liveTab, origin, camp, mood, stage, weeksKept, onTab, onBuy, onLook, onClose }: PipCornerProps) {
  const open = liveTab != null
  const tab = liveTab ?? 'wardrobe'
  const [tryOn, setTryOn] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [cheer, setCheer] = useState(false)
  const [fenLine, setFenLine] = useState<string | null>(null)
  const [naming, setNaming] = useState(false)
  const [name, setName] = useState('')

  const owned = useMemo(() => new Set(camp?.owned ?? []), [camp])
  const equipped = camp?.equipped ?? {}
  const decor = camp?.decor ?? []
  const sparks = camp?.sparks ?? 0
  const buddy = buddyNameOf(camp?.buddyName)
  const growth = pipGrowth(weeksKept)

  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTryOn(null)
    setError('')
    setFenLine(null)
    setNaming(false)
  }, [open, tab])

  useEffect(() => {
    if (!cheer) return
    const t = window.setTimeout(() => setCheer(false), 1600)
    return () => window.clearTimeout(t)
  }, [cheer])

  const tried = tryOn ? campItem(tryOn) : undefined
  const previewWear = {
    ...equipped,
    ...(tried && tried.slot !== 'decor' ? { [tried.slot]: tried.id } : {}),
  } as Partial<Record<CampWearSlot, string>>

  const look = (patch: Partial<CampLookPayload>): CampLookPayload => ({
    buddyName: camp?.buddyName ?? null,
    equipped: { ...equipped },
    decor: [...decor],
    ...patch,
  })

  const saveLook = async (next: CampLookPayload, key: string) => {
    setBusy(key)
    setError('')
    try {
      await onLook(next)
      campSound.play('equip')
    } catch (err) {
      setError(getErrorMessage(err, 'Couldn’t change that — try again.'))
      campSound.play('soft-no')
    } finally {
      setBusy(null)
    }
  }

  const toggleWear = (item: CampItemInfo) => {
    const slot = item.slot as CampWearSlot
    const nextEquipped = { ...equipped }
    if (nextEquipped[slot] === item.id) delete nextEquipped[slot]
    else nextEquipped[slot] = item.id
    void saveLook(look({ equipped: nextEquipped }), item.id)
  }

  const toggleDecor = (item: CampItemInfo) => {
    const next = decor.includes(item.id) ? decor.filter((d) => d !== item.id) : [...decor, item.id]
    void saveLook(look({ decor: next }), item.id)
  }

  const buy = async (item: CampItemInfo) => {
    setBusy(item.id)
    setError('')
    try {
      await onBuy(item.id)
      campSound.play('buy')
      setCheer(true)
      setTryOn(null)
      setFenLine(item.slot === 'decor' ? 'Pleasure doing business! It’s already out at camp.' : `Pleasure doing business! The ${item.name.toLowerCase()} suits your sprout.`)
    } catch (err) {
      setError(getErrorMessage(err, 'Fen couldn’t sell that just now.'))
      campSound.play('soft-no')
    } finally {
      setBusy(null)
    }
  }

  const saveName = () => {
    setNaming(false)
    const trimmed = name.trim().replace(/\s+/g, ' ')
    if (trimmed === (camp?.buddyName ?? '')) return
    void saveLook(look({ buddyName: trimmed || null }), 'name')
  }

  const hero = (
    <div className="pc-hero">
      <span className="pc-podium" aria-hidden="true" />
      <Pip mood={cheer ? 'celebrating' : tryOn ? 'eager' : mood === 'cozy' ? 'content' : mood} size={150} stage={stage} wear={previewWear} name={buddy} className="pc-pip" />
      {naming ? (
        <form
          className="pc-name pc-name--edit"
          onSubmit={(e) => {
            e.preventDefault()
            saveName()
          }}
        >
          <input
            value={name}
            maxLength={16}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
            aria-label="Your buddy's name"
            placeholder="Pip"
            autoFocus
          />
        </form>
      ) : (
        <button
          type="button"
          className="pc-name"
          onClick={() => {
            setName(camp?.buddyName ?? '')
            setNaming(true)
          }}
          title="Rename"
        >
          {busy === 'name' ? <Loader2 size={12} className="animate-spin" /> : null}
          {buddy} <Pencil size={11} strokeWidth={2.8} />
        </button>
      )}
      <p className="pc-growth">
        {growth.name}
        {growth.next ? ` · ${growth.next.name.toLowerCase()} at ${growth.next.at} kept weeks` : ' · fully grown'}
      </p>
    </div>
  )

  const tile = (item: CampItemInfo, mode: 'wear' | 'shop') => {
    const isOwned = owned.has(item.id)
    const on = item.slot === 'decor' ? decor.includes(item.id) : equipped[item.slot as CampWearSlot] === item.id
    const selected = mode === 'shop' && tryOn === item.id
    return (
      <li key={item.id}>
        <button
          type="button"
          className={cn('pc-tile', on && mode === 'wear' && 'is-on', selected && 'is-selected', isOwned && mode === 'shop' && 'is-owned')}
          aria-pressed={mode === 'wear' ? on : selected}
          disabled={busy != null}
          onClick={() => {
            if (mode === 'wear') {
              if (item.slot === 'decor') toggleDecor(item)
              else toggleWear(item)
              return
            }
            campSound.play('tap')
            setTryOn((t) => (t === item.id ? null : item.id))
            setFenLine(item.pitch)
          }}
        >
          <span className="pc-thumb" aria-hidden="true">
            {item.slot === 'decor' ? (
              <DecorThumb id={item.id} />
            ) : (
              <Pip mood="content" size={58} stage="sprout" wear={{ [item.slot]: item.id }} />
            )}
          </span>
          <span className="pc-tile-name">{item.name}</span>
          {mode === 'shop' ? (
            isOwned ? (
              <span className="pc-tag is-owned">
                <Check size={11} strokeWidth={3} /> Yours
              </span>
            ) : (
              <span className={cn('pc-tag', sparks < item.price && 'is-short')}>✦ {item.price}</span>
            )
          ) : (
            <span className={cn('pc-tag', on && 'is-on')}>{busy === item.id ? <Loader2 size={11} className="animate-spin" /> : on ? (item.slot === 'decor' ? 'Out' : 'Wearing') : item.slot === 'decor' ? 'Put out' : 'Wear'}</span>
          )}
        </button>
      </li>
    )
  }

  const ownedItems = CAMP_ITEMS.filter((i) => owned.has(i.id))
  const short = tried && !owned.has(tried.id) ? Math.max(0, tried.price - sparks) : 0

  return (
    <CampSheet open={open} onRequestClose={onClose} origin={origin} labelledBy="pc-title" hero={hero} layout="side" width={560} color="tangerine">
      <div className="pc">
        <header className="pc-head">
          <h2 id="pc-title" className="sr-only">
            {buddy}’s corner
          </h2>
          <div className="pc-tabs" role="tablist" aria-label="Wardrobe or shop">
            <button type="button" role="tab" aria-selected={tab === 'wardrobe'} className={cn('pc-tabbtn', tab === 'wardrobe' && 'is-on')} onClick={() => onTab('wardrobe')}>
              <Shirt size={15} strokeWidth={2.5} /> Wardrobe
            </button>
            <button type="button" role="tab" aria-selected={tab === 'shop'} className={cn('pc-tabbtn', tab === 'shop' && 'is-on')} onClick={() => onTab('shop')}>
              <ShoppingBag size={15} strokeWidth={2.5} /> Fen’s cart
            </button>
          </div>
          <span className="pc-sparks" title="Your sparks">
            ✦ <strong>{sparks}</strong>
          </span>
          <button type="button" className="cs-icon" onClick={onClose} aria-label="Close" data-autofocus>
            <X size={16} strokeWidth={2.6} />
          </button>
        </header>

        <div className="pc-body">
          {tab === 'shop' ? (
            <>
              <p className="pc-fen">
                <span className="pc-fen-name">Fen</span>
                {fenLine ?? FEN_HELLO[sparks % FEN_HELLO.length]}
              </p>
              {SECTIONS.map(({ slot, label }) => (
                <section key={slot} className="pc-section">
                  <h3>{label}</h3>
                  <ul className="pc-grid">{CAMP_ITEMS.filter((i) => i.slot === slot).map((i) => tile(i, 'shop'))}</ul>
                </section>
              ))}
            </>
          ) : ownedItems.length === 0 ? (
            <div className="pc-empty">
              <p>Nothing in the wardrobe yet. Fen’s cart has hats, scarves and things for the camp — all for sparks you earn by keeping weeks.</p>
              <button type="button" className="pc-cta" onClick={() => onTab('shop')}>
                <ShoppingBag size={16} strokeWidth={2.6} /> Visit Fen’s cart
              </button>
            </div>
          ) : (
            [...WEAR_SLOTS.map((w) => ({ slot: w.slot as CampItemInfo['slot'], label: w.label })), { slot: 'decor' as const, label: 'Out at camp' }].map(({ slot, label }) => {
              const items = ownedItems.filter((i) => i.slot === slot)
              if (items.length === 0) return null
              return (
                <section key={slot} className="pc-section">
                  <h3>{label}</h3>
                  <ul className="pc-grid">{items.map((i) => tile(i, 'wear'))}</ul>
                </section>
              )
            })
          )}
          {error && (
            <p className="pc-error" role="alert">
              {error}
            </p>
          )}
        </div>

        {tab === 'shop' && tried && !owned.has(tried.id) && (
          <footer className="pc-foot">
            <span className="pc-foot-text">
              <strong>{tried.name}</strong>
              <small>{short > 0 ? `${short} more sparks to go — keep a week or two` : `You’ll have ✦ ${sparks - tried.price} left`}</small>
            </span>
            <button type="button" className="pc-cta" disabled={short > 0 || busy != null} onClick={() => void buy(tried)}>
              {busy === tried.id ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} strokeWidth={2.6} />}
              Buy · ✦ {tried.price}
            </button>
          </footer>
        )}
      </div>
    </CampSheet>
  )
}

export { PipCorner }
