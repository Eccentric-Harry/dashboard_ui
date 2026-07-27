import { useEffect, useState, useCallback, useMemo } from 'react'
import { PieChart as PieIcon, X } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import type { LearningLog } from '../../../../lib/api'
import { learningsService } from '../../../../services/learnings-service'
import { getConsistentColor, getIconForCategory } from '../learnings-utils'

interface CategoryBreakdownCardProps {
  refreshKey: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomChartTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as { name: string; value: number; color?: string }
    return (
      <div
        style={{
          background: '#ffffff',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          padding: '10px 14px',
          borderRadius: '14px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
          zIndex: 9999,
          position: 'relative',
        }}
      >
        <p style={{ fontWeight: 700, margin: 0, color: '#101312', fontSize: '11px' }}>{data.name}</p>
        <p style={{ fontWeight: 800, margin: '2px 0 0', color: data.color || '#101312', fontSize: '14px' }}>{data.value} logs</p>
      </div>
    )
  }
  return null
}

export function CategoryBreakdownCard({ refreshKey }: CategoryBreakdownCardProps) {
  const [learnings, setLearnings] = useState<LearningLog[]>([])
  const [categories, setCategories] = useState<{ name: string; count: number }[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState<number>(-1)

  const loadCategories = useCallback(async () => {
    setLoading(true)
    try {
      const res = await learningsService.getLearnings()
      if (res.error) throw new Error(res.error.message)
      const list: LearningLog[] = res?.data ?? []
      setLearnings(list)

      const counts: Record<string, number> = {}
      list.forEach((log) => {
        const cat = log.category ? log.category.trim() : 'General'
        counts[cat] = (counts[cat] || 0) + 1
      })

      const sorted = Object.entries(counts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)

      setCategories(sorted)
    } catch (err) {
      console.error('Failed to load category counts', err)
      setCategories([])
      setLearnings([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadCategories()
  }, [loadCategories, refreshKey])

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onPieClick = useCallback((data: any) => {
    if (data && data.name) {
      setSelectedCategory((prev) => (prev === data.name ? null : data.name))
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
        <PieIcon size={15} style={{ display: 'inline', marginRight: 6, verticalAlign: -2, color: '#1a7a4a' }} />
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
                        style={{ cursor: 'pointer', outline: 'none', transition: 'fill-opacity 0.2s ease' }}
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
                    <span className="lo-cat-row-icon" style={{ backgroundColor: `${color}14`, color }}>
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
                        <span className="lo-cat-row-fill" style={{ width: `${percentage}%`, background: color }} />
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
