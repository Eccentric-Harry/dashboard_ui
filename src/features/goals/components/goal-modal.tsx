import { useEffect, useMemo, useState } from 'react'
import { Archive, Loader2, Target, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import type { GoalColor, GoalPayload, GoalProgressView, GoalWorldKey } from '@/types/goals'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useConfirmClose } from '@/hooks/use-confirm-close'
import { getErrorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'
import { GOAL_ICONS } from '../goal-icons'
import { GOAL_COLORS, goalColor } from '../goal-palette'
import { formatAmount, SHAPES, shapeOf, type GoalShape } from '../goal-format'
import { campSound } from '../camp-sound'
import { useHeld } from '../use-held'
import { GOAL_WORLDS } from '../worlds/world-registry'
import { CampSheet } from './camp-sheet'
import { LanternArt } from './lantern-art'
import './goal-modal.css'

type GoalModalProps = {
  state:
    | { mode: 'create'; preset?: GoalPayload; origin?: HTMLElement | null }
    | { mode: 'edit'; view: GoalProgressView; origin?: HTMLElement | null }
    | null
  onSave: (payload: GoalPayload, id?: string) => Promise<void>
  onArchive: (id: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onClose: () => void
}

interface Draft {
  title: string
  icon: string
  color: GoalColor
  shape: GoalShape
  /** COUNT shapes — kept as typed so a half-typed "1." doesn't jump. */
  amount: string
  unit: string
  /** DAY shapes — hit days that keep the week. */
  daysPerWeek: number
  /** CHECK + WEEK — times a week. */
  times: number
  /** A world of its own ('' = a lantern at camp only). */
  world: GoalWorldKey | ''
}

const UNIT_CHOICES: Record<'daily-amount' | 'weekly-total', string[]> = {
  'daily-amount': ['pages', 'min', 'words', 'km', 'steps', 'reps'],
  'weekly-total': ['min', 'km', 'pages', 'sessions'],
}

const EMPTY: Draft = { title: '', icon: 'book', color: 'tangerine', shape: 'daily-amount', amount: '10', unit: 'pages', daysPerWeek: 5, times: 3, world: '' }

function draftFrom(payload: GoalPayload | undefined): Draft {
  if (!payload) return EMPTY
  const shape = shapeOf(payload)
  return {
    title: payload.title,
    icon: payload.icon ?? 'book',
    color: payload.color ?? 'tangerine',
    shape,
    amount: payload.measure === 'COUNT' ? String(payload.target) : shape === 'weekly-total' ? '420' : '10',
    unit: payload.unit ?? (shape === 'weekly-total' ? 'min' : 'pages'),
    daysPerWeek: payload.daysPerWeek ?? 5,
    times: shape === 'times-week' ? Math.min(7, Math.max(1, Math.round(payload.target))) : 3,
    world: payload.world || '',
  }
}

function payloadFrom(draft: Draft): GoalPayload {
  const base = { title: draft.title.trim(), icon: draft.icon, color: draft.color, world: draft.world }
  switch (draft.shape) {
    case 'daily-amount':
      return { ...base, measure: 'COUNT', period: 'DAY', target: Number(draft.amount), unit: draft.unit.trim(), daysPerWeek: draft.daysPerWeek }
    case 'daily-check':
      return { ...base, measure: 'CHECK', period: 'DAY', target: 1, daysPerWeek: draft.daysPerWeek }
    case 'times-week':
      return { ...base, measure: 'CHECK', period: 'WEEK', target: draft.times }
    case 'weekly-total':
      return { ...base, measure: 'COUNT', period: 'WEEK', target: Number(draft.amount), unit: draft.unit.trim() }
  }
}

const slackLine = (days: number) =>
  days === 7 ? 'No rest days — you can loosen this any time.' : `${7 - days} rest ${7 - days === 1 ? 'day is' : 'days are'} built in.`

/** The "so what" of the form: the rule as one plain sentence. */
function ruleSentence(draft: Draft): string {
  const amount = Number(draft.amount)
  const valid = amount > 0
  switch (draft.shape) {
    case 'daily-amount':
      return valid
        ? `A week is kept on any ${draft.daysPerWeek} days with ${formatAmount(amount, draft.unit)} or more. ${slackLine(draft.daysPerWeek)}`
        : 'How much makes a day count?'
    case 'daily-check':
      return `A week is kept on any ${draft.daysPerWeek} days you do it. ${slackLine(draft.daysPerWeek)}`
    case 'times-week':
      return `A week is kept once it’s happened ${draft.times === 1 ? 'once' : `${draft.times} times`} — any days you like.`
    case 'weekly-total': {
      if (!valid) return 'How much in a week?'
      const perDay = formatAmount(Math.ceil(amount / 7), draft.unit)
      return `A week is kept at ${formatAmount(amount, draft.unit)} in total — about ${perDay} a day, or most of it on Sunday. Your call.`
    }
  }
}

/**
 * Create or shape a goal: a name, an icon, one of four labelled shapes, the number that
 * matters for it, and a live sentence saying exactly what keeps a week. Editing re-judges
 * history under the new rule; archiving keeps it; deleting removes it (confirmed).
 */
function GoalModal({ state: liveState, onSave, onArchive, onDelete, onClose }: GoalModalProps) {
  const open = liveState != null
  // A closing workshop keeps drawing what it showed while it folds away.
  const state = useHeld(liveState)
  const editing = state?.mode === 'edit' ? state.view : null
  const initial = useMemo(() => {
    if (!state) return EMPTY
    if (state.mode === 'edit') {
      const g = state.view.goal
      return draftFrom({ title: g.title, icon: g.icon ?? undefined, color: goalColor(g), world: g.world ?? '', measure: g.measure, period: g.period, target: g.target, unit: g.unit ?? undefined, daysPerWeek: g.daysPerWeek ?? undefined })
    }
    return draftFrom(state.preset)
  }, [state])

  const [draft, setDraft] = useState<Draft>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(initial)
    setError('')
    setConfirmDelete(false)
  }, [open, initial])

  const isDirty = open && JSON.stringify(draft) !== JSON.stringify(initial)
  const { requestClose, dialog: confirmCloseDialog } = useConfirmClose(isDirty && !saving, onClose)

  if (!state) return null

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }))
  const isCount = draft.shape === 'daily-amount' || draft.shape === 'weekly-total'
  const amount = Number(draft.amount)
  const valid = draft.title.trim().length > 0 && (!isCount || (amount > 0 && amount <= 100000))

  const chooseShape = (shape: GoalShape) =>
    setDraft((d) => {
      // Carry the amount across the two amount shapes only when it still makes sense.
      if (shape === 'weekly-total' && d.shape !== 'weekly-total') return { ...d, shape, amount: '420', unit: 'min' }
      if (shape === 'daily-amount' && d.shape !== 'daily-amount') return { ...d, shape, amount: '10', unit: 'pages' }
      return { ...d, shape }
    })

  const submit = async () => {
    if (saving || !valid) return
    setSaving(true)
    setError('')
    try {
      await onSave(payloadFrom(draft), editing?.goal.id)
      campSound.play(editing ? 'equip' : 'chime')
      onClose()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save this goal — try again.'))
    } finally {
      setSaving(false)
    }
  }

  const archive = async () => {
    if (!editing) return
    setSaving(true)
    try {
      await onArchive(editing.goal.id)
      onClose()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not archive — try again.'))
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!editing) return
    setConfirmDelete(false)
    setSaving(true)
    try {
      await onDelete(editing.goal.id)
      onClose()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not delete — try again.'))
    } finally {
      setSaving(false)
    }
  }

  const titleId = 'goals-goal-modal-title'
  const startsThisWeek = !editing

  const hero = (
    <div className="lantern lantern--hero has-light" data-color={draft.color} aria-hidden="true">
      <LanternArt icon={draft.icon} level={0.62} lit={false} iconSize={34} />
    </div>
  )

  return (
    <>
      <CampSheet
        open={open}
        onRequestClose={requestClose}
        origin={state.origin}
        labelledBy={titleId}
        hero={hero}
        color={draft.color}
        tag
        width={540}
        escape={!confirmDelete}
      >
        <form
          className="gw"
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
        >
          <header className="gl-modal-head">
            <div className="gl-modal-head-goal">
              <div>
                <p className="gl-eyebrow">
                  <Target size={11} strokeWidth={2.5} /> {editing ? 'Shape this lantern' : 'A new lantern'}
                </p>
                <h2 id={titleId}>{draft.title.trim() || (editing ? editing.goal.title : 'What shall we look after?')}</h2>
              </div>
            </div>
            <button type="button" className="cs-icon" onClick={requestClose} aria-label="Close">
              <X size={16} strokeWidth={2.6} />
            </button>
          </header>
          <div className="gl-modal-body">
            <label className="gl-field">
              <span>Name</span>
              <input
                className="gl-input"
                type="text"
                value={draft.title}
                maxLength={60}
                placeholder="Read, Move, Learn Spanish…"
                onChange={(e) => set('title', e.target.value)}
                data-autofocus
              />
            </label>

            <div className="gl-field">
              <span id="gl-color-label">Colour</span>
              <div className="gl-color-row" role="radiogroup" aria-labelledby="gl-color-label">
                {GOAL_COLORS.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={draft.color === key}
                    aria-label={label}
                    title={label}
                    data-color={key}
                    className={cn('gl-color-choice', draft.color === key && 'is-on')}
                    onClick={() => {
                      set('color', key)
                      campSound.play('tap')
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="gl-field">
              <span id="gl-icon-label">Icon</span>
              <div className="gl-icon-grid" role="radiogroup" aria-labelledby="gl-icon-label">
                {GOAL_ICONS.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={draft.icon === key}
                    aria-label={label}
                    title={label}
                    className={cn('gl-icon-choice', draft.icon === key && 'is-on')}
                    onClick={() => {
                      set('icon', key)
                      campSound.play('tap')
                    }}
                  >
                    <Icon size={15} strokeWidth={2.2} />
                  </button>
                ))}
              </div>
            </div>

            <div className="gl-field">
              <span id="gl-shape-label">Shape</span>
              <div className="gl-shape-grid" role="radiogroup" aria-labelledby="gl-shape-label">
                {SHAPES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    role="radio"
                    aria-checked={draft.shape === s.id}
                    className={cn('gl-shape', draft.shape === s.id && 'is-on')}
                    onClick={() => chooseShape(s.id)}
                  >
                    <strong>{s.label}</strong>
                    <small>{s.example}</small>
                  </button>
                ))}
              </div>
            </div>

            {isCount && (
              <div className="gl-field-row">
                <label className="gl-field">
                  <span>{draft.shape === 'daily-amount' ? 'A day counts at' : 'Each week'}</span>
                  <input
                    className="gl-input gl-input--number"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    value={draft.amount}
                    onChange={(e) => set('amount', e.target.value)}
                  />
                </label>
                <label className="gl-field">
                  <span>Unit</span>
                  <input
                    className="gl-input"
                    type="text"
                    value={draft.unit}
                    maxLength={16}
                    placeholder="pages"
                    onChange={(e) => set('unit', e.target.value)}
                  />
                </label>
                <div className="gl-unit-chips" aria-label="Common units">
                  {UNIT_CHOICES[draft.shape as 'daily-amount' | 'weekly-total'].map((u) => (
                    <button key={u} type="button" className={cn('gl-chip', draft.unit === u && 'is-on')} onClick={() => set('unit', u)}>
                      {u}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(draft.shape === 'daily-amount' || draft.shape === 'daily-check' || draft.shape === 'times-week') && (
              <div className="gl-field">
                <span id="gl-days-label">
                  {draft.shape === 'times-week' ? 'Times a week' : 'Days that keep the week'}
                </span>
                <div className="gl-days" role="radiogroup" aria-labelledby="gl-days-label">
                  {[1, 2, 3, 4, 5, 6, 7].map((n) => {
                    const on = draft.shape === 'times-week' ? draft.times === n : draft.daysPerWeek === n
                    return (
                      <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        className={cn('gl-day-choice', on && 'is-on')}
                        onClick={() => (draft.shape === 'times-week' ? set('times', n) : set('daysPerWeek', n))}
                      >
                        {n}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="gl-field">
              <span id="gl-world-label">
                A world of its own <em>· optional</em>
              </span>
              <div className="gl-world-grid" role="radiogroup" aria-labelledby="gl-world-label">
                <button
                  type="button"
                  role="radio"
                  aria-checked={draft.world === ''}
                  className={cn('gl-shape gl-world', draft.world === '' && 'is-on')}
                  onClick={() => set('world', '')}
                >
                  <strong>Just a lantern</strong>
                  <small>It lives at camp with the others.</small>
                </button>
                {GOAL_WORLDS.map((w) => (
                  <button
                    key={w.key}
                    type="button"
                    role="radio"
                    aria-checked={draft.world === w.key}
                    className={cn('gl-shape gl-world', `gl-world--${w.key}`, draft.world === w.key && 'is-on')}
                    onClick={() => {
                      set('world', w.key)
                      campSound.play('tap')
                    }}
                  >
                    <strong>{w.name}</strong>
                    <small>{w.blurb}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="gl-read gl-read--sticky" aria-live="polite">
              <p>{ruleSentence(draft)}</p>
              {startsThisWeek && <small>This week counts from today, sized to the days it has left.</small>}
              {editing && <small>Past weeks are re-judged under the new rule.</small>}
            </div>
          </div>

          <footer className="gl-modal-foot">
            {error ? (
              <p className="gl-modal-hint is-error" role="alert">{error}</p>
            ) : editing ? (
              <div className="gl-modal-danger">
                <button type="button" className="tb-link" onClick={() => void archive()} disabled={saving}>
                  <Archive size={12} strokeWidth={2.3} /> Archive
                </button>
                <button type="button" className="tb-link is-danger" onClick={() => setConfirmDelete(true)} disabled={saving}>
                  <Trash2 size={12} strokeWidth={2.3} /> Delete
                </button>
              </div>
            ) : (
              <p className="gl-modal-hint">Starts today. You can change any of this later.</p>
            )}
            <div className="gl-modal-actions">
              <button type="button" className="tb-btn" onClick={requestClose} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="tb-btn tb-btn--primary" disabled={saving || !valid}>
                {saving && <Loader2 size={13} className="animate-spin" />}
                {saving ? 'Saving…' : editing ? 'Save goal' : 'Add goal'}
              </button>
            </div>
          </footer>
        </form>
      </CampSheet>
      {confirmCloseDialog}
      <ConfirmDialog
        open={confirmDelete}
        title={`Delete “${editing?.goal.title ?? ''}”?`}
        message={`Its ${editing?.weeksKept ?? 0} kept ${editing?.weeksKept === 1 ? 'week goes' : 'weeks go'} with it. Archiving keeps the history instead.`}
        confirmLabel="Delete goal"
        onConfirm={() => void remove()}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  )
}

export { GoalModal }
