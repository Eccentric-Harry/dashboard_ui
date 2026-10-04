import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ExternalLink, Footprints, Lightbulb, Moon, Play, RefreshCw, Trash2, Waves, X } from 'lucide-react'
import type { LearningPursuit } from '@/types/learnings'
import type { LiftSet, ProgramLog, ProgramTrackKey } from '@/types/program'
import { learningsService } from '@/services/learnings-service'
import { cn } from '@/lib/utils'
import { CampSheet } from '../components/camp-sheet'
import { addDays } from '../goal-format'
import {
  BUNDLE_TIP,
  KIND_PROMPTS,
  LIFT_PLANS,
  LIFT_SAFETY,
  MOOD_SCALE,
  MOOD_TAGS,
  PROMISE_EXAMPLES,
  PROTEIN_FOODS,
  fillCopy,
  sessionMinutes,
  trackMeta,
} from './program-content'
import {
  capOn,
  consistency,
  dateOfDay,
  dayCell,
  dayNumber,
  isBaseline,
  isOn,
  keptPromises,
  lastSet,
  logSound,
  logsOn,
  nextLiftDay,
  nextRun,
  opensDay,
  progressionHint,
  scheduledDay,
  screenMinutes,
  startedEarly,
  targetOn,
  type ProgramCtx,
} from './program-engine'
import type { LighthouseApi } from './lighthouse-api'
import { SpeakStudio } from './speak-studio'
import { IfThen, Seg, Stepper, TrackDisc } from './lh-ui'
import { dayMonth, shortDay } from './lh-utils'

type TrackSheetProps = {
  open: boolean
  track: ProgramTrackKey | null
  origin: HTMLElement | null
  ctx: ProgramCtx | null
  api: LighthouseApi
  busy: boolean
  onClose: () => void
  onCoach: (el: HTMLElement) => void
  onUrge: (el: HTMLElement) => void
  onNavigate: (path: '/nutrition' | '/learnings') => void
}

/**
 * One track, up close: its log form (each track logs its own way), the if-then plan, why
 * it's here, and the last week's entries with undo. A track that hasn't opened yet shows
 * when it will and lets you write its plan now — the audit week's real job.
 */
function TrackSheet({ open, track, origin, ctx, api, busy, onClose, onCoach, onUrge, onNavigate }: TrackSheetProps) {
  const [shown, setShown] = useState(track)
  if (open && track && track !== shown) setShown(track)
  const key = shown ?? 'run'
  const meta = trackMeta(key)
  if (!ctx) return null
  const locked = !isOn(ctx.program, key, ctx.today)
  const { target, floor } = targetOn(ctx, key, ctx.today)
  const wide = key === 'lift' || key === 'english' || key === 'protein'

  return (
    <CampSheet open={open} onRequestClose={onClose} origin={origin} labelledBy="lh-track-title" width={wide ? 820 : 720} color={meta.color}>
      <div className="lh-sheet" data-color={meta.color}>
        <header className="lh-sheet-head">
          <TrackDisc track={key} size={44} />
          <div className="lh-sheet-title">
            <h2 id="lh-track-title">{meta.name}</h2>
            <p>
              {locked
                ? `Opens ${shortDay(dateOfDay(ctx.program, opensDay(ctx.program, key)))}`
                : fillCopy(meta.full, target, floor)}
            </p>
          </div>
          <button type="button" className="cs-icon" onClick={onClose} aria-label="Close" data-autofocus>
            <X size={18} strokeWidth={2.6} />
          </button>
        </header>

        <div className={cn('lh-sheet-body', 'lh-sheet-body--split')}>
          <div className="lh-sheet-main">
            {locked ? (
              <div className="lh-locked-intro">
                {startedEarly(ctx.program, key) ? (
                  <p>
                    You moved {meta.name.toLowerCase()} up: it starts with the program on <b>day 1, {shortDay(ctx.program.startDate)}</b>, and every session from
                    then on is recorded.
                  </p>
                ) : (
                  <p>
                    {meta.name} switches on <b>{shortDay(dateOfDay(ctx.program, opensDay(ctx.program, key)))}</b>. The tracks come in a few at a time so the
                    first weeks stay light — that’s the default, not a rule.
                  </p>
                )}
                <p className="lh-small">
                  Full version: {fillCopy(meta.full, target, floor)}. Bad-day version: {fillCopy(meta.min, target, floor)} — and it counts.
                </p>
                {startedEarly(ctx.program, key) ? <EarlyNote track={key} ctx={ctx} api={api} /> : <StartNow track={key} ctx={ctx} api={api} />}
              </div>
            ) : (
              <TrackForm track={key} ctx={ctx} api={api} busy={busy} onCoach={onCoach} onUrge={onUrge} onNavigate={onNavigate} />
            )}
          </div>
          <aside className="lh-sheet-side">
            {!locked && startedEarly(ctx.program, key) && <EarlyNote track={key} ctx={ctx} api={api} />}
            {key !== 'mood' && <PlanEditor key={`${key}:${ctx.program.tracks.find((t) => t.key === key)?.plan ?? ''}`} ctx={ctx} track={key} api={api} />}
            <Why track={key} ctx={ctx} />
            <Recent track={key} ctx={ctx} api={api} />
          </aside>
        </div>
      </div>
    </CampSheet>
  )
}

