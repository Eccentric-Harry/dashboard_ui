import { useMemo, useState, useCallback, useEffect, type CSSProperties } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { PieChart as PieChartIcon } from 'lucide-react'
import type { DailyFinancialLog } from '../../../../lib/api'
import { getIconForCategory, getConsistentColor } from '../utils'

interface SpendingOverviewCardProps {
  logs?: DailyFinancialLog[]
  selectedCategory?: string | null
  onCategorySelect?: (category: string | null) => void
  selectedMonthKey?: string
  onMonthSelect?: (monthKey: string) => void
  loading?: boolean
  /** Entrance-stagger index; drives the `--i` animation delay. */
  stagger?: number
}

const formatMonth = (dateString: string) => {
  const d = new Date(dateString)
  return d.toLocaleString('default', { month: 'long', year: 'numeric' })
}

const getMonthKey = (dateString: string) => {
  const d = new Date(dateString)
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`
}


// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as { label: string; rawAmount: number; share: string }
    return (
      <div 
        className="finance-chart-tooltip" 
        style={{ 
          background: 'rgba(255, 255, 255, 0.95)', 
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          padding: '12px 16px', 
          borderRadius: '16px', 
          boxShadow: '0 12px 30px rgba(0, 0, 0, 0.15)',
          zIndex: 9999,
          position: 'relative'
        }}
      >
        <p className="label" style={{ fontWeight: 700, margin: 0, color: '#101312', fontSize: '13px' }}>{data.label}</p>
        <p className="amount" style={{ fontWeight: 800, margin: '4px 0 0', color: '#101312', fontSize: '16px' }}>₹{data.rawAmount.toLocaleString()}</p>
        <p className="share" style={{ fontWeight: 600, margin: '4px 0 0', color: 'rgba(23, 28, 25, 0.5)', fontSize: '11px' }}>{data.share} of total</p>
      </div>
    )
  }
  return null
}

function SpendingOverviewCard({
  logs = [],
  selectedCategory = null,
  onCategorySelect,
  selectedMonthKey = '',
  onMonthSelect,
  loading = false,
  stagger = 0
}: SpendingOverviewCardProps) {
  // Extract all available months from logs
  const availableMonths = useMemo(() => {
    const monthsMap = new Map<string, string>()

    // Always include the current month
    const nowKey = getMonthKey(new Date().toISOString())
    monthsMap.set(nowKey, formatMonth(new Date().toISOString()))

    // Always include selectedMonthKey if it exists
    if (selectedMonthKey) {
      const [year, month] = selectedMonthKey.split('-')
      if (year && month) {
        const dummyDate = `${year}-${month}-01T00:00:00.000Z`
        monthsMap.set(selectedMonthKey, formatMonth(dummyDate))
      }
    }

    logs.forEach(log => {
      const key = getMonthKey(log.date)
      if (!monthsMap.has(key)) {
        monthsMap.set(key, formatMonth(log.date))
      }
    })

    // Sort descending (newest first)
    return Array.from(monthsMap.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [logs, selectedMonthKey])

  // Calculate spending for the selected month
  const spendingData = useMemo(() => {
    if (!selectedMonthKey) return { total: 0, topCategory: 'N/A', categories: [] }

    const categoryTotals: Record<string, number> = {}
    let totalSpent = 0

    logs.forEach(log => {
      if (getMonthKey(log.date) === selectedMonthKey) {
        Object.entries(log.transactions || {}).forEach(([category, txs]) => {
          const transactions = txs as Array<{ amount: number; type?: string }>
          // Spending = expenses only. Prefer the stored transaction type; fall back to
          // the category-name heuristic for legacy records without a type.
          const expenses = transactions.filter(tx =>
            tx.type
              ? tx.type.toLowerCase() === 'expense'
              : !(category.toLowerCase().includes('income') || category.toLowerCase().includes('salary'))
          )
          if (expenses.length === 0) return

          const sum = expenses.reduce((acc, tx) => acc + tx.amount, 0)
          categoryTotals[category] = (categoryTotals[category] || 0) + sum
          totalSpent += sum
        })
      }
    })

    const categoriesList = Object.entries(categoryTotals).map(([label, value]) => {
      const shareValue = totalSpent > 0 ? (value / totalSpent) * 100 : 0
      return {
        label,
        value: `₹${value.toLocaleString()}`,
        share: `${shareValue.toFixed(1)}%`,
        tone: getConsistentColor(label), // Assign vibrant color
        icon: getIconForCategory(label),
        rawAmount: value
      }
    })

    // Sort by largest spending
    categoriesList.sort((a, b) => b.rawAmount - a.rawAmount)

    const topCategory = categoriesList.length > 0 ? categoriesList[0].label : 'N/A'

    return {
      total: totalSpent,
      topCategory,
      categories: categoriesList
    }
  }, [logs, selectedMonthKey])

  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true)
  }, [])

  // One-shot donut entrance. The chart re-renders on every filter click, so a
  // mount keyframe left on the container permanently would re-fire the sweep
  // each time a category is toggled; this retires the class once it has played.
  const [isEntering, setIsEntering] = useState(true)
  useEffect(() => {
    const timer = window.setTimeout(() => setIsEntering(false), 700)
    return () => window.clearTimeout(timer)
  }, [])

  const [activeIndex, setActiveIndex] = useState<number>(-1)

  const onPieEnter = useCallback((_: unknown, index: number) => {
    setActiveIndex(index)
  }, [])

  const onPieLeave = useCallback(() => {
    setActiveIndex(-1)
  }, [])

  const onPieClick = useCallback((data: unknown) => {
    const item = data as { label: string }
    if (onCategorySelect) {
      if (selectedCategory === item.label) {
        onCategorySelect(null) // toggle off
      } else {
        onCategorySelect(item.label)
      }
    }
  }, [onCategorySelect, selectedCategory])

  const selectedIndex = useMemo(() => {
    if (!selectedCategory) return -1
    return spendingData.categories.findIndex((entry) => entry.label === selectedCategory)
  }, [selectedCategory, spendingData.categories])

  const centerIndex = selectedIndex !== -1 ? selectedIndex : activeIndex

  if (loading) {
    return (
      <section className="finance-card finance-spending-card" style={{ '--i': stagger } as CSSProperties}>
        <div className="finance-section-head">
          <div>
            <h2>Spending Overview</h2>
          </div>
          <span className="skeleton-rect skeleton-shimmer" style={{ width: 100, height: 28, borderRadius: 11 }} />
        </div>

        <div className="finance-spending-body" style={{ marginTop: 12 }}>
          <div className="finance-donut-container relative flex items-center justify-center">
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
              <span className="skeleton-rect skeleton-shimmer" style={{ width: 60, height: 20, margin: '0 auto' }} />
            </div>
          </div>

          <div className="finance-category-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid rgba(0,0,0,0.02)', paddingBottom: '8px' }}>
                <span className="skeleton-circle skeleton-shimmer" style={{ width: 22, height: 22, flexShrink: 0 }} />
                <span className="skeleton-rect skeleton-shimmer" style={{ width: '40%', height: 12 }} />
                <span className="skeleton-rect skeleton-shimmer" style={{ width: '20%', height: 12, marginLeft: 'auto' }} />
                <span className="skeleton-rect skeleton-shimmer" style={{ width: '15%', height: 10 }} />
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="finance-card finance-spending-card" style={{ '--i': stagger } as CSSProperties}>
      <div className="finance-section-head">
        <div>
          <h2>Spending Overview</h2>
        </div>

        {availableMonths.length > 0 && (
          <select
            value={selectedMonthKey}
            onChange={(e) => onMonthSelect && onMonthSelect(e.target.value)}
            style={{
              height: '28px',
              padding: '0 10px',
              borderRadius: '11px',
              background: 'rgba(255, 255, 255, 0.56)',
              color: '#111514',
              fontSize: '10px',
              fontWeight: 700,
              border: 'none',
              boxShadow: 'inset 0 0 0 1px rgba(20, 24, 22, 0.05)',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            {availableMonths.map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        )}
      </div>

      <div className="finance-spending-body">
        <div className={`finance-donut-container${isEntering ? ' is-entering' : ''}`}>
          {spendingData.categories.length > 0 ? (
            isMounted ? (
              <ResponsiveContainer width="99%" height="100%" minWidth={0} minHeight={0}>
                <PieChart>
                  <Pie
                    data={spendingData.categories}
                    cx="50%"
                    cy="50%"
                    innerRadius={"55%"}
                    outerRadius={"75%"}
                    dataKey="rawAmount"
                    nameKey="label"
                    onMouseEnter={onPieEnter}
                    onMouseLeave={onPieLeave}
                    onClick={onPieClick}
                    stroke="none"
                    isAnimationActive={false}
                  >
                    {spendingData.categories.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.tone}
                        fillOpacity={
                          selectedCategory === entry.label
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
                  <Tooltip 
                    content={<CustomTooltip />} 
                    wrapperStyle={{ zIndex: 100 }} 
                    offset={25}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : null
          ) : (
            <div className="finance-donut-container">
              <div>
                <span>No Data</span>
              </div>
            </div>
          )}
          {/* Custom Center Text */}
          {spendingData.categories.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              pointerEvents: 'none'
            }}>
              <span style={{ display: 'block', fontSize: '14px', color: 'rgba(23, 28, 25, 0.46)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                {centerIndex !== -1 ? spendingData.categories[centerIndex].label : 'Total'}
              </span>
              <b style={{ display: 'block', fontSize: '28px', color: '#101312', marginTop: '4px', fontWeight: 800 }}>
                {centerIndex !== -1
                  ? `₹${spendingData.categories[centerIndex].rawAmount.toLocaleString()}`
                  : `₹${spendingData.total.toLocaleString()}`
                }
              </b>
            </div>
          )}
        </div>

        <div className="finance-category-list">
          {spendingData.categories.length === 0 ? (
            <div className="fin-empty">
              <span className="fin-empty-glyph">
                <PieChartIcon size={20} strokeWidth={2.2} />
              </span>
              <p className="fin-empty-title">No spending this month</p>
              <p className="fin-empty-sub">
                Once you log an expense, the breakdown by category shows up here.
              </p>
            </div>
          ) : (
            spendingData.categories.map(({ label, value, share, tone, icon: Icon }) => (
              <div
                key={label}
                onClick={() => onCategorySelect && onCategorySelect(selectedCategory === label ? null : label)}
                style={{
                  cursor: 'pointer',
                  opacity: selectedCategory && selectedCategory !== label ? 0.4 : 1,
                  transition: 'opacity 0.2s'
                }}
              >
                <span style={{ background: tone, color: '#fff', boxShadow: `0 4px 10px ${tone}40` }}>
                  <Icon size={12} strokeWidth={2.5} />
                </span>
                <p style={{ fontWeight: selectedCategory === label ? 700 : 500 }}>{label}</p>
                <b>{value}</b>
                <small>{share}</small>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  )
}

export { SpendingOverviewCard }
