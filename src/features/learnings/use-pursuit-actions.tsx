import { useState } from 'react'
import { toast } from 'react-hot-toast'
import type { LearningPursuit, PursuitStep } from '@/types/learnings'
import { learningsService } from '@/services/learnings-service'
import { useLearningsStore } from '@/store/learnings-store'
import { useFocusStore, focusActions } from '@/store/focus-store'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { childrenOf, countSteps, deleteStepInPursuit, patchStepInPursuit, toggleStepInPursuit } from './pursuit-tree'

export interface StepEditPatch {
  text?: string
  /** null clears the estimate. */
  estimateMinutes?: number | null
  /** Empty string clears. */
  resumeNote?: string
}

export interface PursuitDetailsPatch {
  title: string
  category: string
  /** Omit to leave unchanged; empty string clears. */
  goal?: string
}

interface PursuitActionOptions {
  /** Called after a change that also moves learnings or the summary, so the route can re-sync. */
  onRefresh?: () => void
  /** Replaces the default toast when a step finishes its pursuit (the server has moved it to All Learnings). */
  onCompleted?: (pursuit: LearningPursuit) => void
  /** Called once a delete is confirmed, before the pursuit leaves the store. */
  onDeleted?: (pursuitId: string) => void
}

type PendingConfirm = {
  title: string
  message: string
  confirmLabel: string
  tone: 'danger' | 'accent'
  run: () => void
}

const shorten = (text: string, max = 70) => (text.length > max ? `${text.slice(0, max - 1)}…` : text)

/**
 * Every pursuit mutation, shared by the study queue card and the pursuit workspace.
 * Updates are optimistic against the learnings store and re-sync on failure. Anything
 * that can't be undone — deleting, or ticking the step that finishes a pursuit (the
 * server then deletes the plan and writes a learning) — waits on a confirm dialog, so
 * callers must render `dialog`.
 */