type FormProps = {
  track: ProgramTrackKey
  ctx: ProgramCtx
  api: LighthouseApi
  busy: boolean
  onCoach: (el: HTMLElement) => void
  onUrge: (el: HTMLElement) => void
  onNavigate: (path: '/nutrition' | '/learnings') => void
}

function TrackForm(props: FormProps) {
  switch (props.track) {
    case 'run':
      return <RunForm {...props} />
    case 'lift':
      return <LiftForm {...props} />
    case 'protein':
      return <ProteinForm {...props} />
    case 'mood':
      return <MoodForm {...props} />
    case 'learn':
      return <LearnForm {...props} />
    case 'english':
      return <SpeakStudio ctx={props.ctx} api={props.api} busy={props.busy} />
    case 'screen':
      return <ScreenForm {...props} />
    case 'regard':
      return <RegardForm {...props} />
  }
}

const anchor = (track: ProgramTrackKey) => document.querySelector<HTMLElement>(`[data-track-card="${track}"]`)

// ── Run ─────────────────────────────────────────────────────────────────

function RunForm({ ctx, api, busy, onCoach }: FormProps) {
  const next = nextRun(ctx.logs)
  const strava = ctx.sources.runs[ctx.today]
  const [level, setLevel] = useState<'FULL' | 'MIN' | 'REST'>('FULL')
  const [minutes, setMinutes] = useState(next ? sessionMinutes(next) : 30)
  const [km, setKm] = useState(0)
  const [feel, setFeel] = useState<number | null>(null)

  const log = () =>
    api.addLog(
      {
        track: 'run',
        date: ctx.today,
        level,
        minutes: level === 'REST' ? null : minutes,
        distanceKm: level === 'REST' || km <= 0 ? null : km,
        feel: level === 'REST' ? null : feel,
      },
      { anchor: anchor('run'), detail: level === 'FULL' ? 'Run' : undefined },
    )

  return (
    <div className="lh-form">
      {next ? (
        <section className="lh-coach-card">
          <div>
            <p className="lh-kicker">Couch to 5K · week {next.week} of 9 · run {next.run}</p>
            <p className="lh-coach-summary">{next.summary}</p>
            <p className="lh-small">{sessionMinutes(next)} minutes with a 5-minute walk either side. Repeat a week whenever you like — the coach moves on only when you finish a run.</p>
          </div>
          <button type="button" className="lh-btn lh-btn--candy lh-btn--lg" data-sound="tap" onClick={(e) => onCoach(e.currentTarget)}>
            <Play size={18} strokeWidth={2.8} aria-hidden="true" /> Start the coach
          </button>
        </section>
      ) : (
        <section className="lh-coach-card">
          <p className="lh-coach-summary">Couch to 5K done. You run for 30 minutes now — keep three a week.</p>
        </section>
      )}
      {strava && strava.count > 0 && (
        <p className="lh-note-line">
          <Footprints size={15} strokeWidth={2.6} aria-hidden="true" /> Strava has {strava.km.toFixed(1)} km today — it already counts.
        </p>
      )}
      <p className="lh-kicker">Or log it yourself</p>
      <Seg
        label="Which version"
        value={level}
        onChange={setLevel}
        options={[
          { value: 'FULL', label: 'Full run' },
          { value: 'MIN', label: 'Small · 10 min' },
          { value: 'REST', label: 'Rest day' },
        ]}
      />
      {level !== 'REST' && (
        <div className="lh-row">
          <Stepper value={minutes} onChange={setMinutes} step={5} min={1} max={240} unit="min" label="minutes" />
          <Stepper value={km} onChange={setKm} step={0.5} min={0} max={60} unit="km" label="distance" />
        </div>
      )}
      {level !== 'REST' && (
        <div className="lh-feel" role="radiogroup" aria-label="How did it feel?">
          <span className="lh-small">Felt</span>
          {['Rough', 'Hard', 'Okay', 'Good', 'Great'].map((w, i) => (
            <button key={w} type="button" role="radio" aria-checked={feel === i + 1} className={cn('lh-chip', feel === i + 1 && 'is-on')} onClick={() => setFeel(feel === i + 1 ? null : i + 1)}>
              {w}
            </button>
          ))}
        </div>
      )}
      <button type="button" className="lh-btn lh-btn--primary lh-btn--wide" disabled={busy} onClick={() => void log()} {...soundAttrs(ctx, 'run', level)}>
        {level === 'REST' ? 'Log a rest day' : level === 'MIN' ? 'Log the small version' : 'Log the run'}
      </button>
      <p className="lh-tip">
        <Lightbulb size={14} strokeWidth={2.6} aria-hidden="true" /> {BUNDLE_TIP}
      </p>
    </div>
  )
}

