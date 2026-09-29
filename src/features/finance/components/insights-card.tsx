// What changed this month: category movement against last month, then every pattern
// the shared engine found. The month's headline numbers live in the MonthHero — this
// card never repeats them (the safe-to-spend, forecast and lending insights are filtered
// out upstream for exactly that reason).

import type { CSSProperties } from 'react'
import { RefreshCw } from 'lucide-react'
import { InsightList } from '@/components/ui/insight-list'
import { inr, monthLabel, type Insight, type InsightAction } from '@/lib/insights/engine'
import type { CategoryTrend } from '@/lib/insights/finance'
import { getConsistentColor } from '../utils'
import './finance-intelligence.css'

interface InsightsCardProps {
  monthKey: string
  trends: CategoryTrend[]
  insights: Insight[]
  onInsightAction: (insight: Insight, action: InsightAction) => void
  onRefresh: () => void
  loading: boolean
  stagger?: number
}

function InsightsCard({ monthKey, trends, insights, onInsightAction, onRefresh, loading, stagger = 0 }: InsightsCardProps) {
  const month = monthLabel(monthKey).split(' ')[0]
  if (!loading && trends.length === 0 && insights.length === 0) return null
  const scale = Math.max(...trends.map((x) => Math.max(x.total, x.previous ?? 0)), 1)

  return (
    <section className="finance-card fin-intel fin-insights" aria-label="Insights" style={{ '--i': stagger } as CSSProperties}>
      <div className="finance-section-head fin-intel-head">
        <div>
          <span className="finance-eyebrow">Insights</span>
          <h2>What stands out in {month}</h2>
        </div>
        <button type="button" className="fin-intel-refresh" onClick={onRefresh} aria-label="Refresh insights">
          <RefreshCw size={13} />
        </button>
      </div>

      {loading ? (
        <div className="fin-insights-skeleton">
          {Array.from({ length: 4 }).map((_, i) => (
            <span key={i} className="skeleton-rect skeleton-shimmer" style={{ height: 14 }} />
          ))}
        </div>
      ) : (
        <div className="fin-intel-grid fin-insights-grid">
          {trends.length > 0 && (
            <div className="fin-intel-trends">
              <div className="fin-intel-trends-head">
                <p className="fin-intel-eyebrow">Categories vs last month</p>
                <span className="fin-intel-trends-key">
                  bar = {month} · <i /> = last month
                </span>
              </div>
              <div className="fin-intel-trend-bars">
                {/* A bullet chart: the bar is this month, the tick behind it last month,
                    both on one scale, so the comparison is something you can see. */}
                {trends.map((t) => (
                  <div
                    key={t.category}
                    className="fin-intel-trend-row"
                    style={{ '--cat': getConsistentColor(t.category) } as CSSProperties}
                  >
                    <span className="fin-intel-trend-name">{t.category}</span>
                    <div className="fin-intel-trend-track">
                      <i style={{ width: `${Math.max((t.total / scale) * 100, 1.5)}%` }} />
                      {t.previous != null && t.previous > 0 && (
                        <u style={{ left: `${Math.min((t.previous / scale) * 100, 100)}%` }} title={`last month: ${inr(t.previous)}`} />
                      )}
                    </div>
                    <b className="fin-intel-trend-amount">{inr(t.total)}</b>
                    <span className={`fin-intel-trend-delta ${t.changePct == null ? 'na' : t.changePct > 0 ? 'up' : 'down'}`}>
                      {t.changePct == null ? 'new' : `${t.changePct > 0 ? '+' : '−'}${Math.abs(t.changePct)}%`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {insights.length > 0 && (
            <div className="fin-intel-list">
              <p className="fin-intel-eyebrow">Patterns</p>
              <InsightList insights={insights} className="ins-list--columns" onAction={onInsightAction} />
            </div>
          )}
        </div>
      )}
    </section>
  )
}

export { InsightsCard }
