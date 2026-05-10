import { useMemo, useState } from 'react'
import type { DailyFinancialLog } from '../../../../lib/api'
import { getIconForCategory } from '../finance-overview-dashboard'

interface SpendingOverviewCardProps {
  logs?: DailyFinancialLog[]
}

const formatMonth = (dateString: string) => {
  const d = new Date(dateString)
  return d.toLocaleString('default', { month: 'long', year: 'numeric' })
}

const getMonthKey = (dateString: string) => {
  const d = new Date(dateString)
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`
}

function SpendingOverviewCard({ logs = [] }: SpendingOverviewCardProps) {
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

  // Default to the most recent month if available
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(() => {
    return availableMonths.length > 0 ? availableMonths[0][0] : ''
  })

  // Ensure selected month updates if available months change and current selection is invalid
  useMemo(() => {
    if (availableMonths.length > 0 && !availableMonths.find(m => m[0] === selectedMonthKey)) {
      setSelectedMonthKey(availableMonths[0][0])
    }
  }, [availableMonths, selectedMonthKey])

  // Calculate spending for the selected month
  const spendingData = useMemo(() => {
    if (!selectedMonthKey) return { total: 0, topCategory: 'N/A', categories: [] }

    const categoryTotals: Record<string, number> = {}
    let totalSpent = 0

    logs.forEach(log => {
      if (getMonthKey(log.date) === selectedMonthKey) {
        Object.entries(log.transactions || {}).forEach(([category, txs]) => {
          const transactions = txs as any[]
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
        tone: '#e0e8df', // Using a default neutral green tone for the background
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

  return (
    <section className="finance-card finance-spending-card">
      <div className="finance-section-head">
        <div>
          <h2>Spending Overview</h2>
          <p>Total spent</p>
          <strong>
            ₹{spendingData.total.toLocaleString()}
            <small></small>
          </strong>
        </div>
        
        {availableMonths.length > 0 && (
          <select 
            value={selectedMonthKey} 
            onChange={(e) => setSelectedMonthKey(e.target.value)}
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
        <div className="finance-donut" aria-label={`Top category ${spendingData.topCategory}`}>
          <div>
            <span>Top Category</span>
            <b>{spendingData.topCategory}</b>
          </div>
        </div>

        <div className="finance-category-list">
          {spendingData.categories.length === 0 ? (
            <div className="text-center text-xs text-gray-500 py-4">No spending data</div>
          ) : (
            spendingData.categories.map(({ label, value, share, tone, icon: Icon }) => (
              <div key={label}>
                <span style={{ background: tone }}>
                  <Icon size={12} />
                </span>
                <p>{label}</p>
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