export function usePursuitActions({ onRefresh, onCompleted, onDeleted }: PursuitActionOptions = {}) {
  const tracks = useLearningsStore.use.pursuits().data
  const { loadPursuits, applyPursuits } = useLearningsStore.use.actions()
  const focusSession = useFocusStore.use.session()
  const [pending, setPending] = useState<PendingConfirm | null>(null)

  const sessionActive = focusSession?.status === 'RUNNING' || focusSession?.status === 'PAUSED'

  const updateTrack = (pursuitId: string, fn: (track: LearningPursuit) => LearningPursuit) =>
    applyPursuits((prev) => prev.map((track) => (track.id === pursuitId ? fn(track) : track)))

  /** A pursuit whose last step was ticked (or deleted) has moved to All Learnings server-side. */
  const settleCompletion = (res: { data?: LearningPursuit | null }) => {
    if (res.data?.status !== 'COMPLETED') return
    if (onCompleted) onCompleted(res.data)
    else toast.success(`"${res.data.title}" completed! Moved to All Learnings.`)
    void loadPursuits()
    onRefresh?.()
  }

  const runToggle = async (pursuitId: string, stepId: string) => {
    updateTrack(pursuitId, (track) => toggleStepInPursuit(track, stepId))
    const res = await learningsService.togglePursuitStep(pursuitId, stepId)
    if (res.error) {
      console.error('Failed to toggle step completion:', res.error)
      toast.error('Failed to sync step status')
      void loadPursuits()
      return
    }
    settleCompletion(res)
  }

  const toggleStep = (pursuitId: string, stepId: string) => {
    const track = tracks.find((t) => t.id === pursuitId)
    if (track && toggleStepInPursuit(track, stepId).status === 'COMPLETED') {
      setPending({
        title: 'Finish this pursuit?',
        message: `That's the last open step in "${shorten(track.title)}". Finishing moves the pursuit and its takeaways to All Learnings, and the plan leaves your study queue.`,
        confirmLabel: 'Finish pursuit',
        tone: 'accent',
        run: () => void runToggle(pursuitId, stepId),
      })
      return
    }
    void runToggle(pursuitId, stepId)
  }

  const editStep = async (pursuitId: string, stepId: string, patch: StepEditPatch) => {
    updateTrack(pursuitId, (track) =>
      patchStepInPursuit(track, stepId, {
        ...(patch.text !== undefined ? { text: patch.text } : {}),
        ...(patch.estimateMinutes !== undefined ? { estimateMinutes: patch.estimateMinutes } : {}),
        ...(patch.resumeNote !== undefined ? { resumeNote: patch.resumeNote || null } : {}),
      })
    )
    const res = await learningsService.updatePursuitStep(pursuitId, stepId, {
      text: patch.text,
      // The API clears an estimate with 0.
      estimateMinutes: patch.estimateMinutes === undefined ? undefined : patch.estimateMinutes ?? 0,
      resumeNote: patch.resumeNote,
    })
    if (res.error) {
      console.error('Failed to update step:', res.error)
      toast.error('Failed to update step')
      void loadPursuits()
    }
  }

  const deleteStep = (pursuitId: string, step: PursuitStep) => {
    const track = tracks.find((t) => t.id === pursuitId)
    const nested = countSteps(childrenOf(step))
    const finishes = track ? deleteStepInPursuit(track, step.id).status === 'COMPLETED' : false
    const what = nested > 0
      ? `"${shorten(step.text)}" and its ${nested} sub-step${nested === 1 ? '' : 's'} will be removed from the plan.`
      : `"${shorten(step.text)}" will be removed from the plan.`

    setPending({
      title: nested > 0 ? 'Delete these steps?' : 'Delete this step?',
      message: finishes
        ? `${what} Everything else is done, so this also finishes the pursuit and moves it to All Learnings.`
        : what,
      confirmLabel: 'Delete',
      tone: 'danger',
      run: async () => {
        updateTrack(pursuitId, (t) => deleteStepInPursuit(t, step.id))
        const res = await learningsService.deletePursuitStep(pursuitId, step.id)
        if (res.error) {
          console.error('Failed to delete step:', res.error)
          toast.error('Failed to delete step')
          void loadPursuits()
          return
        }
        settleCompletion(res)
      },
    })
  }

  /** Resolves true once the step is saved, so an add input can clear for the next one. */
  const addStep = async (pursuitId: string, text: string, parentId?: string) => {
    const res = await learningsService.addPursuitStep(pursuitId, { text, parentId })
    if (res.error || !res.data) {
      toast.error(res.error?.message ?? 'Failed to add step')
      return false
    }
    const saved = res.data
    updateTrack(pursuitId, () => saved)
    return true
  }

  const setPrimary = async (pursuitId: string) => {
    applyPursuits((prev) => prev.map((t) => ({ ...t, isPrimary: t.id === pursuitId })))
    const res = await learningsService.setPrimaryPursuit(pursuitId)
    if (res.error) {
      console.error('Failed to set main pursuit:', res.error)
      toast.error('Failed to set main pursuit')
      void loadPursuits()
      return
    }
    toast.success('Now your main pursuit')
  }

  /** Resolves true when a step-linked session actually started. */
  const startFocus = async (pursuit: LearningPursuit, stepId: string, minutes: number) => {
    if (sessionActive) {
      toast.error('A focus session is already running — finish or reset it first.')
      return false
    }
    await focusActions.start(pursuit.title, minutes, { pursuitId: pursuit.id, stepId })
    return true
  }

  const updateDetails = async (pursuitId: string, patch: PursuitDetailsPatch) => {
    applyPursuits((prev) =>
      prev.map((t) =>
        t.id === pursuitId
          ? { ...t, title: patch.title, category: patch.category, ...(patch.goal !== undefined ? { goal: patch.goal || null } : {}) }
          : t
      )
    )
    const res = await learningsService.updatePursuit(pursuitId, patch)
    if (res.error) {
      console.error('Failed to update pursuit:', res.error)
      toast.error('Failed to update pursuit')
      void loadPursuits()
      return false
    }
    toast.success('Pursuit updated')
    onRefresh?.()
    return true
  }

  const deletePursuit = (pursuitId: string) => {
    const track = tracks.find((t) => t.id === pursuitId)
    setPending({
      title: 'Delete pursuit?',
      message: track
        ? `"${shorten(track.title)}" and its whole plan will be deleted. This can't be undone.`
        : "This pursuit and its whole plan will be deleted. This can't be undone.",
      confirmLabel: 'Delete pursuit',
      tone: 'danger',
      run: async () => {
        onDeleted?.(pursuitId)
        // The server promotes another main pursuit if needed.
        applyPursuits((prev) => prev.filter((t) => t.id !== pursuitId))
        const res = await learningsService.deletePursuit(pursuitId)
        if (res.error) {
          console.error('Failed to delete pursuit:', res.error)
          toast.error('Failed to delete pursuit')
          void loadPursuits()
          return
        }
        toast.success('Pursuit deleted')
        void loadPursuits()
        onRefresh?.()
      },
    })
  }

  const dialog = (
    <ConfirmDialog
      open={pending !== null}
      title={pending?.title ?? ''}
      message={pending?.message ?? ''}
      confirmLabel={pending?.confirmLabel}
      tone={pending?.tone}
      onCancel={() => setPending(null)}
      onConfirm={() => {
        const confirmed = pending
        setPending(null)
        confirmed?.run()
      }}
    />
  )

  return { toggleStep, editStep, deleteStep, addStep, setPrimary, startFocus, updateDetails, deletePursuit, dialog }
}
