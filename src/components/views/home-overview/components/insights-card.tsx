import { RefreshCw, Sparkles } from 'lucide-react'
import type { Insight } from '../../../../lib/insights/engine'
import { InsightList } from '../../../ui/insight-list'
import { INSIGHT_WINDOW_DAYS } from '../insights-engine'

type ActionRoute = '/nutrition' | '/finance' | '/mind' | '/tasks'

type InsightsCardProps = {
  loading: boolean
  insights: Insight[]
  activeDays: number
  onRefresh: () => void
  onNavigate?: (pathname: ActionRoute) => void
}

function InsightsCard({ loading, insights, activeDays, onRefresh, onNavigate }: InsightsCardProps) {
  return (
    <section className="home-card home-card--insights" aria-label="Patterns this week">
      <Sparkles className="home-card-glyph" aria-hidden="true" />
      <header className="home-card-head">
        <div>
          <span className="home-card-eyebrow">Patterns</span>
          <h2 className="home-card-title">What stands out</h2>
        </div>
        <button type="button" className="home-btn-quiet" onClick={onRefresh} aria-label="Refresh insights">
          <RefreshCw size={13} />
        </button>
      </header>

      {loading ? (
        <div className="home-card-body">
          <span className="home-skel home-skel--line" />
          <span className="home-skel home-skel--line" />
          <span className="home-skel home-skel--line short" />
        </div>
      ) : insights.length === 0 ? (
        <div className="home-card-empty">
          <p>Keep logging — patterns need about a week of data to appear.</p>
          <small className="home-progress-hint">
            {Math.min(activeDays, INSIGHT_WINDOW_DAYS)} of {INSIGHT_WINDOW_DAYS} days have signals
          </small>
          <span className="home-progress-track" aria-hidden="true">
            <i style={{ width: `${(Math.min(activeDays, INSIGHT_WINDOW_DAYS) / INSIGHT_WINDOW_DAYS) * 100}%` }} />
          </span>
        </div>
      ) : (
        <InsightList
          insights={insights}
          onAction={(insight: Insight) => onNavigate?.(insight.action!.route as ActionRoute)}
        />
      )}
    </section>
  )
}

export { InsightsCard }