// ── Lift ────────────────────────────────────────────────────────────────

function LiftForm({ ctx, api, busy }: FormProps) {
  const days = LIFT_PLANS[ctx.program.liftPlace ?? 'gym']
  const [dayKey, setDayKey] = useState(nextLiftDay(ctx.logs, days).key)
  const plan = days.find((d) => d.key === dayKey) ?? days[0]
  const initial = useMemo(
    () =>
      Object.fromEntries(
        plan.exercises.map((e) => {
          const last = lastSet(ctx.logs, e.name)
          return [e.name, { weightKg: last?.weightKg ?? 0, reps: last?.reps ?? 0 }]
        }),
      ),
    [plan, ctx.logs],
  )
  // Only what's been typed is state; everything else shows last time's numbers.
  const [edits, setEdits] = useState<Record<string, { weightKg: number; reps: number }>>({})
  const valueOf = (name: string) => edits[`${plan.key}:${name}`] ?? initial[name] ?? { weightKg: 0, reps: 0 }

  const logFull = () => {
    const done: LiftSet[] = plan.exercises
      .map((e) => ({ exercise: e.name, weightKg: valueOf(e.name).weightKg, reps: valueOf(e.name).reps }))
      .filter((s) => (s.reps ?? 0) > 0)
    return api.addLog({ track: 'lift', date: ctx.today, level: 'FULL', session: plan.key, sets: done.length ? done : null }, { anchor: anchor('lift'), detail: `${plan.name}` })
  }

  return (
    <div className="lh-form">
      <div className="lh-row lh-row--between">
        <Seg label="Which day" value={dayKey} onChange={setDayKey} options={days.map((d) => ({ value: d.key, label: d.name }))} />
        <span className="lh-small">{ctx.program.liftPlace === 'home' ? 'At home' : 'At the gym'} · top set per exercise</span>
      </div>
      <ul className="lh-lifts">
        {plan.exercises.map((e) => {
          const last = lastSet(ctx.logs, e.name)
          const v = valueOf(e.name)
          const set = (patch: Partial<typeof v>) => setEdits((s) => ({ ...s, [`${plan.key}:${e.name}`]: { ...v, ...patch } }))
          return (
            <li key={e.name} className="lh-lift">
              <div className="lh-lift-name">
                <strong>{e.name}</strong>
                <small>
                  {e.scheme} · {progressionHint(last, e.top, e.next, e.timed)}
                </small>
              </div>
              {!e.timed && (
                <label className="lh-mini-field">
                  <input type="number" inputMode="decimal" min={0} max={500} step={0.5} value={v.weightKg || ''} placeholder="0" onChange={(ev) => set({ weightKg: Number(ev.target.value) || 0 })} aria-label={`${e.name} weight in kg`} />
                  <span>kg</span>
                </label>
              )}
              <label className="lh-mini-field">
                <input type="number" inputMode="numeric" min={0} max={200} value={v.reps || ''} placeholder="0" onChange={(ev) => set({ reps: Number(ev.target.value) || 0 })} aria-label={`${e.name} ${e.timed ? 'seconds' : 'reps'}`} />
                <span>{e.timed ? 's' : 'reps'}</span>
              </label>
            </li>
          )
        })}
      </ul>
      <p className="lh-tip">
        <Lightbulb size={14} strokeWidth={2.6} aria-hidden="true" /> {LIFT_SAFETY}
      </p>
      <div className="lh-row">
        <button type="button" className="lh-btn lh-btn--primary" disabled={busy} onClick={() => void logFull()} {...soundAttrs(ctx, 'lift', 'FULL')}>
          Log {plan.name}
        </button>
        <button
          type="button"
          className="lh-btn lh-btn--soft"
          disabled={busy}
          {...soundAttrs(ctx, 'lift', 'MIN')}
          onClick={() => void api.addLog({ track: 'lift', date: ctx.today, level: 'MIN', session: 'lift-min' }, { anchor: anchor('lift') })}
        >
          Small version
        </button>
        <button type="button" className="lh-btn lh-btn--ghost" disabled={busy} onClick={() => void api.addLog({ track: 'lift', date: ctx.today, level: 'REST' }, { anchor: anchor('lift') })}>
          <Moon size={15} strokeWidth={2.6} aria-hidden="true" /> Rest day
        </button>
      </div>
    </div>
  )
}

