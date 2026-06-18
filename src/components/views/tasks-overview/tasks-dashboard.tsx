import { useState, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Search, List, Columns3, CalendarDays, X, Clock, Briefcase, BookOpen, Dumbbell, ShoppingCart, Home, DollarSign, User, Hash, LayoutDashboard, Tag, Film } from 'lucide-react'
import toast from 'react-hot-toast'
import { fetchTasks, toggleTask, deleteTask, updateTask, addTask } from '../../../lib/api'
import type { DailyTask } from '../../../lib/api'
import { ConfirmDialog } from '../../ui/confirm-dialog'
import { TasksListView } from './tasks-list-view'
import { TasksKanbanView } from './tasks-kanban-view'
import { TasksCalendarView } from './tasks-calendar-view'
import { TasksDetailPanel } from './tasks-detail-panel'
import avatarImage from '../../../assets/reference-crops/avatar_luffy.png'
import { getTagColor } from '../../../lib/tag-colors'

type ViewMode = 'list' | 'kanban' | 'calendar'
type FilterStatus = 'all' | 'pending' | 'completed'
type TaskCategory = 'Work' | 'Learning' | 'Fitness' | 'Shopping' | 'Chores' | 'Finance' | 'Personal' | 'General'

const CATEGORIES: { key: string; label: string }[] = [
  { key: 'Work', label: 'Work' },
  { key: 'Learning', label: 'Learning' },
  { key: 'Fitness', label: 'Fitness' },
  { key: 'Personal', label: 'Personal' },
  { key: 'General', label: 'General' },
]

const getCategoryIcon = (cat: string, color: string, size = 12) => {
  const props = { size, color }
  switch (cat) {
    case 'Work': return <Briefcase {...props} />
    case 'Learning': return <BookOpen {...props} />
    case 'Fitness': return <Dumbbell {...props} />
    case 'Shopping': return <ShoppingCart {...props} />
    case 'Chores': return <Home {...props} />
    case 'Finance': return <DollarSign {...props} />
    case 'Personal': return <User {...props} />
    case 'Movies': return <Film {...props} />
    case 'General': return <Hash {...props} />
    case 'Dashboard': return <LayoutDashboard {...props} />
    default: return <Hash {...props} />
  }
}
import type { AppPath } from '../../dashboard/quantified-self-dashboard/data'

