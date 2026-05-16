import { useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { StravaActivity } from '../../../../lib/api'

type DistanceTrendCardProps = {
  activities: StravaActivity[]
  loading: boolean
}

function DistanceTrendCard({ activities, loading }: DistanceTrendCardProps) {
  const chartData = useMemo(() => {
    if (!activities.length) return []

    // Sort ascending by date for the chart
    const sorted = [...activities]
      .filter(a => a.sportType === 'Run')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    return sorted.map(a => {
      const d = new Date(a.date)
      return {
        date: `${d.getDate()} ${d.toLocaleString('en', { month: 'short' })}`,
        distance: a.distanceKm,
        pace: a.paceMinPerKm ?? 0,
        name: a.activityName,
      }
    })
  }, [activities])

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    return (
      <div className="workouts-chart-tooltip">
        <p className="label">{d.date}</p>
        <p className="value">{d.distance.toFixed(2)} km</p>
        {d.pace > 0 && <p className="sub">{formatPace(d.pace)} /km</p>}
      </div>
    )
  }

  return (
    <div className="workouts-card workouts-trend-card">
      <div className="workouts-section-head">
        <div>
          <h2>Distance Trend</h2>
          <p>Running distance over time</p>
        </div>
      </div>
      <div className="workouts-trend-chart">
        {loading ? (
          <div className="workouts-loading"><span className="workouts-loading-dot">Loading chart…</span></div>
        ) : (
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="distGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3dc152" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3dc152" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(20,24,22,0.06)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: 'rgba(23,28,25,0.45)', fontWeight: 700 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 9, fill: 'rgba(23,28,25,0.45)', fontWeight: 700 }}
                tickLine={false}
                axisLine={false}
                unit=" km"
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="distance"
                stroke="#3dc152"
                strokeWidth={2.5}
                fill="url(#distGrad)"
                dot={{ r: 3, fill: '#3dc152', stroke: '#fff', strokeWidth: 2 }}
                activeDot={{ r: 5, fill: '#3dc152', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

function formatPace(pace: number): string {
  const m = Math.floor(pace)
  const s = Math.round((pace - m) * 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export { DistanceTrendCard }
