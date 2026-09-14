import { useEffect, useRef, useState } from 'react'
import { useFocusStore } from '@/store/focus-store'
import { useLearningsStore } from '@/store/learnings-store'
import { SessionWrapUpModal } from './session-wrap-up-modal'
import { findStepById } from '../pursuit-tree'

interface FocusSessionHostProps {
  onSessionComplete: (durationMinutes: number, activityType: string) => void
  /** A wrap-up changed a pursuit (a step may have finished it), so the route should re-sync. */
  onPursuitsChanged?: () => void
}

type WrapUpTarget = { pursuitId: string; stepId: string; minutes: number }

/**
 * Reacts to a focus session finishing: logs it and, for a step-linked session, opens the
 * wrap-up. Mounted by the learnings route rather than a card so it keeps listening
 * whichever view is on screen — the dashboard or a pursuit workspace.
 */
export function FocusSessionHost({ onSessionComplete, onPursuitsChanged }: FocusSessionHostProps) {
  const session = useFocusStore.use.session()
  const pursuits = useLearningsStore.use.pursuits().data
  const { loadPursuits } = useLearningsStore.use.actions()
  const [wrapUp, setWrapUp] = useState<WrapUpTarget | null>(null)
  const prevStatusRef = useRef(session?.status)

  useEffect(() => {
    const wasActive = prevStatusRef.current === 'RUNNING' || prevStatusRef.current === 'PAUSED'
    if (session?.status === 'COMPLETED' && wasActive) {
      onSessionComplete(session.durationMinutes, session.activePursuit)
      if (session.pursuitId && session.stepId) {
        // The server credited these minutes to the step: pull them in, then ask how it went.
        void loadPursuits()
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setWrapUp({ pursuitId: session.pursuitId, stepId: session.stepId, minutes: session.durationMinutes })
      }
    }
    prevStatusRef.current = session?.status ?? undefined
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.status])

  const wrapUpPursuit = wrapUp ? pursuits.find((p) => p.id === wrapUp.pursuitId) : undefined
  const wrapUpStep = wrapUpPursuit && wrapUp ? findStepById(wrapUpPursuit.steps, wrapUp.stepId) : null
  if (!wrapUp || !wrapUpPursuit || !wrapUpStep) return null

  return (
    <SessionWrapUpModal
      pursuit={wrapUpPursuit}
      step={wrapUpStep}
      minutes={wrapUp.minutes}
      onClose={() => setWrapUp(null)}
      onSaved={() => {
        setWrapUp(null)
        void loadPursuits()
        onPursuitsChanged?.()
      }}
    />
  )
}
