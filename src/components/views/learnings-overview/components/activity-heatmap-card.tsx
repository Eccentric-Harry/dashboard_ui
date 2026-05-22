import { Activity } from 'lucide-react'
import type { LearningsTimelineDay } from '../../../../lib/api'
import { parseIsoDate } from '../learnings-utils'

const intensityColors = [
  'rgba(164, 200, 177, 0.3)',
  'rgba(122, 191, 147, 0.55)',
  'rgba(76, 175, 115, 0.75)',
  'rgba(39, 142, 85, 0.9)',
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
        {timeline.length}-day activity
      </h3>

      {timeline.length === 0 ? (
        <p className="learnings-empty" style={{ marginTop: 16 }}>
          No activity data yet.
        </p>
      ) : (
        <>
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
                  <span className="heatmap-cell-weekday">{label}</span>
                  <span className="heatmap-cell-value">{day.learningsCount + day.tasksCompleted}</span>
                </div>
              )
            })}
          </div>
          <div className="learnings-heatmap-legend">
            <span>Less</span>
            <div className="learnings-heatmap-legend-colors">
              {intensityColors.map((color, idx) => (
                <span
                  key={idx}
                  className="legend-color-box"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <span>More</span>
          </div>
        </>
      )}
    </section>
  )
}
