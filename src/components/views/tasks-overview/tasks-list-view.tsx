import { Check, Clock, Briefcase, BookOpen, Dumbbell, ShoppingCart, Sparkles, DollarSign, CheckSquare } from 'lucide-react'
import type { DailyTask } from '../../../lib/api'

type TaskCategory = 'Work' | 'Learning' | 'Fitness' | 'Shopping' | 'Chores' | 'Finance' | 'Personal' | 'General'

const CATEGORY_THEMES: Record<TaskCategory, { color: string; bg: string; text: string; icon: React.ComponentType<{ size?: number }> }> = {
  Work: { color: '#0ea5e9', bg: 'rgba(14,165,233,0.08)', text: '#0369a1', icon: Briefcase },
  Learning: { color: '#6366f1', bg: 'rgba(99,102,241,0.08)', text: '#4338ca', icon: BookOpen },
  Fitness: { color: '#f97316', bg: 'rgba(249,115,22,0.08)', text: '#c2410c', icon: Dumbbell },
  Shopping: { color: '#d97706', bg: 'rgba(217,119,6,0.08)', text: '#b45309', icon: ShoppingCart },
  Chores: { color: '#a855f7', bg: 'rgba(168,85,247,0.08)', text: '#7e22ce', icon: Sparkles },
  Finance: { color: '#10b981', bg: 'rgba(16,185,129,0.08)', text: '#047857', icon: DollarSign },
  Personal: { color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)', text: '#6d28d9', icon: Sparkles },
  General: { color: '#14b8a6', bg: 'rgba(20,184,166,0.08)', text: '#0f766e', icon: CheckSquare },
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
      {tasks.map((task) => {
        const storedCategory = task.category as string | undefined
        const detected = detectCategory(task.title)
        const category = storedCategory || detected
        const theme = CATEGORY_THEMES[category as TaskCategory] || CATEGORY_THEMES.General
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
                <span className="k-tag dept" style={{ background: `${theme.color}14`, color: theme.color }}>
                  <span className="dot" style={{ background: theme.color, width: 6, height: 6, borderRadius: '50%', display: 'inline-block' }} />
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
  )
}
