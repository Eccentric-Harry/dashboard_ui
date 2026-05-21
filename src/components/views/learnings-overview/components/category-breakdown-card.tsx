import { PieChart } from 'lucide-react'
import type { LearningsCategoryCount } from '../../../../lib/api'

interface CategoryBreakdownCardProps {
  categories: LearningsCategoryCount[]
}

export function CategoryBreakdownCard({ categories }: CategoryBreakdownCardProps) {
  const max = Math.max(...categories.map((c) => c.count), 1)

  return (
    <section className="learnings-card learnings-category-card">
      <p className="learnings-card-eyebrow">Breakdown</p>
      <h3 className="learnings-card-title">
        <PieChart size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} />
        Categories today
      </h3>

      {categories.length === 0 ? (
        <p className="learnings-empty" style={{ marginTop: 16 }}>
          Log learnings to see category distribution.
        </p>
      ) : (
        <div className="learnings-category-bar">
          {categories.map((cat) => (
            <div key={cat.name} className="learnings-category-row">
              <span>{cat.name}</span>
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
