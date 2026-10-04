import { useState } from 'react'
import { Camera, Phone, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import type { ProgramAssessment, ProgramAssessmentType } from '@/types/program'
import { HELPLINES } from '@/lib/helplines'
import { getErrorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'
import { CampSheet } from '../components/camp-sheet'
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
  return (
    <CampSheet open={open} onRequestClose={onClose} origin={origin} labelledBy="lh-check-title" width={tab === 'ROSENBERG' ? 860 : 760} color="sky">
      {ctx && (
        <div className="lh-sheet" data-color="sky">
          <header className="lh-sheet-head">
            <div className="lh-sheet-title">
              <h2 id="lh-check-title">Check-ins</h2>
              <p>Slow measures, so you can see change a single week hides.</p>
            </div>
            <Seg label="Which check-in" value={tab} onChange={setTab} options={TABS} />
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

  return (
    <div className="lh-sheet-body lh-sheet-body--split">
      <div className="lh-sheet-main">
        <p className="lh-small">{dueLine(ctx, assessments, 'BODY') ?? 'Every two weeks.'} Same spot, same light, same time of day — morning, before eating, is easiest.</p>
        <div className="lh-photo-pair">
          {(['front', 'side'] as const).map((pose) => (
            <label key={pose} className={cn('lh-photo-pick', photos[pose] && 'has-photo')}>
              {photos[pose] ? <img src={photos[pose]} alt={`${pose} photo, today`} /> : <Camera size={22} strokeWidth={2.4} aria-hidden="true" />}
              <span>{pose === 'front' ? 'Front' : 'Side'}</span>
              <input type="file" accept="image/*" onChange={(e) => void pick(pose, e.target.files?.[0])} />
            </label>
          ))}
        </div>
        <div className="lh-row">
          <label className="lh-mini-field lh-mini-field--wide">
            <input type="number" inputMode="decimal" min={25} max={300} step={0.1} value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="Weight" />
            <span>kg</span>
          </label>
          <label className="lh-mini-field lh-mini-field--wide">
            <input type="number" inputMode="decimal" min={30} max={250} step={0.5} value={waist} onChange={(e) => setWaist(e.target.value)} placeholder="Waist" />
            <span>cm</span>
          </label>
        </div>
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
          <p className="lh-small">Your day-1 photos are the ones you’ll be glad you took.</p>
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

function Questionnaire({ type, ctx, assessments, api }: { type: 'ROSENBERG' | 'WHO5'; ctx: ProgramCtx; assessments: ProgramAssessment[]; api: LighthouseApi }) {
  const items = type === 'ROSENBERG' ? ROSENBERG_ITEMS : WHO5_ITEMS
  const choices = type === 'ROSENBERG' ? ROSENBERG_CHOICES : WHO5_CHOICES
  const [answers, setAnswers] = useState<(number | null)[]>(() => items.map(() => null))
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<ProgramAssessment | null>(null)
  const history = assessments.filter((a) => a.type === type)
  const complete = answers.every((a) => a != null)

  const submit = async () => {
    setSaving(true)
    const saved = await api.addAssessment({ type, date: ctx.today, answers: answers as number[] })
    setSaving(false)
    if (saved) setResult(saved)
  }

  const shown = result ?? null

  return (
    <div className="lh-sheet-body">
      {shown ? (
        <ScoreCard type={type} a={shown} history={[...history]} />
      ) : (
        <>
          <p className="lh-small">
            {dueLine(ctx, assessments, type) ?? ''}{' '}
            {type === 'ROSENBERG'
              ? 'Ten standard statements. Some are blunt by design — answer how it is, not how it should be.'
              : 'Over the last two weeks, how often…'}
          </p>
          <ol className={cn('lh-quiz', type === 'WHO5' && 'lh-quiz--six')}>
            {items.map((item, i) => (
              <li key={i}>
                <span className="lh-quiz-q">{item}</span>
                <div className="lh-quiz-a" role="radiogroup" aria-label={item}>
                  {choices.map((c, v) => (
                    <button
                      key={c}
                      type="button"
                      role="radio"
                      aria-checked={answers[i] === v}
                      className={cn('lh-quiz-opt', answers[i] === v && 'is-on')}
                      onClick={() => setAnswers((a) => a.map((x, j) => (j === i ? v : x)))}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ol>
          <button type="button" className="lh-btn lh-btn--primary lh-btn--wide" disabled={!complete || saving} onClick={() => void submit()}>
            {complete ? 'See the score' : `${answers.filter((a) => a != null).length} of ${items.length} answered`}
          </button>
        </>
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
        <span className="lh-small">{history.length ? 'A mirror, not a diagnosis.' : type === 'ROSENBERG' ? 'Days 1, 45 and 90 · a mirror, not a diagnosis.' : 'Every two weeks · a mirror, not a diagnosis.'}</span>
      </footer>
    </div>
  )
}

function ScoreCard({ type, a, history }: { type: 'ROSENBERG' | 'WHO5'; a: ProgramAssessment; history: ProgramAssessment[] }) {
  const score = a.score ?? 0
  const all = history.some((h) => h.id === a.id) ? history : [...history, a]
  const first = all[0]
  const delta = first && first.id !== a.id && first.score != null ? score - first.score : null
  const concern = type === 'WHO5' ? who5Concern(all) : score < 15 ? 'low' : 'none'
  return (
    <div className="lh-score">
      <p className="lh-score-big">
        <strong>{score}</strong>
        <span>{type === 'WHO5' ? '/ 100' : '/ 30'}</span>
      </p>
      {delta != null && (
        <p className="lh-score-delta">
          {delta === 0
            ? 'Same as day 1.'
            : delta > 0
              ? `+${delta} since day 1.`
              : `Day 1 was ${first.score}. ${type === 'WHO5' ? 'Two weeks is a short window — this measures them, not you.' : 'Scores move both ways; the direction over 90 days is what counts.'}`}
        </p>
      )}
      <p className="lh-small">
        {type === 'ROSENBERG'
          ? 'Most people score between 15 and 25. What matters here isn’t the number today — it’s how it moves by day 90.'
          : 'Higher is better. The number is about the last two weeks, nothing more.'}
      </p>
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
