import { useState, useEffect, useMemo } from 'react'
import { fetchNutritionSummary } from '../../../../lib/api'
import { useDashboard } from '../../../../contexts/DashboardContext'
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip, ReferenceLine, CartesianGrid } from 'recharts'

type TrendPoint = {
  day: string
  dateStr: string
  grams: number
  target: number
}

const PROTEIN_TARGET = 100

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 10px', borderRadius: '8px', color: '#fff', fontSize: '12px', fontWeight: 600, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)' }}>
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
  const { data } = useDashboard()
  const selectedDate = data?.date || isoDate(new Date())
  const [trendData, setTrendData] = useState<TrendPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const todayProtein = useMemo(() => {
    const circularGoals = data?.health?.circularGoals || []
    const proteinGoal = circularGoals.find((goal: { label?: string }) => goal.label === 'Protein')
    return proteinGoal?.value || 0
  }, [data?.health?.circularGoals])

  useEffect(() => {
    let cancelled = false

    async function loadTrend() {
      try {
        const res = await fetchNutritionSummary(selectedDate)
        if (cancelled) return

        const summary = res.data

        if (summary.dailyProtein) {
          const formatted = Object.keys(summary.dailyProtein)
            .sort()
            .slice(-7)
            .map((dateStr: string) => {
              const dateObj = new Date(dateStr + 'T00:00:00')
              const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' })
              return {
                day: dayName,
                dateStr,
                grams: summary.dailyProtein[dateStr],
                target: PROTEIN_TARGET
              }
            })

          setTrendData(formatted)
        } else {
          setTrendData([{
            day: parseIsoDate(selectedDate).toLocaleDateString('en-US', { weekday: 'short' }),
            dateStr: selectedDate,
            grams: todayProtein,
            target: PROTEIN_TARGET
          }])
        }
      } catch (err) {
        console.error("Failed to load trend", err)
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
      <section className="nutrition-card nutrition-trend-card">
        <div className="nutrition-dark-head">
          <div>
            <p>Weekly Protein Consistency</p>
            <h2>Loading...</h2>
          </div>
        </div>
      </section>
    )
  }

  const latestPoint = displayTrend[displayTrend.length - 1]


  // Set minimum limit so the graph looks proportional

  return (
    <section className="nutrition-card nutrition-trend-card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="nutrition-dark-head">
        <div>
          <p>Weekly Protein Consistency</p>
          <h2>{latestPoint.grams}g {latestPoint.dateStr === isoDate(new Date()) ? 'today' : ''}</h2>
        </div>
        <span className="nutrition-days-pill">7 days</span>
      </div>

      <div style={{ flex: 1, width: '100%', minHeight: 0, marginTop: '20px', marginLeft: '-15px', position: 'relative', zIndex: 1 }}>
        <ResponsiveContainer width="99%" height="100%" minWidth={0} minHeight={0}>
          <AreaChart data={displayTrend} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorGramsArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4ade80" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#059669" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorGramsStroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#4ade80" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(20, 24, 22, 0.06)" />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'rgba(23, 28, 25, 0.58)', fontSize: 11, fontWeight: 600 }}
              padding={{ left: 10, right: 10 }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(20, 24, 22, 0.08)', strokeWidth: 1, strokeDasharray: '4 4' }} />
            <ReferenceLine y={PROTEIN_TARGET} stroke="rgba(20, 24, 22, 0.12)" strokeDasharray="4 4" label={{ position: 'insideTopRight', value: `TARGET ${PROTEIN_TARGET}G`, fill: 'rgba(23, 28, 25, 0.48)', fontSize: 9, fontWeight: 800, letterSpacing: '0.05em' }} />
            <Area
              type="monotone"
              dataKey="grams"
              stroke="url(#colorGramsStroke)"
              strokeWidth={3.5}
              fillOpacity={1}
              fill="url(#colorGramsArea)"
              activeDot={{ r: 6, fill: '#fff', stroke: '#4ade80', strokeWidth: 3 }}
              dot={{ r: 4, fill: '#fff', stroke: '#10b981', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}

export { ProteinTrendCard }