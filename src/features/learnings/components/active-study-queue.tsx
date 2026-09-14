import React, { useState, useEffect } from 'react'
import { GraduationCap, Plus, ChevronLeft, ChevronRight, Pencil, Trash2, Star, ListTree, CornerDownRight } from 'lucide-react'
import type { LearningPursuit } from '@/types/learnings'
import { useLearningsStore } from '@/store/learnings-store'
import { useFocusStore } from '@/store/focus-store'
import { isAwaitingData } from '@/store/zustand-utils'
import { cn } from '@/lib/utils'
import { toast } from 'react-hot-toast'
import { CreatePursuitModal } from './create-pursuit-modal'
import { LearnWithAiModal } from './learn-with-ai-modal'
import { NotionIcon } from './notion-icon'
import { PursuitMilestoneBar } from './pursuit-milestone-bar'
import { PursuitNextUp } from './pursuit-next-up'
import { PURSUIT_CATEGORIES } from '../pursuit-import'
import { usePursuitActions } from '../use-pursuit-actions'
import {
  countLeaves,
  findNextStep,
  findPrimaryPursuit,
  formatMinutes,
  hasMilestones,
  sumEstimates,
} from '../pursuit-tree'
import './pursuit-plan.css'

interface ActiveStudyQueueProps {
  /** Called after a pursuit changes so the route can re-sync learnings + summary. */
  onRefresh?: () => void
  /** Opens a pursuit's full plan in the pursuit workspace. */
  onOpenPursuit: (pursuitId: string) => void
}

const TRACKS_PAGE_SIZE = 3

export function ActiveStudyQueue({ onRefresh, onOpenPursuit }: ActiveStudyQueueProps) {
  const pursuitsState = useLearningsStore.use.pursuits()
  const { applyPursuits } = useLearningsStore.use.actions()
  const focusSession = useFocusStore.use.session()
  const actions = usePursuitActions({ onRefresh })
  const tracks = pursuitsState.data
  const isLoading = isAwaitingData(pursuitsState) && tracks.length === 0

  const [isCreating, setIsCreating] = useState(false)
  const [tutorTarget, setTutorTarget] = useState<{ pursuitId: string; stepId: string } | null>(null)

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

  const handleSetPrimary = (id: string) => {
    setPage(1)
    void actions.setPrimary(id)
  }

  const handleStartFocus = async (pursuit: LearningPursuit, stepId: string, minutes: number) => {
    if (await actions.startFocus(pursuit, stepId, minutes)) {
      document.querySelector('.lo-focus-wrap')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
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

  const handleSaveEditPursuit = (e: React.FormEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (!editTitle.trim()) return

    const finalCategory = isEditCustom ? editCustomCategory.trim() : editCategory
    if (!finalCategory) {
      toast.error('Category is required')
      return
    }

    setEditingPursuitId(null)
    void actions.updateDetails(id, { title: editTitle.trim(), category: finalCategory })
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
      {tutorTarget && tutorPursuit && (
        <LearnWithAiModal pursuit={tutorPursuit} stepId={tutorTarget.stepId} onClose={() => setTutorTarget(null)} />
      )}
      {actions.dialog}

      {!isLoading && primary && next && (
        <PursuitNextUp
          key={next.step.id}
          pursuit={primary}
          next={next}
          isFocusing={sessionActive && focusSession?.stepId === next.step.id}
          onStartFocus={(minutes) => handleStartFocus(primary, next.step.id, minutes)}
          onLearn={() => setTutorTarget({ pursuitId: primary.id, stepId: next.step.id })}
          onMarkDone={() => actions.toggleStep(primary.id, next.step.id)}
          onSaveResumeNote={(note) => void actions.editStep(primary.id, next.step.id, { resumeNote: note })}
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
                            onClick={(e) => {
                              e.stopPropagation()
                              actions.deletePursuit(track.id)
                            }}
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
                        className="group w-6 h-6 rounded-full bg-gray-100 hover:bg-neutral-200 flex items-center justify-center text-black hover:text-[#1a7a4a] transition-colors"
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
                    <h4 className="plan-tile-title">
                      <button type="button" className="plan-tile-title-btn" onClick={() => onOpenPursuit(track.id)}>
                        {track.title}
                      </button>
                    </h4>
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

                  <button type="button" className="plan-tile-open" onClick={() => onOpenPursuit(track.id)}>
                    <ListTree size={13} />
                    View plan
                    <span className="plan-tile-open-count">
                      {hasMilestones(steps)
                        ? `${steps.length} ${steps.length === 1 ? 'milestone' : 'milestones'}`
                        : `${total} ${total === 1 ? 'step' : 'steps'}`}
                    </span>
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
