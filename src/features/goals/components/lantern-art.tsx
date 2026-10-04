import { Check, Loader2 } from 'lucide-react'
import { GoalIcon } from './goal-icon'

type LanternArtProps = {
  icon?: string | null
  /** How much light is inside, 0–1. */
  level: number
  /** A lighter, striped fill showing what an entry would bring the light up to. */
  preview?: number
  lit: boolean
  busy?: boolean
  iconSize?: number
}

/**
 * The paper lantern itself — cord, halo, cap, ribbed body with the light inside, base and
 * tassel. State classes (`is-lit`, `is-charging`, `is-popped`…) and the candy colour live
 * on the `.lantern` element that wraps it, so the string's small lanterns and the big one
 * lowered for logging are drawn by the same markup and the same CSS.
 */
function LanternArt({ icon, level, preview, lit, busy, iconSize = 20 }: LanternArtProps) {
  return (
    <span className="lantern-hang" aria-hidden="true">
      <span className="lantern-cord" />
      <span className="lantern-halo" />
      <span className="lantern-cap" />
      <span className="lantern-body">
        {preview != null && preview > level && (
          <span className="lantern-preview" style={{ ['--level' as string]: Math.min(1, preview) }} />
        )}
        <span className="lantern-light" style={{ ['--level' as string]: level }} />
        <span className="lantern-ribs" />
        <span className="lantern-icon">
          {busy ? (
            <Loader2 size={iconSize * 0.9} className="animate-spin" />
          ) : (
            <GoalIcon icon={icon} size={iconSize} strokeWidth={2.4} />
          )}
        </span>
        {lit && (
          <span className="lantern-check">
            <Check size={11} strokeWidth={3.6} />
          </span>
        )}
      </span>
      <span className="lantern-base" />
      <span className="lantern-tassel" />
    </span>
  )
}

export { LanternArt }
