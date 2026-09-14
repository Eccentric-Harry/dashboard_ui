import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronsDownUp, ChevronsUpDown, ListTree, Plus, SearchX, Target } from 'lucide-react'
import type { LearningPursuit } from '@/types/learnings'
import { learningsActions, useLearningsStore } from '@/store/learnings-store'
import { useFocusStore } from '@/store/focus-store'
import { isAwaitingData } from '@/store/zustand-utils'
import { cn } from '@/lib/utils'
import { usePursuitActions } from '../../use-pursuit-actions'
import {
  collectParents,
  countLeaves,
  findNextStep,
  findPrimaryPursuit,
  hasMilestones,
  suggestedSessionMinutes,
} from '../../pursuit-tree'
import { LearnWithAiModal } from '../learn-with-ai-modal'
import { PursuitNextUp } from '../pursuit-next-up'
import { AddStepForm } from './add-step-form'
import { CurriculumComplete } from './curriculum-complete'
import { sectionDomId } from './curriculum-ids'
import { MilestoneNavigator } from './milestone-navigator'
import { MilestoneSection, StepBranch } from './milestone-section'
import { PursuitHeader } from './pursuit-header'
import { StickyActionBar } from './sticky-action-bar'
import type { CurriculumContext } from './step-row'
import { isComfortablyVisible, scrollToElement, useWorkspaceScroll } from './use-workspace-scroll'
import './pursuit-workspace.css'

/** `addingParentId` value for a new top-level step. */
const ROOT = '__root__'
/** Long enough for the last check-off to land before the completion panel takes over. */
const COMPLETION_REVEAL_MS = 900

interface PursuitWorkspaceProps {
  pursuitId: string
  onBack: () => void
  onOpenPursuit: (pursuitId: string) => void
  /** Re-sync learnings and the summary after a change that moves data between lists. */
  onRefresh: () => void
}

type Finished = { pursuit: LearningPursuit; revealed: boolean }

/** Main pursuit first, the rest in saved order — the same order as the study queue. */
const orderPursuits = (list: LearningPursuit[]) =>
  [...list].sort((a, b) => Number(Boolean(b.isPrimary)) - Number(Boolean(a.isPrimary)))

/**
 * A pursuit's whole curriculum on its own page (`/learnings?pursuit=<id>`): header and
 * Up next on top, a milestone navigator beside the plan, and a sticky bar that keeps
 * Up next's actions in reach while scrolling.
 */
export function PursuitWorkspace({ pursuitId, onBack, onOpenPursuit, onRefresh }: PursuitWorkspaceProps) {
  const pursuitsState = useLearningsStore.use.pursuits()
  const pursuits = orderPursuits(pursuitsState.data)
  const [finished, setFinished] = useState<Finished | null>(null)

  const snapshot = finished?.pursuit.id === pursuitId ? finished : null
  const pursuit = pursuits.find((p) => p.id === pursuitId) ?? snapshot?.pursuit

  // Finishing deletes the pursuit server-side, so hold on to the final state to show it.
  const handleFinished = (done: LearningPursuit) => {
    setFinished({ pursuit: done, revealed: false })
    window.setTimeout(() => {
      setFinished((f) => (f && f.pursuit.id === done.id ? { ...f, revealed: true } : f))
    }, COMPLETION_REVEAL_MS)
  }

  if (snapshot?.revealed) {
    return (
      <div className="pursuit-workspace">
        <div className="pw-state-top">
          <BackButton onBack={onBack} />
        </div>
        <CurriculumComplete
          pursuit={snapshot.pursuit}
          nextPursuit={findPrimaryPursuit(pursuits.filter((p) => p.id !== pursuitId))}
          onBack={onBack}
          onOpenPursuit={onOpenPursuit}
        />
      </div>
    )
  }

  if (!pursuit) {
    if (isAwaitingData(pursuitsState)) return <WorkspaceSkeleton onBack={onBack} />
    return <NotFound failed={pursuitsState.hasErrors} onBack={onBack} />
  }

  return (
    <WorkspaceView
      key={pursuit.id}
      pursuit={pursuit}
      pursuits={pursuits}
      onBack={onBack}
      onOpenPursuit={onOpenPursuit}
      onRefresh={onRefresh}
      onFinished={handleFinished}
    />
  )
}

