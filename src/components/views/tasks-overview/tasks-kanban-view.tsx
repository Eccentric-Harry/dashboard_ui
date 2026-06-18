import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Plus, MoreHorizontal, Clock, Pencil, Check, Trash2 } from 'lucide-react'
import type { DailyTask } from '../../../lib/api'
import avatar1 from '../../../assets/avatars/avatar1.png'
import avatar2 from '../../../assets/avatars/avatar2.png'
import avatar3 from '../../../assets/avatars/avatar3.png'
import avatar4 from '../../../assets/avatars/avatar4.png'

type TaskCategory = 'Work' | 'Learning' | 'Fitness' | 'Shopping' | 'Chores' | 'Finance' | 'Personal' | 'General'

const CATEGORY_COLORS: Record<TaskCategory, string> = {
  Work: '#0ea5e9',
  Learning: '#6366f1',
  Fitness: '#f97316',
  Shopping: '#d97706',
  Chores: '#a855f7',
  Finance: '#10b981',
  Personal: '#8b5cf6',
  General: '#14b8a6',
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

function isOverdueTask(task: DailyTask) {
  if (task.completed || !task.date) return false
  const d = new Date(task.date + (task.scheduledTime ? `T${task.scheduledTime}` : 'T23:59:59'))
  return new Date() > d
}

const COLUMNS = [
  { key: 'TODO', label: 'Assigned', dot: '#6b7280', countColor: '#6b7280', countBg: '#f3f4f6' },
  { key: 'IN_PROGRESS', label: 'In Progress', dot: '#3b82f6', countColor: '#ffffff', countBg: '#3b82f6' },
  { key: 'DONE', label: 'Complete', dot: '#10b981', countColor: '#ffffff', countBg: '#10b981' },
] as const

type ColumnKey = 'TODO' | 'IN_PROGRESS' | 'DONE'

interface TasksKanbanViewProps {
  tasks: DailyTask[]
  onSelect: (task: DailyTask) => void
  onStatusChange: (taskId: string, status: string) => void
  onAddTask?: () => void
  onToggle?: (task: DailyTask) => void
  onDelete?: (task: DailyTask) => void
  onEditRequest?: (task: DailyTask) => void
}

export function TasksKanbanView({ tasks, onSelect, onStatusChange, onAddTask, onToggle, onDelete, onEditRequest }: TasksKanbanViewProps) {
  const grouped: Record<ColumnKey, DailyTask[]> = { TODO: [], IN_PROGRESS: [], DONE: [] }

  const [dropdownOpenFor, setDropdownOpenFor] = useState<string | null>(null)
  const [dropdownCoords, setDropdownCoords] = useState<{ top: number; right?: number; left?: number } | null>(null)

  useEffect(() => {
    if (!dropdownOpenFor) return
    const handler = () => {
      setDropdownOpenFor(null)
      setDropdownCoords(null)
    }
    window.addEventListener('click', handler)
    window.addEventListener('close-dropdowns', handler)
    window.addEventListener('scroll', handler, true)
    window.addEventListener('resize', handler)
    return () => {
      window.removeEventListener('click', handler)
      window.removeEventListener('close-dropdowns', handler)
      window.removeEventListener('scroll', handler, true)
      window.removeEventListener('resize', handler)
    }
  }, [dropdownOpenFor])

  tasks.forEach((task) => {
    let s = task.status || (task.completed ? 'DONE' : 'TODO')
    if (s !== 'TODO' && s !== 'IN_PROGRESS' && s !== 'DONE') {
      s = task.completed ? 'DONE' : 'TODO'
    }
    grouped[s as ColumnKey].push(task)
  })

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId)
    e.dataTransfer.effectAllowed = 'move'
    
    // Add subtle styling class to dragged element if needed later
    const target = e.target as HTMLElement
    setTimeout(() => target.classList.add('is-dragging'), 0)
  }

  const handleDragEnd = (e: React.DragEvent) => {
    const target = e.target as HTMLElement
    target.classList.remove('is-dragging')
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    
    const target = e.currentTarget as HTMLElement
    target.classList.add('is-drag-over')
  }

  const handleDragLeave = (e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement
    target.classList.remove('is-drag-over')
  }

  const handleDrop = (e: React.DragEvent, colKey: string) => {
    e.preventDefault()
    const target = e.currentTarget as HTMLElement
    target.classList.remove('is-drag-over')
    
    const taskId = e.dataTransfer.getData('text/plain')
    if (taskId) {
      onStatusChange(taskId, colKey)
    }
  }

  return (
    <div className="tasks-kanban-view">
      {COLUMNS.map((col) => (
        <div key={col.key} className="tasks-kanban-column new-design">
          <div className="tasks-kanban-column-header">
            <div className="col-info">
              <span className="col-bar" style={{ background: col.dot }} />
              <h4>{col.label}</h4>
              <span className="kanban-count-badge" style={{ background: col.countBg, color: col.countColor }}>
                {grouped[col.key].length}
              </span>
            </div>
            <button type="button" className="kanban-add-btn" onClick={onAddTask}>
              <Plus size={14} color="rgba(16,19,18,0.4)" />
            </button>
          </div>
          <div 
            className="tasks-kanban-body"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, col.key)}
          >
            {grouped[col.key].length === 0 ? (
              <div className="kanban-empty-dropzone" onClick={onAddTask} style={{ cursor: 'pointer' }}>
                <div className="empty-plus">
                  <Plus size={20} color="rgba(16,19,18,0.3)" strokeWidth={1.5} />
                </div>
                <span>Drag and drop task here to start</span>
              </div>
            ) : (
              grouped[col.key].map((task) => {
                const storedCat = task.category as string | undefined
                const detected = detectCategory(task.title)
                const category = storedCat || detected
                const color = CATEGORY_COLORS[category as TaskCategory] || CATEGORY_COLORS.General

                const hasTags = task.tags && task.tags.length > 0;
                const isOverdue = isOverdueTask(task);
                
                // Deterministically pick avatar based on task id length or title
                const avatars = [avatar1, avatar2, avatar3, avatar4]
                const seed = (task.id || task.title).length
                const firstAvatar = avatars[seed % 4]
                
                return (
                  <React.Fragment key={task.id}>
                  <div
                    draggable={!!task.id}
                    onDragStart={(e) => task.id && handleDragStart(e, task.id)}
                    onDragEnd={handleDragEnd}
                    className={`tasks-kanban-card new-card ${task.completed ? 'is-completed' : ''}`}
                    onClick={() => onSelect(task)}
                    style={{ cursor: task.id ? 'grab' : 'pointer' }}
                  >
                    <div className="kanban-card-title">{task.title}</div>
                    <div className="kanban-card-desc">
                      {task.notes ? (task.notes.length > 60 ? task.notes.substring(0, 60) + '...' : task.notes) : 'No additional details provided for this task.'}
                    </div>
                    
                    <div className="kanban-card-tags">
                      <span className="k-tag dept" style={{ background: `${color}14`, color }}>
                        <span className="dot" style={{ background: color, width: 6, height: 6, borderRadius: '50%', display: 'inline-block' }} />
                        {category}
                      </span>
                      {hasTags && task.tags!.map((tag) => (
                        <span key={tag} className="k-tag id">
                          <span className="at">#</span>
                          {tag}
                        </span>
                      ))}
                    </div>
                    
                    {(task.scheduledTime || task.date) && (
                      <div className="kanban-card-metrics">
                        {task.scheduledTime && (
                          <span className="k-tag time">
                            <Clock size={10} style={{ marginRight: 2 }} />
                            {task.scheduledTime}
                          </span>
                        )}
                        {isOverdue && (
                          <span className="k-tag sla" style={{ background: 'rgba(212, 71, 82, 0.1)', color: '#d44752' }}>
                            Overdue
                          </span>
                        )}
                        {task.date && (
                          <span className={`k-tag sla ${task.completed ? 'sla-done' : ''}`}>
                            <span className="flag">⚑</span>
                            {task.date.slice(5).replace('-', '/')}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="kanban-card-footer">
                      <div 
                        className="more-btn"
                        style={{ cursor: 'pointer', padding: 4, margin: -4 }}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (dropdownOpenFor === task.id) {
                            setDropdownOpenFor(null)
                            setDropdownCoords(null)
                          } else {
                            const rect = e.currentTarget.getBoundingClientRect()
                            const zoom = parseFloat(window.getComputedStyle(document.documentElement).zoom || '1')
                            const isLeftHalf = rect.left < window.innerWidth / 2
                            setDropdownOpenFor(task.id!)
                            setDropdownCoords({ 
                              top: rect.bottom / zoom, 
                              ...(isLeftHalf ? { left: rect.left / zoom } : { right: (window.innerWidth - rect.right) / zoom })
                            })
                          }
                        }}
                      >
                        <MoreHorizontal size={14} color="rgba(16,19,18,0.4)" />
                      </div>
                      <div className="kanban-assignees">
                        <div className="assignee-avatar" style={{ zIndex: 3, backgroundImage: `url(${firstAvatar})` }} />
                      </div>
                    </div>
                  </div>
                  {dropdownOpenFor === task.id && dropdownCoords && createPortal(
                    <div className="routine-card-dropdown" style={{ position: 'fixed', top: dropdownCoords.top + 8, left: dropdownCoords.left ?? 'auto', right: dropdownCoords.right ?? 'auto', zIndex: 100000 }} onClick={(e) => e.stopPropagation()}>
                      {onEditRequest && (
                        <button onClick={() => { setDropdownOpenFor(null); onEditRequest(task) }}>
                          <Pencil size={14} /> Edit
                        </button>
                      )}
                      {onToggle && (
                        <button onClick={() => { setDropdownOpenFor(null); onToggle(task) }}>
                          <Check size={14} /> {task.completed ? 'Reopen' : 'Complete'}
                        </button>
                      )}
                      {onDelete && (
                        <button className="danger" onClick={() => { setDropdownOpenFor(null); onDelete(task) }}>
                          <Trash2 size={14} /> Delete
                        </button>
                      )}
                    </div>,
                    document.body
                  )}
                  </React.Fragment>
                )
              })
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
