// The goal's photos: a stage that drifts slowly through the shots, a filmstrip under it, and
// a full-screen viewer. The thing itself, kept in view while the money builds — a visual
// reminder of what the money is for measurably lifts saving (Soman & Cheema 2011), and it's
// why Monzo pots and Qapital goals carry a picture. The photos are the product's own
// (found server-side from its page), hotlinked; one that fails to load just drops out.

import { createElement, useEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, ExternalLink, Images, Link2, Loader2, Maximize2, Search, X } from 'lucide-react'
import type { GoalPhoto, SavingsGoal } from '@/types/finance'
import { cn } from '@/lib/utils'
import { goalIcon } from '../goal-icons'
import { GoalJar } from './goal-jar'

const SLIDE_MS = 6500

/** Wide shots fill the frame; squarer ones (a retailer's cut-out) sit whole on their own backdrop. */
const fills = (photo: GoalPhoto): boolean =>
  photo.width != null && photo.height != null ? photo.width / photo.height >= 1.3 : true

const toneClass = (photo: GoalPhoto | undefined): string =>
  photo?.tone === 'LIGHT' ? 'is-light' : photo?.tone === 'DARK' ? 'is-dark' : 'is-mid'

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// ── Stage ─────────────────────────────────────────────────────────────────────

interface ShowcaseStageProps {
  goal: SavingsGoal
  photos: GoalPhoto[]
  index: number
  onIndex: (index: number) => void
  onBroken: (url: string) => void
  onOpen: () => void
  onEdit: () => void
  /** Empty state: look the official page up by name (null hides the button — e.g. guests on a non-iPhone). */
  onFind: (() => void) | null
  onPasteLink: () => void
  finding: boolean
  /** Hold the slideshow — the viewer or a modal is open over it. */
  paused: boolean
}

export function ShowcaseStage({ goal, photos, index, onIndex, onBroken, onOpen, onEdit, onFind, onPasteLink, finding, paused }: ShowcaseStageProps) {
  const [hovered, setHovered] = useState(false)
  const count = photos.length
  const current = photos[Math.min(index, Math.max(0, count - 1))]

  // Warm the next shot so the change lands on a loaded image.
  useEffect(() => {
    if (count < 2) return
    const next = new Image()
    next.referrerPolicy = 'no-referrer'
    next.src = photos[(index + 1) % count].url
  }, [count, index, photos])

  // A slow slideshow while nobody's looking at a particular shot.
  useEffect(() => {
    if (count < 2 || hovered || paused || prefersReducedMotion()) return
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') onIndex((index + 1) % count)
    }, SLIDE_MS)
    return () => window.clearInterval(timer)
  }, [count, hovered, paused, index, onIndex])

  if (count === 0) {
    return (
      <div className={cn('fin-goal-stage is-empty', finding && 'is-finding')} aria-busy={finding}>
        <GoalJar icon={goalIcon(goal)} progress={null} size={54} stroke={4} />
        <h3>{finding ? <FindingCopy name={goal.name} /> : 'See what you’re saving for'}</h3>
        <p>
          {goal.kind === 'TRIP'
            ? `Add photos of ${goal.name} — a place you can picture is easier to keep saving for.`
            : `Bring in the official photos and highlights for ${goal.name}, so the goal looks like the thing.`}
        </p>
        <div className="fin-goal-stage-actions">
          {onFind && (
            <button type="button" className="fin-goal-primary" onClick={onFind} disabled={finding}>
              {finding ? <Loader2 size={14} className="spinner" /> : <Search size={14} strokeWidth={2.4} />}
              {finding ? 'Finding photos…' : 'Find photos'}
            </button>
          )}
          <button type="button" className="fin-soft-btn" onClick={onPasteLink} disabled={finding}>
            <Link2 size={13} strokeWidth={2.4} /> Paste a link
          </button>
        </div>
      </div>
    )
  }

  const go = (delta: number) => onIndex((index + delta + count) % count)

  return (
    <div
      className={cn('fin-goal-stage', toneClass(current))}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      <button type="button" className="fin-goal-stage-frame" onClick={onOpen} aria-label={`View ${goal.name} photos full screen`}>
        {/* Keyed, so each change fades the new shot up out of the stage's own tone. */}
        <img
          key={current.url}
          src={current.url}
          alt=""
          referrerPolicy="no-referrer"
          decoding="async"
          draggable={false}
          className={cn('fin-goal-stage-img', fills(current) ? 'is-fill' : 'is-whole')}
          onError={() => onBroken(current.url)}
        />
      </button>

      {count > 1 && (
        <>
          <button type="button" className="fin-goal-stage-nav is-prev" onClick={() => go(-1)} aria-label="Previous photo">
            <ChevronLeft size={18} strokeWidth={2.4} />
          </button>
          <button type="button" className="fin-goal-stage-nav is-next" onClick={() => go(1)} aria-label="Next photo">
            <ChevronRight size={18} strokeWidth={2.4} />
          </button>
        </>
      )}

      <div className="fin-goal-stage-top">
        <button type="button" className="fin-goal-stage-pill" onClick={onEdit}>
          <Images size={12} strokeWidth={2.4} /> Photos
        </button>
        <button type="button" className="fin-goal-stage-pill is-icon" onClick={onOpen} aria-label="Full screen">
          <Maximize2 size={12} strokeWidth={2.4} />
        </button>
      </div>

      {count > 1 && (
        <div className="fin-goal-stage-dots" aria-hidden="true">
          {photos.map((photo, i) => (
            <i key={photo.url} className={cn(i === index && 'is-active')} />
          ))}
        </div>
      )}
    </div>
  )
}

