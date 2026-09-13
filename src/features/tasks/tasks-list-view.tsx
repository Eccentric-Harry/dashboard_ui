import { useState, useMemo, type CSSProperties } from 'react'
import { Check, Clock, CheckSquare, ChevronDown, CalendarDays } from 'lucide-react'
import type { DailyTask } from '@/lib/api'
import { getTagColor } from '@/lib/tag-colors'

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
 * The due date as plain meta text whose colour means something: red only for
 * work that is actually late, amber for today, blue for tomorrow, muted
 * otherwise. No chip — a filled pill on every row made every date shout.
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

/** Most recently due first, so the freshest wins lead the completed list. */
const byRecent = (a: DailyTask, b: DailyTask) => (b.date || '').localeCompare(a.date || '')

const DONE_PAGE = 10
const RING_R = 8
const RING_C = 2 * Math.PI * RING_R

/** Things-style progress ring beside the list title — fills as tasks close. */
function ProgressRing({ pct }: { pct: number }) {
  return (
    <svg className="tg-ring" viewBox="0 0 22 22" aria-hidden="true">
      <circle cx="11" cy="11" r={RING_R} className="tg-ring-track" />
      <circle
        cx="11"
        cy="11"
        r={RING_R}
        className="tg-ring-fill"
        strokeDasharray={RING_C}
        strokeDashoffset={RING_C * (1 - pct / 100)}
        transform="rotate(-90 11 11)"
      />
    </svg>
  )
}

interface TasksListViewProps {
  tasks: DailyTask[]
  selectedTask: DailyTask | null
  onSelect: (task: DailyTask) => void
  onToggle: (task: DailyTask) => void
}

