import { earningsMetricRows, waveform, earningsFooterItems } from '../data'

function EarningsCard() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <section className="earnings-panel">
      <div className="earnings-top">
        <p>Spendings</p>
        <div>
          <h1>₹68,498</h1>
          <span>-4.2%</span>
        </div>
        <small>Compared to Last Week</small>
      </div>
      <div className="earning-metrics">
        {earningsMetricRows.map((metric) => (
          <div key={metric.label}>
            <b>
              {metric.value}
              {'suffix' in metric ? <small>{metric.suffix}</small> : null}
            </b>
            <span>{metric.label}</span>
          </div>
        ))}
      </div>
      <div className="weekly-spending-graph" aria-hidden="true">
        {waveform.map((height, index) => (
          <div key={index} className="bar-container">
            <span 
              className={`bar ${index === 5 ? 'dark' : index === 4 || index === 6 ? 'darker' : ''}`} 
              style={{ height: `${height}%` }} 
            />
          </div>
        ))}
      </div>
      <div className="date-row" style={{ marginTop: '12px', opacity: 0.6 }}>
        {days.map((day) => (
          <span key={day} style={{ fontSize: '10px' }}>{day}</span>
        ))}
      </div>
      <div className="earnings-footer">
        {earningsFooterItems.map(({ value, label, icon: Icon }) => (
          <div key={label}>
            <b>{value}</b>
            <Icon size={17} />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

export { EarningsCard }
