type ArcGaugeProps = {
  value: number
  target: number
  centerText: string
  centerSub: string
}

/** Semicircular gauge — dark ink arc over the lime hero panel. */
function ArcGauge({ value, target, centerText, centerSub }: ArcGaugeProps) {
  const radius = 84
  const arcLength = Math.PI * radius
  const ratio = Math.min(value / Math.max(target, 1), 1)
  const arcPath = `M ${100 - radius} 102 A ${radius} ${radius} 0 0 1 ${100 + radius} 102`

  return (
    <div className="ntr-gauge" role="img" aria-label={`${centerText} ${centerSub}`}>
      <svg viewBox="0 0 200 112" aria-hidden="true">
        <path d={arcPath} className="track" />
        <path
          d={arcPath}
          className="value"
          strokeDasharray={arcLength}
          strokeDashoffset={arcLength * (1 - ratio)}
        />
      </svg>
      <span className="ntr-gauge-center">
        <strong>{centerText}</strong>
        <small>{centerSub}</small>
      </span>
    </div>
  )
}

export { ArcGauge }
