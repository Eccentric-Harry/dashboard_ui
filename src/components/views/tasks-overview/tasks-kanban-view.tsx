import type { DailyTask } from '../../../lib/api'

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

function formatFriendlyDate(dateStr: string) {
  if (!dateStr) return ''
  try {
    const parts = dateStr.split('-').map(Number)
    if (parts.length === 3) {
      const d = new Date(parts[0], parts[1] - 1, parts[2])
      const today = new Date()
      if (d.toDateString() === today.toDateString()) return 'Today'
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
    return dateStr
  } catch {
    return dateStr
  }
}

const COLUMNS = [
  { key: 'TODO', label: 'To Do', dot: 'rgba(16,19,18,0.2)' },
  { key: 'IN_PROGRESS', label: 'In Progress', dot: '#0ea5e9' },
  { key: 'DONE', label: 'Done', dot: '#10b981' },
] as const

type ColumnKey = 'TODO' | 'IN_PROGRESS' | 'DONE'

interface TasksKanbanViewProps {
  tasks: DailyTask[]
  onSelect: (task: DailyTask) => void
  onStatusChange: (taskId: string, newStatus: string) => void
}

export function TasksKanbanView({ tasks, onSelect, onStatusChange }: TasksKanbanViewProps) {
  const grouped: Record<ColumnKey, DailyTask[]> = { TODO: [], IN_PROGRESS: [], DONE: [] }

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
        <div key={col.key} className="tasks-kanban-column">
          <div className="tasks-kanban-column-header">
            <div className="col-info">
              <span className="col-dot" style={{ background: col.dot }} />
              <h4>{col.label}</h4>
            </div>
            <span className="kanban-count">{grouped[col.key].length}</span>
          </div>
          <div 
            className="tasks-kanban-body"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, col.key)}
          >
            {grouped[col.key].length === 0 ? (
              <div style={{ padding: '20px 10px', textAlign: 'center', fontSize: 12, color: 'rgba(16,19,18,0.25)', fontWeight: 500 }}>
                No tasks
              </div>
            ) : (
              grouped[col.key].map((task) => {
                const storedCat = task.category as string | undefined
                const detected = detectCategory(task.title)
                const category = storedCat || detected
                const color = CATEGORY_COLORS[category as TaskCategory] || CATEGORY_COLORS.General

                return (
                  <div
                    key={task.id}
                    draggable={!!task.id}
                    onDragStart={(e) => task.id && handleDragStart(e, task.id)}
                    onDragEnd={handleDragEnd}
                    className={`tasks-kanban-card ${task.completed ? 'is-completed' : ''}`}
                    onClick={() => onSelect(task)}
                    style={{ cursor: task.id ? 'grab' : 'pointer' }}
                  >
                    <div className="kanban-title">{task.title}</div>
                    <div className="kanban-footer">
                      <span className="kanban-badge" style={{ background: `${color}14`, color }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, display: 'inline-block' }} />
                        {category}
                      </span>
                      {task.date && <span className="kanban-date">{formatFriendlyDate(task.date)}</span>}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
