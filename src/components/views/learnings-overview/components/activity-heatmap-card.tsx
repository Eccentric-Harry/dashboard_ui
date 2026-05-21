import { Activity } from 'lucide-react'
import type { LearningsTimelineDay } from '../../../../lib/api'
import { parseIsoDate } from '../learnings-utils'

const intensityColors = [
  'rgba(164, 200, 177, 0.45)',
  'rgba(122, 191, 147, 0.6)',
  'rgba(76, 175, 115, 0.8)',
  'rgba(39, 142, 85, 0.95)',
  '#0d6b3a',
]

interface ActivityHeatmapCardProps {
  timeline: LearningsTimelineDay[]
}

export function ActivityHeatmapCard({ timeline }: ActivityHeatmapCardProps) {
  return (
    <section className="learnings-card learnings-heatmap-card">
      <p className="learnings-card-eyebrow">Momentum</p>
      <h3 className="learnings-card-title">
        <Activity size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} />
        7-day activity
      </h3>

      {timeline.length === 0 ? (
        <p className="learnings-empty" style={{ marginTop: 16 }}>
          No activity data yet.
        </p>
      ) : (
        <div className="learnings-heatmap-strip">
          {timeline.map((day) => {
            const d = parseIsoDate(day.date)
            const label = d.toLocaleDateString('en-US', { weekday: 'short' })
            const intensity = Math.min(day.intensity ?? 0, 4)

            return (
              <div
                key={day.date}
                className="learnings-heatmap-cell"
                style={{ background: intensityColors[intensity] }}
                title={`${day.date}: ${day.learningsCount} learnings, ${day.tasksCompleted} tasks done`}
              >
                <span>{label}</span>
                <span>{day.learningsCount + day.tasksCompleted}</span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
