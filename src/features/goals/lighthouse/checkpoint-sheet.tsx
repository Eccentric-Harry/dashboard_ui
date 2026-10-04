import { useEffect, useRef, useState } from 'react'
import { Camera, Check, ChevronLeft, ChevronRight, PersonStanding, Phone, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import type { ProgramAssessment, ProgramAssessmentType } from '@/types/program'
import { HELPLINES } from '@/lib/helplines'
import { getErrorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'
import { CampSheet } from '../components/camp-sheet'
import { campSound } from '../camp-sound'
import { ROSENBERG_CHOICES, ROSENBERG_ITEMS, WHO5_CHOICES, WHO5_ITEMS } from './program-content'
import { currentCheckpoint, dayNumber, who5Concern, type ProgramCtx } from './program-engine'
import type { LighthouseApi } from './lighthouse-api'
import { Seg } from './lh-ui'
import { dayMonth, photoToDataUrl, useMediaUrl } from './lh-utils'

type CheckpointSheetProps = {
  open: boolean
  origin: HTMLElement | null
  ctx: ProgramCtx | null
  assessments: ProgramAssessment[]
  api: LighthouseApi
  type?: ProgramAssessmentType
  onClose: () => void
}

const TABS: { value: ProgramAssessmentType; label: string }[] = [
  { value: 'BODY', label: 'Body' },
  { value: 'ROSENBERG', label: 'Self-esteem' },
  { value: 'WHO5', label: 'Well-being' },
]

/**
 * The slow measures, on the flag post: photos and measurements every two weeks (never on the
 * main screen — daily weight is noise), the Rosenberg Self-Esteem Scale on days 1, 45 and 90,
 * and the WHO-5 every two weeks. Scores are a mirror, not a diagnosis; a low WHO-5 shows real
 * people to talk to, and two in a row asks for a doctor or therapist.
 */
function CheckpointSheet({ open, origin, ctx, assessments, api, type, onClose }: CheckpointSheetProps) {
  const [tab, setTab] = useState<ProgramAssessmentType>(type ?? 'BODY')
  const [wasOpen, setWasOpen] = useState(false)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open && type) setTab(type)
  }
  const isDue = (t: ProgramAssessmentType) => {
    if (!ctx) return false
    const cp = currentCheckpoint(ctx.program, assessments, t, ctx.today)
    return !!cp && !cp.done
  }
  return (
    <CampSheet open={open} onRequestClose={onClose} origin={origin} labelledBy="lh-check-title" width={tab === 'BODY' ? 780 : 680} color="sky">
      {ctx && (
        <div className="lh-sheet lh-checkins" data-color="sky">
          <header className="lh-sheet-head">
            <div className="lh-sheet-title">
              <h2 id="lh-check-title">Check-ins</h2>
              <p>Slow measures, so you can see change a single week hides.</p>
            </div>
            <Seg
              label="Which check-in"
              value={tab}
              onChange={setTab}
              options={TABS.map((t) => ({
                value: t.value,
                label: (
                  <>
                    {t.label}
                    {isDue(t.value) && <i className="lh-due-dot" aria-label="due" />}
                  </>
                ),
              }))}
            />
            <button type="button" className="cs-icon" onClick={onClose} aria-label="Close" data-autofocus>
              <X size={18} strokeWidth={2.6} />
            </button>
          </header>
          {tab === 'BODY' && <BodyCheck key="body" ctx={ctx} assessments={assessments} api={api} />}
          {tab === 'ROSENBERG' && <Questionnaire key="rse" type="ROSENBERG" ctx={ctx} assessments={assessments} api={api} />}
          {tab === 'WHO5' && <Questionnaire key="who5" type="WHO5" ctx={ctx} assessments={assessments} api={api} />}
        </div>
      )}
    </CampSheet>
  )
}

function dueLine(ctx: ProgramCtx, assessments: ProgramAssessment[], type: ProgramAssessmentType) {
  const cp = currentCheckpoint(ctx.program, assessments, type, ctx.today)
  if (!cp) return null
  return cp.done ? `Day ${cp.day} check done.` : `Day ${cp.day} check is due.`
}

// ── Body ────────────────────────────────────────────────────────────────

