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
  const maxValue = Math.max(...displayTrend.map((point) => point.grams), PROTEIN_TARGET + 40)
  const chartWidth = 300
  const chartHeight = 150
  const padding = 18
  const points = displayTrend.map((point, index) => {
    const x = padding + (index * (chartWidth - padding * 2)) / Math.max(displayTrend.length - 1, 1)
    const y = chartHeight - padding - (point.grams / maxValue) * (chartHeight - padding * 2)
    return { ...point, x, y }
  })
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
  const targetY = chartHeight - padding - (PROTEIN_TARGET / maxValue) * (chartHeight - padding * 2)

  return (
    <section className="nutrition-card nutrition-trend-card">
      <div className="nutrition-dark-head">
        <div>
          <p>Weekly Protein Consistency</p>
          <h2>{latestPoint.grams}g {latestPoint.dateStr === isoDate(new Date()) ? 'today' : ''}</h2>
        </div>
        <span>7 days</span>
      </div>

      <svg className="nutrition-line-chart" viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="Seven day protein intake trend">
        <defs>
          <linearGradient id="protein-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#2f9d43" />
            <stop offset="50%" stopColor="#35b64b" />
            <stop offset="100%" stopColor="#7ddaa0" />
          </linearGradient>
        </defs>
        <line x1={padding} x2={chartWidth - padding} y1={targetY} y2={targetY} className="target" />
        <path d={path} />
        {points.map((point, idx) => (
          <circle key={`${point.dateStr}-${idx}`} cx={point.x} cy={point.y} r="4.5" />
        ))}
      </svg>

      <div className="nutrition-trend-days">
        {displayTrend.map((point, idx) => (
          <span key={`${point.dateStr}-${idx}`}>{point.day}</span>
        ))}
      </div>

      <div className="nutrition-trend-footer">
        <span>Target line: {PROTEIN_TARGET}g</span>
        <b>Consistency is key</b>
      </div>
    </section>
  )
}

export { ProteinTrendCard }