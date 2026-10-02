import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { campSound } from '../camp-sound'
import { useMediaQuery } from '../use-media-query'

type CampSheetProps = {
  open: boolean
  /** × / Escape / scrim / a drag down — the parent decides (it may confirm first). */
  onRequestClose: () => void
  /** What the sheet grows out of, and shrinks back into (Material's container transform). */
  origin?: HTMLElement | null
  labelledBy: string
  /** The object that comes with the sheet: a lantern on its cord, a character, the chest. */
  hero?: ReactNode
  /** `stack`: the hero hangs above the card. `side`: it stands beside it (phones stack). */
  layout?: 'stack' | 'side'
  /** Card width on wide screens. */
  width?: number
  /** Card skin: lined paper, a letter, or Fen's wooden counter. */
  tone?: 'paper' | 'letter' | 'wood'
  /** A goal colour for the candy tokens inside. */
  color?: string
  /** A punched hole at the top of the card, for a lantern's tassel to tie to. */
  tag?: boolean
  /** Turn off Escape while a nested confirm owns it. */
  escape?: boolean
  /** No card: the children are the dialog (the journal is a book, not a sheet). */
  bare?: boolean
  className?: string
  children: ReactNode
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Keyframes that bring the stage out of `origin` (or up from the bottom on a phone). */
function entranceFrames(stage: HTMLElement, origin: HTMLElement | null | undefined, narrow: boolean): Keyframe[] {
  if (reducedMotion()) return [{ opacity: 0 }, { opacity: 1 }]
  if (narrow) return [{ transform: 'translateY(55%)', opacity: 0.2 }, { transform: 'none', opacity: 1 }]
  if (origin?.isConnected) {
    const from = origin.getBoundingClientRect()
    const to = stage.getBoundingClientRect()
    const dx = from.left + from.width / 2 - (to.left + to.width / 2)
    const dy = from.top + from.height / 2 - (to.top + to.height / 2)
    const s = Math.max(0.12, Math.min(0.6, from.width / Math.max(1, to.width)))
    return [
      { transform: `translate(${dx}px, ${dy}px) scale(${s})`, opacity: 0 },
      { opacity: 1, offset: 0.3 },
      { transform: 'none', opacity: 1 },
    ]
  }
  return [{ transform: 'translateY(18px) scale(0.96)', opacity: 0 }, { transform: 'none', opacity: 1 }]
}

/**
 * The camp's one overlay. Every surface — a lantern lowered for logging, the goal
 * workshop, Wren's letter, Fen's cart, Pip's corner — is a paper card that grows out of
 * the thing you touched and shrinks back into it, with its object (the hero) hanging
 * above or standing beside it. On a phone the card is a bottom sheet you can drag away.
 * It renders inside the world, so the world's tokens and sky colours reach it.
 */
function CampSheet({
  open,
  onRequestClose,
  origin,
  labelledBy,
  hero,
  layout = 'stack',
  width = 440,
  tone = 'paper',
  color,
  tag,
  escape = true,
  bare,
  className,
  children,
}: CampSheetProps) {
  const narrow = useMediaQuery('(max-width: 760px)')
  const [present, setPresent] = useState(open)
  if (open && !present) setPresent(true)

  const stageRef = useRef<HTMLDivElement | null>(null)
  const scrimRef = useRef<HTMLDivElement | null>(null)
  const cardRef = useRef<HTMLDivElement | null>(null)
  const entered = useRef(false)
  const originRef = useRef(origin)
  useEffect(() => {
    if (open && origin) originRef.current = origin
  }, [open, origin])

  // In: grow out of the origin, then hand focus to the card.
  useLayoutEffect(() => {
    if (!open || !present) {
      entered.current = false
      return
    }
    if (entered.current || !stageRef.current) return
    entered.current = true
    const stage = stageRef.current
    const anim = stage.animate(entranceFrames(stage, origin, narrow), {
      duration: reducedMotion() ? 140 : 460,
      easing: 'cubic-bezier(0.2, 1.22, 0.32, 1)',
    })
    scrimRef.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: 'ease-out' })
    campSound.play('open')
    const card = cardRef.current ?? stage
    const target = card.querySelector<HTMLElement>('[data-autofocus]') ?? card
    target.focus({ preventScroll: true })
    return () => anim.cancel()
  }, [open, present, origin, narrow])

  // Out: shrink back into where it came from, then unmount.
  useEffect(() => {
    if (open || !present) return
    const stage = stageRef.current
    if (!stage) {
      setPresent(false)
      return
    }
    const back = originRef.current
    const frames = entranceFrames(stage, back, narrow).slice().reverse()
    const anim = stage.animate(frames, {
      duration: reducedMotion() ? 120 : 260,
      easing: 'cubic-bezier(0.5, 0, 0.75, 0)',
      fill: 'forwards',
    })
    scrimRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 240, fill: 'forwards' })
    campSound.play('close')
    let done = false
    const finish = () => {
      if (done) return
      done = true
      setPresent(false)
      if (back?.isConnected && back.tabIndex >= 0) back.focus({ preventScroll: true })
    }
    anim.onfinish = finish
    // A safety net for browsers that never fire onfinish (throttled tabs).
    const t = window.setTimeout(finish, 420)
    return () => {
      // Reopened mid-exit: stop shrinking and stay.
      done = true
      window.clearTimeout(t)
      anim.cancel()
    }
  }, [open, present, narrow])

  useEffect(() => {
    if (!open || !escape) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onRequestClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, escape, onRequestClose])

  // Drag the sheet down to put it away (phones).
  const drag = useRef<{ y: number; dy: number; id: number } | null>(null)
  const onGrabDown = (e: ReactPointerEvent<HTMLElement>) => {
    drag.current = { y: e.clientY, dy: 0, id: e.pointerId }
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // Dragging still works without capture, just less forgivingly.
    }
  }
  const onGrabMove = (e: ReactPointerEvent<HTMLElement>) => {
    const d = drag.current
    const card = cardRef.current
    if (!d || !card) return
    d.dy = Math.max(0, e.clientY - d.y)
    card.style.transform = `translateY(${d.dy}px)`
  }
  const onGrabUp = () => {
    const d = drag.current
    const card = cardRef.current
    drag.current = null
    if (!d || !card) return
    if (d.dy > 90) {
      onRequestClose()
      return
    }
    card.animate([{ transform: `translateY(${d.dy}px)` }, { transform: 'translateY(0)' }], {
      duration: 260,
      easing: 'cubic-bezier(0.2, 1.3, 0.3, 1)',
    })
    card.style.transform = ''
  }

  if (!present) return null

  return (
    <div className={cn('cs-root', !open && 'is-leaving')} role="presentation">
      <div ref={scrimRef} className="cs-scrim" onClick={open ? onRequestClose : undefined} />
      <div
        ref={stageRef}
        className={cn('cs-stage', `cs-stage--${layout}`, className)}
        style={{ ['--cs-w' as string]: `${width}px` } as CSSProperties}
      >
        {hero && <div className="cs-hero">{hero}</div>}
        {bare ? (
          children
        ) : (
          <div
            ref={cardRef}
            className={cn('cs-card', `cs-card--${tone}`, tag && 'cs-card--tag')}
            data-color={color}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            tabIndex={-1}
          >
            <span
              className="cs-grab"
              aria-hidden="true"
              onPointerDown={onGrabDown}
              onPointerMove={onGrabMove}
              onPointerUp={onGrabUp}
              onPointerCancel={onGrabUp}
            />
            {children}
          </div>
        )}
      </div>
    </div>
  )
}

export { CampSheet }
