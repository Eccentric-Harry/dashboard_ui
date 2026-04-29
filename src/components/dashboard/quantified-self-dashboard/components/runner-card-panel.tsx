import runnerCard from '../../../../assets/image.png'

function RunnerCardPanel() {
  return (
    <section className="runner-card" aria-label="12 kilometer running">
      <div className="runner-card-header">
        <span className="runner-eyebrow">RUNNING SUMMARY</span>
        <div className="runner-distance-row">
          <h1 className="runner-distance">10.73 <span>km</span></h1>
          <span className="runner-badge">+19%</span>
        </div>
        <div className="runner-stats">
          <div className="runner-stat">
            <span className="runner-stat-label">Pace</span>
            <span className="runner-stat-value">3:59/Km</span>
          </div>
          <div className="runner-stat">
            <span className="runner-stat-label">Running Time</span>
            <span className="runner-stat-value">42:44</span>
          </div>
          <div className="runner-stat">
            <span className="runner-stat-label">Calories</span>
            <span className="runner-stat-value">163kcal</span>
          </div>
        </div>
      </div>
      <div className="runner-card-image-wrapper">
        <img src={runnerCard} alt="" className="runner-card-image" />
      </div>
    </section>
  )
}

export { RunnerCardPanel }
