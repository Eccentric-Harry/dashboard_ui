import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowRight, Check, Eye, ListTodo, Timer, Wind, X } from 'lucide-react'
import { cn } from '../../lib/utils'
import { mindService } from '../../services/mind-service'
import { tasksService } from '../../services/tasks-service'
import { useSpiralStore, spiralActions } from '../../store/spiral-store'
import { SpiralSketch } from './spiral-sketches'
import type { DailyTask } from '../../types/tasks'
import './spiral-breaker.css'

/**
 * A ninety-second interrupt for when you are already in the spiral.
 *
 * Four beats: name it, ask the one question that decides everything (is this solvable
 * in the next 24 hours?), shift attention for a minute, then — the part most tools
 * skip — hand you back the thing you were doing. Being calmed down and then left
 * standing in an empty room is how a spiral restarts.
 *
 * The overlay is global rather than living on /mind, because the moment you need it is
 * almost never the moment you are looking at /mind.
 */

const GROUNDING_STEPS = [
  { count: 5, sense: 'things you can see' },
  { count: 4, sense: 'things you can touch' },
  { count: 3, sense: 'things you can hear' },
] as const

type Step = 'name' | 'solvable' | 'ground' | 'return'

function SpiralBreakerOverlay() {
  const open = useSpiralStore.use.open()
  const [step, setStep] = useState<Step>('name')
  const [solvable, setSolvable] = useState<boolean | null>(null)
  const [groundIndex, setGroundIndex] = useState(0)
  const [tasks, setTasks] = useState<DailyTask[]>([])
  // Stamped when the overlay opens (see the effect below) — reading the clock during
  // render would make this component non-idempotent.
  const startedAt = useRef<number>(0)
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  const reset = useCallback(() => {
    setStep('name')
    setSolvable(null)
    setGroundIndex(0)
  }, [])

  /** Logged on close either way — an abandoned run is still a moment you noticed. */
  const finish = useCallback(
    (returnedToTaskId?: string) => {
      const durationSeconds = Math.round((Date.now() - startedAt.current) / 1000)
      void mindService.logSpiral({
        solvableIn24h: solvable ?? undefined,
        returnedToTaskId,
        durationSeconds,
      })
      spiralActions.close()
      reset()
    },
    [solvable, reset],
  )

  // Today's open tasks, so the last step can offer something concrete to go back to.
  useEffect(() => {
    if (!open) return
    startedAt.current = Date.now()
    let cancelled = false
    void (async () => {
      const res = await tasksService.getTasks()
      if (!cancelled && !res.error && res.data) {
        setTasks(res.data.filter((t) => !t.completed).slice(0, 4))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open])

  // Escape to leave, and focus moves into the dialog and back out again on close.
  useEffect(() => {
    if (!open) return
    previouslyFocused.current = document.activeElement as HTMLElement | null
    dialogRef.current?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        finish()
      }
      if (e.key !== 'Tab') return
      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (!focusables || focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      previouslyFocused.current?.focus()
    }
  }, [open, finish])

  if (!open) return null

  return createPortal(
    <div className="spiral-backdrop" onClick={() => finish()}>
      <div
        ref={dialogRef}
        className="spiral-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Spiral breaker"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="spiral-close" onClick={() => finish()} aria-label="Close">
          <X size={14} />
        </button>

        {step === 'name' && (
          <div className="spiral-pane">
            <span className="spiral-eyebrow">Step 1</span>
            <h2 className="spiral-title">This is a spiral, not a problem.</h2>
            <p className="spiral-body">
              Nothing has gone wrong. Your mind is doing the thing it does. You do not have to
              finish the thought to be allowed to stop.
            </p>
            <SpiralSketch name="unwind" />
            <button type="button" className="spiral-primary" onClick={() => setStep('solvable')}>
              Okay
              <ArrowRight size={14} />
            </button>
          </div>
        )}

        {step === 'solvable' && (
          <div className="spiral-pane">
            <span className="spiral-eyebrow">Step 2</span>
            <h2 className="spiral-title">Is this solvable in the next 24 hours?</h2>
            <p className="spiral-body">Not "could it matter" — could you actually do something about it today?</p>
            <SpiralSketch name="fork" />
            <div className="spiral-choices">
              <button
                type="button"
                className="spiral-choice"
                onClick={() => {
                  setSolvable(false)
                  setStep('ground')
                }}
              >
                <strong>No</strong>
                <em>It's hypothetical</em>
              </button>
              <button
                type="button"
                className="spiral-choice"
                onClick={() => {
                  setSolvable(true)
                  setStep('ground')
                }}
              >
                <strong>Yes</strong>
                <em>There's a real thing to do</em>
              </button>
            </div>
          </div>
        )}

        {step === 'ground' && (
          <div className="spiral-pane">
            <span className="spiral-eyebrow">Step 3</span>
            {solvable === false ? (
              <>
                <h2 className="spiral-title">Then there is nothing to do.</h2>
                <p className="spiral-body">
                  That's the answer — not a dodge. A question with no available answer does not
                  become answerable by being asked harder.
                </p>
              </>
            ) : (
              <>
                <h2 className="spiral-title">Then it's a task, not a spiral.</h2>
                <p className="spiral-body">
                  Write it down when you're out of this. For the next minute, it can wait.
                </p>
              </>
            )}

            <SpiralSketch name="ripple" />

            <div className="spiral-ground">
              <Eye size={15} />
              <p className="spiral-ground-prompt">
                Name <strong>{GROUNDING_STEPS[groundIndex].count}</strong>{' '}
                {GROUNDING_STEPS[groundIndex].sense}
              </p>
              <div className="spiral-ground-dots" aria-hidden="true">
                {GROUNDING_STEPS.map((_, i) => (
                  <span key={i} className={cn('spiral-dot', i <= groundIndex && 'is-done')} />
                ))}
              </div>
              <button
                type="button"
                className="spiral-primary"
                onClick={() => {
                  if (groundIndex < GROUNDING_STEPS.length - 1) setGroundIndex((i) => i + 1)
                  else setStep('return')
                }}
              >
                <Check size={14} />
                Named them
              </button>
            </div>
          </div>
        )}

        {step === 'return' && (
          <div className="spiral-pane">
            <span className="spiral-eyebrow">Step 4</span>
            <h2 className="spiral-title">What were you doing before this started?</h2>
            <p className="spiral-body">Go back to it. That's the whole exit — not feeling better first.</p>
            <SpiralSketch name="return" />

            {tasks.length > 0 ? (
              <div className="spiral-tasks">
                {tasks.map((t) => (
                  <button key={t.id} type="button" className="spiral-task" onClick={() => finish(t.id)}>
                    <ListTodo size={13} />
                    <span>{t.title}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="spiral-body spiral-muted">
                <Timer size={13} /> Nothing on today's list — pick the nearest real thing and start it.
              </p>
            )}

            <button type="button" className="spiral-ghost" onClick={() => finish()}>
              <Wind size={13} />
              Something else
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

export { SpiralBreakerOverlay }
