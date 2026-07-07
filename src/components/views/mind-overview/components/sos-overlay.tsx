import { useEffect, useState } from 'react'
import { Heart, Pause, Phone, Play, RotateCcw, ShieldAlert, X } from 'lucide-react'
import { cn } from '../../../../lib/utils'

const PAUSE_SECONDS = 60
const RING_RADIUS = 54
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

const COPING_STEPS = [
  'Ten slow breaths — the timer above can hold you through them.',
  'Splash cold water on your face or hold something cold.',
  'Step outside, or just to a different room.',
  "Message one person. You don't have to explain anything.",
  'Remind yourself: a feeling is weather, not the climate.',
]

const HELPLINES = [
  { name: 'Tele-MANAS (Govt. of India, 24/7)', display: '14416', tel: 'tel:14416' },
  { name: 'AASRA (24/7)', display: '+91 98204 66726', tel: 'tel:+919820466726' },
  { name: 'iCall', display: '+91 91529 87821', tel: 'tel:+919152987821' },
]

type SosOverlayProps = {
  open: boolean
  onClose: () => void
}

function SosOverlay({ open, onClose }: SosOverlayProps) {
  // Mounted only while open, so every visit starts with a fresh, calm slate.
  if (!open) return null
  return <SosCard onClose={onClose} />
}

function SosCard({ onClose }: { onClose: () => void }) {
  const [secondsLeft, setSecondsLeft] = useState<number>(PAUSE_SECONDS)
  const [running, setRunning] = useState(false)
  const [checked, setChecked] = useState<boolean[]>(() => COPING_STEPS.map(() => false))

  useEffect(() => {
    if (!running) return
    const timer = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setRunning(false)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [running])

  const progress = secondsLeft / PAUSE_SECONDS
  const dashOffset = RING_CIRCUMFERENCE * (1 - progress)

  return (
    <div className="mind-sos-backdrop" role="dialog" aria-modal="true" aria-label="SOS — pause with me">
      <div className="mind-sos-card">
        <button type="button" className="mind-sos-close" onClick={onClose} aria-label="Close SOS card">
          <X size={16} />
        </button>

        <div className="mind-sos-head">
          <span className="mind-sos-eyebrow">
            <ShieldAlert size={12} />
            You're not in trouble. You're in a moment.
          </span>
          <h2 className="mind-sos-title">Pause with me</h2>
          <p className="mind-sos-sub">This feeling is intense, and it will pass. Sixty seconds first — decide nothing until then.</p>
        </div>

        <div className="mind-sos-timer">
          <svg viewBox="0 0 120 120" className="mind-sos-ring" aria-hidden="true">
            <circle cx="60" cy="60" r={RING_RADIUS} className="mind-sos-ring-track" />
            <circle
              cx="60"
              cy="60"
              r={RING_RADIUS}
              className="mind-sos-ring-fill"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 60 60)"
            />
          </svg>
          <div className="mind-sos-timer-center">
            {secondsLeft === 0 ? (
              <span className="mind-sos-timer-done">
                <Heart size={16} />
                Still here. Well done.
              </span>
            ) : (
              <span className="mind-sos-timer-count">{secondsLeft}</span>
            )}
          </div>
        </div>

        <div className="mind-sos-timer-controls">
          <button type="button" className="mind-solid-btn" onClick={() => setRunning((r) => !r)} disabled={secondsLeft === 0}>
            {running ? <Pause size={12} /> : <Play size={12} />}
            {running ? 'Pause' : secondsLeft === PAUSE_SECONDS ? 'Start the minute' : 'Resume'}
          </button>
          <button
            type="button"
            className="mind-ghost-btn"
            onClick={() => {
              setSecondsLeft(PAUSE_SECONDS)
              setRunning(false)
            }}
          >
            <RotateCcw size={12} />
            Restart
          </button>
        </div>

        <div className="mind-sos-section">
          <h3>While the minute runs</h3>
          <ul className="mind-sos-checklist">
            {COPING_STEPS.map((step, index) => (
              <li key={step}>
                <label className={cn('mind-sos-check', checked[index] && 'is-checked')}>
                  <input
                    type="checkbox"
                    checked={checked[index]}
                    onChange={() =>
                      setChecked((prev) => prev.map((value, i) => (i === index ? !value : value)))
                    }
                  />
                  <span>{step}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>

        <div className="mind-sos-section">
          <h3>A real voice helps more than a screen</h3>
          <ul className="mind-sos-helplines">
            {HELPLINES.map((line) => (
              <li key={line.name}>
                <a href={line.tel} className="mind-sos-helpline">
                  <Phone size={13} />
                  <span className="mind-sos-helpline-name">{line.name}</span>
                  <span className="mind-sos-helpline-number">{line.display}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

export { SosOverlay }