// ── Protein ─────────────────────────────────────────────────────────────

function ProteinForm({ ctx, api, busy, onNavigate }: FormProps) {
  const cell = dayCell(ctx, 'protein', ctx.today)
  const { target, floor } = targetOn(ctx, 'protein', ctx.today)
  const auto = ctx.sources.protein[ctx.today]
  const [grams, setGrams] = useState(Math.round(cell.value ?? target ?? 100))
  const baseline = isBaseline(ctx.program, 'protein', ctx.today)
  return (
    <div className="lh-form">
      <section className="lh-read" data-color="mint">
        <p className="lh-read-big">
          <strong>{auto != null ? auto : '—'}</strong>
          <span> g today</span>
        </p>
        <p className="lh-small">{auto != null ? 'From your meals on Nutrition.' : 'Nothing logged on Nutrition yet today — unknown, not zero.'}</p>
        {!baseline && target != null && (
          <p className="lh-small">
            Target <b>{target} g</b> (1.6 g/kg) · floor <b>{floor} g</b> (1.2 g/kg) — both count as done.
          </p>
        )}
      </section>
      <button type="button" className="lh-btn lh-btn--candy lh-btn--wide" data-sound="tap" onClick={() => onNavigate('/nutrition')}>
        <ExternalLink size={15} strokeWidth={2.6} aria-hidden="true" /> Log meals on Nutrition
      </button>
      <p className="lh-kicker">Ate without logging? Write the day’s total</p>
      <div className="lh-row">
        <Stepper value={grams} onChange={setGrams} step={5} min={0} max={400} unit="g" label="protein grams" />
        <button
          type="button"
          className="lh-btn lh-btn--soft"
          disabled={busy}
          {...soundAttrs(ctx, 'protein', 'FULL')}
          onClick={() => void api.addLog({ track: 'protein', date: ctx.today, value: grams }, { anchor: anchor('protein'), detail: `${grams} g of protein` })}
        >
          Save {grams} g
        </button>
      </div>
      <details className="lh-how" open>
        <summary>Vegetarian protein, roughly per serving</summary>
        <ul className="lh-foods">
          {PROTEIN_FOODS.map((f) => (
            <li key={f.food}>
              <span>
                {f.food} <small>{f.serving}</small>
              </span>
              <b>{f.grams} g</b>
            </li>
          ))}
        </ul>
      </details>
    </div>
  )
}

// ── Mood ────────────────────────────────────────────────────────────────

