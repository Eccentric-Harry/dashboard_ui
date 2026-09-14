// Pure helpers over a pursuit's step tree. Mirrors LearningPursuitService's rules so
// optimistic updates (and guest mode) land on the same state the backend returns:
// only leaves are ticked directly, a parent's completion is derived from its
// children, and ticking a parent sets its whole subtree.
import type { LearningPursuit, PursuitStep, PursuitStepInput } from '@/types/learnings'

/** Levels of nesting, counting top-level steps as level 1 (LearningPursuitService.MAX_DEPTH). */
export const MAX_STEP_DEPTH = 3
/** LearningPursuitService.MAX_TOTAL_STEPS */
export const MAX_TOTAL_STEPS = 150

export const childrenOf = (step: PursuitStep): PursuitStep[] => step.children ?? []

export function countLeaves(steps: PursuitStep[]): { done: number; total: number } {
  let done = 0
  let total = 0
  for (const step of steps) {
    const children = childrenOf(step)
    if (children.length > 0) {
      const nested = countLeaves(children)
      done += nested.done
      total += nested.total
    } else {
      total += 1
      if (step.isCompleted) done += 1
    }
  }
  return { done, total }
}

export function countSteps(steps: PursuitStep[]): number {
  return steps.reduce((sum, step) => sum + 1 + countSteps(childrenOf(step)), 0)
}

function deriveCompletion(steps: PursuitStep[]): PursuitStep[] {
  return steps.map((step) => {
    const children = childrenOf(step)
    if (children.length === 0) return step
    const derived = deriveCompletion(children)
    return { ...step, children: derived, isCompleted: derived.every((c) => c.isCompleted) }
  })
}

function setCompletedDeep(step: PursuitStep, isCompleted: boolean): PursuitStep {
  const children = childrenOf(step)
  return {
    ...step,
    isCompleted,
    ...(children.length > 0 ? { children: children.map((c) => setCompletedDeep(c, isCompleted)) } : {}),
  }
}

function mapStep(steps: PursuitStep[], stepId: string, fn: (step: PursuitStep) => PursuitStep): PursuitStep[] {
  return steps.map((step) => {
    if (step.id === stepId) return fn(step)
    const children = childrenOf(step)
    return children.length > 0 ? { ...step, children: mapStep(children, stepId, fn) } : step
  })
}

function removeStep(steps: PursuitStep[], stepId: string): PursuitStep[] {
  return steps
    .filter((step) => step.id !== stepId)
    .map((step) => {
      const children = childrenOf(step)
      return children.length > 0 ? { ...step, children: removeStep(children, stepId) } : step
    })
}

/** Returns the pursuit with status re-derived from its (already derived) steps. */
function withStatus(pursuit: LearningPursuit, steps: PursuitStep[]): LearningPursuit {
  const allDone = steps.length > 0 && steps.every((s) => s.isCompleted)
  return { ...pursuit, steps, status: allDone ? 'COMPLETED' : 'ACTIVE' }
}

export function toggleStepInPursuit(pursuit: LearningPursuit, stepId: string): LearningPursuit {
  const steps = mapStep(pursuit.steps, stepId, (step) => setCompletedDeep(step, !step.isCompleted))
  return withStatus(pursuit, deriveCompletion(steps))
}

export function deleteStepInPursuit(pursuit: LearningPursuit, stepId: string): LearningPursuit {
  return withStatus(pursuit, deriveCompletion(removeStep(pursuit.steps, stepId)))
}

export function patchStepInPursuit(pursuit: LearningPursuit, stepId: string, patch: Partial<PursuitStep>): LearningPursuit {
  return { ...pursuit, steps: mapStep(pursuit.steps, stepId, (step) => ({ ...step, ...patch })) }
}

export function renameStepInPursuit(pursuit: LearningPursuit, stepId: string, text: string): LearningPursuit {
  return { ...pursuit, steps: mapStep(pursuit.steps, stepId, (step) => ({ ...step, text })) }
}

