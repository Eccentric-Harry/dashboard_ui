// One savings goal, full page (`/finance?goal=<id>`) — deep content you work in gets its
// own view, not a sheet.
//
// Something to buy or a trip leads with the thing itself, because a goal you can picture is
// one you keep feeding (Soman & Cheema: a visual reminder lifts the savings rate; an
// emotional "why" beat financial education 73% to 22% in the sentimental-savings study):
// - Showcase: the product's own photos (found from its page), how much is in, and when it's
//   yours — with the next set-aside one tap away.
// - Why you want it: the user's reasons in their own words, then the maker's highlights.
// - Getting closer: quarter, half, three-quarters, yours — each with its date. Early on it
//   counts what's in, later what's left (Koo & Fishbach's small-area effect).
// - Plan & numbers, folded away (goal-numbers.tsx): pace, whether it fits your month,
//   the price, and every row that moved the goal — one card, each figure once.
//
// A safety net or open saving has no picture to pull toward, so it keeps the numbers-first
// layout: hero, plan, ledger.

import { useCallback, useMemo, useState, type CSSProperties } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  ChevronLeft,
  ExternalLink,
  Lightbulb,
  PenLine,
  Pencil,
  Plus,
  Quote,
  ShoppingBag,
  Wallet,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import type { SavingsGoal, ShowcaseUpdateRequest } from '@/types/finance'
import type { LedgerEntry } from '@/lib/finance-ledger'
import { inr } from '@/lib/insights/engine'
import {
  KIND_LABEL,
  landingDate,
  nearAppleLaunch,
  shortDate,
  monthYear,
  type GoalColor,
  type GoalPlan,
  type MonthCapacity,
} from '@/lib/finance-goals'
import { cn } from '@/lib/utils'
import { findingLine, fullDate, statusLine } from '../goal-copy'
import { goalIcon } from '../goal-icons'
import { GoalChart } from './goal-chart'
import { GoalJar } from './goal-jar'
import { Money } from './money'
import { Filmstrip, PhotoLightbox, ShowcaseStage } from './goal-showcase'
import { useLivePhotos } from '../use-live-photos'
import { withPresetShowcase } from '../goal-presets'
import { isDarkThemeActive, useAppearanceStore } from '@/store/appearance-store'
import { GoalPhotosModal, GoalReasonModal } from './goal-photos-modal'
import { GoalNumbers, GoalRow } from './goal-numbers'

interface GoalWorkspaceProps {
  plan: GoalPlan | null
  color: GoalColor
  /** This goal's ledger rows (all loaded months). */
  rows: LedgerEntry[]
  capacity: MonthCapacity
  /** Room left for this goal after the goals funded before it; null = take-home unknown. */
  room: number | null
  /** Goals funded before this one each month. */
  fundedBefore: number
  owed: number
  today: string
  payday: number
  paydayKnown: boolean
  loading: boolean
  onBack: () => void
  onEdit: () => void
  onSetAside: () => void
  onTakeOut: () => void
  onBuy: () => void
  onOpenEntry: (entry: LedgerEntry) => void
  onAddIncome: () => void
  /** Saves a new pace from the simulator: a new date, or a new monthly amount. */
  onSavePace: (patch: { targetDate?: string; plannedMonthly?: number }) => void
  /** After a purchase: start the next goal and keep the habit. */
  onNewGoal: () => void
  /** Move this goal to the front of the funding order. */
  onFundFirst: () => void
  /** Fill the showcase from a link, or by the goal's name with none. Resolves the updated goal, or null on failure. */
  onFindShowcase: (url?: string) => Promise<SavingsGoal | null>
  onUpdateShowcase: (dto: ShowcaseUpdateRequest) => Promise<SavingsGoal | null>
  /** Whether "Find photos" by name can work here (guest mode can't reach the web). */
  canFindByName: boolean
}


