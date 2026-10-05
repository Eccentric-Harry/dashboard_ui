import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import type { ProgramTargetEdit, ProgramTrackKey } from '@/types/program'
import { cn } from '@/lib/utils'
import { CampSheet } from '../components/camp-sheet'
import { addDays } from '../goal-format'
import { SELF_TRUST_QUESTION, TRACKS, trackMeta } from './program-content'
import {
  activeTracks,
  dayCell,
  isDone,
  isOn,
  isWeekly,
  keptPromises,
  trackOf,
  weekCount,
  weekDates,
  type ProgramCtx,
} from './program-engine'
import type { LighthouseApi } from './lighthouse-api'
import { IfThen, Stepper, TrackDisc } from './lh-ui'
import { dayMonth } from './lh-utils'

type ReviewSheetProps = {
  open: boolean
  origin: HTMLElement | null
  ctx: ProgramCtx | null
  api: LighthouseApi
  weekStart: string
  /** A track whose target Pip offered to lower — opened and highlighted. */
  focus?: ProgramTrackKey | null
  onClose: () => void
}

/**
 * The weekly review on the bench — five minutes: how much you trust yourself to do what you
 * say (1–10), one win, one thing that got in the way, one adjustment and an if-then plan for
 * next week (WOOP-shaped). It's the only place targets change, so a change is a decision;
 * lowering one is a valid outcome, never a failure.
 */
function ReviewSheet({ open, origin, ctx, api, weekStart, focus, onClose }: ReviewSheetProps) {
  return (
    <CampSheet open={open} onRequestClose={onClose} origin={origin} labelledBy="lh-review-title" width={860} color="lemon">
      {ctx && <ReviewBody key={`${weekStart}:${focus ?? ''}`} ctx={ctx} api={api} weekStart={weekStart} focus={focus} onClose={onClose} />}
    </CampSheet>
  )
}

type Draft = Partial<Record<ProgramTrackKey, { target: number; floor: number | null }>>

