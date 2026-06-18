import { useEffect, useState, useCallback, useMemo } from 'react'
import { PieChart as PieIcon, X } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { fetchLearnings } from '../../../../lib/api'
import type { LearningLog } from '../../../../lib/api'
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
        className="learnings-chart-tooltip" 
        style={{ 
          background: '#ffffff', 
          border: '1px solid rgba(0, 0, 0, 0.08)',
          padding: '10px 14px', 
          borderRadius: '14px', 
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
          zIndex: 9999,
          position: 'relative'
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
      const res = await fetchLearnings()
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
    <section className="learnings-card learnings-category-card flex flex-col h-full">
      <p className="learnings-card-eyebrow text-xs uppercase tracking-wider text-gray-400 font-bold">DISTRIBUTION</p>
      <h3 className="learnings-card-title text-lg font-bold text-gray-900 flex items-center gap-1.5 mb-4">
        <PieIcon size={16} className="text-[#1a7a4a]" />
        Learning Categories
      </h3>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch mt-2">
          {/* Column 1: Doughnut Chart Skeleton */}
          <div className="lg:col-span-4 relative flex items-center justify-center min-h-[220px]">
            {/* Shimmering circle representing the pie chart ring */}
            <div className="skeleton-circle skeleton-shimmer" style={{ width: 140, height: 140, border: '16px solid rgba(23, 28, 25, 0.04)', background: 'transparent' }} />
            {/* Center Text Skeleton */}
            <div 
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                pointerEvents: 'none'
              }}
            >
              <span className="skeleton-rect skeleton-shimmer" style={{ width: 40, height: 10, margin: '0 auto 4px' }} />
              <span className="skeleton-rect skeleton-shimmer" style={{ width: 25, height: 20, margin: '0 auto' }} />
            </div>
          </div>

          {/* Column 2: Legends list Skeleton */}
          <div className="lg:col-span-4 flex flex-col justify-center">
            <div className="flex flex-col gap-2.5">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-2.5 rounded-xl border border-transparent bg-white/30"
                >
                  <div className="w-7 h-7 rounded-lg skeleton-rect skeleton-shimmer" />
                  <div className="min-w-0 flex-1">
                    <span className="skeleton-rect skeleton-shimmer mb-1.5" style={{ width: idx % 2 === 0 ? '55%' : '45%', height: 11 }} />
                    <span className="skeleton-rect skeleton-shimmer" style={{ width: '70%', height: 8 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 3: Linked learnings section Skeleton */}
          <div className="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-gray-100 pt-6 lg:pt-0 lg:pl-6 flex flex-col justify-center">
            <div className="flex flex-col items-center justify-center flex-1 text-center py-6 px-4 bg-gray-50/20 rounded-2xl border border-dashed border-gray-200/50">
              <span className="skeleton-circle skeleton-shimmer mb-2.5" style={{ width: 24, height: 24 }} />
              <span className="skeleton-rect skeleton-shimmer mb-1.5" style={{ width: 80, height: 10 }} />
              <span className="skeleton-rect skeleton-shimmer" style={{ width: 140, height: 8 }} />
            </div>
          </div>
        </div>
      ) : categories.length === 0 ? (
        <p className="learnings-empty py-12 text-center text-xs text-gray-400 italic">
          No category distribution found.
        </p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch mt-2">
          {/* Column 1: Doughnut Chart */}
          <div className="lg:col-span-4 relative flex items-center justify-center min-h-[220px]">
            <ResponsiveContainer width="99%" height="100%" minWidth={0} minHeight={0}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius="60%"
                  outerRadius="80%"
                  dataKey="value"
                  nameKey="name"
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
                            ? 0.3
                            : activeIndex === -1 || activeIndex === index
                              ? 1
                              : 0.5
                      }
                      style={{ cursor: 'pointer', outline: 'none', transition: 'fill-opacity 0.2s ease' }}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomChartTooltip />} offset={15} />
              </PieChart>
            </ResponsiveContainer>

            {/* Center Text */}
            <div 
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                pointerEvents: 'none'
              }}
            >
              <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider truncate max-w-[120px]">
                {centerIndex !== -1 ? categories[centerIndex].name : 'Total'}
              </span>
              <span className="block text-2xl font-extrabold text-gray-900 mt-0.5">
                {centerIndex !== -1 ? categories[centerIndex].count : totalLogs}
              </span>
            </div>
          </div>

          {/* Column 2: Legends list (Interactive Grid) */}
          <div className="lg:col-span-4 flex flex-col justify-center">
            <div className="flex flex-col gap-2.5">
              {categories.map((cat) => {
                const color = getConsistentColor(cat.name)
                const Icon = getIconForCategory(cat.name)
                const percentage = totalLogs > 0 ? Math.round((cat.count / totalLogs) * 100) : 0
                const isSelected = selectedCategory === cat.name

                return (
                  <div
                    key={cat.name}
                    onClick={() => handleCategorySelect(cat.name)}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? 'bg-gray-50 border-gray-200 shadow-sm'
                        : 'border-transparent hover:bg-gray-50/50 bg-white/30'
                    }`}
                    style={{
                      opacity: selectedCategory && !isSelected ? 0.5 : 1
                    }}
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: `${color}12`,
                        color: color,
                      }}
                    >
                      <Icon size={14} strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold text-gray-800 truncate capitalize">
                        {cat.name}
                      </span>
                      <span className="block text-[10px] text-gray-400 font-medium font-mono">
                        {cat.count} logs ({percentage}%)
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Column 3: Linked learnings section */}
          <div className="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-gray-100 pt-6 lg:pt-0 lg:pl-6 flex flex-col justify-center">
            {selectedCategory ? (
              <div className="flex flex-col h-full justify-between">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">
                    Linked in "{selectedCategory}" ({linkedLearnings.length})
                  </span>
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className="w-5 h-5 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 transition-colors"
                    title="Clear selection"
                  >
                    <X size={10} />
                  </button>
                </div>
                
                <div className="flex flex-col gap-2.5 max-h-[180px] overflow-y-auto pr-1">
                  {linkedLearnings.map((log) => (
                    <div 
                      key={log.id} 
                      className="p-3 rounded-2xl bg-white/40 border border-gray-100/80 hover:border-gray-200/50 hover:bg-white/80 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.01)]"
                    >
                      <div className="flex justify-between items-start mb-1 gap-2">
                        <h4 className="text-xs font-bold text-gray-900 leading-snug">{log.title}</h4>
                        <span className="text-[9px] text-gray-400 font-mono shrink-0 font-bold">{log.date}</span>
                      </div>
                      {log.description && (
                        <p className="text-[10.5px] text-gray-500 leading-relaxed break-words whitespace-pre-wrap line-clamp-3">
                          {log.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 text-center py-6 px-4 bg-gray-50/20 rounded-2xl border border-dashed border-gray-200/50">
                <PieIcon className="text-gray-300 mb-2" size={24} />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Inspect Category</span>
                <p className="text-[10.5px] text-gray-400/80 mt-1 max-w-[200px] leading-normal">Click a doughnut slice or category button to inspect linked learnings.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
