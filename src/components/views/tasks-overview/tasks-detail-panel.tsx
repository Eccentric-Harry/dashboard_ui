import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Check, Plus, Trash2, Clock, CalendarDays, Circle, MoreHorizontal, Pencil } from 'lucide-react'
import type { DailyTask } from '../../../lib/api'
import { getTagColor } from '../../../lib/tag-colors'

interface SubTask {
  id?: string
  text: string
  completed?: boolean
}



function formatTimelineDateParts(dateStr: string) {
  if (!dateStr) return { date: '', time: '' }
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return { date: dateStr, time: '' }
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const month = months[d.getMonth()]
    const day = d.getDate()
    const year = d.getFullYear()
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    return { date: `${month} ${day}, ${year}`, time: `${hh}:${mm}` }
  } catch {
    return { date: dateStr, time: '' }
  }
}


function formatFriendlyDate(dateStr: string) {
  if (!dateStr) return ''
  try {
    const parts = dateStr.split('-').map(Number)
    if (parts.length === 3) {
      const d = new Date(parts[0], parts[1] - 1, parts[2])
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }
    return dateStr
  } catch {
    return dateStr
  }
}

interface TasksDetailPanelProps {
  task: DailyTask | null
  onClose: () => void
  onToggle: (task: DailyTask) => void
  onDelete: (task: DailyTask) => void
  onUpdate: (id: string, data: Partial<DailyTask>) => void
  onEditRequest?: () => void
}

