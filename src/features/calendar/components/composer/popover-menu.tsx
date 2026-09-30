import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

import { cn } from '@/lib/utils'

type Props = {
  anchor: HTMLElement | null
  open: boolean
  onClose: () => void
  children: ReactNode
  width?: number
  className?: string
}

/**
 * A small menu anchored under (or, without room, over) a trigger. Portalled
 * so a scrolling modal body can never clip it. Escape and outside clicks close
 * it; Escape is marked handled so the surrounding modal stays open.
 */
export function PopoverMenu({ anchor, open, onClose, children, width = 240, className }: Props) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [pos, setPos] = useState<{ top: number; left: number; maxHeight: number } | null>(null)

  useLayoutEffect(() => {
    if (!open || !anchor) return
    const place = () => {
      // The app scales <html> with CSS zoom (fit-to-window). Rects come back in
      // zoomed pixels but top/left apply in unzoomed ones — convert.
      const z = parseFloat(getComputedStyle(document.documentElement).zoom) || 1
      const r = anchor.getBoundingClientRect()
      const rect = { top: r.top / z, bottom: r.bottom / z, left: r.left / z }
      const vw = window.innerWidth / z
      const vh = window.innerHeight / z
      // scrollHeight: the natural height, even while a previous pass clamped it.
      const menuH = ref.current?.scrollHeight ?? 240
      const gap = 6
      const pad = 12
      const below = vh - rect.bottom - pad
      const above = rect.top - pad
      const flip = below < menuH && above > below
      const maxHeight = Math.max(160, (flip ? above : below) - gap)
      const top = flip ? Math.max(pad, rect.top - gap - Math.min(menuH, maxHeight)) : rect.bottom + gap
      const left = Math.max(pad, Math.min(vw - width - pad, rect.left))
      setPos({ top, left, maxHeight })
    }
    place()
    // Second pass once the menu has measured itself.
    const raf = requestAnimationFrame(place)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, anchor, width])

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (ref.current?.contains(t) || anchor?.contains(t)) return
      onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('pointerdown', onDown, true)
    window.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      window.removeEventListener('keydown', onKey, true)
    }
  }, [open, anchor, onClose])

  if (!open) return null
  return createPortal(
    <div
      ref={ref}
      className={cn('cal-menu', className)}
      role="menu"
      style={{
        width,
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        maxHeight: pos?.maxHeight,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body,
  )
}

type ItemProps = {
  icon?: ReactNode
  label: ReactNode
  hint?: ReactNode
  selected?: boolean
  onSelect: () => void
}

export function MenuItem({ icon, label, hint, selected, onSelect }: ItemProps) {
  return (
    <button type="button" role="menuitemradio" aria-checked={selected} className={cn('cal-menu-item', selected && 'is-selected')} onClick={onSelect}>
      {icon && <span className="cal-menu-ic">{icon}</span>}
      <span className="cal-menu-text">
        <span className="cal-menu-label">{label}</span>
        {hint && <span className="cal-menu-hint">{hint}</span>}
      </span>
      <span className="cal-menu-check" aria-hidden="true" />
    </button>
  )
}
