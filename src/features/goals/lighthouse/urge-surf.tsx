import { useEffect, useState } from 'react'
import { Check, LifeBuoy, X } from 'lucide-react'
import { spiralActions } from '@/store/spiral-store'
import { cn } from '@/lib/utils'
import { CampSheet } from '../components/camp-sheet'
import { campSound } from '../camp-sound'
import { URGE_MOVES, URGE_STEPS } from './program-content'
import type { ProgramCtx } from './program-engine'
import type { LighthouseApi } from './lighthouse-api'
import { formatClock, useStopwatch, useWakeLock } from './lh-utils'

type UrgeSurfProps = {
  open: boolean
  origin: HTMLElement | null
  ctx: ProgramCtx | null
  api: LighthouseApi
  onClose: () => void
}

const SURF_SEC = 10 * 60

/**
 * Ride the wave (urge surfing, Bowen & Marlatt 2009): when a cheap-dopamine urge hits, watch
 * it build, peak and pass for ten minutes instead of fighting or obeying it. A wave on screen
 * rises and falls with the timer; a few things to do with your hands sit beside it. Riding
 * one out is logged as evidence. If the urge wins, nothing is reset and nothing is counted:
 * a lapse isn't a relapse, and the next hour is a fresh one.
 */
function UrgeSurf({ open, origin, ctx, api, onClose }: UrgeSurfProps) {
  return (
    <CampSheet open={open} onRequestClose={onClose} origin={origin} labelledBy="lh-urge-title" width={500} color="sky">
      {ctx && <SurfBody ctx={ctx} api={api} onClose={onClose} />}
    </CampSheet>
  )
}

function SurfBody({ ctx, api, onClose }: { ctx: ProgramCtx; api: LighthouseApi; onClose: () => void }) {
  const watch = useStopwatch()
  const [done, setDone] = useState<Set<number>>(new Set())
  const [ending, setEnding] = useState<'rode' | 'lapse' | null>(null)
  const [saving, setSaving] = useState(false)
  const t = Math.min(1, watch.elapsed / SURF_SEC)
  // The wave: rises to a crest around 40% of the way through, then settles.
  const height = t < 0.4 ? t / 0.4 : 1 - (t - 0.4) / 0.6
  useWakeLock(watch.running)

  useEffect(() => {
    if (t >= 1 && watch.running) {
      watch.pause()
      campSound.play('chime')
    }
  }, [t, watch])

  const rode = async () => {
    setSaving(true)
    const saved = await api.addLog({ track: 'urge', date: ctx.today, urge: true, note: `rode it out after ${Math.max(1, Math.round(watch.elapsed / 60))} min` })
    setSaving(false)
    if (saved) setEnding('rode')
  }

  const amp = 6 + 34 * Math.max(0, height)
  const wave = `M0 ${70 - amp * 0.2} C 60 ${70 - amp}, 120 ${70 + amp * 0.3}, 180 ${70 - amp * 0.6} S 300 ${70 + amp * 0.2}, 360 ${70 - amp * 0.4} L360 120 L0 120 Z`

  return (
    <div className="lh-sheet lh-surf" data-color="sky">
      <header className="lh-sheet-head">
        <div className="lh-sheet-title">
          <h2 id="lh-urge-title">Ride the wave</h2>
          <p>An urge builds, peaks and passes — usually within 20–30 minutes.</p>
        </div>
        <button type="button" className="cs-icon" onClick={onClose} aria-label="Close" data-autofocus>
          <X size={18} strokeWidth={2.6} />
        </button>
      </header>

      {ending === 'rode' ? (
        <div className="lh-surf-end">
          <p className="lh-surf-big">You rode it out.</p>
          <p className="lh-small">Logged as evidence. Every wave you ride makes the next one a little smaller.</p>
          <button type="button" className="lh-btn lh-btn--primary lh-btn--wide" onClick={onClose}>
            Back to the lighthouse
          </button>
        </div>
      ) : ending === 'lapse' ? (
        <div className="lh-surf-end">
          <p className="lh-surf-big">That’s a lapse, not a relapse.</p>
          <p className="lh-small">
            Nothing is reset and nothing is counted. One slip only turns into more when it gets called “ruined” — it isn’t. The next hour is a fresh one;
            pick one small thing for it.
          </p>
          <div className="lh-row">
            <button type="button" className="lh-btn lh-btn--primary" onClick={onClose}>
              Okay
            </button>
            <button type="button" className="lh-btn lh-btn--ghost" onClick={() => spiralActions.open()}>
              <LifeBuoy size={15} strokeWidth={2.6} aria-hidden="true" /> Spiral breaker
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className={cn('lh-wave', watch.running && 'is-running')} aria-hidden="true">
            <svg viewBox="0 0 360 120" preserveAspectRatio="none">
              <path className="lh-wave-back" d={wave} transform="translate(-20 8)" />
              <path className="lh-wave-front" d={wave} />
            </svg>
            <span className="lh-wave-clock">{formatClock(SURF_SEC - watch.elapsed)}</span>
          </div>
          <ol className="lh-steps">
            {URGE_STEPS.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
          <p className="lh-kicker">Something for your hands</p>
          <div className="lh-chips">
            {URGE_MOVES.map((m, i) => (
              <button
                key={m}
                type="button"
                className={cn('lh-chip', done.has(i) && 'is-on')}
                onClick={() =>
                  setDone((d) => {
                    const next = new Set(d)
                    if (next.has(i)) next.delete(i)
                    else next.add(i)
                    return next
                  })
                }
              >
                {done.has(i) && <Check size={13} strokeWidth={3} aria-hidden="true" />}
                {m}
              </button>
            ))}
          </div>
          <div className="lh-row">
            {watch.running ? (
              <button type="button" className="lh-btn lh-btn--soft" onClick={watch.pause}>
                Pause
              </button>
            ) : (
              <button type="button" className="lh-btn lh-btn--candy" onClick={watch.start} disabled={t >= 1}>
                {watch.elapsed > 0 ? 'Resume' : 'Start the 10 minutes'}
              </button>
            )}
            <button type="button" className="lh-btn lh-btn--primary" disabled={saving} onClick={() => void rode()}>
              It passed — I rode it out
            </button>
          </div>
          <button type="button" className="lh-link" onClick={() => setEnding('lapse')}>
            It won this time
          </button>
        </>
      )}
    </div>
  )
}

export { UrgeSurf }
