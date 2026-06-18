import { earningsMetricRows, waveform, earningsFooterItems } from '../data'
import { useDashboard } from '../../../../contexts/DashboardContext';

function EarningsCard() {
  const { data, isLoading } = useDashboard();
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  if (isLoading) {
    return (
      <section className="earnings-panel" aria-label="Spendings summary loading">
        <div className="earnings-top">
          <p>Spendings</p>
          <div style={{ marginTop: '8px', marginBottom: '8px' }}>
            <div className="skeleton-shimmer skeleton-rect" style={{ width: '130px', height: '32px', borderRadius: '6px' }} />
          </div>
          <small>Compared to Last Month</small>
        </div>
        <div className="earning-metrics" style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} style={{ flex: 1 }}>
              <div className="skeleton-shimmer skeleton-rect" style={{ width: '90%', height: '14px', borderRadius: '4px' }} />
              <div className="skeleton-shimmer skeleton-rect" style={{ width: '60%', height: '10px', marginTop: '6px', borderRadius: '3px' }} />
            </div>
          ))}
        </div>
        <div className="weekly-spending-graph" style={{ marginTop: '20px', height: '40px', display: 'flex', gap: '6px', alignItems: 'flex-end', opacity: 0.6 }}>
          {Array.from({ length: 7 }).map((_, idx) => (
            <div key={idx} className="skeleton-shimmer" style={{ flex: 1, height: `${[40, 55, 30, 65, 45, 80, 50][idx]}%`, borderRadius: '3px' }} />
          ))}
        </div>
        <div className="earnings-footer" style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
          {Array.from({ length: 2 }).map((_, idx) => (
            <div key={idx} style={{ flex: 1 }}>
              <div className="skeleton-shimmer skeleton-rect" style={{ width: '80%', height: '12px', borderRadius: '3px' }} />
              <div className="skeleton-shimmer skeleton-rect" style={{ width: '50%', height: '8px', marginTop: '4px', borderRadius: '2px' }} />
            </div>
          ))}
        </div>
      </section>
    );
  }

  const totalSpent = data?.finance?.totalSpent || 68498;
  const formattedSpent = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(totalSpent);

  return (
    <section className="earnings-panel">
      <div className="earnings-top">
        <p>Spendings</p>
        <div>
          <h1>{formattedSpent}</h1>
          <span>-4.2%</span>
        </div>
        <small>Compared to Last Month</small>
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