export function TasksDetailPanel({ task, onClose, onToggle, onDelete, onUpdate, onEditRequest }: TasksDetailPanelProps) {
  const [subtasks, setSubtasks] = useState<SubTask[]>(task?.subtasks || [])
  
  const [isAddingSubtask, setIsAddingSubtask] = useState(false)
  const [newSubtask, setNewSubtask] = useState('')
  
  const [tags, setTags] = useState<string[]>(task?.tags || [])
  const [isAddingTag, setIsAddingTag] = useState(false)
  const [newTag, setNewTag] = useState('')

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [dropdownCoords, setDropdownCoords] = useState<{ top: number; right?: number; left?: number } | null>(null)

  useEffect(() => {
    if (!dropdownOpen) return
    const handler = () => {
      setDropdownOpen(false)
      setDropdownCoords(null)
    }
    window.addEventListener('click', handler)
    window.addEventListener('scroll', handler, true)
    window.addEventListener('resize', handler)
    return () => {
      window.removeEventListener('click', handler)
      window.removeEventListener('scroll', handler, true)
      window.removeEventListener('resize', handler)
    }
  }, [dropdownOpen])

  // Sync state when task changes
  useEffect(() => {
    if (task) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSubtasks(task.subtasks || [])
      setTags(task.tags || [])

      setIsAddingSubtask(false)
      setIsAddingTag(false)
      setNewSubtask('')
      setNewTag('')
    }
  }, [task])

  if (!task) {
    return (
      <div className="tasks-detail-panel is-empty">
        <div className="tasks-detail-empty">
          <Circle size={32} strokeWidth={1.5} />
          <p>Select a task to view details</p>
        </div>
      </div>
    )
  }

  const category = task.category || 'General'
  const categoryInfo = getTagColor(category)

  return (
    <div className="tasks-detail-panel">
      <div className="tasks-detail-panel-header">
        <h3>Task Details</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button 
            type="button" 
            className="tasks-detail-more" 
            onClick={(e) => {
              e.stopPropagation()
              if (dropdownOpen) {
                setDropdownOpen(false)
                setDropdownCoords(null)
              } else {
                const rect = e.currentTarget.getBoundingClientRect()
                const zoom = parseFloat(window.getComputedStyle(document.documentElement).zoom || '1')
                const isLeftHalf = rect.left < window.innerWidth / 2
                setDropdownOpen(true)
                setDropdownCoords({ 
                  top: rect.bottom / zoom, 
                  ...(isLeftHalf ? { left: rect.left / zoom } : { right: (window.innerWidth - rect.right) / zoom })
                })
              }
            }}
            aria-label="More options"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(16,19,18,0.4)', borderRadius: 6 }}
          >
            <MoreHorizontal size={14} />
          </button>
          <button type="button" className="tasks-detail-close" onClick={onClose} aria-label="Close detail panel">
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="tasks-detail-body">
            <h2 className="tasks-detail-title">{task.title}</h2>

            <div className="tasks-detail-meta-tags">
              <span className="k-tag" style={{ background: categoryInfo.bg, color: categoryInfo.text }}>
                <span className="dot" style={{ background: categoryInfo.dot, width: 6, height: 6, borderRadius: '50%', display: 'inline-block' }} />
                {category}
              </span>
              <span className="k-tag id" style={{ background: '#f3f4f6', color: '#4b5563' }}>
                <Circle size={10} />
                {task.status === 'TODO' ? 'To Do' : task.status === 'IN_PROGRESS' ? 'In Progress' : task.status === 'DONE' ? 'Done' : (task.completed ? 'Done' : 'To Do')}
              </span>
              {task.date && (
                <span className="k-tag id" style={{ background: '#f3f4f6', color: '#4b5563' }}>
                  <CalendarDays size={10} />
                  {formatFriendlyDate(task.date)}
                </span>
              )}
              {task.scheduledTime && (
                <span className="k-tag time" style={{ background: '#f3e8ff', color: '#7e22ce' }}>
                  <Clock size={10} />
                  {task.scheduledTime}
                </span>
              )}
              {task.completed && (
                <span className="k-tag sla sla-done" style={{ background: '#d1fae5', color: '#047857' }}>
                  <Check size={10} />
                  Completed
                </span>
              )}
              {tags.map((t) => {
                const colors = getTagColor(t)
                return (
                  <span key={t} className="k-tag" style={{ background: colors.bg, color: colors.text }}>
                    {t}
                    <button type="button" className="tasks-tag-remove" aria-label="Remove tag" onClick={() => {
                      const newArr = tags.filter(x => x !== t)
                      setTags(newArr)
                      if (task.id) onUpdate(task.id, { tags: newArr })
                    }} style={{ marginLeft: 4, background: 'transparent', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', padding: 0 }}>
                      <X size={8} color="inherit" />
                    </button>
                  </span>
                )
              })}
              {isAddingTag ? (
                <input
                  autoFocus
                  className="tasks-add-modal-input"
                  style={{ width: 80, padding: '2px 8px', fontSize: 10, minHeight: 'auto', marginBottom: 0, borderRadius: 12 }}
                  placeholder="New tag"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newTag.trim()) {
                      if (!tags.includes(newTag.trim())) {
                        const newArr = [...tags, newTag.trim()]
                        setTags(newArr)
                        if (task.id) onUpdate(task.id, { tags: newArr })
                      }
                      setNewTag('')
                      setIsAddingTag(false)
                    } else if (e.key === 'Escape') {
                      setIsAddingTag(false)
                    }
                  }}
                  onBlur={() => setIsAddingTag(false)}
                />
              ) : (
                <button type="button" className="k-add-pill" style={{ marginTop: 0 }} onClick={() => setIsAddingTag(true)}>
                  <Plus size={10} />
                  Add tag
                </button>
              )}
            </div>

            <div className="tasks-detail-section">
              <div className="tasks-detail-section-label">Checklist</div>
              {subtasks.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <p style={{ fontSize: 13, color: 'rgba(16,19,18,0.35)', margin: 0 }}>
                    No subtasks yet
                  </p>
                  {!isAddingSubtask && (
                    <button type="button" className="k-add-pill" style={{ marginTop: 0 }} onClick={() => setIsAddingSubtask(true)}>
                      <Plus size={10} />
                      Add subtask
                    </button>
                  )}
                </div>
              ) : (
                subtasks.map((st) => (
                  <div key={st.id} className={`tasks-detail-checkbox-item ${st.completed ? 'is-completed' : ''}`}>
                    <div className={`tasks-circle-check ${st.completed ? 'checked' : ''}`} onClick={() => {
                      const newArr = subtasks.map(s => s.id === st.id ? { ...s, completed: !s.completed } : s)
                      setSubtasks(newArr)
                      if (task.id) onUpdate(task.id, { subtasks: newArr })
                    }}>
                      {st.completed && <Check size={10} strokeWidth={3} />}
                    </div>
                    <span className="subtask-text">{st.text}</span>
                  </div>
                ))
              )}

              {isAddingSubtask && (
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <input
                    autoFocus
                    className="tasks-detail-notes-input"
                    style={{ minHeight: 32, padding: '4px 10px' }}
                    placeholder="Subtask description..."
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newSubtask.trim()) {
                        const newArr = [...subtasks, { id: Math.random().toString(), text: newSubtask.trim(), completed: false }]
                        setSubtasks(newArr)
                        if (task.id) onUpdate(task.id, { subtasks: newArr })
                        setNewSubtask('')
                        setIsAddingSubtask(false)
                      } else if (e.key === 'Escape') {
                        setIsAddingSubtask(false)
                      }
                    }}
                  />
                  <button type="button" className="k-add-pill" style={{ marginTop: 0 }} onClick={() => {
                    if (newSubtask.trim()) {
                      const newArr = [...subtasks, { id: Math.random().toString(), text: newSubtask.trim(), completed: false }]
                      setSubtasks(newArr)
                      if (task.id) onUpdate(task.id, { subtasks: newArr })
                    }
                    setNewSubtask('')
                    setIsAddingSubtask(false)
                  }}>Add</button>
                </div>
              )}
              {subtasks.length > 0 && !isAddingSubtask && (
                <button type="button" className="k-add-pill" onClick={() => setIsAddingSubtask(true)}>
                  <Plus size={10} />
                  Add subtask
                </button>
              )}
            </div>

            {task.notes && (
              <div className="tasks-detail-section">
                <div className="tasks-detail-section-label">Notes</div>
                <div className="tasks-detail-notes">{task.notes}</div>
              </div>
            )}



            <div className="tasks-detail-section">
              <div className="tasks-detail-section-label">Timeline</div>
              <div className="tasks-detail-timeline">
                {task.createdAt && (
                  <div className="tasks-timeline-item">
                    <span className="timestamp-date">{formatTimelineDateParts(task.createdAt).date}</span>
                    <div className="tasks-timeline-content">
                      <span className="timestamp-time">{formatTimelineDateParts(task.createdAt).time}</span>
                      <span className="timestamp-msg">Task created</span>
                    </div>
                  </div>
                )}
                {/* Future Event-Sourcing mapping will go here:
                    task.events?.map(event => (
                      <div key={event.id} className="tasks-timeline-item">
                        <span className="timestamp">{formatTimelineDate(event.timestamp)}</span>
                        {event.action}
                      </div>
                    ))
                */}
                {task.updatedAt && task.createdAt && new Date(task.updatedAt).getTime() > new Date(task.createdAt).getTime() && (
                  <div className="tasks-timeline-item">
                    <span className="timestamp-date">{formatTimelineDateParts(task.updatedAt).date}</span>
                    <div className="tasks-timeline-content">
                      <span className="timestamp-time">{formatTimelineDateParts(task.updatedAt).time}</span>
                      <span className="timestamp-msg">Task last updated</span>
                    </div>
                  </div>
                )}
                {task.completedAt && (
                  <div className="tasks-timeline-item">
                    <span className="timestamp-date">{formatTimelineDateParts(task.completedAt).date}</span>
                    <div className="tasks-timeline-content">
                      <span className="timestamp-time">{formatTimelineDateParts(task.completedAt).time}</span>
                      <span className="timestamp-msg">Task completed</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

      </div>
      {dropdownOpen && dropdownCoords && createPortal(
        <div className="routine-card-dropdown" style={{ position: 'fixed', top: dropdownCoords.top + 8, left: dropdownCoords.left ?? 'auto', right: dropdownCoords.right ?? 'auto', zIndex: 100000 }} onClick={(e) => e.stopPropagation()}>
          {onEditRequest && (
            <button onClick={() => { setDropdownOpen(false); onEditRequest() }}>
              <Pencil size={14} /> Edit
            </button>
          )}
          <button onClick={() => { setDropdownOpen(false); onToggle(task) }}>
            <Check size={14} /> {task.completed ? 'Reopen' : 'Complete'}
          </button>
          <button className="danger" onClick={() => { setDropdownOpen(false); onDelete(task) }}>
            <Trash2 size={14} /> Delete
          </button>
        </div>,
        document.body
      )}
    </div>
  )
}
