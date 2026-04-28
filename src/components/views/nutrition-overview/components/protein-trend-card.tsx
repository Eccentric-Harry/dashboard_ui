import { proteinTrend } from '../data'

function ProteinTrendCard() {
  const latestPoint = proteinTrend[proteinTrend.length - 1]
  const maxValue = Math.max(...proteinTrend.map((point) => point.grams), 190)
  const chartWidth = 300
  const chartHeight = 150
  const padding = 18
  const points = proteinTrend.map((point, index) => {
    const x = padding + (index * (chartWidth - padding * 2)) / (proteinTrend.length - 1)
    const y = chartHeight - padding - (point.grams / maxValue) * (chartHeight - padding * 2)
    return { ...point, x, y }
  })
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
  const targetY = chartHeight - padding - (proteinTrend[0].target / maxValue) * (chartHeight - padding * 2)

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
        {proteinTrend.map((point) => (
          <span key={point.day}>{point.day}</span>
        ))}
      </div>

      <div className="nutrition-trend-footer">
        <span>Target line: 160g</span>
        <b>Recovery score rising</b>
      </div>
    </section>
  )
}

export { ProteinTrendCard }
