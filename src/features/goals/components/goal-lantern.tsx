import { useEffect, useRef } from 'react'
import { DoorOpen } from 'lucide-react'
import type { GoalProgressView } from '@/types/goals'
import { cn } from '@/lib/utils'
import { ruleLabel, weekdayShort } from '../goal-format'
import { goalColor } from '../goal-palette'
import { lanternFigure, lightLevel } from '../lantern-light'
import { campSound } from '../camp-sound'
import { useHold } from '../use-hold'
import { usePop } from '../use-pop'
import { LanternArt } from './lantern-art'

type GoalLanternProps = {
  view: GoalProgressView
  busy: boolean
  /** Extra drop from the string, in px — the lanterns hang along its sag. */
  drop: number
  /** Stagger for the idle sway, so the string never moves in lockstep. */
  index: number
  onComplete: (view: GoalProgressView) => void
  /** Opens the lantern up close; `from` is where it flies out of. */
  onOpen: (view: GoalProgressView, from: HTMLElement | null) => void
}

/** Names longer than this set a size smaller, so two lines still fit the tag. */
const LONG_NAME = 13

/**
 * A goal as a paper lantern on the camp's string. Check goals are **held** to light —
 * light gathers from the bottom while you hold, then the lantern pops bright and swings.
 * A tap lowers it for logging; the light inside shows how far today (or the week) has
 * come. The paper tag carries the whole name (two lines if it needs them), the number
 * and the week's days.
 */
function GoalLantern({ view, busy, drop, index, onComplete, onOpen }: GoalLanternProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const { goal, today, week } = view
  const holdable = goal.measure === 'CHECK' && !today.hit && !busy
  const lit = today.hit
  const { charging, nudged, handlers } = useHold({
    enabled: holdable,
    onComplete: () => onComplete(view),
    onTap: () => onOpen(view, ref.current),
  })
  const level = charging ? 1 : lightLevel(view)
  const { big, small } = lanternFigure(view)

  // The swing plays once, when the lantern lights.
  const popped = usePop(lit)

  useEffect(() => {
    if (charging) campSound.chargeStart()
    else campSound.chargeStop()
  }, [charging])

  useEffect(() => {
    if (nudged) campSound.play('nudge')
  }, [nudged])

  const label = holdable
    ? `${goal.title}: hold to light it for today, or press Enter. ${ruleLabel(goal)}.`
    : `${goal.title}: ${big} ${small}. Open to log${lit ? ' or undo' : ''}.`

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-busy={busy}
      data-goal-id={goal.id}
      data-color={goalColor(goal)}
      className={cn(
        'lantern',
        holdable && 'is-holdable',
        charging && 'is-charging',
        lit && 'is-lit',
        level > 0 && !lit && 'has-light',
        popped && 'is-popped',
        nudged && 'is-nudged',
      )}
      style={{ ['--drop' as string]: `${drop}px`, ['--sway-delay' as string]: `${-(index * 0.7)}s` }}
      {...handlers}
    >
      <LanternArt icon={goal.icon} level={level} lit={lit} busy={busy} />

      <span className="lantern-tag" title={goal.title}>
        {goal.world && (
          <span className="lantern-door" title="Has a world of its own" aria-hidden="true">
            <DoorOpen size={11} strokeWidth={2.8} />
          </span>
        )}
        <span className={cn('lantern-name', goal.title.length > LONG_NAME && 'is-long')}>{goal.title}</span>
        <span className="lantern-figure">
          <strong>{big}</strong> <small>{small}</small>
        </span>
        <span className="lantern-week" aria-hidden="true">
          {week.days.map((d) => (
            <i
              key={d.date}
              className={cn(d.hit && 'is-hit', d.today && 'is-today', (d.future || d.beforeStart) && 'is-off')}
              title={weekdayShort(d.date)}
            />
          ))}
        </span>
      </span>
    </div>
  )
}

export { GoalLantern }