function MoodForm({ ctx, api, busy }: FormProps) {
  const existing = [...logsOn(ctx.logs, 'mood', ctx.today)].reverse().find((l) => l.value != null)
  const fromMind = ctx.sources.mood[ctx.today]
  const [score, setScore] = useState<number | null>(existing?.value ?? fromMind ?? null)
  const [tag, setTag] = useState(existing?.tag ?? '')
  const [note, setNote] = useState(existing?.note ?? '')
  const save = () => {
    if (score == null) return
    const payload = { track: 'mood' as const, date: ctx.today, value: score, tag: tag || null, note: note.trim() || null }
    return existing ? api.updateLog(existing.id, payload) : api.addLog(payload)
  }
  return (
    <div className="lh-form">
      <p className="lh-kicker">How was today, honestly?</p>
      <div className="lh-mood-row lh-mood-row--big" role="radiogroup" aria-label="Mood">
        {MOOD_SCALE.map((m) => (
          <button key={m.score} type="button" role="radio" aria-checked={score === m.score} className={cn('lh-mood-chip', score === m.score && 'is-on')} style={{ ['--mood' as string]: m.color }} onClick={() => setScore(m.score)}>
            <i aria-hidden="true" />
            {m.word}
          </button>
        ))}
      </div>
      <p className="lh-kicker">One word, if one fits</p>
      <div className="lh-chips">
        {MOOD_TAGS.map((t) => (
          <button key={t} type="button" className={cn('lh-chip', tag === t && 'is-on')} onClick={() => setTag(tag === t ? '' : t)}>
            {t}
          </button>
        ))}
      </div>
      <textarea className="lh-text" rows={2} maxLength={280} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything else (optional)" aria-label="Note" />
      <button type="button" className="lh-btn lh-btn--primary lh-btn--wide" disabled={busy || score == null} onClick={() => void save()}>
        {existing ? 'Update today’s check-in' : 'Save check-in'}
      </button>
      <p className="lh-small">Mood is never scored against anything here. It also shows on Mind, so you only log it once.</p>
    </div>
  )
}

// ── Learn ───────────────────────────────────────────────────────────────

