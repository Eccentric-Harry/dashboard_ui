import { useEffect } from 'react'
import { Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'
import { COURSE } from './course'
import { CHAPTER_COLORS } from './path-data'
import { SatchelArt } from './path-decor'
import { pocketCardOf } from './pocket-cards'

type PocketCardRevealProps = {
  /** `fresh`: just found — the satchel opens and the card rises out of it. */
  card: { chapter: number; fresh: boolean } | null
  onClose: () => void
}

/**
 * Opening a satchel: it hops, the flap lifts, and the chapter's pocket card rises out —
 * one practical idea, a line to try, and where it comes from. Found cards stay in the
 * notebook. Nothing is paid out; the card is the gift.
 */
function PocketCardReveal({ card, onClose }: PocketCardRevealProps) {
  const open = card != null
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!card) return null
  const pc = pocketCardOf(card.chapter)
  const chapter = COURSE.find((c) => c.n === card.chapter)
  if (!pc || !chapter) return null
  const c = CHAPTER_COLORS[chapter.color]

  return (
    <div className={cn('qp-card-reveal', card.fresh && 'is-fresh')} role="dialog" aria-modal="true" aria-labelledby="qp-card-title">
      <div className="qp-postcard-scrim" onClick={onClose} />
      <div className="qp-card-stage">
        {card.fresh && (
          <span className="qp-card-satchel" aria-hidden="true">
            <SatchelArt state="open" />
          </span>
        )}
        <article className="qp-card" style={{ ['--ch' as string]: c.fill, ['--ch-lip' as string]: c.lip, ['--ch-soft' as string]: c.soft }}>
          <p className="qp-card-kicker">
            <Lightbulb size={13} strokeWidth={2.8} aria-hidden="true" /> A pocket card · {chapter.place}
          </p>
          <h2 id="qp-card-title">{pc.title}</h2>
          <p className="qp-card-text">{pc.text}</p>
          <p className="qp-card-try">
            <strong>Try it</strong> {pc.tryIt}
          </p>
          <small className="qp-card-source">{pc.source}</small>
          <button type="button" className="qs-cta" onClick={onClose} autoFocus>
            {card.fresh ? 'Keep it' : 'Close'}
          </button>
          {card.fresh && <p className="qp-card-note">It’s in your notebook now, under Cards.</p>}
        </article>
      </div>
    </div>
  )
}

export { PocketCardReveal }
