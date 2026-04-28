import { calendarDays, calendarSelections, scaleLabels, assetRowLabels, stripedCalendarCells } from '../data'

function CalendarCard() {
  return (
    <section className="calendar-panel">
      <div className="calendar-grid">
        {calendarDays.map((day) => (
          <b key={day}>{day}</b>
        ))}
        {Array.from({ length: 28 }, (_, index) => (
          <span
            key={index}
            className={`${calendarSelections.has(index) ? 'selected' : ''} ${stripedCalendarCells.has(index) ? 'striped' : ''}`}
          >
            {calendarSelections.get(index)}
          </span>
        ))}
      </div>
      <div className="scale-card">
        <div className="scale-labels">
          {scaleLabels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
        <div className="ruler" />
        <div className="asset-row">
          {assetRowLabels.map((label) => (
            <span key={label} className={label === '0.09 BTC' ? 'pill' : undefined}>
              {label}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

export { CalendarCard }