function LearnForm({ ctx, api, busy, onNavigate }: FormProps) {
  const [pursuits, setPursuits] = useState<LearningPursuit[]>([])
  const [minutes, setMinutes] = useState(25)
  const [where, setWhere] = useState<'work' | 'home'>('home')
  const [pursuitId, setPursuitId] = useState('')
  const [line, setLine] = useState('')
  useEffect(() => {
    let alive = true
    void learningsService.getPursuits().then((res) => {
      if (alive && res.data) setPursuits(res.data.filter((p) => p.status === 'ACTIVE'))
    })
    return () => {
      alive = false
    }
  }, [])
  const focus = ctx.sources.focus[ctx.today]
  const level = minutes >= 25 ? 'FULL' : 'MIN'
  return (
    <div className="lh-form">
      {focus != null && <p className="lh-note-line">{focus} focused minutes on Learnings today — 25 or more counts by itself.</p>}
      <div className="lh-row">
        <Stepper value={minutes} onChange={setMinutes} step={5} min={5} max={240} unit="min" label="minutes" />
        <Seg label="Work or home" value={where} onChange={setWhere} options={[{ value: 'work', label: 'Work' }, { value: 'home', label: 'Home' }]} />
      </div>
      {pursuits.length > 0 && (
        <label className="lh-field">
          <span>Pursuit</span>
          <select value={pursuitId} onChange={(e) => setPursuitId(e.target.value)}>
            <option value="">—</option>
            {pursuits.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </label>
      )}
      <input className="lh-input" maxLength={280} value={line} onChange={(e) => setLine(e.target.value)} placeholder="One line: what did you learn?" aria-label="Takeaway" />
      <button
        type="button"
        className="lh-btn lh-btn--primary lh-btn--wide"
        disabled={busy || (level === 'MIN' && !line.trim())}
        {...soundAttrs(ctx, 'learn', level)}
        onClick={() =>
          void api.addLog(
            { track: 'learn', date: ctx.today, level, minutes, tag: where, pursuitId: pursuitId || null, text: line.trim() || null },
            { anchor: anchor('learn'), detail: `${minutes} focused minutes` },
          )
        }
      >
        {level === 'FULL' ? `Log ${minutes} minutes` : 'Log the small version'}
      </button>
      {level === 'MIN' && !line.trim() && <p className="lh-small">The small version is 10 minutes and one line — write the line.</p>}
      <button type="button" className="lh-link" onClick={() => onNavigate('/learnings')}>
        <ExternalLink size={14} strokeWidth={2.6} aria-hidden="true" /> Start a focus session on Learnings
      </button>
    </div>
  )
}

// ── Screen ──────────────────────────────────────────────────────────────

function ScreenForm(props: FormProps) {
  const [day, setDay] = useState<'today' | 'yesterday'>(new Date().getHours() < 12 ? 'yesterday' : 'today')
  return (
    <div className="lh-form">
      <Seg label="Which day" value={day} onChange={setDay} options={[{ value: 'yesterday', label: 'Yesterday' }, { value: 'today', label: 'Today' }]} />
      <p className="lh-small">Recreational time only, from your phone’s Settings → Screen Time. Work apps don’t count.</p>
      <ScreenDay key={day} {...props} day={day} />
    </div>
  )
}

function ScreenDay({ ctx, api, busy, onUrge, day }: FormProps & { day: 'today' | 'yesterday' }) {
  const date = day === 'today' ? ctx.today : addDays(ctx.today, -1)
  const existing = [...logsOn(ctx.logs, 'screen', date)].reverse().find((l) => l.value != null)
  const [minutes, setMinutes] = useState(existing?.value ?? screenMinutes(ctx.logs).get(addDays(date, -1)) ?? 180)
  const [morning, setMorning] = useState<boolean | null>(existing?.morningRule ?? null)
  const [night, setNight] = useState<boolean | null>(existing?.nightRule ?? null)
  const cap = capOn(ctx, date)
  const baseline = isBaseline(ctx.program, 'screen', date)
  const save = () => {
    const payload = { track: 'screen' as const, date, value: minutes, morningRule: morning, nightRule: night }
    const opts = { anchor: anchor('screen'), detail: `${minutes} minutes` }
    return existing ? api.updateLog(existing.id, payload, opts) : api.addLog(payload, opts)
  }
  return (
    <>
      <Stepper value={minutes} onChange={setMinutes} step={5} min={0} max={1440} unit="min" label="recreational minutes" big />
      <p className="lh-note-line">
        {baseline ? 'Audit week — no cap yet. Just the honest number.' : cap != null ? `Cap for ${day}: ${cap} min · ${minutes <= cap ? 'under it' : `${minutes - cap} over — still worth logging`}` : 'The cap appears once the audit week has three days logged.'}
      </p>
      <div className="lh-rules">
        <RuleToggle label="No phone for the first 30 minutes after waking" value={morning} onChange={setMorning} />
        <RuleToggle label="No phone for the last 30 minutes before sleep" value={night} onChange={setNight} />
      </div>
      <div className="lh-row">
        <button type="button" className="lh-btn lh-btn--primary" disabled={busy} onClick={() => void save()}>
          {existing ? 'Update' : 'Save'} {day}
        </button>
        <button type="button" className="lh-btn lh-btn--ghost" onClick={(e) => onUrge(e.currentTarget)}>
          <Waves size={16} strokeWidth={2.6} aria-hidden="true" /> Ride an urge
        </button>
      </div>
    </>
  )
}

function RuleToggle({ label, value, onChange }: { label: string; value: boolean | null; onChange: (v: boolean | null) => void }) {
  return (
    <div className="lh-rule">
      <span>{label}</span>
      <div className="lh-rule-opts" role="radiogroup" aria-label={label}>
        <button type="button" role="radio" aria-checked={value === true} className={cn('lh-chip', value === true && 'is-on')} onClick={() => onChange(value === true ? null : true)}>
          Kept
        </button>
        <button type="button" role="radio" aria-checked={value === false} className={cn('lh-chip', value === false && 'is-on is-neutral')} onClick={() => onChange(value === false ? null : false)}>
          Not today
        </button>
      </div>
    </div>
  )
}

// ── Self-regard ─────────────────────────────────────────────────────────

function RegardForm({ ctx, api, busy }: FormProps) {
  const [promise, setPromise] = useState('')
  const [kind, setKind] = useState('')
  const [prompt, setPrompt] = useState(() => Math.abs(ctx.today.split('-').reduce((n, x) => n + Number(x), 0)) % KIND_PROMPTS.length)
  const save = async () => {
    // The stone sounds as you press, not when the server answers; a milestone rings bigger.
    const saved = await api.addLog(
      { track: 'regard', date: ctx.today, level: kind.trim() ? 'FULL' : 'MIN', text: promise.trim(), kind: kind.trim() || null },
      { anchor: anchor('regard'), soundPlayed: true },
    )
    if (saved) {
      setPromise('')
      setKind('')
    }
  }
  const recent = ctx.logs.filter((l) => l.track === 'regard' && l.text).slice(-3).reverse()
  return (
    <div className="lh-form">
      <label className="lh-field">
        <span>A promise I kept today</span>
        <textarea className="lh-text" rows={2} maxLength={280} value={promise} onChange={(e) => setPromise(e.target.value)} placeholder={PROMISE_EXAMPLES[prompt % PROMISE_EXAMPLES.length]} />
      </label>
      <label className="lh-field">
        <span className="lh-field-row">
          {KIND_PROMPTS[prompt]}
          <button type="button" className="lh-icon-btn" onClick={() => setPrompt((p) => (p + 1) % KIND_PROMPTS.length)} aria-label="Another prompt">
            <RefreshCw size={13} strokeWidth={2.6} />
          </button>
        </span>
        <textarea className="lh-text" rows={2} maxLength={280} value={kind} onChange={(e) => setKind(e.target.value)} placeholder="One kind sentence to yourself (optional on a hard day)" />
      </label>
      <button
        type="button"
        className="lh-btn lh-btn--primary lh-btn--wide"
        disabled={busy || !promise.trim()}
        data-sound={[25, 50, 100].includes(keptPromises(ctx.logs) + 1) ? 'celebrate' : 'stone'}
        onClick={() => void save()}
      >
        Lay the stone
      </button>
      {recent.length > 0 && (
        <ul className="lh-kept-mini">
          {recent.map((l) => (
            <li key={l.id}>
              <small>{dayMonth(l.date)}</small> {l.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** The press sound for a log button: what logging this will sound like, decided up front. */
function soundAttrs(ctx: ProgramCtx, track: ProgramTrackKey, level: 'FULL' | 'MIN' | 'REST') {
  if (level === 'REST') return { 'data-sound': 'tap' }
  const s = logSound(ctx, track, level)
  return { 'data-sound': s.name, 'data-sound-step': s.step }
}

// ── Starting a track before its day ────────────────────────────────────

/**
 * The schedule staggers the tracks, but a person who wants to run now should be able to.
 * The evidence is mixed (some studies favour one habit at a time, others a bundle that
 * reinforces itself), so this is the user's call: it counts from today (or day 1).
 */
function StartNow({ track, ctx, api }: { track: ProgramTrackKey; ctx: ProgramCtx; api: LighthouseApi }) {
  const [saving, setSaving] = useState(false)
  const meta = trackMeta(track)
  const beforeStart = dayNumber(ctx.program, ctx.today) < 1
  return (
    <div className="lh-start-now" data-color={meta.color}>
      <span className="lh-start-now-text">
        <strong>Ready to start {meta.name.toLowerCase()} now?</strong>
        <small>
          It’s on from {beforeStart ? `day 1, ${shortDay(ctx.program.startDate)}` : 'today'} and every session is recorded, with the usual targets. You can put it back on the
          schedule later.
        </small>
      </span>
      <button
        type="button"
        className="lh-btn lh-btn--candy"
        disabled={saving}
        data-sound="start"
        onClick={async () => {
          setSaving(true)
          await api.saveSettings({ opens: { [track]: ctx.today } }, `${meta.name} is on from ${beforeStart ? 'day 1' : 'today'}.`)
          setSaving(false)
        }}
      >
        <Play size={14} strokeWidth={3} aria-hidden="true" /> Start {beforeStart ? 'on day 1' : 'today'}
      </button>
    </div>
  )
}

function EarlyNote({ track, ctx, api }: { track: ProgramTrackKey; ctx: ProgramCtx; api: LighthouseApi }) {
  const opened = dateOfDay(ctx.program, opensDay(ctx.program, track))
  const scheduled = dateOfDay(ctx.program, scheduledDay(ctx.program, track))
  return (
    <p className="lh-note-line lh-early-note">
      <span>
        {dayNumber(ctx.program, ctx.today) < 1 ? `Starting early, on ${dayMonth(opened)}.` : `Started early, on ${dayMonth(opened)}.`}{' '}
        <button type="button" className="lh-link" onClick={() => void api.saveSettings({ opens: { [track]: '' } }, `Back on the schedule — from ${dayMonth(scheduled)}.`)}>
          Back to the schedule ({dayMonth(scheduled)})
        </button>
      </span>
    </p>
  )
}

// ── Side: plan, why, recent ─────────────────────────────────────────────

function PlanEditor({ ctx, track, api }: { ctx: ProgramCtx; track: ProgramTrackKey; api: LighthouseApi }) {
  const current = ctx.program.tracks.find((t) => t.key === track)?.plan ?? ''
  const [plan, setPlan] = useState(current)
  const [saving, setSaving] = useState(false)
  const dirty = plan.trim() !== current.trim()
  return (
    <section className="lh-plan">
      <p className="lh-kicker">Your if-then plan</p>
      <IfThen value={current} example={trackMeta(track).planExample} onChange={setPlan} />
      <div className="lh-row lh-row--between">
        <span className="lh-small">A moment and an action. Plans like this roughly double follow-through.</span>
        {dirty && (
          <button
            type="button"
            className="lh-btn lh-btn--sm lh-btn--candy"
            disabled={saving}
            onClick={async () => {
              setSaving(true)
              await api.saveSettings({ plans: { [track]: plan.trim() } }, 'Plan saved.')
              setSaving(false)
            }}
          >
            Save plan
          </button>
        )}
      </div>
    </section>
  )
}

function Why({ track, ctx }: { track: ProgramTrackKey; ctx: ProgramCtx }) {
  const meta = trackMeta(track)
  const cons = consistency(ctx, track)
  return (
    <section className="lh-why">
      {cons.pct != null && (
        <p className="lh-why-stat">
          <b>{Math.round(cons.pct * 100)}%</b> · last 14 days
        </p>
      )}
      <p className="lh-small">{meta.why}</p>
      {meta.source && (
        <a className="lh-source" href={meta.source.url} target="_blank" rel="noreferrer">
          {meta.source.label}
        </a>
      )}
    </section>
  )
}

function summary(l: ProgramLog): ReactNode {
  const bits: string[] = []
  if (l.level === 'MIN') bits.push('small version')
  if (l.level === 'REST') bits.push('rest day')
  if (l.track === 'mood' && l.value != null) bits.push(MOOD_SCALE[l.value - 1]?.word ?? String(l.value))
  if (l.track === 'screen' && l.value != null) bits.push(`${l.value} min`)
  if (l.track === 'protein' && l.value != null) bits.push(`${l.value} g`)
  if (l.minutes) bits.push(`${l.minutes} min`)
  if (l.distanceKm) bits.push(`${l.distanceKm} km`)
  if (l.session?.startsWith('c25k-')) {
    const [, w, r] = l.session.split('-')
    bits.push(`C25K w${w} r${r}`)
  }
  if (l.sets?.length) bits.push(l.sets.map((s) => `${s.exercise.split(' ')[0]} ${s.weightKg ? `${s.weightKg}×` : ''}${s.reps}`).join(' · '))
  if (l.tag) bits.push(l.tag)
  if (l.urge) bits.push('urge ridden out')
  if (l.stretch) bits.push('meeting stretch')
  if (l.text) bits.push(`“${l.text}”`)
  return bits.join(' · ') || (l.level === 'FULL' ? 'done' : 'logged')
}

function Recent({ track, ctx, api }: { track: ProgramTrackKey; ctx: ProgramCtx; api: LighthouseApi }) {
  const since = addDays(ctx.today, -6)
  const list = ctx.logs.filter((l) => l.track === track && l.date >= since).slice().reverse()
  if (list.length === 0) return null
  return (
    <section className="lh-recent">
      <p className="lh-kicker">This past week</p>
      <ul>
        {list.slice(0, 6).map((l) => (
          <li key={l.id}>
            <small>{l.date === ctx.today ? 'Today' : shortDay(l.date)}</small>
            <span>{summary(l)}</span>
            <button type="button" className="lh-icon-btn" data-sound="soft-no" onClick={() => void api.deleteLog(l.id)} aria-label="Undo this entry">
              <Trash2 size={14} strokeWidth={2.6} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

export { TrackSheet }
