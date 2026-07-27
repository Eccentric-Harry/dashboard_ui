import { useState, useEffect, useMemo } from 'react'
import { getNutritionSummaryShared } from './food-history'
import { useDashboard } from '../../../../store/dashboard-store'
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip, ReferenceLine } from 'recharts'

type TrendPoint = {
  day: string
  dateStr: string
  grams: number
  target: number
}

const FALLBACK_PROTEIN_TARGET = 100

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: '#171b15', padding: '6px 10px', borderRadius: '10px', color: '#a8f0b4', fontSize: '12px', fontWeight: 650, boxShadow: '0 6px 16px rgba(23, 27, 21, 0.2)' }}>
        <p style={{ margin: 0 }}>{`${label}: ${payload[0].value}g`}</p>
      </div>
    )
  }
  return null
}

const isoDate = (date: Date) => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

const parseIsoDate = (dateValue?: string) => {
  if (!dateValue) {
    return new Date()
  }

  const [year, month, day] = dateValue.split('-').map(Number)
  if (!year || !month || !day) {
    return new Date()
  }

  return new Date(year, month - 1, day)
}

function ProteinTrendCard() {
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true)
  }, [])

  const { data } = useDashboard()
  const selectedDate = data?.date || isoDate(new Date())
  const [trendData, setTrendData] = useState<TrendPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const todayProtein = useMemo(() => {
    const circularGoals = data?.health?.circularGoals || []
    const proteinGoal = circularGoals.find((goal: { label?: string }) => goal.label === 'Protein')
    return proteinGoal?.value || 0
  }, [data?.health?.circularGoals])

  const proteinTarget = useMemo(() => {
    const circularGoals = data?.health?.circularGoals || []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const proteinGoal = (circularGoals as any[]).find((g) => g.label === 'Protein')
    return Number(proteinGoal?.target) || FALLBACK_PROTEIN_TARGET
  }, [data?.health?.circularGoals])

  useEffect(() => {
    let cancelled = false

    async function loadTrend() {
      try {
        // Shared with the intelligence section, which asks for the same summary on mount.
        const summary = (await getNutritionSummaryShared(selectedDate)) as {
          dailyProtein?: Record<string, number>
        }
        if (cancelled) return

        const dailyProtein = summary.dailyProtein
        if (dailyProtein) {
          const formatted = Object.keys(dailyProtein)
            .sort()
            .slice(-7)
            .map((dateStr: string) => {
              const dateObj = new Date(dateStr + 'T00:00:00')
              const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' })
              return {
                day: dayName,
                dateStr,
                grams: dailyProtein[dateStr],
                target: FALLBACK_PROTEIN_TARGET
              }
            })

          setTrendData(formatted)
        } else {
          setTrendData([{
            day: parseIsoDate(selectedDate).toLocaleDateString('en-US', { weekday: 'short' }),
            dateStr: selectedDate,
            grams: todayProtein,
            target: FALLBACK_PROTEIN_TARGET
          }])
        }
      } catch (err) {
        console.error("Failed to load trend", err)
        if (!cancelled) {
          setTrendData([{
            day: parseIsoDate(selectedDate).toLocaleDateString('en-US', { weekday: 'short' }),
            dateStr: selectedDate,
            grams: todayProtein,
            target: FALLBACK_PROTEIN_TARGET
          }])
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadTrend()
    return () => {
      cancelled = true
    }
  }, [selectedDate, todayProtein])

  const displayTrend = useMemo(() => {
    if (trendData.length === 0) return []
    const updated = [...trendData]
    const lastPointIndex = updated.length - 1
    const lastPoint = updated[lastPointIndex]

    if (lastPoint.dateStr === selectedDate && lastPoint.grams !== todayProtein) {
      updated[lastPointIndex] = { ...lastPoint, grams: todayProtein }
    }
    return updated
  }, [trendData, todayProtein, selectedDate])

  if (isLoading || displayTrend.length === 0) {
    return (
      <section className="ntr-card ntr-trend">
        <div className="ntr-card-head">
          <div>
            <p className="ntr-eyebrow">Weekly Protein</p>
            <div className="skeleton-shimmer skeleton-rect" style={{ width: '85px', height: '22px', marginTop: '6px', borderRadius: '4px' }} />
          </div>
          <span className="ntr-pill">7 days</span>
        </div>
        <div style={{ flex: 1, width: '100%', minHeight: '130px', marginTop: '20px', display: 'flex', alignItems: 'flex-end', gap: '12px', opacity: 0.35, padding: '0 10px' }}>
          {Array.from({ length: 7 }).map((_, idx) => (
            <div key={idx} className="skeleton-shimmer" style={{ flex: 1, height: `${[40, 60, 50, 75, 45, 90, 65][idx]}%`, borderRadius: '4px 4px 0 0' }} />
          ))}
        </div>
      </section>
    )
  }

  const latestPoint = displayTrend[displayTrend.length - 1]
  const weeklyTotal = displayTrend.reduce((sum, point) => sum + point.grams, 0)
  const avgGrams = Math.round(weeklyTotal / displayTrend.length)
  const daysOnTarget = displayTrend.filter(p => p.grams >= proteinTarget).length

  // emphasise only the latest point — the line stays clean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderEndDot = (props: any) => {
    const { cx, cy, index } = props
    if (index !== displayTrend.length - 1 || cx == null || cy == null) {
      return <g key={`dot-${index}`} />
    }
    return (
      <g key={`dot-${index}`}>
        <circle cx={cx} cy={cy} r={9} fill="#cfe965" opacity={0.55} />
        <circle cx={cx} cy={cy} r={4.5} fill="#171b15" stroke="#ffffff" strokeWidth={2} />
      </g>
    )
  }


  // Set minimum limit so the graph looks proportional

  return (
    <section className="ntr-card ntr-trend">
      <div className="ntr-card-head">
        <p className="ntr-eyebrow">Weekly Protein</p>
        <span className="ntr-pill">7 days</span>
      </div>

      <div className="ntr-trend-accent-panel">
        <div className="ntr-tap-big">
          <strong>{weeklyTotal}g</strong>
          <small>this week</small>
        </div>
        <div className="ntr-tap-stats">
          <div className="ntr-tap-stat">
            <span>today</span>
            <b>{latestPoint.grams}g</b>
          </div>
          <div className="ntr-tap-stat">
            <span>daily avg</span>
            <b>{avgGrams}g</b>
          </div>
          <div className="ntr-tap-stat">
            <span>on track</span>
            <b>{daysOnTarget}/{displayTrend.length}</b>
          </div>
        </div>
      </div>

      <div className="ntr-trend-chart">
        {isMounted ? (
          <ResponsiveContainer width="99%" height="100%" minWidth={0} minHeight={0}>
            <AreaChart data={displayTrend} margin={{ top: 18, right: 18, left: 6, bottom: 6 }}>
              <defs>
                <linearGradient id="colorGramsArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#cfe965" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#cfe965" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorGramsStroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#b5d94c" />
                  <stop offset="100%" stopColor="#7e9c2c" />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                interval={0}
                tick={{ fill: 'rgba(23, 27, 21, 0.42)', fontSize: 10, fontWeight: 650 }}
                padding={{ left: 14, right: 14 }}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(23, 27, 21, 0.14)', strokeWidth: 1, strokeDasharray: '4 5' }} />
              <ReferenceLine y={proteinTarget} stroke="rgba(23, 27, 21, 0.16)" strokeDasharray="5 6" label={{ position: 'insideTopRight', value: `TARGET ${proteinTarget}G`, fill: 'rgba(23, 27, 21, 0.38)', fontSize: 8.5, fontWeight: 800, letterSpacing: '0.06em' }} />
              <Area
                type="natural"
                dataKey="grams"
                stroke="url(#colorGramsStroke)"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorGramsArea)"
                activeDot={{ r: 5, fill: '#171b15', stroke: '#cfe965', strokeWidth: 3 }}
                dot={renderEndDot}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : null}
      </div>
    </section>
  )
}

export { ProteinTrendCard }