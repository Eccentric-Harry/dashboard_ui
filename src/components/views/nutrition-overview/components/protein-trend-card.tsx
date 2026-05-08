import { useState, useEffect } from 'react'
import { fetchNutritionSummary } from '../../../../lib/api'
import { useDashboard } from '../../../../contexts/DashboardContext'

type TrendPoint = {
  day: string
  grams: number
  target: number
}

const PROTEIN_TARGET = 100

function ProteinTrendCard() {
  const { data } = useDashboard()
  const [trendData, setTrendData] = useState<TrendPoint[]>([])
  const [target, setTarget] = useState(PROTEIN_TARGET)
  
  useEffect(() => {
    async function loadTrend() {
      try {
        const res = await fetchNutritionSummary(data?.date)
        const summary = res.data;
        setTarget(PROTEIN_TARGET);
        
        // Map the dailyProtein object { "2024-05-01": 100, "2024-05-02": 120 } to array
        if (summary.dailyProtein) {
          const formatted = Object.keys(summary.dailyProtein).map(dateStr => {
            const dateObj = new Date(dateStr)
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' })
            return {
              day: dayName,
              grams: summary.dailyProtein[dateStr],
              target: PROTEIN_TARGET
            }
          })
          setTrendData(formatted)
        }
      } catch (err) {
        console.error("Failed to load trend", err)
      }
    }
    
    loadTrend()
  }, [data?.date, data?.health?.foodEntries]) // refetch if food entries change!

  if (trendData.length === 0) {
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

  const latestPoint = trendData[trendData.length - 1]
  const maxValue = Math.max(...trendData.map((point) => point.grams), target + 40)
  const chartWidth = 300
  const chartHeight = 150
  const padding = 18
  const points = trendData.map((point, index) => {
    const x = padding + (index * (chartWidth - padding * 2)) / (trendData.length - 1)
    const y = chartHeight - padding - (point.grams / maxValue) * (chartHeight - padding * 2)
    return { ...point, x, y }
  })
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
  const targetY = chartHeight - padding - (target / maxValue) * (chartHeight - padding * 2)

  return (
    <section className="nutrition-card nutrition-trend-card">
      <div className="nutrition-dark-head">
        <div>
          <p>Weekly Protein Consistency</p>
          <h2>{latestPoint.grams}g today</h2>
        </div>
        <span>7 days</span>
      </div>

      <svg className="nutrition-line-chart" viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="Seven day protein intake trend">
        <line x1={padding} x2={chartWidth - padding} y1={targetY} y2={targetY} className="target" />
        <path d={path} />
        {points.map((point) => (
          <circle key={point.day} cx={point.x} cy={point.y} r="4.5" />
        ))}
      </svg>

      <div className="nutrition-trend-days">
        {trendData.map((point) => (
          <span key={point.day}>{point.day}</span>
        ))}
      </div>

      <div className="nutrition-trend-footer">
        <span>Target line: {target}g</span>
        <b>Consistency is key</b>
      </div>
    </section>
  )
}

export { ProteinTrendCard }
