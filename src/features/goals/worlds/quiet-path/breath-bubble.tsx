import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { campSound } from '../../camp-sound'
import { breathPattern, type BreathPatternKey } from './course'

type BreathBubbleProps = {
  pattern: BreathPatternKey
  /** How many full breaths; Infinity runs until stopped. */
  cycles: number
  running: boolean
  onDone?: () => void
  className?: string
}

const SCALE = { in: 1, top: 1.1, out: 0.58 } as const

/**
 * Calm's Breathe Bubble, the Quiet Path's way: a soft orb that grows as you breathe in,
 * tops up, holds, and settles as you breathe out, with the phase in words and a count. One
 * component for every breathing step and the Anytime breathing tool. Each phase sets its
 * own transition length, so a 4-7-8 breath moves as slowly as it should.
 */
function BreathBubble({ pattern, cycles, running, onDone, className }: BreathBubbleProps) {
  const p = breathPattern(pattern)
  const [step, setStep] = useState(0)
  const [left, setLeft] = useState(Math.ceil(p.phases[0].secs))
  const done = useRef(onDone)
  useEffect(() => {
    done.current = onDone
  }, [onDone])

  useEffect(() => {
    if (!running) return
    let i = 0
    let timer = 0
    let tick = 0
    const total = Number.isFinite(cycles) ? cycles * p.phases.length : Infinity
    const run = () => {
      if (i >= total) {
        done.current?.()
        return
      }
      const phase = p.phases[i % p.phases.length]
      setStep(i)
      campSound.breathTone(phase.move, phase.secs)
      let remaining = Math.ceil(phase.secs)
      setLeft(remaining)
      window.clearInterval(tick)
      tick = window.setInterval(() => {
        remaining = Math.max(1, remaining - 1)
        setLeft(remaining)
      }, 1000)
      timer = window.setTimeout(() => {
        i += 1
        run()
      }, phase.secs * 1000)
    }
    run()
    return () => {
      window.clearTimeout(timer)
      window.clearInterval(tick)
    }
  }, [running, cycles, p])

  const phase = p.phases[step % p.phases.length]
  // A hold keeps whatever size the breath before it left.
  let scale: number = 0.58
  for (let k = step; k >= step - p.phases.length; k--) {
    const ph = p.phases[((k % p.phases.length) + p.phases.length) % p.phases.length]
    if (ph.move !== 'hold') {
      scale = SCALE[ph.move]
      break
    }
  }
  if (!running) scale = 0.58

  return (
    <div className={cn('bb', `bb--${phase.move}`, running && 'is-running', className)}>
      <div className="bb-lake" aria-hidden="true">
        <span className="bb-ring" style={{ transform: `scale(${Math.min(1.25, scale + 0.16)})`, transitionDuration: `${phase.secs}s` }} />
        <span className="bb-orb" style={{ transform: `scale(${scale})`, transitionDuration: `${phase.move === 'hold' ? 0.4 : phase.secs}s` }} />
        <span className="bb-count">{running ? left : ''}</span>
      </div>
      <p className="bb-label" aria-live="polite">
        {running ? phase.label : 'Ready when you are'}
      </p>
    </div>
  )
}

export { BreathBubble }