type TasksDashboardProps = {
  searchParams?: URLSearchParams
  onNavigate?: (pathname: AppPath, search?: string) => void
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function TasksDashboard(_props: TasksDashboardProps) {
  const [tasks, setTasks] = useState<DailyTask[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [categoryFilters, setCategoryFilters] = useState<string[]>([])
  const [tagFilters, setTagFilters] = useState<string[]>([])
  const [selectedTask, setSelectedTask] = useState<DailyTask | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DailyTask | null>(null)
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null)
  const [modalFormTitle, setModalFormTitle] = useState('')
  const [modalFormDate, setModalFormDate] = useState(() => new Date().toISOString().split('T')[0])
  const [modalFormTime, setModalFormTime] = useState('')
  const [modalFormCategory, setModalFormCategory] = useState<string>('Personal')
  const [customCategory, setCustomCategory] = useState('')
  const [modalFormNotes, setModalFormNotes] = useState('')

  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 15

  // Clear selected task when view or filters change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedTask(null)
  }, [viewMode, statusFilter, categoryFilters, tagFilters, searchQuery])

  const load = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true)
    try {
      const res = await fetchTasks()
      const sorted = (res?.data ?? []).sort((a: DailyTask, b: DailyTask) => {
        const dateCompare = (b.date || '').localeCompare(a.date || '')
        if (dateCompare !== 0) return dateCompare
        if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
          return a.sortOrder - b.sortOrder
        }
        if (b.id && a.id) return b.id.localeCompare(a.id)
        return 0
      })
      setTasks(sorted)
    } catch {
      if (showLoading) setTasks([])
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  // Reset page when filters change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1)
  }, [searchQuery, statusFilter, categoryFilters, tagFilters, viewMode])

  const uniqueCategories = useMemo(() => {
    const catSet = new Set<string>(CATEGORIES.map(c => c.key))
    tasks.forEach(t => {
      if (t.category) {
        catSet.add(t.category)
      }
    })
    return Array.from(catSet).sort()
  }, [tasks])

  const uniqueTags = useMemo(() => {
    const tagSet = new Set<string>()
    tasks.forEach(t => {
      if (t.tags) {
        t.tags.forEach(tag => tagSet.add(tag))
      }
    })
    return Array.from(tagSet).sort()
  }, [tasks])

  const handleToggle = async (task: DailyTask) => {
    if (!task.id) return

    // Optimistic UI update
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t)))
    if (selectedTask?.id === task.id) {
      setSelectedTask((prev) => prev ? { ...prev, completed: !prev.completed } : prev)
    }

    try {
      const isRecurring = task.recurrenceFrequency && task.recurrenceFrequency !== 'NONE'
      const res = await toggleTask(task.id, isRecurring ? task.date : undefined)
      if (selectedTask?.id === task.id && res?.data) {
        setSelectedTask(res.data)
      }
      await load(false)
    } catch (err: unknown) {
      // Rollback on error
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t)))
      if (selectedTask?.id === task.id) {
        setSelectedTask((prev) => prev ? { ...prev, completed: !prev.completed } : prev)
      }
      toast.error(err instanceof Error ? err.message : 'Failed to update task')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget?.id) return
    const id = deleteTarget.id

    // Optimistic UI update
    setTasks((prev) => prev.filter((t) => t.id !== id))

    try {
      await deleteTask(id)
      toast.success(`Deleted "${deleteTarget.title}"`)
      if (selectedTask?.id === id) {
        setSelectedTask(null)
      }
      setDeleteTarget(null)
      await load(false)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete task')
      await load(false) // Reload to restore
    }
  }

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    const isCompleted = newStatus === 'DONE'
    handleUpdate(taskId, { status: newStatus, completed: isCompleted } as Partial<DailyTask>)
  }

  const handleUpdate = async (id: string, data: Partial<DailyTask>) => {
    // Optimistic UI update
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...data } : t)))

    try {
      const existing = tasks.find((t) => t.id === id)
      if (!existing) return
      const res = await updateTask(id, { ...existing, ...data } as DailyTask)
      toast.success('Task updated')
      if (selectedTask?.id === id && res?.data) {
        setSelectedTask(res.data)
      }
      await load(false)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update task')
      await load(false) // Rollback
    }
  }

  useEffect(() => {
    if (modalMode === 'edit' && selectedTask) {
      setModalFormTitle(selectedTask.title)
      setModalFormDate(selectedTask.date || '')
      setModalFormTime(selectedTask.scheduledTime || '')
      setModalFormCategory(selectedTask.category || 'General')
      setCustomCategory('')
      setModalFormNotes(selectedTask.notes || '')
    } else if (modalMode === 'add') {
      setModalFormTitle('')
      setModalFormDate(new Date().toISOString().split('T')[0])
      setModalFormTime('')
      setModalFormCategory('Personal')
      setCustomCategory('')
      setModalFormNotes('')
    }
  }, [modalMode, selectedTask])

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!modalFormTitle.trim()) return

    try {
      const finalCategory = modalFormCategory === 'Custom' && customCategory.trim() ? customCategory.trim() : modalFormCategory
      
      if (modalMode === 'edit' && selectedTask?.id) {
        await handleUpdate(selectedTask.id, {
          title: modalFormTitle.trim(),
          date: modalFormDate,
          scheduledTime: modalFormTime || undefined,
          category: finalCategory,
          notes: modalFormNotes.trim() || undefined,
        })
        setModalMode(null)
      } else {
        const res = await addTask({
          title: modalFormTitle.trim(),
          date: modalFormDate,
          scheduledTime: modalFormTime || undefined,
          category: finalCategory,
          notes: modalFormNotes.trim() || undefined,
        })
        toast.success('Task created')
        setModalMode(null)
        load(false)
        if (res?.data) {
          setSelectedTask(res.data)
        }
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save task')
    }
  }

  const filteredTasks = useMemo(() => {
    let result = tasks

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((t) => t.title.toLowerCase().includes(q))
    }

    if (statusFilter === 'pending') {
      result = result.filter((t) => !t.completed)
    } else if (statusFilter === 'completed') {
      result = result.filter((t) => t.completed)
    }

    const activeTagFilters = tagFilters.filter(t => uniqueTags.includes(t))

    if (categoryFilters.length > 0 || activeTagFilters.length > 0) {
      result = result.filter((t) => {
        const storedCat = t.category as string | undefined
        const detected = detectCategory(t.title)
        const cat = storedCat || detected
        
        const hasCategory = categoryFilters.includes(cat)
        const hasTag = t.tags && t.tags.some(tag => activeTagFilters.includes(tag))
        
        return hasCategory || hasTag
      })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    result.sort((a, b) => {
      const aOverdue = !a.completed && a.date ? new Date(a.date) < today : false
      const bOverdue = !b.completed && b.date ? new Date(b.date) < today : false
      if (aOverdue && !bOverdue) return -1
      if (!aOverdue && bOverdue) return 1
      return (b.date || '').localeCompare(a.date || '')
    })

    return result
  }, [tasks, searchQuery, statusFilter, categoryFilters, tagFilters, uniqueTags])

  // Sliced tasks for pagination (List and Kanban views)
  const paginatedTasks = useMemo(() => {
    if (viewMode === 'calendar') return filteredTasks
    const start = (currentPage - 1) * pageSize
    return filteredTasks.slice(start, start + pageSize)
  }, [filteredTasks, viewMode, currentPage])

  const totalPages = Math.ceil(filteredTasks.length / pageSize)

  return (
    <div className="tasks-dashboard">
      {/* Top Control Bar */}
      <div className="tasks-control-bar">
        {/* Row 1: Search & Avatar */}
        <div className="tasks-search-avatar-row">
            <div className="tasks-search-wrap">
              <Search size={16} color="rgba(16,19,18,0.4)" />
              <input
                type="text"
                className="tasks-search-input"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="tasks-view-header-row desktop-only">
              <div className="tasks-view-toggle">
                <button
                  type="button"
                  className={`tasks-view-btn ${viewMode === 'list' ? 'is-active' : ''}`}
                  onClick={() => setViewMode('list')}
                >
                  <List size={13} />
                  List
                </button>
                <button
                  type="button"
                  className={`tasks-view-btn ${viewMode === 'kanban' ? 'is-active' : ''}`}
                  onClick={() => setViewMode('kanban')}
                >
                  <Columns3 size={13} />
                  Kanban
                </button>
                <button
                  type="button"
                  className={`tasks-view-btn ${viewMode === 'calendar' ? 'is-active' : ''}`}
                  onClick={() => setViewMode('calendar')}
                >
                  <CalendarDays size={13} />
                  Calendar
                </button>
              </div>

              <button type="button" className="tasks-add-btn-primary" onClick={() => setModalMode('add')}>
                <Plus size={14} strokeWidth={2.5} />
                <span>New Task</span>
              </button>
            </div>

            <div className="tasks-avatar-container">
              <img src={avatarImage} alt="User" />
            </div>
          </div>

        {/* Row 2: Filters */}
        <div className="tasks-filters-scroll-row">
          <div className="tasks-filter-group">
            <button
              type="button"
              className={`tasks-filter-pill ${statusFilter === 'all' ? 'is-active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              All
            </button>
            <button
              type="button"
              className={`tasks-filter-pill ${statusFilter === 'pending' ? 'is-active' : ''}`}
              onClick={() => setStatusFilter('pending')}
            >
              Pending
            </button>
            <button
              type="button"
              className={`tasks-filter-pill ${statusFilter === 'completed' ? 'is-active' : ''}`}
              onClick={() => setStatusFilter('completed')}
            >
              Done
            </button>
          </div>

          <div className="tasks-filters-divider" />

          {/* Categories */}
          <div className="tasks-filter-group">
            {uniqueCategories.map((cat) => {
              const dotColor = getTagColor(cat).dot
              return (
                <button
                  key={cat}
                  type="button"
                  className={`tasks-filter-pill ${categoryFilters.includes(cat) ? 'is-active' : ''}`}
                  onClick={() =>
                    setCategoryFilters((prev) =>
                      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
                    )
                  }
                >
                  {getCategoryIcon(cat, dotColor, 14)}
                  {cat}
                </button>
              )
            })}
            {uniqueTags.length > 0 && <div className="tasks-filters-divider" style={{ margin: '0 8px' }} />}
            {uniqueTags.map((tag) => {
              const colors = getTagColor(tag)
              return (
                <button
                  key={tag}
                  type="button"
                  className={`tasks-filter-pill ${tagFilters.includes(tag) ? 'is-active' : ''}`}
                  onClick={() => setTagFilters(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                >
                  <Tag size={14} color={colors.dot} />
                  {tag}
                </button>
              )
            })}
          </div>
        </div>

        <div className="tasks-view-header-row mobile-only">
          <div className="tasks-view-toggle">
            <button
              type="button"
              className={`tasks-view-btn ${viewMode === 'list' ? 'is-active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              <List size={13} />
              List
            </button>
            <button
              type="button"
              className={`tasks-view-btn ${viewMode === 'kanban' ? 'is-active' : ''}`}
              onClick={() => setViewMode('kanban')}
            >
              <Columns3 size={13} />
              Kanban
            </button>
            <button
              type="button"
              className={`tasks-view-btn ${viewMode === 'calendar' ? 'is-active' : ''}`}
              onClick={() => setViewMode('calendar')}
            >
              <CalendarDays size={13} />
              Calendar
            </button>
          </div>

          {!modalMode && (
            <button type="button" className="tasks-add-btn-primary" onClick={() => setModalMode('add')}>
              <Plus size={14} strokeWidth={2.5} />
              <span>New Task</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content + Detail Panel */}
      <div className={`tasks-content-grid ${selectedTask ? 'has-selection' : ''}`}>
        <div className="tasks-viewport">
          {loading ? (
            <div className="tasks-empty-state">
              <p>Loading tasks...</p>
            </div>
          ) : viewMode === 'list' || viewMode === 'kanban' ? (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {viewMode === 'list' ? (
                <TasksListView
                  tasks={paginatedTasks}
                  selectedTask={selectedTask}
                  onSelect={setSelectedTask}
                  onToggle={handleToggle}
                />
              ) : (
                <TasksKanbanView
                  tasks={paginatedTasks}
                  onSelect={setSelectedTask}
                  onStatusChange={handleStatusChange}
                  onAddTask={() => setModalMode('add')}
                  onToggle={handleToggle}
                  onDelete={(t) => setDeleteTarget(t)}
                  onEditRequest={(t) => { setSelectedTask(t); setModalMode('edit'); }}
                />
              )}
              
              {totalPages > 1 && (
                <div className="tasks-pagination-bar">
                  <button 
                    type="button" 
                    className="pagination-btn"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  <span className="pagination-info">Page {currentPage} of {totalPages}</span>
                  <button 
                    type="button" 
                    className="pagination-btn"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          ) : (
            <TasksCalendarView
              tasks={filteredTasks}
              onSelect={setSelectedTask}
            />
          )}
        </div>

        <div className="tasks-detail-overlay" onClick={() => setSelectedTask(null)} />

        <div className="tasks-detail-wrapper">
          <TasksDetailPanel
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
            onToggle={handleToggle}
            onDelete={(t) => setDeleteTarget(t)}
            onUpdate={handleUpdate}
            onEditRequest={() => setModalMode('edit')}
          />
        </div>
      </div>

      {modalMode && createPortal(
        <div className="tasks-add-modal-overlay" onClick={() => setModalMode(null)}>
          <div className="tasks-add-entry-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modalMode === 'edit' ? 'Edit Task' : 'Add Task'}</h3>
              <button type="button" className="close-modal-btn" onClick={() => setModalMode(null)}>
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleModalSubmit} className="add-entry-form">
              <div className="tasks-modal-grid">
                {/* Left Column: Form */}
                <div className="tasks-modal-form-col">
                  <div className="form-group">
                    <label>TASK TITLE</label>
                    <input
                      type="text"
                      autoFocus
                      placeholder="e.g. Code review, Study session..."
                      value={modalFormTitle}
                      onChange={(e) => setModalFormTitle(e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>TIME (OPTIONAL)</label>
                      <div className="input-with-icon">
                        <input
                          type="time"
                          value={modalFormTime}
                          onChange={(e) => setModalFormTime(e.target.value)}
                          className="form-input"
                        />
                        <Clock size={14} className="input-icon" />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>DATE</label>
                      <div className="input-with-icon">
                        <input
                          type="date"
                          value={modalFormDate}
                          onChange={(e) => setModalFormDate(e.target.value)}
                          className="form-input"
                        />
                        <CalendarDays size={14} className="input-icon" />
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>CATEGORY</label>
                    <select 
                      value={modalFormCategory}
                      onChange={(e) => setModalFormCategory(e.target.value)}
                      className="form-input"
                    >
                      {CATEGORIES.map(c => (
                        <option key={c.key} value={c.key}>{c.label}</option>
                      ))}
                      <option value="Custom">Custom...</option>
                    </select>
                    {modalFormCategory === 'Custom' && (
                      <input
                        type="text"
                        placeholder="Enter custom category..."
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        className="form-input"
                        style={{ marginTop: '8px' }}
                        autoFocus
                      />
                    )}
                  </div>

                  <div className="form-group">
                    <label>NOTES (OPTIONAL)</label>
                    <textarea
                      placeholder="Extra context..."
                      value={modalFormNotes}
                      onChange={(e) => setModalFormNotes(e.target.value)}
                      className="form-input"
                      rows={3}
                    />
                  </div>
                </div>

                {/* Right Column: Preview */}
                <div className="tasks-modal-preview-col">
                  <div className="preview-label">Preview</div>
                  
                  <div className="tasks-kanban-card new-card" style={{ pointerEvents: 'none', width: '100%', maxWidth: '260px' }}>
                    <div className="kanban-card-title">{modalFormTitle || 'Untitled Task'}</div>
                    <div className="kanban-card-desc">
                      {modalFormNotes ? (modalFormNotes.length > 60 ? modalFormNotes.substring(0, 60) + '...' : modalFormNotes) : 'No additional details provided for this task.'}
                    </div>
                    
                    <div className="kanban-card-tags">
                      {(() => {
                        const actualCategory = modalFormCategory === 'Custom' && customCategory.trim() ? customCategory.trim() : modalFormCategory
                        const categoryInfo = getTagColor(actualCategory)
                        return (
                          <span className="k-tag dept" style={{ 
                            background: categoryInfo.bg, 
                            color: categoryInfo.text 
                          }}>
                            <span className="dot" style={{ background: categoryInfo.dot, width: 6, height: 6, borderRadius: '50%', display: 'inline-block' }} />
                            {actualCategory}
                          </span>
                        )
                      })()}
                    </div>
                    
                    {(modalFormTime || modalFormDate) && (
                      <div className="kanban-card-metrics">
                        {modalFormTime && (
                          <span className="k-tag time">
                            <Clock size={10} style={{ marginRight: 2 }} />
                            {modalFormTime}
                          </span>
                        )}
                        {modalFormDate && (
                          <span className="k-tag sla">
                            <span className="flag">⚑</span>
                            {modalFormDate.slice(5).replace('-', '/')}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="kanban-card-footer">
                      <div className="kanban-assignees" style={{ marginLeft: 'auto' }}>
                        <div className="assignee-avatar" style={{ zIndex: 3, backgroundImage: `url(${avatarImage})` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer-actions">
                {modalMode === 'edit' && selectedTask?.updatedAt ? (
                  <div className="modal-last-updated">
                    Last updated: {new Date(selectedTask.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                ) : <div />}
                <div className="modal-btn-group">
                  <button type="button" className="modal-btn-cancel" onClick={() => setModalMode(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="modal-btn-save" disabled={!modalFormTitle.trim()}>
                    Save Task
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {!!deleteTarget && createPortal(
        <ConfirmDialog
          open={!!deleteTarget}
          title="Delete task?"
          message={`Remove "${deleteTarget?.title}" from your schedule?`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />,
        document.body
      )}
    </div>
  )
}

function detectCategory(title: string): TaskCategory {
  const t = title.toLowerCase()
  if (/\b(work|meeting|email|office|call|project|code|dev|pr\b|review|commit|deploy|github|api\b|backend|frontend|test\b|debug|design|sprint|standup)\b/.test(t)) return 'Work'
  if (/\b(learn|study|course|read|book|article|tutorial|lecture|homework|leetcode|notion)\b/.test(t)) return 'Learning'
  if (/\b(gym|run|workout|exercise|walk|yoga|meditate|health|fitness|protein|water)\b/.test(t)) return 'Fitness'
  if (/\b(buy|order|shop|groceries|purchase|gift)\b/.test(t)) return 'Shopping'
  if (/\b(laundry|clean|wash|tidy|fix|vacuum|dishes|cook|meal)\b/.test(t)) return 'Chores'
  if (/\b(finance|bill|pay|bank|credit|tax|rent|money|salary|budget)\b/.test(t)) return 'Finance'
  if (/\b(personal|family|friend|call\s+\w+|plan|travel|trip)\b/.test(t)) return 'Personal'
  return 'General'
}