interface WorkspaceViewProps {
  pursuit: LearningPursuit
  pursuits: LearningPursuit[]
  onBack: () => void
  onOpenPursuit: (pursuitId: string) => void
  onRefresh: () => void
  onFinished: (pursuit: LearningPursuit) => void
}

function WorkspaceView({ pursuit, pursuits, onBack, onOpenPursuit, onRefresh, onFinished }: WorkspaceViewProps) {
  const focusSession = useFocusStore.use.session()
  const actions = usePursuitActions({ onRefresh, onCompleted: onFinished, onDeleted: onBack })
  const [tutorStepId, setTutorStepId] = useState<string | null>(null)
  const [addingParentId, setAddingParentId] = useState<string | null>(null)
  const [spotlightId, setSpotlightId] = useState<string | null>(null)

  const { steps } = pursuit
  const next = findNextStep(steps)
  const grouped = hasMilestones(steps)
  const leafCount = countLeaves(steps)
  const primary = findPrimaryPursuit(pursuits)
  const sessionActive = focusSession?.status === 'RUNNING' || focusSession?.status === 'PAUSED'
  const focusingStepId = sessionActive && focusSession?.pursuitId === pursuit.id ? focusSession.stepId ?? null : null

  // Milestones already finished when the workspace opens start folded. Ones finished
  // while you're here stay open, so the check-off stays visible.
  const [initiallyFolded] = useState(() => new Set(collectParents(steps).filter((s) => s.isCompleted).map((s) => s.id)))
  const [openOverrides, setOpenOverrides] = useState<Record<string, boolean>>({})
  const parentIds = collectParents(steps).map((s) => s.id)
  const isOpen = (stepId: string) => openOverrides[stepId] ?? !initiallyFolded.has(stepId)
  const allOpen = parentIds.every(isOpen)

  const setOpen = (stepId: string, open: boolean) => {
    setOpenOverrides((prev) => ({ ...prev, [stepId]: open }))
    if (!open && addingParentId === stepId) setAddingParentId(null)
  }

  const setAllOpen = (open: boolean) => {
    setOpenOverrides(Object.fromEntries(parentIds.map((id) => [id, open])))
    if (!open) setAddingParentId((current) => (current === ROOT ? current : null))
  }

  const rootRef = useRef<HTMLDivElement>(null)
  const upNextRef = useRef<HTMLDivElement>(null)
  const { activeId, stuck, condensed, lockTo } = useWorkspaceScroll(rootRef, upNextRef, grouped ? steps.map((s) => s.id) : [])

  const jumpTo = (stepId: string) => {
    setOpen(stepId, true)
    lockTo(stepId)
    const section = document.getElementById(sectionDomId(stepId))
    if (section) scrollToElement(section, 'start')
  }

  // On arrival, bring the Up next step into view (only if it isn't already) and pulse it once.
  useEffect(() => {
    const stepId = next?.step.id
    if (!stepId) return
    const timer = window.setTimeout(() => {
      const row = rootRef.current?.querySelector<HTMLElement>(`[data-step-id="${CSS.escape(stepId)}"]`)
      if (!row) return
      if (!isComfortablyVisible(row)) scrollToElement(row, 'center')
      setSpotlightId(stepId)
    }, 380)
    return () => window.clearTimeout(timer)
    // Only on arrival: Up next moving on later shouldn't pull the page around.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const ctx: CurriculumContext = {
    nextStepId: next?.step.id ?? null,
    focusingStepId,
    spotlightId,
    addingParentId,
    isOpen,
    setOpen,
    setAddingParentId,
    onSpotlightEnd: () => setSpotlightId(null),
    onToggle: (stepId) => actions.toggleStep(pursuit.id, stepId),
    onEdit: (stepId, patch) => void actions.editStep(pursuit.id, stepId, patch),
    onDelete: (step) => actions.deleteStep(pursuit.id, step),
    onAdd: (text, parentId) => actions.addStep(pursuit.id, text, parentId),
    onLearn: setTutorStepId,
    onFocus: (step) => void actions.startFocus(pursuit, step.id, suggestedSessionMinutes(step)),
  }

  const milestone = next ? next.trail[0] ?? next.step : null
  const upNextMeta = next ? (
    <span className="pnu-meta">
      {grouped && milestone
        ? `Milestone ${steps.indexOf(milestone) + 1} of ${steps.length}`
        : `${leafCount.done} of ${leafCount.total} done`}
    </span>
  ) : null

  const rootAdding = addingParentId === ROOT
  const rootAddForm = (
    <AddStepForm
      placeholder={steps.length === 0 ? 'First step' : grouped ? 'New milestone' : 'New step'}
      onSubmit={(text) => actions.addStep(pursuit.id, text)}
      onClose={() => setAddingParentId(null)}
    />
  )

  let curriculum
  if (steps.length === 0) {
    curriculum = (
      <div className="learnings-card pw-empty">
        <span className="pw-state-icon">
          <ListTree size={20} />
        </span>
        <h3>Map out this pursuit</h3>
        <p>Add the big steps first, then break each one into sub-steps. Up next, focus sessions and Learn with AI all work from this plan.</p>
        {rootAdding ? (
          rootAddForm
        ) : (
          <button type="button" className="pnu-btn is-primary" onClick={() => setAddingParentId(ROOT)}>
            <Plus size={13} />
            Add first step
          </button>
        )}
      </div>
    )
  } else if (grouped) {
    curriculum = (
      <>
        {steps.map((step, i) => (
          <MilestoneSection key={step.id} step={step} index={i + 1} ctx={ctx} />
        ))}
        {rootAdding ? (
          <div className="learnings-card pw-add-card">{rootAddForm}</div>
        ) : (
          <button type="button" className="pw-add-trigger is-root" onClick={() => setAddingParentId(ROOT)}>
            <Plus size={14} />
            Add milestone
          </button>
        )}
      </>
    )
  } else {
    curriculum = (
      <div className="learnings-card pw-section is-flat">
        <div className="pw-section-steps">
          <ul className="pw-steps">
            {steps.map((step) => (
              <StepBranch key={step.id} step={step} depth={0} ctx={ctx} />
            ))}
          </ul>
          {rootAdding ? (
            rootAddForm
          ) : (
            <button type="button" className="pw-add-trigger" onClick={() => setAddingParentId(ROOT)}>
              <Plus size={13} />
              Add step
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div ref={rootRef} className="pursuit-workspace">
      <StickyActionBar
        stuck={stuck}
        condensed={condensed}
        pursuit={pursuit}
        pursuits={pursuits}
        next={next}
        sessionActive={sessionActive}
        onBack={onBack}
        onSelectPursuit={onOpenPursuit}
        onStartFocus={(minutes) => {
          if (next) void actions.startFocus(pursuit, next.step.id, minutes)
        }}
        onLearn={() => next && setTutorStepId(next.step.id)}
        onMarkDone={() => next && actions.toggleStep(pursuit.id, next.step.id)}
        onSaveResumeNote={(note) => {
          if (next) void actions.editStep(pursuit.id, next.step.id, { resumeNote: note })
        }}
      />

      <div className="pw-top">
        <PursuitHeader
          pursuit={pursuit}
          isMain={pursuit.id === primary?.id}
          showMainBadge={pursuits.length > 1}
          currentStepId={next?.step.id}
          onSetPrimary={() => void actions.setPrimary(pursuit.id)}
          onSave={(patch) => actions.updateDetails(pursuit.id, patch)}
          onDelete={() => actions.deletePursuit(pursuit.id)}
        />
        <div ref={upNextRef} className="pw-upnext">
          {next ? (
            <PursuitNextUp
              key={next.step.id}
              pursuit={pursuit}
              next={next}
              meta={upNextMeta}
              isFocusing={focusingStepId === next.step.id}
              onStartFocus={(minutes) => void actions.startFocus(pursuit, next.step.id, minutes)}
              onLearn={() => setTutorStepId(next.step.id)}
              onMarkDone={() => actions.toggleStep(pursuit.id, next.step.id)}
              onSaveResumeNote={(note) => void actions.editStep(pursuit.id, next.step.id, { resumeNote: note })}
            />
          ) : (
            <div className="pw-upnext-empty">
              <strong>
                <Target size={14} />
                {leafCount.total > 0 ? 'Every step is done' : 'Nothing up next yet'}
              </strong>
              <p>
                {leafCount.total > 0
                  ? 'Wrapping up this pursuit…'
                  : 'Add a step to the plan and it shows up here, with focus and Learn with AI one tap away.'}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className={cn('pw-body', !grouped && 'is-flat')}>
        {grouped && (
          <MilestoneNavigator steps={steps} activeId={activeId} nextStepId={next?.step.id ?? null} onJump={jumpTo} />
        )}

        <section className="pw-curriculum" aria-labelledby="pw-curriculum-title">
          <div className="pw-curriculum-head">
            <h2 id="pw-curriculum-title" className="pw-eyebrow">Curriculum</h2>
            {leafCount.total > 0 && (
              <span className="pw-curriculum-meta">
                {grouped ? `${steps.length} milestones · ` : ''}
                {leafCount.total} {leafCount.total === 1 ? 'step' : 'steps'}
              </span>
            )}
            {parentIds.length > 0 && (
              <button type="button" className="pw-text-btn" onClick={() => setAllOpen(!allOpen)}>
                {allOpen ? <ChevronsDownUp size={13} /> : <ChevronsUpDown size={13} />}
                {allOpen ? 'Collapse all' : 'Expand all'}
              </button>
            )}
          </div>
          {curriculum}
        </section>
      </div>

      {tutorStepId && <LearnWithAiModal pursuit={pursuit} stepId={tutorStepId} onClose={() => setTutorStepId(null)} />}
      {actions.dialog}
    </div>
  )
}

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button type="button" className="pw-chip-btn pw-back" onClick={onBack}>
      <ChevronLeft size={15} strokeWidth={2.4} />
      Learnings
    </button>
  )
}

function WorkspaceSkeleton({ onBack }: { onBack: () => void }) {
  return (
    <div className="pursuit-workspace" aria-busy="true">
      <div className="pw-state-top">
        <BackButton onBack={onBack} />
      </div>
      <div className="pw-top">
        <div className="learnings-card pw-header">
          <span className="skeleton-rect skeleton-shimmer" style={{ width: 96, height: 18, borderRadius: 6 }} />
          <span className="skeleton-rect skeleton-shimmer" style={{ width: '72%', height: 28 }} />
          <span className="skeleton-rect skeleton-shimmer" style={{ width: '48%', height: 14 }} />
          <span className="skeleton-rect skeleton-shimmer" style={{ width: '100%', height: 8, borderRadius: 4, marginTop: 18 }} />
        </div>
        <div className="learnings-card pw-skeleton-card">
          <span className="skeleton-rect skeleton-shimmer" style={{ width: 70, height: 12 }} />
          <span className="skeleton-rect skeleton-shimmer" style={{ width: '90%', height: 18 }} />
          <span className="skeleton-rect skeleton-shimmer" style={{ width: '60%', height: 32, borderRadius: 10, marginTop: 'auto' }} />
        </div>
      </div>
      <div className="pw-body is-flat">
        <div className="pw-curriculum">
          {[0, 1, 2].map((i) => (
            <div key={i} className="learnings-card pw-skeleton-card is-row">
              <span className="skeleton-rect skeleton-shimmer" style={{ width: 32, height: 32, borderRadius: 999 }} />
              <span className="skeleton-rect skeleton-shimmer" style={{ width: `${60 - i * 12}%`, height: 16 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function NotFound({ failed, onBack }: { failed: boolean; onBack: () => void }) {
  return (
    <div className="pursuit-workspace">
      <div className="pw-state-top">
        <BackButton onBack={onBack} />
      </div>
      <section className="learnings-card pw-state" aria-labelledby="pw-missing-title">
        <span className="pw-state-icon">
          <SearchX size={22} />
        </span>
        <h1 id="pw-missing-title" className="pw-state-title">
          {failed ? "Couldn't load your pursuits" : "This pursuit isn't in your queue"}
        </h1>
        <p className="pw-state-copy">
          {failed
            ? 'Check your connection and try again.'
            : 'It may have been finished (finished pursuits move to All Learnings) or deleted.'}
        </p>
        <div className="pw-state-actions">
          {failed && (
            <button type="button" className="pnu-btn is-primary" onClick={() => void learningsActions.loadPursuits()}>
              Try again
            </button>
          )}
          <button type="button" className={failed ? 'pnu-btn' : 'pnu-btn is-primary'} onClick={onBack}>
            <ChevronLeft size={13} />
            Back to Learnings
          </button>
        </div>
      </section>
    </div>
  )
}
