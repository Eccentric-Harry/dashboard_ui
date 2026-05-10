import { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import type { StravaActivityStats } from '../../../../lib/api'

const SPORT_COLORS: Record<string, string> = {
  Run: '#3dc152',
  Ride: '#3b82f6',
  Walk: '#f59e0b',
  'E-Bike Ride': '#8b5cf6',
}

type SportBreakdownCardProps = {
  stats: StravaActivityStats | null
  loading: boolean
}

function SportBreakdownCard({ stats, loading }: SportBreakdownCardProps) {
  const pieData = useMemo(() => {
    if (!stats?.countBySportType) return []
    return Object.entries(stats.countBySportType).map(([sport, count]) => ({
      name: sport,
      value: count,
      distance: stats.distanceBySportType?.[sport] || 0,
      color: SPORT_COLORS[sport] || '#94a3b8',
    }))
  }, [stats])

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    return (
      <div className="workouts-chart-tooltip">
        <p className="label">{d.name}</p>
        <p className="value">{d.value} activities</p>
        <p className="sub">{d.distance.toFixed(1)} km total</p>
      </div>
    )
  }

  return (
    <div className="workouts-card workouts-breakdown-card">
      <div className="workouts-section-head">
        <div>
          <h2>Sport Breakdown</h2>
          <p>Activity distribution by type</p>
        </div>
      </div>
      {loading ? (
        <div className="workouts-loading"><span className="workouts-loading-dot">Loading…</span></div>
      ) : (
        <div className="workouts-breakdown-body">
          <div className="workouts-breakdown-chart">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius="65%"
                  outerRadius="90%"
                  paddingAngle={4}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="workouts-breakdown-legend">
            {pieData.map(item => (
              <div key={item.name} className="workouts-breakdown-item">
                <span className="workouts-breakdown-dot" style={{ background: item.color }} />
                <div>
                  <p>{item.name}</p>
                  <small>{item.value} sessions · {item.distance.toFixed(1)} km</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export { SportBreakdownCard }
