import { useState } from 'react'
import { Pause, Play } from 'lucide-react'
import { useFocusStore, focusActions } from '@/store/focus-store'
import { useLearningsStore } from '@/store/learnings-store'
import { cn } from '@/lib/utils'
import { findStepById, formatCountdown } from '../../pursuit-tree'

/**
 * The running focus session in miniature, so its timer stays in view away from the
 * Focus Session card. Renders nothing when no session is running or paused.
 */
export function FocusPill({ compact }: { compact?: boolean }) {
  const session = useFocusStore.use.session()
  const remaining = useFocusStore.use.remainingSeconds()
  const pursuits = useLearningsStore.use.pursuits().data
  const [busy, setBusy] = useState(false)

  const running = session?.status === 'RUNNING'
  const paused = session?.status === 'PAUSED'
  if (!session || (!running && !paused)) return null

  const linkedPursuit = session.pursuitId ? pursuits.find((p) => p.id === session.pursuitId) : undefined
  const linkedStep = linkedPursuit && session.stepId ? findStepById(linkedPursuit.steps, session.stepId) : null
  const label = linkedStep?.text ?? session.activePursuit
  const countdown = formatCountdown(remaining)

  const toggle = async () => {
    setBusy(true)
    try {
      await (running ? focusActions.pause() : focusActions.resume())
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={cn('pw-focus-pill', paused && 'is-paused', compact && 'is-compact')} title={`${paused ? 'Paused' : 'Focusing'} · ${label}`}>
      <i className="pw-focus-dot" aria-hidden="true" />
      <span className="pw-focus-time">
        <span className="sr-only">{paused ? 'Focus paused, ' : 'Focusing, '}</span>
        {countdown}
        <span className="sr-only"> left</span>
      </span>
      {!compact && <span className="pw-focus-label">{label}</span>}
      <button type="button" onClick={toggle} disabled={busy} aria-label={running ? 'Pause focus session' : 'Resume focus session'}>
        {running ? <Pause size={10} fill="currentColor" strokeWidth={0} /> : <Play size={10} fill="currentColor" strokeWidth={0} />}
      </button>
    </div>
  )
}
