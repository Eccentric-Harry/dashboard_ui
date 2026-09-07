import { useEffect, useState } from 'react'
import { Check, Timer, X } from 'lucide-react'
import { cn } from '../../../../lib/utils'

/**
 * Urge-decay timer — ERP in miniature.
 *
 * The toilet-cubicle spiral is a certainty-seeking urge: the pull to check, confirm,
 * re-read, ask. Checking is what teaches the brain the urge was worth obeying, so the
 * only useful move is to wait and let it pass unassisted. This times that wait and asks
 * one question afterwards, so the evidence that urges decay on their own accumulates in
 * the user's own record rather than being asserted at them.
 *
 * It is not attached to an inbox entry on purpose. An urge like this rarely arrives as
 * something you sat down and typed out.
 */

const WAIT_SECONDS = 120

type Phase = 'idle' | 'waiting' | 'asking' | 'done'

type UrgeTimerProps = {
  onLog: (waitedSeconds: number, faded: boolean) => void
}

function UrgeTimer({ onLog }: UrgeTimerProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [remaining, setRemaining] = useState(WAIT_SECONDS)

  useEffect(() => {
    if (phase !== 'waiting') return
    const id = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          window.clearInterval(id)
          setPhase('asking')
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [phase])

  const answer = (faded: boolean) => {
    onLog(WAIT_SECONDS - remaining, faded)
    setPhase('done')
  }

  const reset = () => {
    setPhase('idle')
    setRemaining(WAIT_SECONDS)
  }

  if (phase === 'idle') {
    return (
      <button type="button" className="mind-urge-open" onClick={() => setPhase('waiting')}>
        <Timer size={12} />
        Urge to check something?
      </button>
    )
  }

  if (phase === 'done') {
    return (
      <p className="mind-urge-done">
        <Check size={12} />
        Logged. That's one more time you didn't check.
        <button type="button" className="mind-urge-again" onClick={reset}>
          Again
        </button>
      </p>
    )
  }

  const pct = (remaining / WAIT_SECONDS) * 100
  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60

  return (
    <div className="mind-urge">
      <button type="button" className="mind-urge-close" onClick={reset} aria-label="Close">
        <X size={11} />
      </button>

      {phase === 'waiting' && (
        <>
          <p className="mind-urge-title">Don't check. Just wait.</p>
          <p className="mind-urge-sub">
            The urge is not information. It fades on its own — usually well before this runs out.
          </p>
          <div className="mind-urge-clock" aria-live="off">
            {mins}:{String(secs).padStart(2, '0')}
          </div>
          <div className="mind-urge-bar" aria-hidden="true">
            <span className="mind-urge-fill" style={{ width: `${pct}%` }} />
          </div>
          <button type="button" className="mind-urge-early" onClick={() => setPhase('asking')}>
            It's already passed
          </button>
        </>
      )}

      {phase === 'asking' && (
        <>
          <p className="mind-urge-title">Did it fade?</p>
          <div className="mind-urge-answers">
            <button type="button" className={cn('mind-tag', 'mind-tag--quiet')} onClick={() => answer(true)}>
              Yes, it passed
            </button>
            <button type="button" className={cn('mind-tag', 'mind-tag--quiet')} onClick={() => answer(false)}>
              Not yet
            </button>
          </div>
          <p className="mind-urge-sub">Either answer is fine. Not checking is the part that counts.</p>
        </>
      )}
    </div>
  )
}

export { UrgeTimer, WAIT_SECONDS }
