import { useState, useEffect, useMemo } from 'react'
import { fetchNutritionSummary } from '../../../../lib/api'
import { useDashboard } from '../../../../contexts/DashboardContext'

type TrendPoint = {
  day: string
  dateStr: string
  grams: number
  target: number
}

const PROTEIN_TARGET = 100

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
  }, [selectedDate])

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
  const maxValue = Math.max(...displayTrend.map((p) => p.grams), PROTEIN_TARGET + 20)
  const chartWidth = 300
  const chartHeight = 150
  const padding = 20
  const barGap = 10
  const availableWidth = chartWidth - (padding * 2)
  const barWidth = (availableWidth - (barGap * (displayTrend.length - 1))) / displayTrend.length

  const bars = displayTrend.map((point, index) => {
    const x = padding + index * (barWidth + barGap)
    const h = (point.grams / maxValue) * (chartHeight - padding * 2)
    const y = chartHeight - padding - h
    return { ...point, x, y, h }
  })

  const targetY = chartHeight - padding - (PROTEIN_TARGET / maxValue) * (chartHeight - padding * 2)

  return (
    <section className="nutrition-card nutrition-trend-card">
      <div className="nutrition-dark-head">
        <div>
          <p>Weekly Protein Consistency</p>
          <h2>{latestPoint.grams}g {latestPoint.dateStr === isoDate(new Date()) ? 'today' : ''}</h2>
        </div>
        <span className="nutrition-days-pill">7 days</span>
      </div>

      <svg className="nutrition-bar-chart" viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="bar-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>
        
        {/* Target Line */}
        <line 
          x1={padding - 5} 
          x2={chartWidth - padding + 5} 
          y1={targetY} 
          y2={targetY} 
          className="target-line" 
        />
        <text 
          x={chartWidth - padding} 
          y={targetY - 8} 
          className="target-label"
        >
          Target {PROTEIN_TARGET}g
        </text>

        {/* Bars */}
        {bars.map((bar, idx) => (
          <g key={`${bar.dateStr}-${idx}`} className="chart-bar-group">
            <rect
              x={bar.x}
              y={bar.y}
              width={barWidth}
              height={bar.h}
              rx={barWidth / 4}
              ry={barWidth / 4}
              className="chart-bar"
              fill="url(#bar-gradient)"
            />
            {/* Value Label (Hidden by default, shown on hover via CSS) */}
            <text 
              x={bar.x + barWidth / 2} 
              y={bar.y - 8} 
              className="bar-value-label"
              textAnchor="middle"
            >
              {bar.grams}g
            </text>
          </g>
        ))}
      </svg>

      <div className="nutrition-trend-days">
        {displayTrend.map((point, idx) => (
          <span 
            key={`${point.dateStr}-${idx}`}
            className={point.dateStr === selectedDate ? 'active' : ''}
          >
            {point.day}
          </span>
        ))}
      </div>
    </section>
  )
}

export { ProteinTrendCard }