export function TasksListView({ tasks, selectedTask, onSelect, onToggle }: TasksListViewProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [showDone, setShowDone] = useState<Record<string, boolean>>({})
  // Completed lists on the shelf: which are open, and how many rows each shows.
  const [shelfOpen, setShelfOpen] = useState<Record<string, boolean>>({})
  const [shelfLimit, setShelfLimit] = useState<Record<string, number>>({})

  const groupedTasks = useMemo(() => {
    const groups: Record<string, DailyTask[]> = {}
    tasks.forEach((task) => {
      const storedCategory = task.category as string | undefined
      const category = storedCategory || detectCategory(task.title) || 'General'
      ;(groups[category] ??= []).push(task)
    })
    return groups
  }, [tasks])

  // Lists with open work lead (most overdue first); lists with nothing left
  // leave the grid entirely and collapse onto one "Completed" shelf.
  const { openGroups, doneGroups } = useMemo(() => {
    const definedOrder = ['Work', 'Learning', 'Personal', 'General']
    const rank = (cat: string) => {
      const i = definedOrder.indexOf(cat)
      return cat === 'Movies' ? 99 : i === -1 ? 50 : i
    }
    const stats = (cat: string) => ({
      open: groupedTasks[cat].filter((t) => !t.completed).length,
      overdue: groupedTasks[cat].filter(isOverdue).length,
    })
    const cats = Object.keys(groupedTasks)
    const open = cats.filter((c) => stats(c).open > 0).sort((a, b) =>
      stats(b).overdue - stats(a).overdue || rank(a) - rank(b) || a.localeCompare(b),
    )
    const done = cats.filter((c) => stats(c).open === 0).sort((a, b) =>
      groupedTasks[b].length - groupedTasks[a].length || a.localeCompare(b),
    )
    return { openGroups: open, doneGroups: done }
  }, [groupedTasks])

  if (tasks.length === 0) {
    return (
      <div className="tasks-empty-state">
        <CheckSquare size={32} strokeWidth={1.5} />
        <p>No tasks found</p>
      </div>
    )
  }

  const renderTask = (task: DailyTask) => {
    const due = dueInfo(task)
    const isSelected = selectedTask?.id === task.id
    const showTime = !task.completed && task.scheduledTime
    const tags = task.completed ? [] : task.tags ?? []

    return (
      <li
        key={task.id}
        className={`tr${task.completed ? ' is-done' : ''}${isSelected ? ' is-selected' : ''}`}
        onClick={() => onSelect(task)}
      >
        <button
          type="button"
          className="tr-check"
          onClick={(e) => { e.stopPropagation(); onToggle(task) }}
          aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
        >
          {task.completed && <Check size={10} strokeWidth={3.4} />}
        </button>

        <div className="tr-body">
          <span className="tr-title">{task.title}</span>
          {(due || showTime || tags.length > 0) && (
            <span className="tr-meta">
              {due && (
                <span className={`tr-due is-${due.tone}`}>
                  <CalendarDays size={11} strokeWidth={2.2} aria-hidden="true" />
                  {due.label}
                </span>
              )}
              {showTime && (
                <span className="tr-time">
                  <Clock size={11} strokeWidth={2.2} aria-hidden="true" />
                  {task.scheduledTime}
                </span>
              )}
              {tags.map((tag) => (
                <span key={tag} className="tr-tag">#{tag}</span>
              ))}
            </span>
          )}
        </div>
      </li>
    )
  }

  return (
    <div className="tasks-list-view">
      {openGroups.map((category) => {
        const list = groupedTasks[category]
        const pending = list.filter((t) => !t.completed).sort(byUrgency)
        const completed = list.filter((t) => t.completed).sort(byRecent)
        const overdue = pending.filter(isOverdue).length
        const pct = Math.round((completed.length / list.length) * 100)
        const isCollapsed = !!collapsed[category]
        const doneVisible = !!showDone[category]

        return (
          <section
            key={category}
            className={`tg${isCollapsed ? ' is-collapsed' : ''}`}
            style={{ '--cat': getTagColor(category).dot } as CSSProperties}
          >
            <button
              type="button"
              className="tg-head"
              onClick={() => setCollapsed((prev) => ({ ...prev, [category]: !isCollapsed }))}
              aria-expanded={!isCollapsed}
            >
              <ProgressRing pct={pct} />
              <span className="tg-title">{category}</span>
              {overdue > 0 && <span className="tg-overdue">{overdue} overdue</span>}
              <span className="tg-count" aria-label={`${pending.length} open`}>{pending.length}</span>
              <ChevronDown size={15} className="tg-chev" aria-hidden="true" />
            </button>

            {!isCollapsed && (
              <>
                <ul className="tg-rows">
                  {pending.map(renderTask)}
                  {doneVisible && completed.map(renderTask)}
                </ul>
                {completed.length > 0 && (
                  <button
                    type="button"
                    className="tg-more"
                    onClick={() => setShowDone((prev) => ({ ...prev, [category]: !doneVisible }))}
                  >
                    {doneVisible ? 'Hide completed' : `${completed.length} completed`}
                  </button>
                )}
              </>
            )}
          </section>
        )
      })}

      {doneGroups.length > 0 && (
        <section className="tg tg--shelf" aria-label="Completed lists">
          <div className="tg-shelf-head">
            <span className="tg-title">Completed</span>
            <span className="tg-count">{doneGroups.length} {doneGroups.length === 1 ? 'list' : 'lists'}</span>
          </div>
          <ul className="tg-shelf-list">
            {doneGroups.map((category) => {
              const completed = [...groupedTasks[category]].sort(byRecent)
              const isOpen = !!shelfOpen[category]
              const limit = shelfLimit[category] ?? DONE_PAGE
              return (
                <li key={category} style={{ '--cat': getTagColor(category).dot } as CSSProperties}>
                  <button
                    type="button"
                    className="tg-shelf-row"
                    onClick={() => setShelfOpen((prev) => ({ ...prev, [category]: !isOpen }))}
                    aria-expanded={isOpen}
                  >
                    <span className="tg-shelf-dot" aria-hidden="true">
                      <Check size={10} strokeWidth={3.4} />
                    </span>
                    <span className="tg-shelf-name">{category}</span>
                    <span className="tg-count">{completed.length}</span>
                    <ChevronDown size={15} className="tg-chev" aria-hidden="true" />
                  </button>
                  {isOpen && (
                    <>
                      <ul className="tg-rows tg-rows--nested">
                        {completed.slice(0, limit).map(renderTask)}
                      </ul>
                      {completed.length > limit && (
                        <button
                          type="button"
                          className="tg-more tg-more--nested"
                          onClick={() => setShelfLimit((prev) => ({ ...prev, [category]: limit + DONE_PAGE * 2 }))}
                        >
                          Show more · {completed.length - limit} left
                        </button>
                      )}
                    </>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
