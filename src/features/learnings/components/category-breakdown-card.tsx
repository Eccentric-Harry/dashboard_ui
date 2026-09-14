import { useState, useCallback, useMemo, type CSSProperties } from 'react'
import { PieChart as PieIcon, X } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { useLearningsStore } from '@/store/learnings-store'
import { isAwaitingData } from '@/store/zustand-utils'
import { getConsistentColor, getIconForCategory, liftTone } from '../learnings-utils'
import type { ChartTooltipProps } from '@/lib/chart-tooltip'

const CustomChartTooltip = ({ active, payload }: ChartTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as { name: string; value: number; color?: string }
    return (
      <div className="lo-cat-tooltip" style={data.color ? ({ '--cat-tone': data.color } as CSSProperties) : undefined}>
        <p className="lo-cat-tooltip-name">{data.name}</p>
        <p className="lo-cat-tooltip-value">{data.value} logs</p>
      </div>
    )
  }
  return null
}

export function CategoryBreakdownCard() {
  const learningsState = useLearningsStore.use.learnings()
  const learnings = learningsState.data
  const loading = isAwaitingData(learningsState) && learnings.length === 0
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState<number>(-1)

  const categories = useMemo(() => {
    const counts: Record<string, number> = {}
    learnings.forEach((log) => {
      const cat = log.category ? log.category.trim() : 'General'
      counts[cat] = (counts[cat] || 0) + 1
    })
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [learnings])

  const chartData = useMemo(() => {
    return categories.map((cat) => ({
      name: cat.name,
      value: cat.count,
      color: getConsistentColor(cat.name),
    }))
  }, [categories])

  const totalLogs = useMemo(() => categories.reduce((sum, c) => sum + c.count, 0), [categories])

  const onPieEnter = useCallback((_: unknown, index: number) => {
    setActiveIndex(index)
  }, [])

  const onPieLeave = useCallback(() => {
    setActiveIndex(-1)
  }, [])

  const onPieClick = useCallback((data: { name?: unknown }) => {
    const name = data?.name
    if (typeof name === 'string' && name) {
      setSelectedCategory((prev) => (prev === name ? null : name))
    }
  }, [])

  const handleCategorySelect = (name: string) => {
    setSelectedCategory((prev) => (prev === name ? null : name))
  }

  const selectedIndex = useMemo(() => {
    if (!selectedCategory) return -1
    return categories.findIndex((c) => c.name === selectedCategory)
  }, [selectedCategory, categories])

  const centerIndex = selectedIndex !== -1 ? selectedIndex : activeIndex

  const linkedLearnings = useMemo(() => {
    if (!selectedCategory) return []
    return learnings.filter(
      (log) => (log.category ? log.category.trim().toLowerCase() : 'general') === selectedCategory.toLowerCase()
    )
  }, [selectedCategory, learnings])

  return (
    <section className="learnings-card lo-cat-card">
      <p className="learnings-card-eyebrow">Distribution</p>
      <h3 className="learnings-card-title">
        <PieIcon size={15} className="lo-cat-title-icon" style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} />
        Learning Categories
      </h3>

      {loading ? (
        <div className="lo-cat-layout">
          <div className="lo-cat-donut">
            <div className="skeleton-circle skeleton-shimmer" style={{ width: 116, height: 116, border: '14px solid rgba(23, 28, 25, 0.04)', background: 'transparent' }} />
          </div>
          <div className="lo-cat-legend">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="lo-cat-row" style={{ pointerEvents: 'none' }}>
                <div className="skeleton-rect skeleton-shimmer" style={{ width: 26, height: 26, borderRadius: 8 }} />
                <div style={{ flex: 1 }}>
                  <span className="skeleton-rect skeleton-shimmer" style={{ width: idx % 2 === 0 ? '55%' : '40%', height: 10, marginBottom: 6, display: 'block' }} />
                  <span className="skeleton-rect skeleton-shimmer" style={{ width: '85%', height: 5, display: 'block' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : categories.length === 0 ? (
        <p className="learnings-empty" style={{ marginTop: 16 }}>
          No category distribution found.
        </p>
      ) : (
        <>
          <div className="lo-cat-layout">
            {/* Donut */}
            <div className="lo-cat-donut">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius="66%"
                    outerRadius="88%"
                    dataKey="value"
                    nameKey="name"
                    paddingAngle={chartData.length > 1 ? 3 : 0}
                    cornerRadius={5}
                    onMouseEnter={onPieEnter}
                    onMouseLeave={onPieLeave}
                    onClick={onPieClick}
                    stroke="none"
                    isAnimationActive={false}
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        fillOpacity={
                          selectedCategory === entry.name
                            ? 1
                            : selectedCategory
                              ? 0.28
                              : activeIndex === -1 || activeIndex === index
                                ? 1
                                : 0.45
                        }
                        style={{ fill: liftTone(entry.color), cursor: 'pointer', outline: 'none', transition: 'fill-opacity 0.2s ease' }}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomChartTooltip />} offset={15} />
                </PieChart>
              </ResponsiveContainer>
              <div className="lo-cat-donut-center">
                <span className="lo-cat-donut-label">
                  {centerIndex !== -1 ? categories[centerIndex].name : 'Total'}
                </span>
                <span className="lo-cat-donut-value">
                  {centerIndex !== -1 ? categories[centerIndex].count : totalLogs}
                </span>
              </div>
            </div>

            {/* Legend with proportion bars */}
            <div className="lo-cat-legend">
              {categories.map((cat) => {
                const color = getConsistentColor(cat.name)
                const Icon = getIconForCategory(cat.name)
                const percentage = totalLogs > 0 ? Math.round((cat.count / totalLogs) * 100) : 0
                const isSelected = selectedCategory === cat.name
                const isDimmed = !!selectedCategory && !isSelected

                return (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => handleCategorySelect(cat.name)}
                    className={`lo-cat-row ${isSelected ? 'is-selected' : ''}`}
                    style={{ opacity: isDimmed ? 0.45 : 1 }}
                  >
                    <span className="lo-cat-row-icon" style={{ '--cat-tone': color } as CSSProperties}>
                      <Icon size={13} strokeWidth={2.4} />
                    </span>
                    <span className="lo-cat-row-body">
                      <span className="lo-cat-row-head">
                        <span className="lo-cat-row-name">{cat.name}</span>
                        <span className="lo-cat-row-count">
                          {cat.count} <em>· {percentage}%</em>
                        </span>
                      </span>
                      <span className="lo-cat-row-track">
                        <span className="lo-cat-row-fill" style={{ width: `${percentage}%`, '--cat-tone': color } as CSSProperties} />
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Linked learnings — appears only when a category is selected */}
          {selectedCategory && (
            <div className="lo-cat-linked">
              <div className="lo-cat-linked-head">
                <span>
                  Linked in “{selectedCategory}” ({linkedLearnings.length})
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedCategory(null)}
                  className="lo-cat-linked-clear"
                  title="Clear selection"
                >
                  <X size={10} />
                </button>
              </div>
              <div className="lo-cat-linked-list">
                {linkedLearnings.map((log) => (
                  <div key={log.id} className="lo-cat-linked-item">
                    <div className="lo-cat-linked-item-head">
                      <h4>{log.title}</h4>
                      <span>{log.date}</span>
                    </div>
                    {log.description && <p>{log.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}