export function addStepInPursuit(pursuit: LearningPursuit, step: PursuitStep, parentId?: string): LearningPursuit {
  const steps = parentId
    ? mapStep(pursuit.steps, parentId, (parent) => ({ ...parent, children: [...childrenOf(parent), step] }))
    : [...pursuit.steps, step]
  return withStatus(pursuit, deriveCompletion(steps))
}

/** Materialises create-request inputs into stored steps (guest mode). */
export function stepsFromInputs(inputs: PursuitStepInput[], makeId: () => string): PursuitStep[] {
  return inputs
    .filter((input) => input.text?.trim())
    .map((input) => ({
      id: makeId(),
      text: input.text.trim(),
      ...(input.note ? { note: input.note } : {}),
      ...(input.estimateMinutes ? { estimateMinutes: input.estimateMinutes } : {}),
      spentMinutes: 0,
      isCompleted: false,
      children: stepsFromInputs(input.children ?? [], makeId),
    }))
}

export interface NextStep {
  step: PursuitStep
  /** Ancestors, outermost first. */
  trail: PursuitStep[]
}

/** The first unfinished leaf in plan order — "where you pick up". */
export function findNextStep(steps: PursuitStep[], trail: PursuitStep[] = []): NextStep | null {
  for (const step of steps) {
    const children = childrenOf(step)
    if (children.length > 0) {
      const nested = findNextStep(children, [...trail, step])
      if (nested) return nested
    } else if (!step.isCompleted) {
      return { step, trail }
    }
  }
  return null
}

export function findStepById(steps: PursuitStep[], stepId: string): PursuitStep | null {
  for (const step of steps) {
    if (step.id === stepId) return step
    const nested = findStepById(childrenOf(step), stepId)
    if (nested) return nested
  }
  return null
}

/** The main pursuit, falling back to the first one so there's always something next. */
export function findPrimaryPursuit(pursuits: LearningPursuit[]): LearningPursuit | null {
  return pursuits.find((p) => p.isPrimary) ?? pursuits[0] ?? null
}

export interface EstimateSummary {
  /** Sum of leaf estimates. */
  minutes: number
  /** Leaves counted that have no estimate. */
  unestimated: number
}

/** Sums leaf estimates; `remainingOnly` skips finished leaves. */
export function sumEstimates(steps: PursuitStep[], remainingOnly = false): EstimateSummary {
  let minutes = 0
  let unestimated = 0
  for (const step of steps) {
    const children = childrenOf(step)
    if (children.length > 0) {
      const nested = sumEstimates(children, remainingOnly)
      minutes += nested.minutes
      unestimated += nested.unestimated
    } else if (!(remainingOnly && step.isCompleted)) {
      if (step.estimateMinutes) minutes += step.estimateMinutes
      else unestimated += 1
    }
  }
  return { minutes, unestimated }
}

/** 45 → "45m", 60 → "1h", 95 → "1h 35m". */
export function formatMinutes(minutes: number): string {
  const m = Math.max(0, Math.round(minutes))
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  const rest = m % 60
  return rest ? `${h}h ${rest}m` : `${h}h`
}

export const ESTIMATE_OPTIONS = [15, 30, 45, 60, 90, 120]

/** A session sized to what's left of the step's estimate: 15–90 minutes, 45 when unestimated. */
export function suggestedSessionMinutes(step: PursuitStep): number {
  if (!step.estimateMinutes) return 45
  const left = Math.max(15, step.estimateMinutes - (step.spentMinutes ?? 0))
  return Math.min(90, Math.round(left / 5) * 5)
}

/** Minutes logged across every leaf. */
export function sumSpent(steps: PursuitStep[]): number {
  return steps.reduce((sum, step) => {
    const children = childrenOf(step)
    return sum + (children.length > 0 ? sumSpent(children) : step.spentMinutes ?? 0)
  }, 0)
}
