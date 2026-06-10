import { useEffect, useState, useCallback } from 'react'
import { PieChart, Loader2 } from 'lucide-react'
import { fetchLearnings } from '../../../../lib/api'
import type { LearningLog } from '../../../../lib/api'

interface CategoryBreakdownCardProps {
  refreshKey: number
}

export function CategoryBreakdownCard({ refreshKey }: CategoryBreakdownCardProps) {
  const [categories, setCategories] = useState<{ name: string; count: number }[]>([])
  const [loading, setLoading] = useState(false)

  const loadCategories = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchLearnings()
      const list: LearningLog[] = res?.data ?? []
      
      const counts: Record<string, number> = {}
      list.forEach((log) => {
        // Normalise category name to Title Case or keep as-is
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
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCategories()
  }, [loadCategories, refreshKey])

  const max = Math.max(...categories.map((c) => c.count), 1)

  return (
    <section className="learnings-card learnings-category-card">
      <p className="learnings-card-eyebrow">DISTRIBUTION</p>
      <h3 className="learnings-card-title">
        <PieChart size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} />
        Learning Categories
      </h3>

      {loading ? (
        <p className="learnings-loading" style={{ marginTop: 16 }}>
          <Loader2 className="spinner animate-spin" size={14} />
          Loading distribution...
        </p>
      ) : categories.length === 0 ? (
        <p className="learnings-empty" style={{ marginTop: 16 }}>
          No category distribution found.
        </p>
      ) : (
        <div className="learnings-category-bar" style={{ marginTop: 14 }}>
          {categories.map((cat) => (
            <div key={cat.name} className="learnings-category-row">
              <span className="truncate pr-2" style={{ textTransform: 'capitalize' }}>{cat.name}</span>
              <div className="learnings-category-track">
                <div
                  className="learnings-category-fill"
                  style={{ width: `${(cat.count / max) * 100}%` }}
                />
              </div>
              <strong style={{ fontSize: 12, minWidth: 24, textAlign: 'right' }}>{cat.count}</strong>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