function ReviewBody({ ctx, api, weekStart, focus, onClose }: { ctx: ProgramCtx; api: LighthouseApi; weekStart: string; focus?: ProgramTrackKey | null; onClose: () => void }) {
  const existing = ctx.reviews.find((r) => r.weekStart === weekStart)
  const [trust, setTrust] = useState<number | null>(existing?.selfTrust ?? null)
  const [win, setWin] = useState(existing?.win ?? '')
  const [obstacle, setObstacle] = useState(existing?.obstacle ?? '')
  const [adjustment, setAdjustment] = useState(existing?.adjustment ?? '')
  const [ifThen, setIfThen] = useState(existing?.ifThen ?? '')
  const [saving, setSaving] = useState(false)
  const days = weekDates(weekStart)
  const end = days[6] < ctx.today ? days[6] : ctx.today
  const editable = activeTracks(ctx.program, ctx.today).filter((k) => k !== 'mood')

  const start: Draft = useMemo(() => {
    const d: Draft = {}
    for (const k of editable) {
      const t = trackOf(ctx.program, k)
      d[k] = { target: t.target ?? 1, floor: t.floor ?? null }
    }
    return d
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.program])
  const [draft, setDraft] = useState<Draft>(start)

  const facts = useMemo(() => {
    const out: { key: ProgramTrackKey; text: string }[] = []
    for (const k of TRACKS.map((t) => t.key)) {
      if (!isOn(ctx.program, k, end) || k === 'mood') continue
      if (isWeekly(k)) {
        const { done, target } = weekCount(ctx, k, weekStart)
        out.push({ key: k, text: `${done}${target != null ? ` of ${target}` : ''} ${trackMeta(k).unit ?? ''}` })
      } else if (k === 'regard') {
        const kept = ctx.logs.filter((l) => l.track === 'regard' && l.text && days.includes(l.date)).length
        out.push({ key: k, text: `${kept} kept · ${keptPromises(ctx.logs)} in all` })
      } else {
        const judged = days.filter((d) => d <= ctx.today && isOn(ctx.program, k, d))
        const done = judged.filter((d) => isDone(dayCell(ctx, k, d).status)).length
        out.push({ key: k, text: `${done} of ${judged.length} days` })
      }
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, weekStart])

  const suggestions = useMemo(() => {
    const s: string[] = []
    for (const f of facts) {
      if (isWeekly(f.key)) {
        const { done } = weekCount(ctx, f.key, weekStart)
        if (done > 0) s.push(`${done} ${trackMeta(f.key).name.toLowerCase()} session${done === 1 ? '' : 's'}`)
      }
    }
    if (ctx.logs.some((l) => l.stretch && days.includes(l.date))) s.push('Spoke up in a meeting')
    if (ctx.logs.some((l) => l.urge && days.includes(l.date))) s.push('Rode out an urge')
    const kept = ctx.logs.filter((l) => l.track === 'regard' && l.text && days.includes(l.date)).length
    if (kept > 0) s.push(`${kept} kept promises`)
    return s.slice(0, 4)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facts])

  const changed = (k: ProgramTrackKey): ProgramTargetEdit | null => {
    const a = start[k]
    const b = draft[k]
    if (!a || !b) return null
    if (a.target === b.target && a.floor === b.floor) return null
    return { target: b.target, floor: b.floor }
  }

  const save = async () => {
    if (trust == null) return
    setSaving(true)
    const targets: Partial<Record<ProgramTrackKey, ProgramTargetEdit>> = {}
    for (const k of editable) {
      const c = changed(k)
      if (c) targets[k] = c
    }
    const ok = await api.saveReview(weekStart, {
      selfTrust: trust,
      win: win.trim() || undefined,
      obstacle: obstacle.trim() || undefined,
      adjustment: adjustment.trim() || undefined,
      ifThen: ifThen.trim() || undefined,
      targets: Object.keys(targets).length ? targets : undefined,
    })
    setSaving(false)
    if (ok) onClose()
  }

  const set = (k: ProgramTrackKey, patch: Partial<NonNullable<Draft[ProgramTrackKey]>>) =>
    setDraft((d) => ({ ...d, [k]: { ...(d[k] as NonNullable<Draft[ProgramTrackKey]>), ...patch } }))

  return (
    <div className="lh-sheet lh-review" data-color="lemon">
      <header className="lh-sheet-head">
        <div className="lh-sheet-title">
          <h2 id="lh-review-title">The weekly review</h2>
          <p>
            {dayMonth(weekStart)} – {dayMonth(addDays(weekStart, 6))} · five minutes on the bench
          </p>
        </div>
        <button type="button" className="cs-icon" onClick={onClose} aria-label="Close" data-autofocus>
          <X size={18} strokeWidth={2.6} />
        </button>
      </header>

      <div className="lh-sheet-body lh-sheet-body--split">
        <div className="lh-sheet-main">
          <section className="lh-facts" aria-label="The week">
            {facts.map((f) => (
              <span key={f.key} className="lh-fact" data-color={trackMeta(f.key).color}>
                <TrackDisc track={f.key} size={22} />
                {f.text}
              </span>
            ))}
          </section>

          <p className="lh-kicker">“{SELF_TRUST_QUESTION}”</p>
          <div className="lh-trust" role="radiogroup" aria-label="Self-trust, 1 to 10">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button key={n} type="button" role="radio" aria-checked={trust === n} className={cn('lh-trust-n', trust === n && 'is-on')} onClick={() => setTrust(n)}>
                {n}
              </button>
            ))}
          </div>

          <label className="lh-field">
            <span>One win</span>
            <input className="lh-input" maxLength={300} value={win} onChange={(e) => setWin(e.target.value)} placeholder="Something that happened because you did it" />
          </label>
          {suggestions.length > 0 && !win && (
            <div className="lh-chips">
              {suggestions.map((s) => (
                <button key={s} type="button" className="lh-chip" onClick={() => setWin(s)}>
                  {s}
                </button>
              ))}
            </div>
          )}
          <label className="lh-field">
            <span>One thing that got in the way</span>
            <input className="lh-input" maxLength={300} value={obstacle} onChange={(e) => setObstacle(e.target.value)} placeholder="Facts, not verdicts — “late meetings Wednesday”" />
          </label>
          <label className="lh-field">
            <span>One adjustment</span>
            <input className="lh-input" maxLength={300} value={adjustment} onChange={(e) => setAdjustment(e.target.value)} placeholder="Smaller, earlier, easier to start" />
          </label>
          <div className="lh-field">
            <span>If-then for next week</span>
            <IfThen value={ifThen} max={300} label="If-then for next week" example="If that obstacle shows up, then I do the small version." onChange={setIfThen} />
          </div>
        </div>

        <aside className="lh-sheet-side">
          <p className="lh-kicker">Targets — the only place they change</p>
          <p className="lh-small">Lowering one is a valid outcome, not a failure. A target you hit beats one you avoid.</p>
          <ul className="lh-targets">
            {editable.map((k) => {
              const d = draft[k]
              if (!d) return null
              const meta = trackMeta(k)
              const isChanged = !!changed(k)
              return (
                <li key={k} className={cn('lh-target', focus === k && 'is-focus', isChanged && 'is-changed')} data-color={meta.color}>
                  <TrackDisc track={k} size={26} />
                  <span className="lh-target-name">{meta.name}</span>
                  <div className="lh-target-ctl">
                    <Stepper
                      value={d.target}
                      onChange={(v) => set(k, { target: v, floor: d.floor != null ? Math.min(d.floor, v) : null })}
                      step={k === 'protein' ? 5 : 1}
                      min={k === 'protein' ? 30 : 1}
                      max={k === 'protein' ? 400 : k === 'english' ? 180 : k === 'regard' ? 5 : 7}
                      unit={k === 'protein' ? 'g' : k === 'english' ? 'min' : k === 'regard' ? '/day' : '/wk'}
                      label={`${meta.name} target`}
                    />
                    {d.floor != null && (
                      <Stepper value={d.floor} onChange={(v) => set(k, { floor: Math.min(v, d.target) })} step={k === 'protein' ? 5 : 1} min={1} max={d.target} unit="floor" label={`${meta.name} floor`} />
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
          {ctx.program.weightKg != null && <p className="lh-small">Protein at 1.6 g/kg for {ctx.program.weightKg} kg is {Math.round(ctx.program.weightKg * 1.6)} g.</p>}
        </aside>
      </div>

      <footer className="lh-sheet-foot">
        {existing && <span className="lh-small">Saved {dayMonth(existing.weekStart)} week · saving again updates it</span>}
        <button type="button" className="lh-btn lh-btn--primary lh-btn--lg" disabled={saving || trust == null} onClick={() => void save()}>
          {trust == null ? 'Pick a self-trust number first' : 'Save the review'}
        </button>
      </footer>
    </div>
  )
}

export { ReviewSheet }
