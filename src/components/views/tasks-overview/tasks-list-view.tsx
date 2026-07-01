import { useState, useMemo } from 'react'
import {
  Check,
  Clock,
  CheckSquare,
  ChevronDown,
  Briefcase,
  BookOpen,
  Dumbbell,
  ShoppingCart,
  Home,
  DollarSign,
  User,
  Hash,
  LayoutDashboard,
  Film
} from 'lucide-react'
import type { DailyTask } from '../../../lib/api'
import { getTagColor } from '../../../lib/tag-colors'

type TaskCategory = 'Work' | 'Learning' | 'Fitness' | 'Shopping' | 'Chores' | 'Finance' | 'Personal' | 'General' | 'Movies'

function detectCategory(title: string): TaskCategory {
  const t = title.toLowerCase()
  if (/\b(work|meeting|email|office|call|project|code|dev|pr\b|review|commit|deploy|github|api\b|backend|frontend|test\b|debug|design|sprint|standup)\b/.test(t)) return 'Work'
  if (/\b(learn|study|course|read|book|article|tutorial|lecture|homework|leetcode|notion)\b/.test(t)) return 'Learning'
  if (/\b(gym|run|workout|exercise|walk|yoga|meditate|health|fitness|protein|water)\b/.test(t)) return 'Fitness'
  if (/\b(buy|order|shop|groceries|purchase|gift)\b/.test(t)) return 'Shopping'
  if (/\b(laundry|clean|wash|tidy|fix|vacuum|dishes|cook|meal)\b/.test(t)) return 'Chores'
  if (/\b(finance|bill|pay|bank|credit|tax|rent|money|salary|budget)\b/.test(t)) return 'Finance'
  if (/\b(personal|family|friend|call\s+\w+|plan|travel|trip)\b/.test(t)) return 'Personal'
  if (/\b(watch|movie|film|netflix|show|series|cinema|season|episode|documentary|anime|youtube|stream)\b/.test(t)) return 'Movies'
  return 'General'
}

const isOverdue = (task: DailyTask) => {
  if (task.completed || !task.date) return false
  const parts = task.date.split('-').map(Number)
  if (parts.length !== 3) return false
  const d = new Date(parts[0], parts[1] - 1, parts[2])
  if (task.scheduledTime) {
    const timeMatch = task.scheduledTime.match(/^(\d+):(\d+)\s*(AM|PM)?$/i)
    if (timeMatch) {
      let h = parseInt(timeMatch[1], 10)
      const m = parseInt(timeMatch[2], 10)
      if (timeMatch[3]?.toUpperCase() === 'PM' && h < 12) h += 12
      if (timeMatch[3]?.toUpperCase() === 'AM' && h === 12) h = 0
      d.setHours(h, m, 0, 0)
    }
  } else {
    d.setHours(23, 59, 59, 999)
  }
  return new Date() > d
}

interface TasksListViewProps {
  tasks: DailyTask[]
  selectedTask: DailyTask | null
  onSelect: (task: DailyTask) => void
  onToggle: (task: DailyTask) => void
}