function GoalWorkspace(props: GoalWorkspaceProps) {
  const { plan, color, loading, onBack } = props
  // Built-in photos come in a black-studio set and a white-cut-out set, one per theme.
  const themePreference = useAppearanceStore.use.themePreference()
  const activePath = useAppearanceStore.use.activePath()
  const dark = isDarkThemeActive({ themePreference, activePath })

  if (!plan) {
    return (
      <div className="fin-goal-ws">
        <div className="fin-goal-ws-bar">
          <button type="button" className="fin-goal-back" onClick={onBack}>
            <ChevronLeft size={16} strokeWidth={2.4} /> Finance
          </button>
        </div>
        <div className="finance-card fin-goal-missing">
          {loading ? (
            <span className="skeleton-rect skeleton-shimmer" style={{ width: '60%', height: 24 }} />
          ) : (
            <>
              <h2>That goal isn't here any more</h2>
              <p>It may have been archived. Your money in it is still in the ledger.</p>
              <button type="button" className="fin-soft-btn" onClick={onBack}>Back to finance</button>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('fin-goal-ws', `fin-goal--${color}`)}>
      <div className="fin-goal-ws-bar">
        <button type="button" className="fin-goal-back" onClick={onBack}>
          <ChevronLeft size={16} strokeWidth={2.4} /> Finance
        </button>
        <span className="fin-goal-ws-spacer" aria-hidden="true" />
        <button type="button" className="fin-icon-btn" onClick={props.onEdit} aria-label="Edit goal" title="Edit goal">
          <Pencil size={13} strokeWidth={2.4} />
        </button>
      </div>

      {plan.goal.kind === 'PURCHASE' || plan.goal.kind === 'TRIP' ? (
        <ShowcaseLayout {...props} {...withPreset(plan, dark)} />
      ) : (
        <div className="finance-dashboard-grid fin-bento fin-goal-ws-grid">
          <GoalHero {...props} plan={plan} />
          <PlanCard {...props} plan={plan} />
          <HistoryCard {...props} plan={plan} />
        </div>
      )}
    </div>
  )
}

// ── Showcase layout (a purchase or a trip) ───────────────────────────────────

/** The plan with any built-in photos filled in, and whether they're the built-in set. */
function withPreset(plan: GoalPlan, dark: boolean): { plan: GoalPlan; builtInPhotos: boolean } {
  const goal = withPresetShowcase(plan.goal, dark)
  return goal === plan.goal ? { plan, builtInPhotos: false } : { plan: { ...plan, goal }, builtInPhotos: true }
}

const NUMBERS_KEY = 'fin-goal-numbers-open'
const readOpen = (): boolean => {
  try {
    return localStorage.getItem(NUMBERS_KEY) === '1'
  } catch {
    return false
  }
}

function ShowcaseLayout(props: GoalWorkspaceProps & { plan: GoalPlan; builtInPhotos: boolean }) {
  const { plan, color, onFindShowcase, onUpdateShowcase, canFindByName, builtInPhotos } = props
  const { goal } = plan
  const showcase = goal.showcase
  const { live, markBroken } = useLivePhotos(showcase?.photos ?? [])
  const [index, setIndex] = useState(0)
  const [viewing, setViewing] = useState(false)
  const [photosOpen, setPhotosOpen] = useState(false)
  const [reasonOpen, setReasonOpen] = useState(false)
  const [finding, setFinding] = useState(false)
  const [numbersOpen, setNumbersOpen] = useState(readOpen)
  const shown = Math.min(index, Math.max(0, live.length - 1))

  const find = useCallback(
    async (url?: string): Promise<boolean> => {
      setFinding(true)
      const updated = await onFindShowcase(url)
      setFinding(false)
      if (!updated) return false
      setIndex(0)
      const n = updated.showcase?.photos.length ?? 0
      toast.success(
        url && updated.showcase?.sourceUrl !== url && n > 0 && !updated.showcase?.sourceName
          ? 'Photo added'
          : `${n} photo${n === 1 ? '' : 's'}${updated.showcase?.sourceName ? ` from ${updated.showcase.sourceName}` : ''}`,
      )
      return true
    },
    [onFindShowcase],
  )

  const toggleNumbers = () => {
    setNumbersOpen((open) => {
      try {
        localStorage.setItem(NUMBERS_KEY, open ? '0' : '1')
      } catch {
        // Private mode: the panel just won't remember.
      }
      return !open
    })
  }

  const saveReasons = async (reasons: string[]) => Boolean(await onUpdateShowcase({ reasons }))

  return (
    <>
      <div className="finance-dashboard-grid fin-bento fin-goal-ws-grid is-showcase">
        <section className="finance-card fin-goal-show" style={{ '--i': 0 } as CSSProperties} aria-label={goal.name}>
          <div className="fin-goal-show-media">
            <ShowcaseStage
              goal={goal}
              photos={live}
              index={shown}
              onIndex={setIndex}
              onBroken={markBroken}
              onOpen={() => setViewing(true)}
              onEdit={() => setPhotosOpen(true)}
              onFind={canFindByName ? () => void find() : null}
              onPasteLink={() => setPhotosOpen(true)}
              finding={finding}
              paused={viewing || photosOpen || reasonOpen}
            />
            <Filmstrip photos={live} index={shown} onIndex={setIndex} />
          </div>
          <ShowcaseInfo {...props} plan={plan} />
        </section>

        <WhyCard
          plan={plan}
          onAdd={() => setReasonOpen(true)}
          onRemoveReason={(r) => void saveReasons((showcase?.reasons ?? []).filter((x) => x !== r))}
          // Built-in highlights live in the app, not on the server — nothing to remove there.
          onRemoveHighlight={
            builtInPhotos ? null : (h) => void onUpdateShowcase({ highlights: (showcase?.highlights ?? []).filter((x) => x !== h) })
          }
        />
        <JourneyCard
          {...props}
          plan={plan}
          onSeeAll={() => {
            if (!numbersOpen) toggleNumbers()
            window.setTimeout(() => document.getElementById('fin-goal-numbers')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
          }}
        />

        <GoalNumbers {...props} plan={plan} open={numbersOpen} onToggle={toggleNumbers} />
      </div>

      {viewing && live.length > 0 && (
        <PhotoLightbox goal={goal} photos={live} index={shown} onIndex={setIndex} onClose={() => setViewing(false)} />
      )}
      <GoalPhotosModal
        isOpen={photosOpen}
        goal={goal}
        color={color}
        builtIn={builtInPhotos}
        finding={finding}
        onFindByName={canFindByName ? () => void find().then((ok) => ok && setPhotosOpen(false)) : null}
        onFetch={async (url) => {
          const ok = await find(url)
          if (ok) setPhotosOpen(false)
          return ok
        }}
        onSave={async (photos) => {
          const updated = await onUpdateShowcase({ photos })
          if (updated) setIndex(0)
          return Boolean(updated)
        }}
        onClose={() => setPhotosOpen(false)}
      />
      <GoalReasonModal
        isOpen={reasonOpen}
        goal={goal}
        color={color}
        onSave={(reason) => saveReasons([...(showcase?.reasons ?? []), reason])}
        onClose={() => setReasonOpen(false)}
      />
    </>
  )
}

/** The right-hand side of the showcase: name, what's in, when it's yours, the next move. */
function ShowcaseInfo({ plan, payday, paydayKnown, onSetAside, onTakeOut, onBuy }: GoalWorkspaceProps & { plan: GoalPlan }) {
  const { goal } = plan
  const showcase = goal.showcase
  const status = statusLine(plan)
  const pct = plan.progress != null ? Math.round(plan.progress * 100) : null
  const saving = plan.state !== 'bought' && plan.state !== 'paused'
  const tagline = showcase?.highlights[0] ?? null

  let when: { lead: string; date: string } | null = null
  if (plan.state === 'bought') when = goal.boughtOn ? { lead: 'Yours since', date: fullDate(goal.boughtOn) } : null
  else if (plan.state === 'ready') when = { lead: 'Ready —', date: 'go get it' }
  else if (plan.state === 'behind' && plan.projectedDate) when = { lead: 'At this pace, yours by', date: fullDate(plan.projectedDate) }
  else if (goal.targetDate) when = { lead: 'Yours by', date: fullDate(goal.targetDate) }
  else if (plan.projectedDate) when = { lead: 'Yours around', date: monthYear(plan.projectedDate) }

  const meta: string[] = []
  if (saving && plan.state !== 'ready') {
    if (plan.monthlyNeed) meta.push(`${inr(plan.monthlyNeed)} ${goal.targetDate ? 'each payday' : 'a month'}`)
    if (plan.paydaysLeft != null && plan.paydaysLeft > 0) meta.push(`${plan.paydaysLeft} payday${plan.paydaysLeft === 1 ? '' : 's'} to go`)
    if (!paydayKnown) meta.push(`payday assumed the ${payday === 1 ? '1st' : payday}`)
  }

  return (
    <div className="fin-goal-show-info">
      <header className="fin-goal-show-top">
        <span className="finance-eyebrow">
          {KIND_LABEL[goal.kind]}
          {goal.keptAt && ` · kept at ${goal.keptAt}`}
        </span>
        <span className={cn('fin-goal-chip', `is-${status.tone}`)}>
          {plan.state === 'on-track' && plan.dueThisCycle >= 1 ? 'On track' : status.text.split(' · ')[0]}
        </span>
      </header>
      <h1 className="fin-goal-show-name">{goal.name}</h1>
      {tagline && <p className="fin-goal-show-tagline">{tagline}</p>}

      <div className="fin-goal-show-figure">
        <span className="fin-hero-label">{plan.state === 'bought' ? 'Paid' : 'Set aside'}</span>
        <div>
          <strong>
            <Money value={plan.state === 'bought' ? goal.boughtFor ?? plan.saved : plan.saved} />
          </strong>
          {plan.target != null && plan.state !== 'bought' && (
            <span className="fin-goal-of">
              of {inr(plan.target)}
              {pct != null && <b>{pct}%</b>}
            </span>
          )}
        </div>
        {plan.target != null && plan.state !== 'bought' && <MilestoneMeter plan={plan} />}
      </div>

      {when && (
        <p className="fin-goal-show-when">
          {when.lead} <b>{when.date}</b>
        </p>
      )}
      {meta.length > 0 && (
        <p className="fin-hero-meta fin-goal-show-meta">
          {meta.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </p>
      )}

      <div className="fin-goal-hero-actions fin-goal-show-actions">
        {plan.state === 'ready' && (
          <button type="button" className="fin-goal-primary" onClick={onBuy}>
            <ShoppingBag size={14} strokeWidth={2.4} /> Record the purchase
          </button>
        )}
        {saving && plan.state !== 'ready' && (
          <button type="button" className="fin-goal-primary" onClick={onSetAside}>
            <ArrowUpRight size={14} strokeWidth={2.4} />
            {plan.dueThisCycle >= 1 ? `Set aside ${inr(plan.dueThisCycle)}` : 'Set aside'}
          </button>
        )}
        {saving && plan.state !== 'ready' && (
          <button type="button" className="fin-soft-btn" onClick={onBuy}>
            <ShoppingBag size={13} strokeWidth={2.4} /> Bought it
          </button>
        )}
        {saving && plan.saved > 0 && (
          <button type="button" className="fin-soft-btn is-quiet" onClick={onTakeOut}>
            <ArrowDownLeft size={13} strokeWidth={2.4} /> Take out
          </button>
        )}
      </div>
    </div>
  )
}

const MILESTONES = [
  { at: 0.25, label: 'A quarter' },
  { at: 0.5, label: 'Halfway' },
  { at: 0.75, label: 'Three-quarters' },
  { at: 1, label: 'Yours' },
] as const

/** The progress capsule with a notch at each quarter, the plan's tick, and the fill. */
function MilestoneMeter({ plan }: { plan: GoalPlan }) {
  const fill = Math.min(100, (plan.progress ?? 0) * 100)
  const pacePct = plan.expectedByNow != null && plan.target ? Math.min(100, (plan.expectedByNow / plan.target) * 100) : null
  return (
    <span className="fin-meter fin-goal-meter fin-goal-show-meter" role="img" aria-label={`${Math.round(fill)}% saved`}>
      <span className="fin-meter-track">
        <i className="fin-meter-fill" style={{ width: `${fill}%` }} />
        {MILESTONES.slice(0, 3).map((m) => (
          <span key={m.at} className={cn('fin-goal-notch', fill >= m.at * 100 && 'is-passed')} style={{ left: `${m.at * 100}%` }} />
        ))}
        {pacePct != null && pacePct > 0 && pacePct < 100 && <span className="fin-meter-pace" style={{ left: `${pacePct}%` }} title="Where the plan expects you" />}
      </span>
    </span>
  )
}

// ── Why you want it ──────────────────────────────────────────────────────────

function WhyCard({
  plan,
  onAdd,
  onRemoveReason,
  onRemoveHighlight,
}: {
  plan: GoalPlan
  onAdd: () => void
  onRemoveReason: (reason: string) => void
  onRemoveHighlight: ((highlight: string) => void) | null
}) {
  const showcase = plan.goal.showcase
  const reasons = showcase?.reasons ?? []
  // The first highlight already sits under the name as its tagline.
  const highlights = (showcase?.highlights ?? []).slice(1)
  return (
    <section className="finance-card fin-goal-why" style={{ '--i': 1 } as CSSProperties} aria-label="Why you want it">
      <div className="finance-section-head compact">
        <div>
          <span className="finance-eyebrow">Why</span>
          <h2>Why you want it</h2>
        </div>
        {reasons.length > 0 && reasons.length < 6 && (
          <button type="button" className="fin-icon-btn" onClick={onAdd} aria-label="Add a reason" title="Add a reason">
            <Plus size={14} strokeWidth={2.4} />
          </button>
        )}
      </div>

      {reasons.length > 0 ? (
        <ul className="fin-goal-reasons">
          {reasons.map((r) => (
            <li key={r}>
              <Quote size={14} strokeWidth={2.2} aria-hidden="true" />
              <span>{r}</span>
              <button type="button" className="fin-goal-x" onClick={() => onRemoveReason(r)} aria-label={`Remove “${r}”`}>
                <X size={12} strokeWidth={2.4} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <button type="button" className="fin-goal-reason-empty" onClick={onAdd}>
          <PenLine size={16} strokeWidth={2.2} aria-hidden="true" />
          <span>
            <b>Add your reason</b>
            <small>In your own words — the line you'll read when the money's tempted elsewhere.</small>
          </span>
        </button>
      )}

      {highlights.length > 0 && (
        <div className="fin-goal-highlights">
          <span className="fin-goal-highlights-label">
            From{' '}
            {showcase?.sourceUrl ? (
              <a href={showcase.sourceUrl} target="_blank" rel="noopener noreferrer">
                {showcase.sourceName} <ExternalLink size={10} strokeWidth={2.4} />
              </a>
            ) : (
              showcase?.sourceName ?? 'the page'
            )}
          </span>
          <ul>
            {highlights.map((h) => (
              <li key={h}>
                <Check size={12} strokeWidth={2.8} aria-hidden="true" />
                <span>{h}</span>
                {onRemoveHighlight && (
                  <button type="button" className="fin-goal-x" onClick={() => onRemoveHighlight(h)} aria-label={`Hide “${h}”`}>
                    <X size={11} strokeWidth={2.4} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

// ── Getting closer ───────────────────────────────────────────────────────────

function JourneyCard({ plan, rows, today, payday, onOpenEntry, onSeeAll }: GoalWorkspaceProps & { plan: GoalPlan; onSeeAll: () => void }) {
  const { goal } = plan
  const target = plan.target
  const perMonth = plan.monthlyNeed ?? plan.pace ?? goal.plannedMonthly ?? null

  const stops = useMemo(() => {
    if (target == null) return []
    // When each quarter was crossed: walk the goal's rows in date order.
    const ordered = [...rows].sort((a, b) => a.day.localeCompare(b.day) || a.at - b.at)
    return MILESTONES.map((m) => {
      const amount = Math.round(target * m.at)
      let running = 0
      let reachedOn: string | null = null
      for (const r of ordered) {
        if (r.kind === 'transfer-out') running += r.amount
        else if (r.kind === 'transfer-in') running -= r.amount
        if (running >= amount) {
          reachedOn = r.day
          break
        }
      }
      const reached = plan.saved >= amount || plan.state === 'bought'
      const eta =
        reached || !perMonth
          ? null
          : m.at === 1 && goal.targetDate && plan.state !== 'behind'
            ? goal.targetDate
            : landingDate(amount - plan.saved, perMonth, today, payday, plan.thisCycle >= perMonth)
      return { ...m, amount, reached, date: reached ? reachedOn : eta }
    })
  }, [target, rows, plan.saved, plan.state, plan.thisCycle, perMonth, goal.targetDate, today, payday])

  const next = stops.find((s) => !s.reached)
  const progress = plan.progress ?? 0
  // Small-area framing: early on, count what's in; past halfway, count what's left.
  let line: string
  if (plan.state === 'bought') line = goal.boughtOn ? `Bought ${shortDate(goal.boughtOn)}` : 'Bought'
  else if (!next) line = 'All of it saved'
  else if (plan.saved <= 0) line = 'The first set-aside starts it'
  else if (progress < 0.5) line = `${inr(plan.saved)} in — ${goal.contributions} set-aside${goal.contributions === 1 ? '' : 's'} so far`
  else line = `Just ${inr(plan.remaining ?? 0)} to go`

  const recent = [...rows].sort((a, b) => b.day.localeCompare(a.day) || b.at - a.at).slice(0, 3)

  return (
    <section className="finance-card fin-goal-journey" style={{ '--i': 2 } as CSSProperties} aria-label="Getting closer">
      <div className="finance-section-head compact">
        <div>
          <span className="finance-eyebrow">Getting closer</span>
          <h2>{line}</h2>
          {next && plan.state !== 'bought' && (
            <p>
              Next: {next.label.toLowerCase()} at {inr(next.amount)}
              {next.date && ` · around ${monthYear(next.date)}`}
            </p>
          )}
        </div>
      </div>

      {stops.length > 0 && (
        <ol className="fin-goal-stops">
          {stops.map((s) => (
            <li key={s.at} className={cn(s.reached && 'is-reached', s === next && 'is-next')}>
              <i aria-hidden="true">{s.reached ? <Check size={11} strokeWidth={3} /> : null}</i>
              <b>{s.label}</b>
              <span>{inr(s.amount)}</span>
              <small>{s.date ? (s.reached ? shortDate(s.date) : monthYear(s.date)) : s.reached ? 'done' : '—'}</small>
            </li>
          ))}
        </ol>
      )}

      <div className="fin-goal-recent">
        <span className="fin-goal-recent-label">Recent</span>
        {recent.length === 0 ? (
          <p className="fin-goal-empty">Nothing set aside yet.</p>
        ) : (
          <ul className="fin-goal-rows is-compact">
            {recent.map((r) => (
              <GoalRow key={r.id || `${r.day}-${r.amount}`} r={r} onOpenEntry={onOpenEntry} />
            ))}
          </ul>
        )}
        {rows.length > 3 && (
          <button type="button" className="fin-text-btn" onClick={onSeeAll}>
            All {rows.length} in Plan & numbers
          </button>
        )}
      </div>
    </section>
  )
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function GoalHero({ plan, rows, today, payday, paydayKnown, onSetAside, onTakeOut, onBuy }: GoalWorkspaceProps & { plan: GoalPlan }) {
  const { goal } = plan
  const finding = findingLine(plan)
  const status = statusLine(plan)
  const tone = plan.state === 'behind' ? 'watch' : plan.state === 'paused' || plan.state === 'open' ? 'neutral' : 'good'
  const pct = plan.progress != null ? Math.round(plan.progress * 100) : null
  const pacePct = plan.expectedByNow != null && plan.target ? Math.min(100, (plan.expectedByNow / plan.target) * 100) : null
  const saving = plan.state !== 'bought' && plan.state !== 'paused'

  const meta: string[] = []
  if (plan.state === 'bought') {
    if (goal.boughtOn) meta.push(`Bought ${fullDate(goal.boughtOn)}`)
  } else {
    if (plan.monthlyNeed && plan.state !== 'ready') meta.push(`${inr(plan.monthlyNeed)} ${goal.targetDate ? 'each payday' : 'a month'}`)
    if (plan.paydaysLeft != null && plan.paydaysLeft > 0 && plan.state !== 'ready') {
      meta.push(`${plan.paydaysLeft} payday${plan.paydaysLeft === 1 ? '' : 's'} left`)
    }
    if (plan.projectedDate && plan.state !== 'ready') {
      meta.push(`${plan.paceSource === 'history' ? 'at your pace' : 'on this plan'}: ${monthYear(plan.projectedDate)}`)
    }
    if (!paydayKnown && saving) meta.push(`payday assumed the ${payday === 1 ? '1st' : payday}`)
  }

  return (
    <section className={cn('finance-card fin-goal-hero', `is-${tone}`)} style={{ '--i': 0 } as CSSProperties} aria-label={goal.name}>
      <header className="fin-goal-hero-top">
        <GoalJar icon={goalIcon(goal)} progress={plan.progress} size={44} stroke={4} />
        <div>
          <span className="finance-eyebrow">
            {KIND_LABEL[goal.kind]}
            {goal.keptAt && ` · kept at ${goal.keptAt}`}
          </span>
          <h1 className="fin-goal-hero-name">{goal.name}</h1>
        </div>
        <span className={cn('fin-goal-chip', `is-${status.tone}`)}>{plan.state === 'on-track' && plan.dueThisCycle >= 1 ? 'On track' : status.text.split(' · ')[0]}</span>
      </header>

      <h2 className="fin-hero-title fin-goal-finding">
        {finding.amount != null && <span className={cn('fin-hero-amount', `is-${tone}`)}>{inr(finding.amount)} </span>}
        {finding.text}
      </h2>

      <div className="fin-hero-figure">
        <div>
          <span className="fin-hero-label">{plan.state === 'bought' ? 'Paid' : 'Set aside'}</span>
          <strong>
            <Money value={plan.state === 'bought' ? goal.boughtFor ?? plan.saved : plan.saved} />
          </strong>
        </div>
        {plan.target != null && plan.state !== 'bought' && (
          <span className="fin-goal-of">
            of {inr(plan.target)}
            {pct != null && <b>{pct}%</b>}
          </span>
        )}
      </div>

      {plan.target != null && plan.state !== 'bought' && (
        <span className="fin-meter fin-goal-meter" role="img" aria-label={`${pct}% saved`}>
          <span className="fin-meter-track">
            <i className="fin-meter-fill" style={{ width: `${Math.min(100, (plan.progress ?? 0) * 100)}%` }} />
            {pacePct != null && pacePct > 0 && pacePct < 100 && <span className="fin-meter-pace" style={{ left: `${pacePct}%` }} title="Where the plan expects you" />}
          </span>
        </span>
      )}
      {meta.length > 0 && (
        <p className="fin-hero-meta">
          {meta.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </p>
      )}

      <div className="fin-goal-hero-actions">
        {plan.state === 'ready' && (
          <button type="button" className="fin-goal-primary" onClick={onBuy}>
            <ShoppingBag size={14} strokeWidth={2.4} /> Record the purchase
          </button>
        )}
        {saving && plan.state !== 'ready' && (
          <button type="button" className="fin-goal-primary" onClick={onSetAside}>
            <ArrowUpRight size={14} strokeWidth={2.4} />
            {plan.dueThisCycle >= 1 ? `Set aside ${inr(plan.dueThisCycle)}` : 'Set aside'}
          </button>
        )}
        {saving && plan.saved > 0 && (
          <button type="button" className="fin-soft-btn" onClick={onTakeOut}>
            <ArrowDownLeft size={13} strokeWidth={2.4} /> Take out
          </button>
        )}
        {saving && plan.state !== 'ready' && goal.kind !== 'SAFETY_NET' && (
          <button type="button" className="fin-soft-btn" onClick={onBuy}>
            <ShoppingBag size={13} strokeWidth={2.4} /> Bought it
          </button>
        )}
      </div>

      <div className="fin-goal-hero-chart">
        <GoalChart plan={plan} rows={rows} today={today} />
      </div>
    </section>
  )
}

// ── Plan: simulator + waterfall ──────────────────────────────────────────────

function PlanCard({
  plan,
  capacity,
  room,
  fundedBefore,
  owed,
  today,
  payday,
  onAddIncome,
  onSavePace,
  onNewGoal,
  onFundFirst,
}: GoalWorkspaceProps & { plan: GoalPlan }) {
  const { goal } = plan
  const remaining = plan.remaining ?? 0
  const base = Math.round(plan.monthlyNeed ?? goal.plannedMonthly ?? plan.pace ?? (remaining > 0 ? remaining / 6 : 5000))
  const max = Math.max(1000, Math.ceil(Math.max(remaining, base * 2) / 1000) * 1000)
  const step = max > 50000 ? 500 : 100
  const [monthly, setMonthly] = useState<number | null>(null)
  // Round the starting point *up*, so it never reads as landing later than the plan does.
  const value = monthly ?? Math.min(max, Math.max(step, Math.ceil(base / step) * step))
  const done = plan.state === 'bought' || plan.state === 'ready' || plan.target == null

  const landing = useMemo(
    () => (remaining > 0 ? landingDate(remaining, value, today, payday, plan.thisCycle >= value) : today),
    [remaining, value, today, payday, plan.thisCycle],
  )
  const need = plan.monthlyNeed ?? goal.plannedMonthly ?? 0
  const fits = room != null && need > 0 ? need <= room : null
  const atRoom = room != null && room > 0 && remaining > 0 ? landingDate(remaining, room, today, payday, false) : null
  const changed = monthly != null && Math.abs(value - base) >= step

  const levers: string[] = []
  if ((fits === false || plan.state === 'behind') && atRoom) levers.push(`At the ${inr(room ?? 0)} a month you can spare, it lands ${monthYear(atRoom)}.`)
  if (owed > 0 && plan.state !== 'bought') levers.push(`${inr(owed)} is owed to you — earmark it for ${goal.name} when it comes back.`)
  if (goal.kind === 'PURCHASE' && !goal.exchangeValue && !goal.cardOffer && plan.state !== 'bought') {
    levers.push('An old-phone exchange or a card offer brings the target down — add them to the price.')
  }
  if (nearAppleLaunch(goal, plan.projectedDate)) levers.push('That lands near Apple’s September launch — the current model usually gets cheaper right after.')

  return (
    <section className="finance-card fin-goal-plan" style={{ '--i': 1 } as CSSProperties} aria-label="Plan">
      <div className="finance-section-head compact">
        <div>
          <span className="finance-eyebrow">Plan</span>
          <h2>{done ? 'Your month' : 'Can I afford this pace?'}</h2>
        </div>
      </div>

      {!done && (
        <div className="fin-goal-sim">
          <div className="fin-goal-sim-read">
            <span>Set aside</span>
            <strong>{inr(value)}</strong>
            <em>a month → lands {landing ? <b>{fullDate(landing)}</b> : 'never at this pace'}</em>
          </div>
          <input
            type="range"
            min={step}
            max={max}
            step={step}
            value={value}
            onChange={(e) => setMonthly(Number(e.target.value))}
            aria-label="Amount to set aside each month"
          />
          <div className="fin-goal-sim-foot">
            <small>
              {goal.targetDate ? `Your date: ${fullDate(goal.targetDate)} · needs ${inr(need)}/mo` : `Your plan: ${inr(need)}/mo`}
            </small>
            {changed && landing && (
              <button
                type="button"
                className="fin-soft-btn is-small"
                onClick={() => {
                  onSavePace(goal.targetDate ? { targetDate: landing } : { plannedMonthly: value })
                  setMonthly(null)
                }}
              >
                Make this the plan
              </button>
            )}
          </div>
        </div>
      )}

      {capacity.takeHome == null ? (
        <button type="button" className="fin-goal-income-cta" onClick={onAddIncome}>
          <Wallet size={16} strokeWidth={2.2} />
          <span>
            <b>Add your take-home</b>
            <small>Then this shows whether {inr(need || value)} a month fits after rent, bills, spending and money sent home.</small>
          </span>
        </button>
      ) : (
        <div className="fin-goal-waterfall">
          <dl>
            <div>
              <dt>
                Take-home
                <button type="button" className="fin-text-btn" onClick={onAddIncome}>
                  {capacity.takeHomeSource === 'logged' ? 'from your income · set' : 'edit'}
                </button>
              </dt>
              <dd>{inr(capacity.takeHome)}</dd>
            </div>
            <div>
              <dt>Spending in a typical month</dt>
              <dd>−{inr(capacity.spending)}</dd>
            </div>
            {capacity.sentHome > 0 && (
              <div>
                <dt>Sent home & lent</dt>
                <dd>−{inr(capacity.sentHome)}</dd>
              </div>
            )}
            {fundedBefore > 0 && (
              <div>
                <dt>
                  Goals funded first
                  <button type="button" className="fin-text-btn" onClick={onFundFirst}>
                    fund this first
                  </button>
                </dt>
                <dd>−{inr(fundedBefore)}</dd>
              </div>
            )}
            <div className="is-total">
              <dt>Room for {goal.name}</dt>
              <dd className={cn((room ?? 0) < 0 && 'is-short')}>{inr(room ?? 0)}</dd>
            </div>
          </dl>
          {!done && need > 0 && (
            <p className={cn('fin-goal-verdict', fits ? 'is-good' : 'is-watch')}>
              {fits
                ? `Fits — ${inr(need)} a month leaves ${inr((room ?? 0) - need)} free.`
                : (room ?? 0) <= 0
                  ? `Your typical month has no room left — something has to give, or the date moves.`
                  : `${inr(need - (room ?? 0))} a month more than you can spare.`}
            </p>
          )}
          {capacity.monthsOfHistory < 2 && (
            <small className="fin-form-hint">Based on {capacity.monthsOfHistory === 0 ? 'your budget' : 'one month'} so far — it sharpens as months fill in.</small>
          )}
        </div>
      )}

      {levers.length > 0 && (
        <ul className="fin-goal-levers">
          {levers.map((l) => (
            <li key={l}>
              <Lightbulb size={13} strokeWidth={2.2} aria-hidden="true" />
              <span>{l}</span>
            </li>
          ))}
        </ul>
      )}
      {done && plan.state === 'ready' && (
        <p className="fin-goal-verdict is-good">You've saved all of it. Record the purchase when you buy — it won't touch your budget.</p>
      )}
      {plan.state === 'bought' && (
        <div className="fin-goal-next">
          <p>
            {goal.contributions > 0
              ? `You kept a ${inr(goal.setAside / goal.contributions)}-a-set-aside habit going. Keep it — point it at the next thing.`
              : 'Saved and bought. Keep the habit — point it at the next thing.'}
          </p>
          <button type="button" className="fin-soft-btn" onClick={onNewGoal}>
            Start the next goal
          </button>
        </div>
      )}
    </section>
  )
}

// ── Money in this goal ───────────────────────────────────────────────────────

function HistoryCard({ plan, rows, onOpenEntry }: GoalWorkspaceProps & { plan: GoalPlan }) {
  const sorted = [...rows].sort((a, b) => b.day.localeCompare(a.day) || b.at - a.at)
  return (
    <section className="finance-card fin-goal-history is-wide" style={{ '--i': 2 } as CSSProperties} aria-label="Money in this goal">
      <div className="finance-section-head compact">
        <div>
          <span className="finance-eyebrow">Ledger</span>
          <h2>Money in this goal</h2>
          <p>
            {plan.goal.contributions} set-aside{plan.goal.contributions === 1 ? '' : 's'}
            {plan.goal.takenOut > 0 && ` · ${inr(plan.goal.takenOut)} taken out`}
            {plan.goal.firstContributionDate && ` · since ${shortDate(plan.goal.firstContributionDate)}`}
          </p>
        </div>
      </div>
      {sorted.length === 0 ? (
        <p className="fin-goal-empty">Nothing set aside yet. The first set-aside starts the line above.</p>
      ) : (
        <ul className="fin-goal-rows">
          {sorted.map((r) => (
            <GoalRow key={r.id || `${r.day}-${r.amount}`} r={r} onOpenEntry={onOpenEntry} />
          ))}
        </ul>
      )}
    </section>
  )
}

export { GoalWorkspace }
