// Shared renderer for engine-produced insights, styled after the Home
// "Patterns" rows (icon chip + sentence + sample window + Why? expand)
// so the Intelligence sections read as one system across routes.
// All numbers arrive precomputed on the Insight — no math here.

import { useState } from 'react'
import {
  Activity,
  Banknote,
  CalendarCheck,
  ChevronDown,
  Clock,
  Droplet,
  Flame,
  HandCoins,
  Nut,
  PencilLine,
  PieChart,
  Repeat,
  Scale,
  Tags,
  TrendingDown,
  TrendingUp,
  Trophy,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Insight, InsightIcon } from '../../lib/insights/engine'
import { cn } from '../../lib/utils'
import './insight-list.css'

const ICONS: Record<InsightIcon, LucideIcon> = {
  protein: Nut,
  calories: Flame,
  balance: PieChart,
  timing: Clock,
  streak: CalendarCheck,
  scale: Scale,
  wallet: Wallet,
  forecast: TrendingUp,
  category: Tags,
  subscription: Repeat,
  lending: HandCoins,
  anomaly: Activity,
  trophy: Trophy,
  log: PencilLine,
  income: Banknote,
  hydration: Droplet,
}

const SENTIMENT_LABEL: Record<Insight['sentiment'], string> = {
  positive: 'win',
  neutral: 'insight',
  watch: 'watch',
  urgent: 'urgent',
}

/** Tiny dependency-free sparkline for the row's optional mini-series. */
function RowSpark({ values }: { values: number[] }) {
  if (values.length < 3) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const w = 64
  const h = 22
  const step = w / (values.length - 1)
  const points = values
    .map((v, i) => `${(i * step).toFixed(1)},${(h - 3 - ((v - min) / span) * (h - 6)).toFixed(1)}`)
    .join(' ')
  return (
    <svg className="ins-row-spark" viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <polyline points={points} fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

type InsightListProps = {
  insights: Insight[]
  /** Invoked for an insight's action pill; the caller decides how to navigate/scroll. */
  onAction?: (insight: Insight) => void
  className?: string
}

function InsightList({ insights, onAction, className }: InsightListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (insights.length === 0) return null

  return (
    <ul className={cn('ins-list', className)}>
      {insights.map((insight, index) => {
        const Icon = ICONS[insight.icon] ?? Activity
        const expanded = expandedId === insight.id
        const metric = insight.metric
        return (
          <li
            key={insight.id}
            className={cn('ins-row', `ins-row--${insight.sentiment}`)}
            style={{ animationDelay: `${Math.min(index, 6) * 55}ms` }}
          >
            <span className="ins-row-icon">
              <Icon size={15} />
            </span>
            <div className="ins-row-body">
              <div className="ins-row-top">
                <span className="ins-row-tag">{SENTIMENT_LABEL[insight.sentiment]}</span>
                {insight.spark && <RowSpark values={insight.spark} />}
                {metric && (
                  <span className="ins-row-metric">
                    <b>
                      {metric.value.toLocaleString('en-IN')}
                      <em>{metric.unit}</em>
                    </b>
                    {metric.delta != null && metric.deltaDir && (
                      <i className={`dir-${metric.deltaDir}`}>
                        {metric.deltaDir === 'up' ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                      </i>
                    )}
                  </span>
                )}
              </div>
              <p>{insight.title}</p>
              <div className="ins-row-meta">
                <small>{insight.sampleWindow}</small>
                <button
                  type="button"
                  className="ins-row-why"
                  aria-expanded={expanded}
                  onClick={() => setExpandedId(expanded ? null : insight.id)}
                >
                  Why? <ChevronDown size={11} className={cn(expanded && 'is-flipped')} />
                </button>
                {insight.action && onAction && (
                  <button
                    type="button"
                    className="ins-row-action"
                    onClick={() => onAction(insight)}
                  >
                    {insight.action.label} →
                  </button>
                )}
              </div>
              {expanded && <small className="ins-row-detail">{insight.detail}</small>}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export { InsightList }
