import React, { useState, useEffect } from 'react'
import { GraduationCap, Plus, ChevronLeft, ChevronRight, Pencil, Trash2, Star, ListTree, CornerDownRight } from 'lucide-react'
import type { LearningPursuit, PursuitStep } from '@/types/learnings'
import { learningsService } from '@/services/learnings-service'
import { useLearningsStore } from '@/store/learnings-store'
import { useFocusStore, focusActions } from '@/store/focus-store'
import { isAwaitingData } from '@/store/zustand-utils'
import { cn } from '@/lib/utils'
import { toast } from 'react-hot-toast'
import { CreatePursuitModal } from './create-pursuit-modal'
import { LearnWithAiModal } from './learn-with-ai-modal'
import { PursuitMilestoneBar } from './pursuit-milestone-bar'
import { PursuitNextUp } from './pursuit-next-up'
import { PursuitPlanSheet } from './pursuit-plan-sheet'
import type { StepEditPatch } from './pursuit-step-tree'
import { PURSUIT_CATEGORIES } from '../pursuit-import'
import {
  countLeaves,
  countSteps,
  childrenOf,
  deleteStepInPursuit,
  findNextStep,
  findPrimaryPursuit,
  formatMinutes,
  patchStepInPursuit,
  sumEstimates,
  toggleStepInPursuit,
} from '../pursuit-tree'
import './pursuit-plan.css'

const NotionIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" stroke="currentColor" strokeWidth="0.8" aria-hidden="true" className="shrink-0 transition-transform duration-200 group-hover:scale-110">
    <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z" />
  </svg>
)

interface ActiveStudyQueueProps {
  /** Called after a pursuit changes so the route can re-sync learnings + summary. */
  onRefresh?: () => void
}

type StepPatch = Partial<StepEditPatch> & { resumeNote?: string }

const TRACKS_PAGE_SIZE = 3

