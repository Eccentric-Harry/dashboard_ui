import { useState, useMemo, type CSSProperties } from 'react'
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

type DueTone = 'overdue' | 'today' | 'soon' | 'later' | 'done'

/**
 * One due chip that says what the date *means*. Every date used to render as the
 * same red ⚑ chip — a task due next month looked exactly as alarming as one
 * three weeks late — with a separate "Overdue" chip bolted on. Red is now
 * reserved for work that is actually late.
 */
function dueInfo(task: DailyTask): { tone: DueTone; label: string } | null {
  if (!task.date) return null
  const [y, m, d] = task.date.split('-').map(Number)
  if (!y || !m || !d) return null

  const date = new Date(y, m - 1, d)
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  // Rounded, not floored: a DST shift makes a calendar day 23 or 25 hours long.
  const diffDays = Math.round((date.getTime() - startOfToday.getTime()) / 86400000)
  const short = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  if (task.completed) return { tone: 'done', label: short }
  if (isOverdue(task)) return { tone: 'overdue', label: diffDays === 0 ? 'Overdue · today' : `Overdue · ${short}` }
  if (diffDays === 0) return { tone: 'today', label: 'Today' }
  if (diffDays === 1) return { tone: 'soon', label: 'Tomorrow' }
  return { tone: 'later', label: short }
}

/** Open work first: late, then soonest due, then undated. */
const byUrgency = (a: DailyTask, b: DailyTask) => {
  const aLate = isOverdue(a)
  const bLate = isOverdue(b)
  if (aLate !== bLate) return aLate ? -1 : 1
  if (!a.date !== !b.date) return a.date ? -1 : 1
  return (a.date || '').localeCompare(b.date || '')
}

interface TasksListViewProps {
  tasks: DailyTask[]
  selectedTask: DailyTask | null
  onSelect: (task: DailyTask) => void
  onToggle: (task: DailyTask) => void
}

const COMPLETED_PREVIEW_COUNT = 3

