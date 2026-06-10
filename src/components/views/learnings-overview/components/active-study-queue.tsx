import React, { useState, useEffect } from 'react'
import { GraduationCap, Plus, Check, ChevronLeft, ChevronRight, X, Loader2, Pencil, Trash2 } from 'lucide-react'
import { fetchPursuits, createPursuit, togglePursuitStep, deletePursuit, updatePursuit, deletePursuitStep, updatePursuitStep } from '../../../../lib/api'
import type { LearningPursuit, PursuitStep } from '../../../../lib/api'
import { toast } from 'react-hot-toast'

const NotionIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" stroke="currentColor" strokeWidth="0.8" aria-hidden="true" className="shrink-0 transition-transform duration-200 group-hover:scale-110">
    <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54(1.447-1.632z" />
  </svg>
)

interface ActiveStudyQueueProps {
  refreshKey?: number
  onRefresh?: () => void
}

export function ActiveStudyQueue({ refreshKey, onRefresh }: ActiveStudyQueueProps = {}) {
  const [tracks, setTracks] = useState<LearningPursuit[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Add Form State
  const [isAdding, setIsAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newCategory, setNewCategory] = useState('Development')
  const [customCategory, setCustomCategory] = useState('')
  const [newSteps, setNewSteps] = useState<string[]>([''])
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Edit Pursuit State
  const [editingPursuitId, setEditingPursuitId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editCustomCategory, setEditCustomCategory] = useState('')
  const [isEditCustom, setIsEditCustom] = useState(false)

  // Edit Step State
  const [editingStepId, setEditingStepId] = useState<string | null>(null)
  const [editStepText, setEditStepText] = useState('')

  // Pagination State
  const [page, setPage] = useState(1)
  const TRACKS_PAGE_SIZE = 2 // Match expanded display height

  const loadPursuits = async () => {
    try {
      setIsLoading(true)
      const res = await fetchPursuits()
      setTracks(res.data)
    } catch (err) {
      console.error('Failed to load learning pursuits:', err)
      toast.error('Could not load pursuits.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadPursuits()
  }, [refreshKey])

  const totalPages = Math.max(1, Math.ceil(tracks.length / TRACKS_PAGE_SIZE))
  const start = (page - 1) * TRACKS_PAGE_SIZE
  const paginatedTracks = tracks.slice(start, start + TRACKS_PAGE_SIZE)

  // Auto-adjust page if list shrinks
  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [tracks.length, totalPages, page])

  const handleToggleStep = async (pursuitId: string, stepId: string) => {
    // 1. Optimistic UI update
    setTracks((prev) =>
      prev.map((track) => {
        if (track.id === pursuitId) {
          const updatedSteps = track.steps.map((step) => {
            if (step.id === stepId) {
              return { ...step, isCompleted: !step.isCompleted }
            }
            return step
          })

          const allCompleted = updatedSteps.length > 0 && updatedSteps.every((s) => s.isCompleted)
          const status: 'ACTIVE' | 'COMPLETED' = allCompleted ? 'COMPLETED' : 'ACTIVE'

          return { ...track, steps: updatedSteps, status }
        }
        return track
      })
    )

    // 2. Perform PATCH in background
    try {
      const res = await togglePursuitStep(pursuitId, stepId)
      // If completed, it has been migrated and removed from queue
      if (res.data.status === 'COMPLETED') {
        toast.success(`"${res.data.title}" completed! Moved to All Learnings.`)
        loadPursuits()
        if (onRefresh) onRefresh()
      }
    } catch (err) {
      console.error('Failed to toggle step completion:', err)
      toast.error('Failed to sync subtask status')
      loadPursuits()
    }
  }

  // Edit Pursuit Handlers
  const handleStartEditPursuit = (e: React.MouseEvent, track: LearningPursuit) => {
    e.stopPropagation()
    setEditingPursuitId(track.id)
    setEditTitle(track.title)
    
    const predefined = ['Computer Science', 'Development', 'Architecture', 'Frontend', 'Backend']
    if (predefined.includes(track.category)) {
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
    setTracks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, title: editTitle.trim(), category: finalCategory } : t))
    )
    setEditingPursuitId(null)

    try {
      await updatePursuit(id, { title: editTitle.trim(), category: finalCategory })
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
      // Optimistically remove
      setTracks((prev) => prev.filter((t) => t.id !== id))
      try {
        await deletePursuit(id)
        toast.success('Pursuit deleted')
        if (onRefresh) onRefresh()
      } catch (err) {
        console.error('Failed to delete pursuit:', err)
        toast.error('Failed to delete pursuit')
        loadPursuits()
      }
    }
  }

  // Edit Step Handlers
  const handleStartEditStep = (e: React.MouseEvent, step: PursuitStep) => {
    e.stopPropagation()
    setEditingStepId(step.id)
    setEditStepText(step.text)
  }

  const handleSaveStep = async (pursuitId: string, stepId: string) => {
    if (!editStepText.trim()) return

    // Optimistically update text
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id === pursuitId) {
          const updatedSteps = t.steps.map((s) => (s.id === stepId ? { ...s, text: editStepText.trim() } : s))
          return { ...t, steps: updatedSteps }
        }
        return t
      })
    )
    setEditingStepId(null)

    try {
      await updatePursuitStep(pursuitId, stepId, editStepText.trim())
      toast.success('Subtask updated')
    } catch (err) {
      console.error('Failed to update step:', err)
      toast.error('Failed to update subtask')
      loadPursuits()
    }
  }

  const handleDeleteStep = async (pursuitId: string, stepId: string) => {
    if (window.confirm('Delete this subtask?')) {
      // Optimistically remove step
      setTracks((prev) =>
        prev.map((t) => {
          if (t.id === pursuitId) {
            const updatedSteps = t.steps.filter((s) => s.id !== stepId)
            const allCompleted = updatedSteps.length > 0 && updatedSteps.every((s) => s.isCompleted)
            const status: 'ACTIVE' | 'COMPLETED' = allCompleted ? 'COMPLETED' : 'ACTIVE'
            return { ...t, steps: updatedSteps, status }
          }
          return t
        })
      )

      try {
        const res = await deletePursuitStep(pursuitId, stepId)
        if (res.data.status === 'COMPLETED') {
          toast.success(`"${res.data.title}" completed! Moved to All Learnings.`)
          loadPursuits()
          if (onRefresh) onRefresh()
        }
      } catch (err) {
        console.error('Failed to delete step:', err)
        toast.error('Failed to delete subtask')
        loadPursuits()
      }
    }
  }

  const handleAddStepField = () => {
    setNewSteps([...newSteps, ''])
  }

  const handleRemoveStepField = (index: number) => {
    setNewSteps(newSteps.filter((_, i) => i !== index))
  }

  const handleStepChange = (index: number, val: string) => {
    const updated = [...newSteps]
    updated[index] = val
    setNewSteps(updated)
  }

  const handleAddNewTrack = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return

    const finalCategory = newCategory === 'Custom' ? customCategory.trim() : newCategory
    if (!finalCategory) {
      toast.error('Please specify a category')
      return
    }

    const sanitizedSteps = newSteps.filter((s) => s.trim() !== '')

    try {
      setIsSubmitting(true)
      const res = await createPursuit({
        title: newTitle.trim(),
        category: finalCategory,
        steps: sanitizedSteps,
      })

      setTracks((prev) => [...prev, res.data])
      toast.success('Added pursuit & created Notion page!')
      
      // Reset Form
      setNewTitle('')
      setNewCategory('Development')
      setCustomCategory('')
      setNewSteps([''])
      setIsAdding(false)
      if (onRefresh) onRefresh()
    } catch (err) {
      console.error('Failed to create pursuit:', err)
      toast.error('Failed to create new pursuit')
    } finally {
      setIsSubmitting(false)
    }
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
          onClick={() => setIsAdding(!isAdding)}
          className="w-7 h-7 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 transition-colors"
          title="Add new pursuit"
        >
          <Plus size={14} />
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAddNewTrack} className="mb-5 p-4 rounded-2xl bg-gray-50/50 border border-gray-100 shadow-sm flex flex-col gap-3">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Pursuit Title</label>
            <input
              type="text"
              placeholder="e.g. Learning Zustand Store Management"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-[#1a7a4a] focus:border-[#1a7a4a] transition-all"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Category</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {['Computer Science', 'Development', 'Architecture', 'Frontend', 'Backend', 'Custom'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setNewCategory(cat)}
                  className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
                    newCategory === cat
                      ? 'bg-[#1a7a4a] text-white border-[#1a7a4a]'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            {newCategory === 'Custom' && (
              <input
                type="text"
                placeholder="Enter custom category name..."
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-[#1a7a4a] focus:border-[#1a7a4a]"
                required
              />
            )}
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1 flex justify-between items-center">
              <span>Steps / Subtasks</span>
              <button
                type="button"
                onClick={handleAddStepField}
                className="text-[10px] text-[#1a7a4a] hover:underline font-semibold"
              >
                + Add Step
              </button>
            </label>
            <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
              {newSteps.map((step, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <span className="text-[10px] text-gray-400 font-mono w-4">{idx + 1}.</span>
                  <input
                    type="text"
                    placeholder={`Step ${idx + 1} text`}
                    value={step}
                    onChange={(e) => handleStepChange(idx, e.target.value)}
                    className="flex-1 text-xs p-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-[#1a7a4a] focus:border-[#1a7a4a] transition-all"
                    required
                  />
                  {newSteps.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveStepField(idx)}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => {
                setIsAdding(false)
                setNewTitle('')
                setNewCategory('Development')
                setCustomCategory('')
                setNewSteps([''])
              }}
              className="text-[11px] px-3.5 py-1.5 rounded-full text-gray-500 hover:bg-gray-100 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="text-[11px] px-3.5 py-1.5 rounded-full bg-black text-white hover:bg-neutral-800 font-medium flex items-center gap-1 transition-all disabled:opacity-50"
            >
              {isSubmitting && <Loader2 size={10} className="animate-spin" />}
              Create Pursuit
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="flex flex-col justify-center items-center py-12 gap-2 flex-1">
          <Loader2 className="animate-spin text-[#1a7a4a]" size={24} />
          <span className="text-xs text-gray-400 font-medium">Loading pursuits...</span>
        </div>
      ) : (
        <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
          {paginatedTracks.length === 0 ? (
            <div className="flex justify-center items-center py-8 border border-dashed border-gray-200 rounded-2xl bg-gray-50/50 flex-1 min-h-[200px]">
              <span className="text-xs text-gray-400 font-medium">No active pursuits in queue.</span>
            </div>
          ) : (
            paginatedTracks.map((track) => {
              const totalSteps = track.steps?.length || 0
              const completedSteps = track.steps?.filter((s) => s.isCompleted).length || 0
              const percentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0
              const isExpanded = true

              return (
                <div
                  key={track.id}
                  className="group relative bg-white border border-gray-100/80 rounded-2xl p-4 shadow-[0_4px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.04)] transition-all duration-200"
                >
                  {/* Category Badge & Notion Icon & Actions */}
                  <div className="flex justify-between items-center mb-1.5" onClick={(e) => e.stopPropagation()}>
                    <span className="text-[9px] font-bold text-[#1a7a4a] bg-emerald-50 px-2 py-0.5 rounded-md uppercase tracking-wider">
                      {track.category}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {editingPursuitId !== track.id && (
                        <>
                          <button
                            onClick={(e) => handleStartEditPursuit(e, track)}
                            className="w-6 h-6 rounded-full bg-gray-50 hover:bg-neutral-200 flex items-center justify-center text-neutral-500 hover:text-black transition-colors"
                            title="Edit pursuit name/category"
                          >
                            <Pencil size={11} />
                          </button>
                          <button
                            onClick={(e) => handleDeletePursuitClick(e, track.id)}
                            className="w-6 h-6 rounded-full bg-gray-50 hover:bg-red-50 flex items-center justify-center text-neutral-500 hover:text-red-600 transition-colors"
                            title="Delete pursuit"
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
                      >
                        <NotionIcon />
                      </a>
                    </div>
                  </div>

                  {/* Title or Edit Title input */}
                  {editingPursuitId === track.id ? (
                    <form 
                      onSubmit={(e) => handleSaveEditPursuit(e, track.id)}
                      onClick={(e) => e.stopPropagation()} 
                      className="flex flex-col gap-2 mt-1 mb-2 bg-gray-50/50 p-2.5 rounded-xl border border-gray-100"
                    >
                      <div>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full text-xs p-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-[#1a7a4a]"
                          required
                          placeholder="Pursuit Title"
                          autoFocus
                        />
                      </div>
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
                            {['Computer Science', 'Development', 'Architecture', 'Frontend', 'Backend'].map(cat => (
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
                    <div className="mb-2">
                      <h4 className="text-sm font-semibold text-gray-900 leading-snug pr-4">
                        {track.title}
                      </h4>
                    </div>
                  )}

                  {/* Progress Bar & Status */}
                  <div className="flex items-center justify-between gap-4 mt-2">
                    <div className="flex-1">
                      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="bg-[#1a7a4a] h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-bold text-gray-400 font-mono">
                        {completedSteps}/{totalSteps} done
                      </span>
                      {percentage < 100 ? (
                        <span className="text-[10px] font-bold text-[#1a7a4a] bg-emerald-50 px-1.5 py-0.5 rounded">
                          {percentage}%
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                          Done
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Collapsible Steps Checklist */}
                  <div 
                    className={`transition-all duration-300 ease-in-out overflow-hidden ${
                      isExpanded ? 'max-h-96 opacity-100 mt-4 border-t border-gray-50 pt-3' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="pl-1 pr-1 flex flex-col gap-2.5">
                      {totalSteps === 0 ? (
                        <span className="text-[11px] text-gray-400 italic">No subtasks defined.</span>
                      ) : (
                        track.steps.map((step) => (
                          <div 
                            key={step.id} 
                            className="flex items-center justify-between gap-2.5 group/step relative py-0.5"
                          >
                            <div className="flex items-start gap-2.5 flex-1 min-w-0">
                              <div 
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleToggleStep(track.id, step.id)
                                }}
                                className={`w-5 h-5 rounded-full border flex items-center justify-center cursor-pointer transition-all duration-200 shrink-0 mt-0.5 ${
                                  step.isCompleted 
                                    ? 'bg-[#1a7a4a] border-[#1a7a4a] text-white shadow-[0_2px_8px_rgba(26,122,74,0.3)]' 
                                    : 'border-gray-300 hover:border-[#1a7a4a] bg-white'
                                }`}
                              >
                                {step.isCompleted && <Check size={10} strokeWidth={3} />}
                              </div>
                              
                              {editingStepId === step.id ? (
                                <div className="flex items-center gap-1.5 flex-1 min-w-0" onClick={e => e.stopPropagation()}>
                                  <input
                                    type="text"
                                    value={editStepText}
                                    onChange={(e) => setEditStepText(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveStep(track.id, step.id)
                                      if (e.key === 'Escape') setEditingStepId(null)
                                    }}
                                    className="flex-1 text-xs px-2 py-0.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#1a7a4a] bg-white"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => handleSaveStep(track.id, step.id)}
                                    className="text-[#1a7a4a] hover:text-emerald-700 p-0.5 shrink-0"
                                    title="Save step text"
                                  >
                                    <Check size={12} strokeWidth={3} />
                                  </button>
                                  <button
                                    onClick={() => setEditingStepId(null)}
                                    className="text-gray-400 hover:text-gray-600 p-0.5 shrink-0"
                                    title="Cancel"
                                  >
                                    <X size={12} strokeWidth={3} />
                                  </button>
                                </div>
                              ) : (
                                <span className={`text-xs transition-colors duration-200 select-none break-words flex-1 leading-relaxed ${
                                  step.isCompleted ? 'text-gray-400 line-through' : 'text-gray-700 font-medium'
                                }`}>
                                  {step.text}
                                </span>
                              )}
                            </div>

                            {/* Hover Step Actions */}
                            {editingStepId !== step.id && (
                              <div 
                                className="flex items-center gap-1 opacity-0 group-hover/step:opacity-100 transition-opacity shrink-0"
                                onClick={e => e.stopPropagation()}
                              >
                                <button
                                  onClick={(e) => handleStartEditStep(e, step)}
                                  className="text-gray-400 hover:text-neutral-700 p-1 rounded hover:bg-neutral-100 transition-colors"
                                  title="Edit subtask"
                                >
                                  <Pencil size={11} />
                                </button>
                                <button
                                  onClick={() => handleDeleteStep(track.id, step.id)}
                                  className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                                  title="Delete subtask"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
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