function BodyCheck({ ctx, assessments, api }: { ctx: ProgramCtx; assessments: ProgramAssessment[]; api: LighthouseApi }) {
  const [photos, setPhotos] = useState<{ front?: string; side?: string }>({})
  const [weight, setWeight] = useState('')
  const [waist, setWaist] = useState('')
  const [saving, setSaving] = useState(false)
  const body = assessments.filter((a) => a.type === 'BODY')
  const first = body[0]
  const latest = body.length > 1 ? body[body.length - 1] : null

  const pick = async (pose: 'front' | 'side', file?: File | null) => {
    if (!file) return
    try {
      const url = await photoToDataUrl(file)
      setPhotos((p) => ({ ...p, [pose]: url }))
    } catch (err) {
      toast.error(getErrorMessage(err, 'That photo couldn’t be read — try a JPEG.'))
    }
  }

  const save = async () => {
    setSaving(true)
    const mediaIds: string[] = []
    for (const pose of ['front', 'side'] as const) {
      const url = photos[pose]
      if (!url) continue
      const m = await api.addMedia({ kind: 'PHOTO', label: pose, date: ctx.today, dataUrl: url })
      if (m) mediaIds.push(m.id)
    }
    const w = Number(weight)
    const c = Number(waist)
    const saved = await api.addAssessment({
      type: 'BODY',
      date: ctx.today,
      weightKg: w > 0 ? w : undefined,
      waistCm: c > 0 ? c : undefined,
      mediaIds,
    })
    setSaving(false)
    if (saved) {
      setPhotos({})
      setWeight('')
      setWaist('')
    }
  }

  const waistLooksLikeHeight = Number(waist) >= 140

  return (
    <div className="lh-sheet-body lh-sheet-body--split">
      <div className="lh-sheet-main">
        <p className="lh-kicker">{dueLine(ctx, assessments, 'BODY')?.replace(/\.$/, '') ?? 'Every two weeks'}</p>
        <p className="lh-small">Same spot, same light, same time of day — mornings before eating are easiest.</p>
        <div className="lh-photo-pair">
          {(['front', 'side'] as const).map((pose) => (
            <label key={pose} className={cn('lh-photo-pick', photos[pose] && 'has-photo')}>
              {photos[pose] ? (
                <img src={photos[pose]} alt={`${pose} photo, today`} />
              ) : (
                <span className="lh-photo-cue" aria-hidden="true">
                  <PersonStanding size={34} strokeWidth={1.8} className={pose === 'side' ? 'is-side' : undefined} />
                  <Camera size={15} strokeWidth={2.6} />
                </span>
              )}
              <span className="lh-photo-name">{photos[pose] ? `${pose === 'front' ? 'Front' : 'Side'} · retake` : pose === 'front' ? 'Front' : 'Side'}</span>
              <input type="file" accept="image/*" onChange={(e) => void pick(pose, e.target.files?.[0])} />
            </label>
          ))}
        </div>
        <div className="lh-measures">
          <label className="lh-measure-field">
            <span>Weight</span>
            <span className="lh-measure-input">
              <input type="number" inputMode="decimal" min={25} max={300} step={0.1} value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="—" />
              <b>kg</b>
            </span>
          </label>
          <label className={cn('lh-measure-field', waistLooksLikeHeight && 'is-odd')}>
            <span>Waist, at the navel</span>
            <span className="lh-measure-input">
              <input type="number" inputMode="decimal" min={30} max={250} step={0.5} value={waist} onChange={(e) => setWaist(e.target.value)} placeholder="—" />
              <b>cm</b>
            </span>
          </label>
        </div>
        {waistLooksLikeHeight && <p className="lh-note-line">That looks more like a height. Waist is the tape around your middle, at the navel, breathing out.</p>}
        <button type="button" className="lh-btn lh-btn--primary lh-btn--wide" disabled={saving || (!photos.front && !photos.side && !weight && !waist)} onClick={() => void save()}>
          {saving ? 'Saving…' : 'Save this check'}
        </button>
        <p className="lh-small">Photos are private: stored in your own database and only ever sent to you. Appearance changes too slowly for a mirror — this is how you’ll see it.</p>
      </div>
      <aside className="lh-sheet-side">
        {first ? (
          <>
            <p className="lh-kicker">{latest ? 'Day 1 and now' : 'Your first check'}</p>
            <div className="lh-compare">
              <BodyColumn ctx={ctx} a={first} />
              {latest && <BodyColumn ctx={ctx} a={latest} />}
            </div>
            <ul className="lh-history">
              {body
                .slice()
                .reverse()
                .map((a) => (
                  <li key={a.id}>
                    <small>{dayMonth(a.date)}</small>
                    <span>
                      {a.weightKg != null && `${a.weightKg} kg`}
                      {a.weightKg != null && a.waistCm != null && ' · '}
                      {a.waistCm != null && `${a.waistCm} cm waist`}
                      {(a.mediaIds?.length ?? 0) > 0 && ` · ${a.mediaIds!.length} photo${a.mediaIds!.length === 1 ? '' : 's'}`}
                    </span>
                    <button type="button" className="lh-icon-btn" aria-label="Delete this check" onClick={() => void api.deleteAssessment(a.id)}>
                      <Trash2 size={13} strokeWidth={2.6} />
                    </button>
                  </li>
                ))}
            </ul>
          </>
        ) : (
          <>
            <p className="lh-kicker">Taking them well</p>
            <ul className="lh-tips">
              <li>Phone at chest height, about two metres away — a timer or a shelf helps.</li>
              <li>Same clothes, same spot, same light every time.</li>
              <li>Relaxed, not posed: arms by your sides, breathing out.</li>
              <li>Waist: the tape around your middle at the navel, snug, not tight.</li>
            </ul>
            <p className="lh-small">Your day-1 photos are the ones you’ll be glad you took.</p>
          </>
        )}
      </aside>
    </div>
  )
}

