// Small shared components for The Lighthouse: the track disc, a ring, a stepper and a
// segmented choice. Toybox language from the camp (lipped, rounded, candy) — styles in
// lighthouse.css. Hooks and formatting live in lh-utils.ts.

import { useState } from 'react'
import type { ReactNode } from 'react'
import { Minus, Plus } from 'lucide-react'
import type { ProgramTrackKey } from '@/types/program'
import { cn } from '@/lib/utils'
import { campSound } from '../camp-sound'
import { trackMeta } from './program-content'
import { joinIfThen, splitIfThen } from './lh-utils'

export function TrackDisc({ track, size = 40, className }: { track: ProgramTrackKey; size?: number; className?: string }) {
  const meta = trackMeta(track)
  const Icon = meta.icon
  return (
    <span className={cn('lh-disc', className)} data-color={meta.color} style={{ width: size, height: size }} aria-hidden="true">
      <Icon size={Math.round(size * 0.5)} strokeWidth={2.4} />
    </span>
  )
}

/** A weekly ring: N of target sessions. Past the target it simply stays full. */
export function Ring({ value, max, size = 44, label }: { value: number; max: number; size?: number; label?: string }) {
  const r = size / 2 - 4
  const c = 2 * Math.PI * r
  const pct = max > 0 ? Math.min(1, value / max) : 0
  return (
    <span className="lh-ring" style={{ width: size, height: size }} role="img" aria-label={label ?? `${value} of ${max}`}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true">
        <circle className="lh-ring-track" cx={size / 2} cy={size / 2} r={r} />
        {pct > 0 && (
          <circle
            className="lh-ring-fill"
            cx={size / 2}
            cy={size / 2}
            r={r}
            strokeDasharray={`${c * pct} ${c}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </svg>
      <span className="lh-ring-num">
        {value}
        <small>/{max}</small>
      </span>
    </span>
  )
}

export function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 9999,
  unit,
  label,
  big,
}: {
  value: number
  onChange: (v: number) => void
  step?: number
  min?: number
  max?: number
  unit?: string
  label: string
  big?: boolean
}) {
  const set = (v: number) => {
    const next = Math.max(min, Math.min(max, Math.round(v * 100) / 100))
    if (next !== value) campSound.play(next > value ? 'step-up' : 'step-down')
    onChange(next)
  }
  return (
    <div className={cn('lh-stepper', big && 'lh-stepper--big')} role="group" aria-label={label}>
      <button type="button" className="lh-step" onClick={() => set(value - step)} disabled={value <= min} aria-label={`Less ${label}`}>
        <Minus size={18} strokeWidth={3} />
      </button>
      <label className="lh-step-value">
        <input
          type="number"
          inputMode="decimal"
          value={Number.isFinite(value) ? value : ''}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || 0)))}
          aria-label={label}
        />
        {unit && <span>{unit}</span>}
      </label>
      <button type="button" className="lh-step" onClick={() => set(value + step)} disabled={value >= max} aria-label={`More ${label}`}>
        <Plus size={18} strokeWidth={3} />
      </button>
    </div>
  )
}

export function Seg<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: { value: T; label: ReactNode }[]
  value: T
  onChange: (v: T) => void
  label: string
  className?: string
}) {
  return (
    <div className={cn('lh-seg', className)} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={cn('lh-seg-opt', value === o.value && 'is-on')}
          onClick={() => {
            campSound.play('tap')
            onChange(o.value)
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/**
 * An if-then plan, written as the sentence it is: a cue ("If …") and an action ("then …"),
 * each its own line that grows as you type. The halves are joined back into one plan for
 * storage; key the component by the stored plan to reset it.
 */
export function IfThen({
  value,
  example,
  onChange,
  label = 'If-then plan',
  max = 200,
}: {
  value: string
  example: string
  onChange: (plan: string) => void
  label?: string
  /** The stored sentence's limit; each half gets what's left after "If …, then ….". */
  max?: number
}) {
  const [parts, setParts] = useState(() => splitIfThen(value))
  const half = Math.floor((max - 11) / 2)
  const hint = splitIfThen(example)
  const set = (patch: Partial<typeof parts>) => {
    const next = { ...parts, ...patch }
    setParts(next)
    onChange(joinIfThen(next.when, next.then))
  }
  return (
    <div className="lh-ifthen" role="group" aria-label={label}>
      <label className="lh-ifthen-row">
        <span className="lh-ifthen-word">If</span>
        <textarea rows={1} maxLength={half} value={parts.when} onChange={(e) => set({ when: e.target.value })} placeholder={hint.when || 'when and where'} aria-label="If — the moment" />
      </label>
      <label className="lh-ifthen-row">
        <span className="lh-ifthen-word">then</span>
        <textarea rows={1} maxLength={half} value={parts.then} onChange={(e) => set({ then: e.target.value })} placeholder={hint.then || 'the action'} aria-label="Then — what you do" />
      </label>
    </div>
  )
}
