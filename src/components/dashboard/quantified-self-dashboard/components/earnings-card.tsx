import { earningsMetricRows, waveform, earningsFooterItems } from '../data'

function EarningsCard() {
  return (
    <section className="earnings-panel">
      <div className="earnings-top">
        <p>Earnings</p>
        <div>
          <h1>$8,498</h1>
          <span>+1.6%</span>
        </div>
        <small>Compared to Last Month, 28 Sep</small>
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
      <div className="waveform" aria-hidden="true">
        {waveform.map((height, index) => (
          <span key={index} style={{ height }} className={index === 13 || index === 18 ? 'dark' : undefined} />
        ))}
        <i />
      </div>
      <div className="date-row">
        <span>12 Aug</span>
        <span>19 Sep</span>
        <span>26 Oct</span>
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