/** Time-based, not real progress — the search, then the page, then measuring the shots. */
function FindingCopy({ name }: { name: string }) {
  const steps = [`Looking for ${name}’s official page…`, 'Reading the page…', 'Picking the best shots…']
  const [step, setStep] = useState(0)
  useEffect(() => {
    const timer = window.setInterval(() => setStep((s) => Math.min(s + 1, steps.length - 1)), 3500)
    return () => window.clearInterval(timer)
  }, [steps.length])
  return <>{steps[step]}</>
}

// ── Filmstrip ─────────────────────────────────────────────────────────────────

export function Filmstrip({ photos, index, onIndex }: { photos: GoalPhoto[]; index: number; onIndex: (i: number) => void }) {
  const stripRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const strip = stripRef.current
    const active = strip?.children[index] as HTMLElement | undefined
    if (!strip || !active) return
    // Keep the active thumb in view without scrolling the page.
    const left = active.offsetLeft - strip.clientWidth / 2 + active.clientWidth / 2
    strip.scrollTo({ left, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }, [index])

  if (photos.length < 2) return null
  return (
    <div className="fin-goal-strip" ref={stripRef} role="tablist" aria-label="Photos">
      {photos.map((photo, i) => (
        <button
          key={photo.url}
          type="button"
          role="tab"
          aria-selected={i === index}
          aria-label={`Photo ${i + 1}`}
          className={cn('fin-goal-thumb', toneClass(photo), i === index && 'is-active')}
          onClick={() => onIndex(i)}
        >
          <img src={photo.url} alt="" loading="lazy" referrerPolicy="no-referrer" draggable={false} className={fills(photo) ? 'is-fill' : 'is-whole'} />
        </button>
      ))}
    </div>
  )
}

// ── Full-screen viewer ────────────────────────────────────────────────────────

interface PhotoLightboxProps {
  goal: SavingsGoal
  photos: GoalPhoto[]
  index: number
  onIndex: (i: number) => void
  onClose: () => void
}

export function PhotoLightbox({ goal, photos, index, onIndex, onClose }: PhotoLightboxProps) {
  const count = photos.length
  const photo = photos[index]
  const showcase = goal.showcase

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight' && count > 1) onIndex((index + 1) % count)
      else if (e.key === 'ArrowLeft' && count > 1) onIndex((index - 1 + count) % count)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [count, index, onClose, onIndex])

  if (!photo) return null
  // Portalled to <body>: the finance page is its own stacking context (z-index 2), so a
  // fixed overlay inside it would sit under the side rail.
  return createPortal(
    <div className="fin-goal-lightbox" role="dialog" aria-modal="true" aria-label={`${goal.name} photos`} onClick={onClose}>
      <div className="fin-goal-lightbox-bar" onClick={(e) => e.stopPropagation()}>
        <span className="fin-goal-lightbox-name">
          {createElement(goalIcon(goal), { size: 14, strokeWidth: 2.4 })}
          {goal.name}
          <small>
            {index + 1} / {count}
          </small>
        </span>
        {showcase?.sourceUrl && (
          <a className="fin-goal-lightbox-source" href={showcase.sourceUrl} target="_blank" rel="noopener noreferrer">
            {showcase.sourceName ?? 'Source'} <ExternalLink size={11} strokeWidth={2.4} />
          </a>
        )}
        <button type="button" className="fin-goal-lightbox-close" onClick={onClose} aria-label="Close">
          <X size={16} strokeWidth={2.4} />
        </button>
      </div>
      <div className="fin-goal-lightbox-stage">
        {count > 1 && (
          <button
            type="button"
            className="fin-goal-lightbox-nav is-prev"
            onClick={(e) => {
              e.stopPropagation()
              onIndex((index - 1 + count) % count)
            }}
            aria-label="Previous photo"
          >
            <ChevronLeft size={22} strokeWidth={2.2} />
          </button>
        )}
        <img
          key={photo.url}
          src={photo.url}
          alt={`${goal.name}, photo ${index + 1}`}
          referrerPolicy="no-referrer"
          className={cn('fin-goal-lightbox-img', toneClass(photo))}
          onClick={(e) => e.stopPropagation()}
        />
        {count > 1 && (
          <button
            type="button"
            className="fin-goal-lightbox-nav is-next"
            onClick={(e) => {
              e.stopPropagation()
              onIndex((index + 1) % count)
            }}
            aria-label="Next photo"
          >
            <ChevronRight size={22} strokeWidth={2.2} />
          </button>
        )}
      </div>
      <div className="fin-goal-lightbox-strip" onClick={(e) => e.stopPropagation()} style={{ '--n': count } as CSSProperties}>
        {photos.map((p, i) => (
          <button key={p.url} type="button" className={cn(i === index && 'is-active')} onClick={() => onIndex(i)} aria-label={`Photo ${i + 1}`}>
            <img src={p.url} alt="" loading="lazy" referrerPolicy="no-referrer" />
          </button>
        ))}
      </div>
    </div>,
    document.body,
  )
}
