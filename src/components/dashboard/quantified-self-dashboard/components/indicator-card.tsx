import { indicatorHeights, monthLabels } from '../data'

function IndicatorCard() {
  return (
    <section className="indicator-panel">
      <div className="panel-head">
        <div>
          <h2>Indicators</h2>
          <p>Compared to Last Month</p>
        </div>
        <strong>+19%</strong>
      </div>
      <div className="indicator-chart" aria-hidden="true">
        {indicatorHeights.map((height, index) => (
          <div key={monthLabels[index]} className={index === 9 ? 'hot' : index > 9 ? 'dot-only' : undefined}>
            <span style={{ height }} />
            <small>{monthLabels[index]}</small>
          </div>
        ))}
      </div>
      <div className="indicator-total">
        <span>Total Spend</span>
        <div>
          <b>$59,638</b>
          <em>+15%</em>
        </div>
        <p>Compared to $8,496 last year</p>
      </div>
    </section>
  )
}

export { IndicatorCard }