export function TasksListView({ tasks, selectedTask, onSelect, onToggle }: TasksListViewProps) {
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('tasks-expanded-categories')
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = { ...prev, [category]: !prev[category] }
      try {
        localStorage.setItem('tasks-expanded-categories', JSON.stringify(next))
      } catch (e) {
        console.error(e)
      }
      return next
    })
  }

  const groupedTasks = useMemo(() => {
    const groups: Record<string, DailyTask[]> = {}
    tasks.forEach((task) => {
      const storedCategory = task.category as string | undefined
      const detected = detectCategory(task.title)
      const category = storedCategory || detected || 'General'
      if (!groups[category]) {
        groups[category] = []
      }
      groups[category].push(task)
    })
    return groups
  }, [tasks])

  const sortedCategories = useMemo(() => {
    return Object.keys(groupedTasks).sort((a, b) => {
      if (a === 'General') return 1
      if (b === 'General') return -1
      return a.localeCompare(b)
    })
  }, [groupedTasks])

  if (tasks.length === 0) {
    return (
      <div className="tasks-empty-state">
        <CheckSquare size={32} strokeWidth={1.5} />
        <p>No tasks found</p>
      </div>
    )
  }

  const getCategoryIcon = (cat: string, color: string, size = 14) => {
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

  return (
    <div className="tasks-list-view">
      {sortedCategories.map((category) => {
        const categoryTasks = groupedTasks[category]
        const isCollapsed = !expandedCategories[category]
        const categoryInfo = getTagColor(category)
        const completedCount = categoryTasks.filter((t) => t.completed).length
        const totalCount = categoryTasks.length

        return (
          <div key={category} className="tasks-accordion-group">
            <div
              className="tasks-accordion-header"
              onClick={() => toggleCategory(category)}
            >
              <div className="tasks-accordion-header-left">
                {getCategoryIcon(category, categoryInfo.dot, 14)}
                <span className="tasks-accordion-title">{category}</span>
                <span className="tasks-accordion-badge">
                  {completedCount} / {totalCount} done
                </span>
              </div>
              <div className="tasks-accordion-header-right">
                <ChevronDown
                  size={16}
                  className={`tasks-accordion-chevron ${isCollapsed ? 'is-collapsed' : ''}`}
                />
              </div>
            </div>

            <div className={`tasks-accordion-content ${isCollapsed ? 'is-collapsed' : ''}`}>
              {categoryTasks.map((task) => {
                const isOverdueTask = isOverdue(task)
                const isSelected = selectedTask?.id === task.id

                return (
                  <div
                    key={task.id}
                    className={`tasks-list-card ${task.completed ? 'is-completed' : ''} ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => onSelect(task)}
                  >
                    <button
                      type="button"
                      className={`task-list-check ${task.completed ? 'checked' : ''}`}
                      onClick={(e) => { e.stopPropagation(); onToggle(task) }}
                      aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
                    >
                      {task.completed && <Check size={11} strokeWidth={3} />}
                    </button>

                    <div className="task-list-body">
                      <div className="task-list-title">{task.title}</div>
                      <div className="task-list-meta" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                        <span className="k-tag dept" style={{ background: categoryInfo.bg, color: categoryInfo.text }}>
                          <span className="dot" style={{ background: categoryInfo.dot, width: 6, height: 6, borderRadius: '50%', display: 'inline-block' }} />
                          {category}
                        </span>
                        
                        {task.tags && task.tags.length > 0 && task.tags.map((tag) => (
                          <span key={tag} className="k-tag id">
                            <span className="at">#</span>
                            {tag}
                          </span>
                        ))}
                        
                        {task.date && (
                          <span className={`k-tag sla ${task.completed ? 'sla-done' : ''}`}>
                            <span className="flag">⚑</span>
                            {task.date.slice(5).replace('-', '/')}
                          </span>
                        )}
                        
                        {task.scheduledTime && !task.completed && (
                          <span className="k-tag time">
                            <Clock size={10} style={{ marginRight: 2 }} />
                            {task.scheduledTime}
                          </span>
                        )}
                        
                        {isOverdueTask && (
                          <span className="k-tag sla" style={{ background: 'rgba(212, 71, 82, 0.1)', color: '#d44752' }}>
                            Overdue
                          </span>
                        )}
                        
                        {task.completed && (
                          <span className="k-tag sla sla-done" style={{ background: '#d1fae5', color: '#047857' }}>
                            <Check size={10} />
                            Done
                          </span>
                        )}
                        
                        {task.createdAt && (
                          <span className="k-tag id" style={{ background: 'rgba(16,19,18,0.03)', color: 'rgba(16,19,18,0.35)', fontSize: 9 }}>
                            Created {new Date(task.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
