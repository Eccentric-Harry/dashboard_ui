import { useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react'
import { Check, RotateCcw, X } from 'lucide-react'
import type { CampDecorSpot } from '@/types/goals'
import { cn } from '@/lib/utils'
import { campItem } from '../camp-catalog'
import { YardItem } from './camp-decor'
import { DEFAULT_SPOTS, YARD_ART, isTentDecor } from './camp-decor-data'

type CampYardProps = {
  /** Decorations out at camp (tent ones are skipped here — they hang on the tent). */
  decor: string[]
  decorAt: Record<string, CampDecorSpot>
  arranging: boolean
  saving: boolean
  onDone: (spots: Record<string, CampDecorSpot>) => void
  onCancel: () => void
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
/** Nearer the front is a little bigger — the meadow has depth. */
const depth = (y: number) => 0.8 + 0.38 * y
const spotOf = (id: string, at: Record<string, CampDecorSpot>, i: number): CampDecorSpot =>
  at[id] ?? DEFAULT_SPOTS[id] ?? { x: 0.15 + ((i * 0.17) % 0.7), y: 0.25 }

/**
 * The meadow: every freestanding decoration from Fen's cart, standing where you put it (or
 * where it looks best until you do). Things further back are smaller and drawn first. In
 * arrange mode each piece can be dragged anywhere on the ground; Done saves the spots,
 * Reset puts everything back in its default place.
 */
function CampYard({ decor, decorAt, arranging, saving, onDone, onCancel }: CampYardProps) {
  const pieces = decor.filter((id) => !isTentDecor(id) && YARD_ART[id])
  const [draft, setDraft] = useState<Record<string, CampDecorSpot> | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const yardRef = useRef<HTMLDivElement | null>(null)
  const grab = useRef<{ id: string; dx: number; dy: number } | null>(null)

  // A fresh draft each time arranging starts; dropped when it ends.
  const [wasArranging, setWasArranging] = useState(arranging)
  if (arranging !== wasArranging) {
    setWasArranging(arranging)
    setDraft(arranging ? Object.fromEntries(pieces.map((id, i) => [id, spotOf(id, decorAt, i)])) : null)
  }

  const spots = draft ?? decorAt
  const placed = pieces.map((id, i) => ({ id, spot: spotOf(id, spots, i) })).sort((a, b) => a.spot.y - b.spot.y)

  const toSpot = (clientX: number, clientY: number) => {
    const r = yardRef.current?.getBoundingClientRect()
    if (!r || !r.width || !r.height) return null
    return { x: (clientX - r.left) / r.width, y: (clientY - r.top) / r.height }
  }

  const onDown = (id: string) => (e: PointerEvent<HTMLButtonElement>) => {
    if (!arranging) return
    const at = toSpot(e.clientX, e.clientY)
    const cur = spotOf(id, spots, pieces.indexOf(id))
    if (!at) return
    e.currentTarget.setPointerCapture(e.pointerId)
    grab.current = { id, dx: cur.x - at.x, dy: cur.y - at.y }
    setDragging(id)
  }
  const onMove = (e: PointerEvent<HTMLButtonElement>) => {
    const g = grab.current
    if (!g) return
    const at = toSpot(e.clientX, e.clientY)
    if (!at) return
    const next = { x: clamp(at.x + g.dx, 0.02, 0.98), y: clamp(at.y + g.dy, 0.03, 0.97) }
    setDraft((d) => ({ ...(d ?? {}), [g.id]: next }))
  }
  const onUp = () => {
    grab.current = null
    setDragging(null)
  }
  // Arrow keys nudge a focused piece, for keyboards.
  const onKey = (id: string) => (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!arranging) return
    const step = e.shiftKey ? 0.05 : 0.015
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key]
    if (!d) return
    e.preventDefault()
    const cur = spotOf(id, spots, pieces.indexOf(id))
    setDraft((s) => ({ ...(s ?? {}), [id]: { x: clamp(cur.x + d[0], 0.02, 0.98), y: clamp(cur.y + d[1], 0.03, 0.97) } }))
  }

  if (!pieces.length && !arranging) return null

  return (
    <>
      <div className={cn('camp-yard', arranging && 'is-arranging')} ref={yardRef} aria-hidden={!arranging}>
        {placed.map(({ id, spot }) => {
          const [, , w] = YARD_ART[id].box
          const style = {
            left: `${spot.x * 100}%`,
            top: `${spot.y * 100}%`,
            ['--w' as string]: w * depth(spot.y),
          } as CSSProperties
          return (
            <button
              key={id}
              type="button"
              className={cn('yard-piece', dragging === id && 'is-dragging')}
              style={style}
              tabIndex={arranging ? 0 : -1}
              data-quiet-press
              aria-label={`${campItem(id)?.name ?? id} — drag to move, or use the arrow keys`}
              onPointerDown={onDown(id)}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
              onKeyDown={onKey(id)}
            >
              <YardItem id={id} className="yard-art" />
            </button>
          )
        })}
      </div>
      {arranging && (
        <div className="yard-bar" role="toolbar" aria-label="Arrange the camp">
          <span className="yard-bar-hint">{pieces.length ? 'Drag anything in the meadow to move it' : 'Nothing to arrange yet — Fen sells things for the meadow'}</span>
          <button type="button" className="yard-btn" onClick={() => setDraft(Object.fromEntries(pieces.map((id, i) => [id, DEFAULT_SPOTS[id] ?? spotOf(id, {}, i)])))} disabled={saving}>
            <RotateCcw size={15} strokeWidth={2.6} aria-hidden="true" />
            Reset
          </button>
          <button type="button" className="yard-btn" onClick={onCancel} disabled={saving} aria-label="Cancel arranging">
            <X size={15} strokeWidth={2.8} aria-hidden="true" />
          </button>
          <button type="button" className="yard-btn yard-btn--done" onClick={() => onDone(draft ?? {})} disabled={saving} data-sound="confirm">
            <Check size={15} strokeWidth={3} aria-hidden="true" />
            {saving ? 'Saving…' : 'Done'}
          </button>
        </div>
      )}
    </>
  )
}

export { CampYard }