export function ActiveStudyQueue({ onRefresh }: ActiveStudyQueueProps = {}) {
  const pursuitsState = useLearningsStore.use.pursuits()
  const { loadPursuits, applyPursuits } = useLearningsStore.use.actions()
  const focusSession = useFocusStore.use.session()
  const tracks = pursuitsState.data
  const isLoading = isAwaitingData(pursuitsState) && tracks.length === 0

  const [isCreating, setIsCreating] = useState(false)
  const [tutorTarget, setTutorTarget] = useState<{ pursuitId: string; stepId: string } | null>(null)
  // The pursuit whose full plan is open in the side sheet.
  const [planPursuitId, setPlanPursuitId] = useState<string | null>(null)

  // Edit Pursuit State
  const [editingPursuitId, setEditingPursuitId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editCustomCategory, setEditCustomCategory] = useState('')
  const [isEditCustom, setIsEditCustom] = useState(false)

  // Pagination State
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (pursuitsState.hasErrors) toast.error('Could not load pursuits.')
  }, [pursuitsState.hasErrors])

  // The main pursuit leads the list; the rest keep their order.
  const orderedTracks = [...tracks].sort((a, b) => Number(Boolean(b.isPrimary)) - Number(Boolean(a.isPrimary)))
  const primary = findPrimaryPursuit(orderedTracks)
  const next = primary ? findNextStep(primary.steps ?? []) : null
  const sessionActive = focusSession?.status === 'RUNNING' || focusSession?.status === 'PAUSED'
  const tutorPursuit = tutorTarget ? tracks.find((t) => t.id === tutorTarget.pursuitId) : undefined
  const planPursuit = planPursuitId ? tracks.find((t) => t.id === planPursuitId) : undefined

  const totalPages = Math.max(1, Math.ceil(orderedTracks.length / TRACKS_PAGE_SIZE))
  const start = (page - 1) * TRACKS_PAGE_SIZE
  const paginatedTracks = orderedTracks.slice(start, start + TRACKS_PAGE_SIZE)

  // Auto-adjust page if list shrinks
  useEffect(() => {
    if (page > totalPages) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPage(totalPages)
    }
  }, [tracks.length, totalPages, page])

  const updateTrack = (pursuitId: string, fn: (track: LearningPursuit) => LearningPursuit) =>
    applyPursuits((prev) => prev.map((track) => (track.id === pursuitId ? fn(track) : track)))

  /** A pursuit whose last step was ticked (or deleted) has moved to All Learnings server-side. */
  const handleMaybeCompleted = (res: { data?: LearningPursuit | null }) => {
    if (res.data?.status === 'COMPLETED') {
      toast.success(`"${res.data.title}" completed! Moved to All Learnings.`)
      loadPursuits()
      if (onRefresh) onRefresh()
    }
  }

  const handleToggleStep = async (pursuitId: string, stepId: string) => {
    updateTrack(pursuitId, (track) => toggleStepInPursuit(track, stepId))
    try {
      const res = await learningsService.togglePursuitStep(pursuitId, stepId)
      if (res.error) throw new Error(res.error.message)
      handleMaybeCompleted(res)
    } catch (err) {
      console.error('Failed to toggle step completion:', err)
      toast.error('Failed to sync step status')
      loadPursuits()
    }
  }

  const handleEditStep = async (pursuitId: string, stepId: string, patch: StepPatch) => {
    updateTrack(pursuitId, (track) =>
      patchStepInPursuit(track, stepId, {
        ...(patch.text !== undefined ? { text: patch.text } : {}),
        ...(patch.estimateMinutes !== undefined ? { estimateMinutes: patch.estimateMinutes } : {}),
        ...(patch.resumeNote !== undefined ? { resumeNote: patch.resumeNote || null } : {}),
      })
    )
    try {
      const res = await learningsService.updatePursuitStep(pursuitId, stepId, {
        text: patch.text,
        // The API clears an estimate with 0.
        estimateMinutes: patch.estimateMinutes === undefined ? undefined : patch.estimateMinutes ?? 0,
        resumeNote: patch.resumeNote,
      })
      if (res.error) throw new Error(res.error.message)
    } catch (err) {
      console.error('Failed to update step:', err)
      toast.error('Failed to update step')
      loadPursuits()
    }
  }

  const handleDeleteStep = async (pursuitId: string, step: PursuitStep) => {
    const nested = countSteps(childrenOf(step))
    const message = nested > 0
      ? `Delete "${step.text}" and its ${nested} sub-step${nested === 1 ? '' : 's'}?`
      : `Delete "${step.text}"?`
    if (!window.confirm(message)) return

    updateTrack(pursuitId, (track) => deleteStepInPursuit(track, step.id))
    try {
      const res = await learningsService.deletePursuitStep(pursuitId, step.id)
      if (res.error) throw new Error(res.error.message)
      handleMaybeCompleted(res)
    } catch (err) {
      console.error('Failed to delete step:', err)
      toast.error('Failed to delete step')
      loadPursuits()
    }
  }

  const handleAddStep = async (pursuitId: string, text: string, parentId?: string) => {
    const res = await learningsService.addPursuitStep(pursuitId, { text, parentId })
    if (res.error || !res.data) {
      toast.error(res.error?.message ?? 'Failed to add step')
      return false
    }
    const saved = res.data
    updateTrack(pursuitId, () => saved)
    return true
  }

  const handleSetPrimary = async (id: string) => {
    applyPursuits((prev) => prev.map((t) => ({ ...t, isPrimary: t.id === id })))
    setPage(1)
    try {
      const res = await learningsService.setPrimaryPursuit(id)
      if (res.error) throw new Error(res.error.message)
      toast.success('Now your main pursuit')
    } catch (err) {
      console.error('Failed to set main pursuit:', err)
      toast.error('Failed to set main pursuit')
      loadPursuits()
    }
  }

  const handleStartFocus = async (pursuit: LearningPursuit, stepId: string, minutes: number) => {
    if (sessionActive) {
      toast.error('A focus session is already running — finish or reset it first.')
      return
    }
    await focusActions.start(pursuit.title, minutes, { pursuitId: pursuit.id, stepId })
    document.querySelector('.lo-focus-wrap')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  // Edit Pursuit Handlers
  const handleStartEditPursuit = (e: React.MouseEvent, track: LearningPursuit) => {
    e.stopPropagation()
    setEditingPursuitId(track.id)
    setEditTitle(track.title)

    if (PURSUIT_CATEGORIES.includes(track.category)) {
      setEditCategory(track.category)
      setIsEditCustom(false)
      setEditCustomCategory('')
    } else {
      setEditCategory('Custom')
      setIsEditCustom(true)
      setEditCustomCategory(track.category)
    }
  }

  const handleSaveEditPursuit = async (e: React.FormEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (!editTitle.trim()) return

    const finalCategory = isEditCustom ? editCustomCategory.trim() : editCategory
    if (!finalCategory) {
      toast.error('Category is required')
      return
    }

    // Optimistically update
    applyPursuits((prev) =>
      prev.map((t) => (t.id === id ? { ...t, title: editTitle.trim(), category: finalCategory } : t))
    )
    setEditingPursuitId(null)

    try {
      const res = await learningsService.updatePursuit(id, { title: editTitle.trim(), category: finalCategory })
      if (res.error) throw new Error(res.error.message)
      toast.success('Pursuit updated')
      if (onRefresh) onRefresh()
    } catch (err) {
      console.error('Failed to update pursuit:', err)
      toast.error('Failed to update pursuit')
      loadPursuits()
    }
  }

  const handleDeletePursuitClick = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (window.confirm('Are you sure you want to delete this pursuit?')) {
      // Optimistically remove; the server promotes another main pursuit if needed.
      applyPursuits((prev) => prev.filter((t) => t.id !== id))
      try {
        const res = await learningsService.deletePursuit(id)
        if (res.error) throw new Error(res.error.message)
        toast.success('Pursuit deleted')
        loadPursuits()
        if (onRefresh) onRefresh()
      } catch (err) {
        console.error('Failed to delete pursuit:', err)
        toast.error('Failed to delete pursuit')
        loadPursuits()
      }
    }
  }

  const handlePursuitCreated = (created: LearningPursuit) => {
    applyPursuits((prev) => [...prev, created])
    setPage(created.isPrimary ? 1 : Math.ceil((tracks.length + 1) / TRACKS_PAGE_SIZE))
    toast.success('Added pursuit & created Notion page!')
    if (onRefresh) onRefresh()
  }

  return (
    <div className="learnings-card bg-white rounded-3xl p-5 border border-white/50 shadow-[0_22px_52px_rgba(45,60,48,0.06),inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-md flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <div>
          <p className="learnings-card-eyebrow text-xs uppercase tracking-wider text-gray-400 font-bold">CURRENT PURSUITS</p>
          <h3 className="learnings-card-title text-lg font-bold text-gray-900 flex items-center gap-1.5">
            <GraduationCap size={16} className="text-[#1a7a4a]" />
            Active Study Queue
          </h3>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="w-7 h-7 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 transition-colors"
          title="Add new pursuit"
          aria-label="Add new pursuit"
        >
          <Plus size={14} />
        </button>
      </div>

      {isCreating && <CreatePursuitModal onClose={() => setIsCreating(false)} onCreated={handlePursuitCreated} />}
      {planPursuit && (
        <PursuitPlanSheet
          pursuit={planPursuit}
          isMain={planPursuit.id === primary?.id}
          currentStepId={findNextStep(planPursuit.steps ?? [])?.step.id}
          onClose={() => setPlanPursuitId(null)}
          onToggle={(stepId) => handleToggleStep(planPursuit.id, stepId)}
          onEdit={(stepId, patch) => handleEditStep(planPursuit.id, stepId, patch)}
          onDelete={(step) => handleDeleteStep(planPursuit.id, step)}
          onAdd={(text, parentId) => handleAddStep(planPursuit.id, text, parentId)}
          onLearn={(stepId) => setTutorTarget({ pursuitId: planPursuit.id, stepId })}
        />
      )}
      {tutorTarget && tutorPursuit && (
        <LearnWithAiModal pursuit={tutorPursuit} stepId={tutorTarget.stepId} onClose={() => setTutorTarget(null)} />
      )}

      {!isLoading && primary && next && (
        <PursuitNextUp
          key={next.step.id}
          pursuit={primary}
          next={next}
          isFocusing={sessionActive && focusSession?.stepId === next.step.id}
          onStartFocus={(minutes) => handleStartFocus(primary, next.step.id, minutes)}
          onLearn={() => setTutorTarget({ pursuitId: primary.id, stepId: next.step.id })}
          onMarkDone={() => handleToggleStep(primary.id, next.step.id)}
          onSaveResumeNote={(note) => handleEditStep(primary.id, next.step.id, { resumeNote: note })}
        />
      )}

      {isLoading ? (
        <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
          {Array.from({ length: 2 }).map((_, idx) => (
            <div key={idx} className="plan-tile">
              <span className="skeleton-rect skeleton-shimmer" style={{ width: 68, height: 16, borderRadius: 6 }} />
              <span className="skeleton-rect skeleton-shimmer" style={{ width: idx === 0 ? '75%' : '60%', height: 16 }} />
              <span className="skeleton-rect skeleton-shimmer" style={{ width: '100%', height: 6, borderRadius: 3 }} />
              <span className="skeleton-rect skeleton-shimmer" style={{ width: '40%', height: 12, marginBottom: 8 }} />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
          {paginatedTracks.length === 0 ? (
            <div className="flex flex-col gap-3 justify-center items-center py-8 border border-dashed border-gray-200 rounded-2xl bg-gray-50/50 flex-1 min-h-[200px]">
              <span className="text-xs text-gray-400 font-medium">No active pursuits in queue.</span>
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="text-[11px] px-3.5 py-1.5 rounded-full bg-black text-white hover:bg-neutral-800 font-semibold flex items-center gap-1"
              >
                <Plus size={12} />
                Plan a pursuit
              </button>
            </div>
          ) : (
            paginatedTracks.map((track) => {
              const steps = track.steps ?? []
              const { done, total } = countLeaves(steps)
              const percentage = total > 0 ? Math.round((done / total) * 100) : 0
              const remaining = sumEstimates(steps, true)
              const isMain = track.id === primary?.id
              const trackNext = isMain ? next : findNextStep(steps)

              return (
                <article key={track.id} className={cn('plan-tile', isMain && 'is-main')}>
                  <div className="plan-tile-top">
                    <div className="plan-tile-tags">
                      <span className="text-[9px] font-bold text-[#1a7a4a] bg-emerald-50 px-2 py-0.5 rounded-md uppercase tracking-wider">
                        {track.category}
                      </span>
                      {isMain && tracks.length > 1 && (
                        <span className="pursuit-main-badge">
                          <Star size={8} fill="currentColor" strokeWidth={0} />
                          Main
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {editingPursuitId !== track.id && (
                        <>
                          {!isMain && (
                            <button
                              onClick={() => handleSetPrimary(track.id)}
                              className="w-6 h-6 rounded-full bg-gray-50 hover:bg-neutral-200 flex items-center justify-center text-neutral-500 hover:text-black transition-colors"
                              title="Make this your main pursuit"
                              aria-label="Make this your main pursuit"
                            >
                              <Star size={11} />
                            </button>
                          )}
                          <button
                            onClick={(e) => handleStartEditPursuit(e, track)}
                            className="w-6 h-6 rounded-full bg-gray-50 hover:bg-neutral-200 flex items-center justify-center text-neutral-500 hover:text-black transition-colors"
                            title="Edit pursuit name/category"
                            aria-label="Edit pursuit name and category"
                          >
                            <Pencil size={11} />
                          </button>
                          <button
                            onClick={(e) => handleDeletePursuitClick(e, track.id)}
                            className="w-6 h-6 rounded-full bg-gray-50 hover:bg-red-50 flex items-center justify-center text-neutral-500 hover:text-red-600 transition-colors"
                            title="Delete pursuit"
                            aria-label="Delete pursuit"
                          >
                            <Trash2 size={11} />
                          </button>
                        </>
                      )}
                      <a
                        href={track.notionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-6 h-6 rounded-full bg-gray-100 hover:bg-neutral-200 flex items-center justify-center text-black hover:text-[#1a7a4a] transition-colors"
                        title="Open deep-dive note in Notion"
                        aria-label="Open deep-dive note in Notion"
                      >
                        <NotionIcon />
                      </a>
                    </div>
                  </div>

                  {editingPursuitId === track.id ? (
                    <form
                      onSubmit={(e) => handleSaveEditPursuit(e, track.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="flex flex-col gap-2 bg-gray-50/50 p-2.5 rounded-xl border border-gray-100"
                    >
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-[#1a7a4a]"
                        required
                        placeholder="Pursuit Title"
                        autoFocus
                      />
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center gap-2">
                          <select
                            value={isEditCustom ? 'Custom' : editCategory}
                            onChange={(e) => {
                              const val = e.target.value
                              if (val === 'Custom') {
                                setIsEditCustom(true)
                                setEditCategory('Custom')
                              } else {
                                setIsEditCustom(false)
                                setEditCategory(val)
                              }
                            }}
                            className="text-[10px] p-1.5 rounded-lg border border-gray-200 bg-white font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#1a7a4a]"
                          >
                            {PURSUIT_CATEGORIES.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                            <option value="Custom">Custom...</option>
                          </select>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setEditingPursuitId(null)
                              }}
                              className="text-[10px] px-2.5 py-1 rounded-full text-gray-500 hover:bg-gray-100 font-semibold"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="text-[10px] px-2.5 py-1 rounded-full bg-[#1a7a4a] text-white hover:bg-emerald-700 font-semibold"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                        {isEditCustom && (
                          <input
                            type="text"
                            placeholder="Enter custom category..."
                            value={editCustomCategory}
                            onChange={(e) => setEditCustomCategory(e.target.value)}
                            className="w-full text-xs p-1.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-[#1a7a4a]"
                            required
                          />
                        )}
                      </div>
                    </form>
                  ) : (
                    <h4 className="plan-tile-title">{track.title}</h4>
                  )}

                  <PursuitMilestoneBar steps={steps} currentStepId={trackNext?.step.id} />

                  <div className="plan-tile-meta">
                    <span>{done}/{total} steps</span>
                    <i aria-hidden="true">·</i>
                    <span>{percentage}%</span>
                    {remaining.minutes > 0 && (
                      <>
                        <i aria-hidden="true">·</i>
                        <span>≈{formatMinutes(remaining.minutes)} left</span>
                      </>
                    )}
                  </div>

                  {/* The main pursuit's next step already leads the card in Up next. */}
                  {!isMain && trackNext && (
                    <p className="plan-tile-next">
                      <CornerDownRight size={12} />
                      <span className="plan-tile-next-label">Next</span>
                      <span className="plan-tile-next-text" title={trackNext.step.text}>{trackNext.step.text}</span>
                    </p>
                  )}

                  <button type="button" className="plan-tile-open" onClick={() => setPlanPursuitId(track.id)}>
                    <ListTree size={13} />
                    View plan
                    <span className="plan-tile-open-count">{countSteps(steps)} steps</span>
                    <ChevronRight size={13} className="plan-tile-open-chevron" />
                  </button>
                </article>
              )
            })
          )}
        </div>
      )}

      {totalPages > 1 && (
        <div className="learnings-pagination mt-auto pt-4" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px' }}>
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="pagination-btn"
            type="button"
            style={{ width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <ChevronLeft size={12} />
          </button>
          <span className="pagination-info" style={{ fontSize: 10, minWidth: 60, textAlign: 'center' }}>
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="pagination-btn"
            type="button"
            style={{ width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <ChevronRight size={12} />
          </button>
        </div>
      )}
    </div>
  )
}
