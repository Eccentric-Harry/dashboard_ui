import { useEffect, useState } from 'react'
import { Eye, Hand, Ear, Flame, Flower2, Coffee, Leaf, Pause, Play, RotateCcw, Wind, ArrowRight, Sparkles } from 'lucide-react'
import { cn } from '../../../../lib/utils'

const MAX_CYCLES = 4

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

type BreatheCardProps = {
  onCycleComplete: (cycles: number) => void
}

function BreatheCard({ onCycleComplete }: BreatheCardProps) {
  const [running, setRunning] = useState(false)
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState<number>(BREATH_PHASES[0].seconds)
  const [cycles, setCycles] = useState(0)
  const [sessionDone, setSessionDone] = useState(false)
  const [sessions, setSessions] = useState(() =>
    parseInt(localStorage.getItem('mind_breathe_sessions') || '0', 10))

  useEffect(() => {
    if (cycles > 0) {
      onCycleComplete(cycles)
    }
  }, [cycles, onCycleComplete])

  // Stop and mark session complete when MAX_CYCLES is reached
  useEffect(() => {
    if (cycles >= MAX_CYCLES && !sessionDone) {
      setRunning(false)
      setSessionDone(true)
      setSessions((s) => {
        const next = s + 1
        localStorage.setItem('mind_breathe_sessions', String(next))
        return next
      })
    }
  }, [cycles, sessionDone])

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
    setSessionDone(false)
  }

  const phase = BREATH_PHASES[phaseIndex]

  if (sessionDone) {
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
        <div className="mind-breathe-complete">
          <span className="mind-breathe-complete-badge">
            <Sparkles size={22} />
          </span>
          <p className="mind-breathe-complete-text">4 cycles complete</p>
          <p className="mind-breathe-complete-sub">You stayed with your breath. That's a real rep.</p>
        </div>
        <div className="mind-breathe-controls">
          <button type="button" className="mind-ghost-btn" onClick={reset}>
            <RotateCcw size={12} />
            Again
          </button>
          <span className="mind-sessions-badge">
            <Flame size={10} />
            {sessions} {sessions === 1 ? 'session' : 'sessions'}
          </span>
        </div>
      </section>
    )
  }

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
            {cycles}/{MAX_CYCLES}
          </span>
        )}
        {sessions > 0 && (
          <span className="mind-sessions-badge">
            <Flame size={10} />
            {sessions}
          </span>
        )}
      </div>
    </section>
  )
}

function GroundingCard() {
  const [step, setStep] = useState(0)
  const [sessions, setSessions] = useState(() =>
    parseInt(localStorage.getItem('mind_grounding_sessions') || '0', 10))
  const done = step >= GROUNDING_STEPS.length

  const advanceStep = () => {
    const next = step + 1
    if (next >= GROUNDING_STEPS.length) {
      setSessions((s) => {
        const newCount = s + 1
        localStorage.setItem('mind_grounding_sessions', String(newCount))
        return newCount
      })
    }
    setStep(next)
  }

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button type="button" className="mind-ghost-btn" onClick={() => setStep(0)}>
              <RotateCcw size={12} />
              Again
            </button>
            {sessions > 0 && (
              <span className="mind-sessions-badge">
                <Flame size={10} />
                {sessions} {sessions === 1 ? 'grounding' : 'groundings'}
              </span>
            )}
          </div>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button type="button" className="mind-solid-btn" onClick={advanceStep}>
                    Named them
                    <ArrowRight size={12} />
                  </button>
                  {sessions > 0 && (
                    <span className="mind-sessions-badge">
                      <Flame size={10} />
                      {sessions}
                    </span>
                  )}
                </div>
              </>
            )
          })()}
        </div>
      )}
    </section>
  )
}

export { BreatheCard, GroundingCard }