function BodyColumn({ ctx, a }: { ctx: ProgramCtx; a: ProgramAssessment }) {
  const front = a.mediaIds?.[0]
  return (
    <figure className="lh-compare-col">
      <Photo programId={ctx.program.id} mediaId={front} />
      <figcaption>
        Day {Math.max(1, dayNumber(ctx.program, a.date))}
        {a.weightKg != null && ` · ${a.weightKg} kg`}
      </figcaption>
    </figure>
  )
}

export function Photo({ programId, mediaId }: { programId: string; mediaId?: string | null }) {
  const { url, failed } = useMediaUrl(programId, mediaId)
  if (!mediaId) return <span className="lh-photo-empty">No photo</span>
  return url ? <img className="lh-photo" src={url} alt="Progress photo" /> : <span className="lh-photo-empty">{failed ? 'Couldn’t load' : 'Loading…'}</span>
}

// ── Questionnaires ──────────────────────────────────────────────────────

/**
 * One statement at a time (conversational forms finish far more often than a wall of radio
 * rows, and each statement gets the reader's full attention). Every point on the scale keeps
 * its full label — the instruments are validated with them. A tap answers and moves on;
 * 1–6 on the keyboard answers too, ← and → step back and forth.
 */
function Questionnaire({ type, ctx, assessments, api }: { type: 'ROSENBERG' | 'WHO5'; ctx: ProgramCtx; assessments: ProgramAssessment[]; api: LighthouseApi }) {
  const items = type === 'ROSENBERG' ? ROSENBERG_ITEMS : WHO5_ITEMS
  const choices = type === 'ROSENBERG' ? ROSENBERG_CHOICES : WHO5_CHOICES
  const [answers, setAnswers] = useState<(number | null)[]>(() => items.map(() => null))
  const [index, setIndex] = useState(0)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<ProgramAssessment | null>(null)
  const advance = useRef<number | null>(null)
  const history = assessments.filter((a) => a.type === type)
  const answered = answers.filter((a) => a != null).length
  const done = index >= items.length
  const due = dueLine(ctx, assessments, type)

  useEffect(() => () => {
    if (advance.current) window.clearTimeout(advance.current)
  }, [])

  /** `sounded`: the pluck already played on the press. */
  const choose = (v: number, sounded = false) => {
    if (done) return
    const at = index
    setAnswers((a) => a.map((x, j) => (j === at ? v : x)))
    if (!sounded) campSound.play('select', { step: at })
    if (advance.current) window.clearTimeout(advance.current)
    advance.current = window.setTimeout(() => {
      setIndex((i) => (i === at ? at + 1 : i))
      if (at === items.length - 1) campSound.play('chime')
    }, 260)
  }
  const go = (to: number) => {
    if (advance.current) window.clearTimeout(advance.current)
    setIndex(Math.max(0, Math.min(items.length, to)))
  }

  useEffect(() => {
    if (result) return
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return
      const n = Number(e.key)
      if (Number.isInteger(n) && n >= 1 && n <= choices.length) choose(n - 1)
      else if (e.key === 'ArrowLeft') go(index - 1)
      else if (e.key === 'ArrowRight' && answers[index] != null) go(index + 1)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const submit = async () => {
    setSaving(true)
    const saved = await api.addAssessment({ type, date: ctx.today, answers: answers as number[] })
    setSaving(false)
    if (saved) setResult(saved)
  }

  return (
    <div className="lh-sheet-body lh-qz-body">
      {result ? (
        <ScoreCard type={type} a={result} history={history} />
      ) : (
        <div className="lh-qz">
          <div className="lh-qz-top">
            <p className="lh-kicker">{due ? due.replace(/\.$/, '') : type === 'ROSENBERG' ? 'Days 1, 45 and 90' : 'Every two weeks'}</p>
            <span className="lh-qz-count">
              {Math.min(index + 1, items.length)} <small>of {items.length}</small>
            </span>
          </div>
          <div className="lh-qz-progress" aria-hidden="true">
            {items.map((_, i) => (
              <button
                key={i}
                type="button"
                tabIndex={-1}
                className={cn('lh-qz-seg', answers[i] != null && 'is-answered', i === index && 'is-now')}
                onClick={() => (answers[i] != null || i <= answered ? go(i) : undefined)}
              />
            ))}
          </div>

          {!done ? (
            <div className="lh-qz-stage" key={index}>
              <p className="lh-qz-prompt">{type === 'ROSENBERG' ? 'How much do you agree?' : 'Over the last two weeks…'}</p>
              <p className="lh-qz-q" id={`lh-qz-q-${index}`}>
                {items[index]}
              </p>
              <div className={cn('lh-qz-options', choices.length === 6 && 'is-six')} role="radiogroup" aria-labelledby={`lh-qz-q-${index}`}>
                {choices.map((c, v) => (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={answers[index] === v}
                    className={cn('lh-qz-opt', answers[index] === v && 'is-on')}
                    data-quiet-press
                    onPointerDown={(e) => {
                      if (e.button === 0) campSound.play('select', { step: index })
                    }}
                    onClick={(e) => choose(v, e.detail > 0)}
                  >
                    <kbd>{v + 1}</kbd>
                    <span className="lh-qz-label">{c}</span>
                    <span className="lh-qz-level" aria-hidden="true">
                      {choices.slice(1).map((_, k) => (
                        <i key={k} className={cn(k < v && 'is-on')} />
                      ))}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="lh-qz-stage lh-qz-ready" key="ready">
              <span className="lh-qz-ready-icon" aria-hidden="true">
                <Check size={26} strokeWidth={3.2} />
              </span>
              <p className="lh-qz-q">All {items.length} answered.</p>
              <p className="lh-small">Tap a step above to change an answer — or see where you are.</p>
              <button type="button" className="lh-btn lh-btn--candy lh-btn--lg" disabled={saving || answered < items.length} onClick={() => void submit()}>
                {saving ? 'Scoring…' : 'See my score'}
              </button>
            </div>
          )}

          <div className="lh-qz-nav">
            <button type="button" className="lh-link" onClick={() => go(index - 1)} disabled={index === 0}>
              <ChevronLeft size={15} strokeWidth={2.8} aria-hidden="true" /> Back
            </button>
            <span className="lh-qz-keys" aria-hidden="true">
              Keys 1–{choices.length} answer · ← →
            </span>
            {!done && answers[index] != null ? (
              <button type="button" className="lh-link" onClick={() => go(index + 1)}>
                Next <ChevronRight size={15} strokeWidth={2.8} aria-hidden="true" />
              </button>
            ) : (
              <span />
            )}
          </div>
        </div>
      )}
      <footer className="lh-quiz-foot">
        <span className="lh-kicker">{type === 'ROSENBERG' ? 'Rosenberg Self-Esteem Scale · 0–30' : 'WHO-5 Well-Being Index · 0–100'}</span>
        {history.map((a) => (
          <span key={a.id} className="lh-quiz-past">
            Day {Math.max(1, dayNumber(ctx.program, a.date))} · <b>{a.score}</b>
            <button type="button" className="lh-icon-btn" aria-label={`Delete the day ${Math.max(1, dayNumber(ctx.program, a.date))} score`} onClick={() => void api.deleteAssessment(a.id)}>
              <Trash2 size={12} strokeWidth={2.6} />
            </button>
          </span>
        ))}
        <span className="lh-small">{type === 'ROSENBERG' ? 'Days 1, 45 and 90' : 'Every two weeks'} · a mirror, not a diagnosis.</span>
      </footer>
    </div>
  )
}

/** A half-ring gauge for a score: the arc fills to the score, nothing else is judged. */
function Gauge({ value, max }: { value: number; max: number }) {
  const r = 78
  const len = Math.PI * r
  const pct = Math.max(0, Math.min(1, value / max))
  return (
    <svg className="lh-gauge" viewBox="0 0 200 112" aria-hidden="true">
      <path className="lh-gauge-track" d={`M ${100 - r} 100 A ${r} ${r} 0 0 1 ${100 + r} 100`} />
      <path className="lh-gauge-fill" d={`M ${100 - r} 100 A ${r} ${r} 0 0 1 ${100 + r} 100`} style={{ strokeDasharray: `${len * pct} ${len}`, ['--len' as string]: `${len}` }} />
    </svg>
  )
}

function ScoreCard({ type, a, history }: { type: 'ROSENBERG' | 'WHO5'; a: ProgramAssessment; history: ProgramAssessment[] }) {
  const score = a.score ?? 0
  const max = type === 'WHO5' ? 100 : 30
  const all = history.some((h) => h.id === a.id) ? history : [...history, a]
  const first = all[0]
  const delta = first && first.id !== a.id && first.score != null ? score - first.score : null
  const concern = type === 'WHO5' ? who5Concern(all) : score < 15 ? 'low' : 'none'
  return (
    <div className="lh-score">
      <div className="lh-score-dial">
        <Gauge value={score} max={max} />
        <p className="lh-score-big">
          <strong>{score}</strong>
          <span>/ {max}</span>
        </p>
      </div>
      <div className="lh-score-text">
        {delta != null ? (
          <p className={cn('lh-score-delta', delta > 0 && 'is-up')}>
            {delta === 0 ? 'Same as day 1.' : delta > 0 ? `+${delta} since day 1` : `Day 1 was ${first.score}.`}
            {delta < 0 && <small>{type === 'WHO5' ? ' Two weeks is a short window — this measures them, not you.' : ' Scores move both ways; the direction over 90 days is what counts.'}</small>}
          </p>
        ) : (
          <p className="lh-score-delta">Your first {type === 'WHO5' ? 'well-being' : 'self-esteem'} score — the point everything is measured from.</p>
        )}
        <p className="lh-small">
          {type === 'ROSENBERG'
            ? 'Most people score between 15 and 25. What matters here isn’t today’s number — it’s how it moves by day 90.'
            : 'Higher is better. The number is about the last two weeks, nothing more.'}
        </p>
        {all.length > 1 && (
          <ol className="lh-score-trail" aria-label="Every score so far">
            {all.map((h) => (
              <li key={h.id} className={cn(h.id === a.id && 'is-now')}>
                <i style={{ height: `${Math.max(8, ((h.score ?? 0) / max) * 100)}%` }} />
                <small>{h.score}</small>
              </li>
            ))}
          </ol>
        )}
      </div>
      {concern !== 'none' && (
        <div className="lh-care">
          <p>
            {type === 'WHO5' && concern === 'low-twice'
              ? 'This is the second low well-being check in a row. Please talk to a doctor or a therapist about it — an app can’t do that part, and it’s a strong thing to do.'
              : type === 'WHO5'
                ? 'This score is at or below 50, which is the point where it’s worth checking in with someone — a doctor, a counsellor, or a helpline. You don’t need to be in crisis to call.'
                : 'That’s on the low side — which is exactly what these 90 days are built for. If it feels heavy, talking to someone helps.'}
          </p>
          <ul>
            {HELPLINES.map((h) => (
              <li key={h.tel}>
                <a href={h.tel}>
                  <Phone size={13} strokeWidth={2.6} aria-hidden="true" /> {h.name} · <b>{h.display}</b>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export { CheckpointSheet }
