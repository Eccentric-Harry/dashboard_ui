import { useEffect, useState } from 'react'
import { Eye, Hand, Ear, Flower2, Coffee, Leaf, Pause, Play, RotateCcw, Wind, ArrowRight, Sparkles } from 'lucide-react'
import { cn } from '../../../../lib/utils'

const BREATH_PHASES = [
  { label: 'Breathe in', seconds: 4, ring: 'inhale' },
  { label: 'Hold', seconds: 4, ring: 'hold-full' },
  { label: 'Breathe out', seconds: 4, ring: 'exhale' },
  { label: 'Hold', seconds: 4, ring: 'hold-empty' },
] as const

const GROUNDING_STEPS = [
  { icon: Eye, count: 5, prompt: 'things you can see' },
  { icon: Hand, count: 4, prompt: 'things you can touch' },
  { icon: Ear, count: 3, prompt: 'things you can hear' },
  { icon: Flower2, count: 2, prompt: 'things you can smell' },
  { icon: Coffee, count: 1, prompt: 'thing you can taste' },
] as const

function BreatheCard() {
  const [running, setRunning] = useState(false)
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState<number>(BREATH_PHASES[0].seconds)
  const [cycles, setCycles] = useState(0)

  useEffect(() => {
    if (!running) return
    const timer = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s > 1) return s - 1
        setPhaseIndex((p) => {
          const next = (p + 1) % BREATH_PHASES.length
          if (next === 0) setCycles((c) => c + 1)
          return next
        })
        return BREATH_PHASES[(phaseIndex + 1) % BREATH_PHASES.length].seconds
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [running, phaseIndex])

  const reset = () => {
    setRunning(false)
    setPhaseIndex(0)
    setSecondsLeft(BREATH_PHASES[0].seconds)
    setCycles(0)
  }

  const phase = BREATH_PHASES[phaseIndex]

  return (
    <section className="mind-card mind-card--breathe mind-tint-lavender" aria-label="Breathing exercise">
      <Wind className="mind-card-watermark" size={104} strokeWidth={1.3} aria-hidden="true" />
      <div className="mind-card-head">
        <span className="mind-card-icon">
          <Wind size={16} />
        </span>
        <div>
          <h2 className="mind-card-title">Breathe</h2>
          <p className="mind-card-sub">4 in · 4 hold · 4 out · 4 hold</p>
        </div>
      </div>

      <div className="mind-breathe-stage">
        <div className={cn('mind-breathe-ring', `mind-breathe-ring--${running ? phase.ring : 'rest'}`)}>
          <div className="mind-breathe-core">
            {running ? (
              <>
                <span className="mind-breathe-phase">{phase.label}</span>
                <span className="mind-breathe-count">{secondsLeft}</span>
              </>
            ) : (
              <span className="mind-breathe-phase">Ready?</span>
            )}
          </div>
        </div>
      </div>

      <div className="mind-breathe-controls">
        <button type="button" className="mind-solid-btn" onClick={() => setRunning((r) => !r)}>
          {running ? <Pause size={12} /> : <Play size={12} />}
          {running ? 'Pause' : 'Begin'}
        </button>
        <button type="button" className="mind-ghost-btn" onClick={reset}>
          <RotateCcw size={12} />
        </button>
        {cycles > 0 && (
          <span className="mind-breathe-cycles">
            {cycles} {cycles === 1 ? 'cycle' : 'cycles'}
          </span>
        )}
      </div>
    </section>
  )
}

function GroundingCard() {
  const [step, setStep] = useState(0)
  const done = step >= GROUNDING_STEPS.length

  return (
    <section className="mind-card mind-card--grounding mind-tint-sage" aria-label="5-4-3-2-1 grounding">
      <Leaf className="mind-card-watermark" size={104} strokeWidth={1.3} aria-hidden="true" />
      <div className="mind-card-head">
        <span className="mind-card-icon">
          <Leaf size={16} />
        </span>
        <div>
          <h2 className="mind-card-title">Come to your senses</h2>
          <p className="mind-card-sub">5 · 4 · 3 · 2 · 1 grounding</p>
        </div>
      </div>

      <div className="mind-grounding-dots" aria-hidden="true">
        {GROUNDING_STEPS.map((s, i) => (
          <span key={s.prompt} className={cn('mind-grounding-dot', i < step && 'is-done', i === step && 'is-active')} />
        ))}
      </div>

      {done ? (
        <div className="mind-grounding-body">
          <span className="mind-grounding-badge">
            <Sparkles size={18} />
          </span>
          <p className="mind-grounding-prompt">Back in the room. You were here the whole time.</p>
          <button type="button" className="mind-ghost-btn" onClick={() => setStep(0)}>
            <RotateCcw size={12} />
            Again
          </button>
        </div>
      ) : (
        <div className="mind-grounding-body">
          {(() => {
            const { icon: Icon, count, prompt } = GROUNDING_STEPS[step]
            return (
              <>
                <span className="mind-grounding-badge">
                  <Icon size={18} />
                </span>
                <p className="mind-grounding-prompt">
                  Name <strong>{count}</strong> {prompt}
                </p>
                <button type="button" className="mind-solid-btn" onClick={() => setStep(step + 1)}>
                  Named them
                  <ArrowRight size={12} />
                </button>
              </>
            )
          })()}
        </div>
      )}
    </section>
  )
}

export { BreatheCard, GroundingCard }
