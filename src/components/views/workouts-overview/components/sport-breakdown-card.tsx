import { useMemo, useState, useEffect } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Label } from 'recharts'
import { Footprints, Bike, PersonStanding, Zap, type LucideIcon } from 'lucide-react'
import type { StravaActivityStats } from '../../../../lib/api'

const SPORT_COLORS: Record<string, string> = {
  Run: '#3dc152',
  Ride: '#3b82f6',
  Walk: '#f59e0b',
  'E-Bike Ride': '#8b5cf6',
}

const sportIcons: Record<string, LucideIcon> = {
  Run: Footprints,
  Ride: Bike,
  Walk: PersonStanding,
  'E-Bike Ride': Zap,
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as { name: string; value: number; distance: number }
  return (
    <div className="workouts-chart-tooltip">
      <p className="label">{d.name}</p>
      <p className="value">{d.value} activities</p>
      <p className="sub">{d.distance.toFixed(1)} km total</p>
    </div>
  )
}

type SportBreakdownCardProps = {
  stats: StravaActivityStats | null
  loading: boolean
}

function SportBreakdownCard({ stats, loading }: SportBreakdownCardProps) {
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true)
  }, [])

  const { pieData, totalSessions } = useMemo(() => {
    if (!stats?.countBySportType) return { pieData: [], totalSessions: 0 }
    let total = 0
    const data = Object.entries(stats.countBySportType).map(([sport, count]) => {
      total += count
      return {
        name: sport,
        value: count,
        distance: stats.distanceBySportType?.[sport] || 0,
        color: SPORT_COLORS[sport] || '#94a3b8',
      }
    })
    return { pieData: data, totalSessions: total }
  }, [stats])


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
            {isMounted ? (
              <ResponsiveContainer width="99%" height="100%" minWidth={0} minHeight={0}>
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
                    isAnimationActive={false}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                    <Label
                      content={({ viewBox }) => {
                        const vb = viewBox as { cx?: number; cy?: number }
                        const cx = vb?.cx ?? 0
                        const cy = vb?.cy ?? 0
                        return (
                          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
                            <tspan x={cx} y={cy - 2} style={{ fontSize: '52px', fontWeight: 900, fill: '#111514', letterSpacing: '-0.04em' }}>{totalSessions}</tspan>
                            <tspan x={cx} y={cy + 24} style={{ fontSize: '12px', fontWeight: 800, fill: 'rgba(23, 28, 25, 0.35)', letterSpacing: '0.2em' }}>SESSIONS</tspan>
                          </text>
                        )
                      }}
                    />
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : null}
          </div>
          <div className="workouts-breakdown-list">
            <div className="workouts-breakdown-header">
              <span className="header-sport">Sport</span>
              <span className="header-sessions">Sessions</span>
              <span className="header-distance">Distance</span>
            </div>
            {pieData.map(item => {
              const Icon = sportIcons[item.name] || Footprints
              return (
                <div key={item.name} className="workouts-breakdown-row">
                  <div className="sport-info">
                    <span className="icon-cell" style={{ background: item.color, color: '#fff', boxShadow: `0 4px 10px ${item.color}40` }}>
                      <Icon size={12} strokeWidth={2.5} />
                    </span>
                    <p>{item.name}</p>
                  </div>
                  <b>{item.value}</b>
                  <small>{item.distance.toFixed(1)} km</small>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export { SportBreakdownCard }
