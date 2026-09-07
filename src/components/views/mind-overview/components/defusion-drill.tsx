import { useEffect, useRef, useState } from 'react'
import { Waves, X } from 'lucide-react'
import { cn } from '../../../../lib/utils'

/**
 * ACT cognitive defusion, compressed to about twenty seconds.
 *
 * The drill never argues with the thought, never asks whether it is true, and never
 * asks the user to feel differently about it. It only changes the grammar — from the
 * thought, to *having* the thought, to *noticing* that you are having it — and then
 * lets it dissolve. Arguing with an intrusive thought is the compulsion; this is the
 * alternative to arguing.
 *
 * The closing line is fixed on purpose. Anything that responded to what the thought
 * actually said would be reassurance, and reassurance is the thing that keeps the loop
 * turning.
 */

const BEATS = [1600, 2600, 2600, 2400] as const

const NORMALIZER = 'Around 94% of people report unwanted intrusive thoughts. Having one says nothing about who you are.'

type DefusionDrillProps = {
  /** The thought, when the user typed one. Omitted for a one-tap notice. */
  text?: string | null
  onDone: () => void
}

function DefusionDrill({ text, onDone }: DefusionDrillProps) {
  const [beat, setBeat] = useState(0)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (beat >= BEATS.length) return
    timerRef.current = window.setTimeout(() => setBeat((b) => b + 1), BEATS[beat])
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [beat])

  const subject = text?.trim() ? `“${text.trim()}”` : 'this'
  const finished = beat >= BEATS.length

  return (
    <div className="mind-defusion" role="group" aria-label="Defusion drill">
      <button type="button" className="mind-defusion-skip" onClick={onDone} aria-label="Skip drill">
        <X size={12} />
      </button>

      {/* Keyed by beat so each line remounts and animates in — without the key React
          reuses one <p> and the grammar changes with no transition at all. */}
      <div className="mind-defusion-stage" aria-live="polite">
        {beat === 0 && <p key="b0" className="mind-defusion-line">{subject}</p>}
        {beat === 1 && (
          <p key="b1" className="mind-defusion-line">
            <span className="mind-defusion-prefix">I'm having the thought that</span> {subject}
          </p>
        )}
        {beat === 2 && (
          <p key="b2" className="mind-defusion-line">
            <span className="mind-defusion-prefix">I notice I'm having the thought that</span> {subject}
          </p>
        )}
        {beat === 3 && <p key="b3" className="mind-defusion-line is-dissolving">{subject}</p>}
        {finished && (
          <div className="mind-defusion-close">
            <Waves size={14} />
            <p className="mind-defusion-normalizer">{NORMALIZER}</p>
          </div>
        )}
      </div>

      <div className="mind-defusion-progress" aria-hidden="true">
        {BEATS.map((_, i) => (
          <span key={i} className={cn('mind-defusion-dot', beat > i && 'is-done')} />
        ))}
      </div>

      {finished && (
        <button type="button" className="mind-solid-btn mind-defusion-done" onClick={onDone}>
          Back to what I was doing
        </button>
      )}
    </div>
  )
}

export { DefusionDrill, NORMALIZER }