const getCategoryIcon = (cat: string, size = 15) => {
  const props = { size, strokeWidth: 2.2 }
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

export function TasksListView({ tasks, selectedTask, onSelect, onToggle }: TasksListViewProps) {
  // Only explicit user choices are stored; a group with nothing open starts
  // collapsed until the user opens it.
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({})
  const [completedExpanded, setCompletedExpanded] = useState<Record<string, boolean>>({})

  const toggleCompleted = (category: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setCompletedExpanded((prev) => ({
      ...prev,
      [category]: !prev[category]
    }))
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

  // Groups that need attention lead: anything overdue, then anything open. A
  // category with every task done drops to the end instead of holding the top
  // slot on the strength of its name.
  const sortedCategories = useMemo(() => {
    const definedOrder = ['Work', 'Learning', 'Personal', 'General']
    const stats = (cat: string) => {
      const list = groupedTasks[cat]
      return {
        open: list.filter((t) => !t.completed).length,
        overdue: list.filter(isOverdue).length,
      }
    }

    return Object.keys(groupedTasks).sort((a, b) => {
      const sa = stats(a)
      const sb = stats(b)
      if ((sa.open > 0) !== (sb.open > 0)) return sa.open > 0 ? -1 : 1
      if (sa.overdue !== sb.overdue) return sb.overdue - sa.overdue

      if (a === 'Movies') return 1
      if (b === 'Movies') return -1

      const indexA = definedOrder.indexOf(a)
      const indexB = definedOrder.indexOf(b)
      if (indexA !== -1 && indexB !== -1) return indexA - indexB
      if (indexA !== -1) return -1
      if (indexB !== -1) return 1
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

  return (
    <div className="tasks-list-view">
      {sortedCategories.map((category) => {
        const categoryTasks = groupedTasks[category]
        const categoryInfo = getTagColor(category)

        const pendingTasks = categoryTasks.filter((t) => !t.completed).sort(byUrgency)
        const completedTasks = categoryTasks.filter((t) => t.completed)
        const overdueCount = pendingTasks.filter(isOverdue).length
        const totalCount = categoryTasks.length
        const allDone = pendingTasks.length === 0
        const donePct = totalCount > 0 ? Math.round((completedTasks.length / totalCount) * 100) : 0

        const isCollapsed = collapsedCategories[category] ?? allDone
        const isCompletedExpanded = completedExpanded[category]

        // If all tasks are done, show first 3 as preview; otherwise show all pending + collapsible completed
        const previewCompleted = allDone
          ? completedTasks.slice(0, COMPLETED_PREVIEW_COUNT)
          : (isCompletedExpanded ? completedTasks : [])
        const hiddenCompletedCount = allDone
          ? completedTasks.length - COMPLETED_PREVIEW_COUNT
          : completedTasks.length

        const summary = allDone
          ? `All ${totalCount} done`
          : `${pendingTasks.length} open · ${completedTasks.length} done`

        const renderTask = (task: DailyTask) => {
          const due = dueInfo(task)
          const isSelected = selectedTask?.id === task.id
          const className = [
            'tasks-list-card',
            task.completed && 'is-completed',
            isSelected && 'is-selected',
            due?.tone === 'overdue' && 'is-overdue',
            due?.tone === 'today' && 'is-today',
          ].filter(Boolean).join(' ')

          return (
            <div key={task.id} className={className} onClick={() => onSelect(task)}>
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
                <div className="task-list-meta">
                  {due && <span className={`task-chip due-${due.tone}`}>{due.label}</span>}

                  {!task.completed && task.scheduledTime && (
                    <span className="task-chip">
                      <Clock size={10} strokeWidth={2.4} />
                      {task.scheduledTime}
                    </span>
                  )}

                  {!task.completed && task.tags?.map((tag) => (
                    <span key={tag} className="task-chip tag">#{tag}</span>
                  ))}

                  {!task.completed && task.createdAt && (
                    <span className="task-added">
                      added {new Date(task.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        }

        return (
          <section
            key={category}
            className={`tasks-accordion-group ${isCollapsed ? 'is-collapsed' : ''} ${allDone ? 'is-all-done' : ''}`}
            style={{ '--cat': categoryInfo.dot } as CSSProperties}
          >
            <button
              type="button"
              className="tasks-accordion-header"
              onClick={() => setCollapsedCategories((prev) => ({ ...prev, [category]: !isCollapsed }))}
              aria-expanded={!isCollapsed}
            >
              <span className="tasks-group-icon">{getCategoryIcon(category)}</span>
              <span className="tasks-group-titles">
                <span className="tasks-group-title">{category}</span>
                <span className="tasks-group-sub">{summary}</span>
              </span>
              {overdueCount > 0 && <span className="tasks-group-alert">{overdueCount} overdue</span>}
              <ChevronDown size={16} className={`tasks-accordion-chevron ${isCollapsed ? 'is-collapsed' : ''}`} />
            </button>

            <div
              className="tasks-group-progress"
              role="progressbar"
              aria-label={`${category} progress`}
              aria-valuenow={donePct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <i style={{ width: `${donePct}%` }} />
            </div>

            <div className={`tasks-accordion-content ${isCollapsed ? 'is-collapsed' : ''}`}>
              {!allDone && pendingTasks.map(renderTask)}
              {previewCompleted.map(renderTask)}

              {allDone && hiddenCompletedCount > 0 && (
                <button
                  type="button"
                  className="tasks-completed-toggle"
                  onClick={(e) => toggleCompleted(category, e)}
                >
                  <ChevronDown size={12} className={isCompletedExpanded ? 'rotate-180' : ''} />
                  {isCompletedExpanded
                    ? `Hide ${hiddenCompletedCount} completed`
                    : `Show ${hiddenCompletedCount} more completed`}
                </button>
              )}
              {allDone && isCompletedExpanded && completedTasks.slice(COMPLETED_PREVIEW_COUNT).map(renderTask)}

              {!allDone && completedTasks.length > 0 && (
                <button
                  type="button"
                  className="tasks-completed-toggle"
                  onClick={(e) => toggleCompleted(category, e)}
                >
                  <ChevronDown size={12} className={isCompletedExpanded ? 'rotate-180' : ''} />
                  {isCompletedExpanded
                    ? `Hide ${completedTasks.length} completed`
                    : `${completedTasks.length} completed`}
                </button>
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}
