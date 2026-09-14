import type { CSSProperties } from 'react'

/**
 * Loading placeholders for the /tasks views.
 *
 * Each variant is built from the same class names as the real view (`.tg` / `.tr`
 * for List, the kanban column + card classes, the calendar grid), so the page keeps
 * its exact geometry when data lands instead of jumping. Only the text-bearing parts
 * become shimmering bones; static chrome (kanban column labels, weekday headers) stays
 * real, which gives the eye something to anchor on while it waits.
 */

type TasksViewMode = 'list' | 'kanban' | 'calendar'

interface BoneProps {
  width?: string | number
  height?: string | number
  radius?: string | number
  className?: string
}

const toLength = (value: string | number) => (typeof value === 'number' ? `${value}px` : value)

function Bone({ width = '100%', height = 10, radius = 5, className }: BoneProps) {
  const style = {
    '--skel-w': toLength(width),
    '--skel-h': toLength(height),
    '--skel-r': toLength(radius),
  } as CSSProperties
  return <span className={className ? `tasks-skel-bone ${className}` : 'tasks-skel-bone'} style={style} aria-hidden="true" />
}

/** Stagger index consumed by the card entrance animation. */
const staggerStyle = (index: number) => ({ '--skel-i': index }) as CSSProperties

// ── List ─────────────────────────────────────────────────────────────────────

/** Row title widths, cycled so neighbouring rows never line up into a grid of bars. */
const ROW_WIDTHS = ['74%', '56%', '86%', '48%', '67%', '79%']

/** Two balanced columns of list cards, mirroring tasks-list-view's column dealing. */
const LIST_COLUMNS: { title: number; rows: number }[][] = [
  [
    { title: 72, rows: 4 },
    { title: 58, rows: 2 },
  ],
  [
    { title: 84, rows: 3 },
    { title: 64, rows: 3 },
  ],
]

function ListSkeleton() {
  let rowSeed = 0
  let cardIndex = 0

  return (
    <div className="tasks-list-view tasks-list-view--cols">
      {LIST_COLUMNS.map((column, columnIndex) => (
        <div key={columnIndex} className="tasks-list-col">
          {column.map((group, groupIndex) => {
            const index = cardIndex++
            return (
              <div key={groupIndex} className="tasks-list-cell" style={{ order: index }}>
                <section className="tg tasks-skel-card" style={staggerStyle(index)}>
                  <div className="tg-head">
                    <Bone width={30} height={30} radius="50%" />
                    <span className="tg-title">
                      <Bone width={group.title} height={12} />
                    </span>
                    <Bone width={16} height={11} />
                  </div>
                  <ul className="tg-rows">
                    {Array.from({ length: group.rows }, (_, rowIndex) => {
                      const seed = rowSeed++
                      return (
                        <li key={rowIndex} className="tr">
                          <Bone width={18} height={18} radius="50%" className="tasks-skel-check" />
                          <div className="tr-body">
                            <Bone width={ROW_WIDTHS[seed % ROW_WIDTHS.length]} height={11} />
                            <span className="tr-meta">
                              <Bone width={seed % 3 === 0 ? 72 : 48} height={9} />
                              {seed % 2 === 1 && <Bone width={38} height={9} />}
                            </span>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ── Kanban ───────────────────────────────────────────────────────────────────

const KANBAN_COLUMNS = [
  { key: 'TODO', label: 'Assigned', dot: '#6b7280', cards: 3 },
  { key: 'IN_PROGRESS', label: 'In Progress', dot: '#3b82f6', cards: 2 },
  { key: 'DONE', label: 'Complete', dot: '#10b981', cards: 1 },
] as const

function KanbanSkeleton() {
  let cardIndex = 0

  return (
    <div className="tasks-kanban-view">
      {KANBAN_COLUMNS.map((column) => (
        <div key={column.key} className="tasks-kanban-column new-design">
          <div className="tasks-kanban-column-header">
            <div className="col-info">
              <span className="col-bar" style={{ background: column.dot }} />
              <h4>{column.label}</h4>
              <Bone width={18} height={18} radius="50%" />
            </div>
          </div>
          <div className="tasks-kanban-body">
            {Array.from({ length: column.cards }, (_, index) => {
              const seed = cardIndex++
              return (
                <div key={index} className="tasks-kanban-card new-card tasks-skel-card" style={staggerStyle(seed)}>
                  <Bone width={ROW_WIDTHS[seed % ROW_WIDTHS.length]} height={13} />
                  <div className="tasks-skel-stack">
                    <Bone width="94%" height={9} />
                    <Bone width="62%" height={9} />
                  </div>
                  <div className="kanban-card-tags">
                    <Bone width={seed % 2 === 0 ? 68 : 54} height={20} radius={6} />
                    {seed % 3 !== 2 && <Bone width={46} height={20} radius={6} />}
                  </div>
                  <div className="kanban-card-footer">
                    <Bone width={16} height={6} radius={3} />
                    <Bone width={20} height={20} radius="50%" />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Calendar ─────────────────────────────────────────────────────────────────

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const CALENDAR_CELLS = 35

/** How many task blocks a placeholder day carries — a sparse, irregular pattern. */
const blocksForCell = (index: number) => [0, 1, 0, 2, 1, 0, 0, 3, 0, 1, 2][index % 11]

function CalendarSkeleton() {
  return (
    <div className="tasks-calendar-view">
      <div className="calendar-nav">
        <Bone width={132} height={15} />
        <div className="tasks-skel-row">
          <Bone width={52} height={26} radius={8} />
          <Bone width={26} height={26} radius={8} />
          <Bone width={26} height={26} radius={8} />
        </div>
      </div>
      <div className="calendar-scroll-area">
        <div className="calendar-grid">
          {DAY_NAMES.map((day) => (
            <div key={day} className="calendar-day-header">{day}</div>
          ))}
          {Array.from({ length: CALENDAR_CELLS }, (_, index) => (
            <div key={index} className="calendar-day">
              <Bone width={14} height={10} className="tasks-skel-day-number" />
              <div className="calendar-day-tasks">
                {Array.from({ length: blocksForCell(index) }, (_, block) => (
                  <Bone key={block} width={block === 0 ? '100%' : '78%'} height={16} radius={5} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Public ───────────────────────────────────────────────────────────────────

const VARIANTS: Record<TasksViewMode, () => React.JSX.Element> = {
  list: ListSkeleton,
  kanban: KanbanSkeleton,
  calendar: CalendarSkeleton,
}

export function TasksSkeleton({ viewMode }: { viewMode: TasksViewMode }) {
  const Variant = VARIANTS[viewMode]
  return (
    <div className="tasks-skel" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading tasks…</span>
      <Variant />
    </div>
  )
}
