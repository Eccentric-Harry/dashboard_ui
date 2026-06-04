import { useMemo, useState, useCallback, useEffect } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import type { DailyFinancialLog } from '../../../../lib/api'
import { getIconForCategory, getConsistentColor } from '../utils'

interface SpendingOverviewCardProps {
  logs?: DailyFinancialLog[]
  selectedCategory?: string | null
  onCategorySelect?: (category: string | null) => void
  selectedMonthKey?: string
  onMonthSelect?: (monthKey: string) => void
}

const formatMonth = (dateString: string) => {
  const d = new Date(dateString)
  return d.toLocaleString('default', { month: 'long', year: 'numeric' })
}

const getMonthKey = (dateString: string) => {
  const d = new Date(dateString)
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`
}


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
  onMonthSelect
}: SpendingOverviewCardProps) {
  // Extract all available months from logs
  const availableMonths = useMemo(() => {
    const monthsMap = new Map<string, string>()
    logs.forEach(log => {
      const key = getMonthKey(log.date)
      if (!monthsMap.has(key)) {
        monthsMap.set(key, formatMonth(log.date))
      }
    })

    // Sort descending (newest first)
    return Array.from(monthsMap.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [logs])

  // Calculate spending for the selected month
  const spendingData = useMemo(() => {
    if (!selectedMonthKey) return { total: 0, topCategory: 'N/A', categories: [] }

    const categoryTotals: Record<string, number> = {}
    let totalSpent = 0

    logs.forEach(log => {
      if (getMonthKey(log.date) === selectedMonthKey) {
        Object.entries(log.transactions || {}).forEach(([category, txs]) => {
          const transactions = txs as Array<{ amount: number }>
          // Ignore income categories
          if (category.toLowerCase().includes('income') || category.toLowerCase().includes('salary')) return

          const sum = transactions.reduce((acc, tx) => acc + tx.amount, 0)
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
    setIsMounted(true)
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

  return (
    <section className="finance-card finance-spending-card">
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
        <div className="finance-donut-container">
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
            <div className="text-center text-xs text-gray-500 py-4">No spending data</div>
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
