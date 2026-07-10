import { useState } from 'react'
import {
  Brain,
  CheckSquare,
  ChevronDown,
  CircleDollarSign,
  Dumbbell,
  Moon,
  RefreshCw,
  Sparkles,
  Timer,
  Utensils,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../../../lib/utils'
import type { HomeInsight, InsightDomain } from '../insights-engine'
import { INSIGHT_WINDOW_DAYS } from '../insights-engine'

const DOMAIN_ICONS: Record<InsightDomain, LucideIcon> = {
  sleep: Moon,
  focus: Timer,
  mood: Brain,
  tasks: CheckSquare,
  nutrition: Utensils,
  finance: CircleDollarSign,
  workout: Dumbbell,
}

type InsightsCardProps = {
  loading: boolean
  insights: HomeInsight[]
  activeDays: number
  onRefresh: () => void
}

function InsightsCard({ loading, insights, activeDays, onRefresh }: InsightsCardProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <section className="home-card home-card--insights" aria-label="Patterns this week">
      <Sparkles className="home-card-glyph" aria-hidden="true" />
      <header className="home-card-head">
        <div>
          <span className="home-card-eyebrow">Patterns</span>
          <h2 className="home-card-title">This week</h2>
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
        <ul className="home-insights-list">
          {insights.map((insight) => {
            const Icon = DOMAIN_ICONS[insight.domain]
            const expanded = expandedId === insight.id
            return (
              <li key={insight.id} className={cn('home-insight', `home-insight--${insight.sentiment}`)}>
                <span className="home-insight-icon">
                  <Icon size={14} />
                </span>
                <div className="home-insight-body">
                  <p>{insight.text}</p>
                  <div className="home-insight-meta">
                    <small>based on {insight.sampleDays} days</small>
                    <button
                      type="button"
                      className="home-insight-why"
                      aria-expanded={expanded}
                      onClick={() => setExpandedId(expanded ? null : insight.id)}
                    >
                      Why? <ChevronDown size={11} className={cn(expanded && 'is-flipped')} />
                    </button>
                  </div>
                  {expanded && <small className="home-insight-detail">{insight.detail}</small>}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export { InsightsCard }
