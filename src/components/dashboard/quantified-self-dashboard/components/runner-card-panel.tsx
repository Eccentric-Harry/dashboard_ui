import runnerCard from '../../../../assets/image.png'
import { useDashboard } from '../../../../contexts/DashboardContext';

function RunnerCardPanel() {
  const { data, isLoading } = useDashboard();
  
  // Try to find the latest run from recent activities
  const recentActivities = data?.workouts?.recentActivities?.activities || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const latestRun = recentActivities.find((a: any) => a.type === 'Run');
  
  // Format distance
  const distanceKm = latestRun ? (latestRun.distance / 1000).toFixed(2) : '10.73';
  
  // Calculate pace (min/km)
  let paceStr = '3:59/Km';
  if (latestRun && latestRun.movingTime > 0 && latestRun.distance > 0) {
    const secondsPerKm = latestRun.movingTime / (latestRun.distance / 1000);
    const mins = Math.floor(secondsPerKm / 60);
    const secs = Math.floor(secondsPerKm % 60);
    paceStr = `${mins}:${secs.toString().padStart(2, '0')}/Km`;
  }
  
  // Format time
  let timeStr = '42:44';
  if (latestRun && latestRun.movingTime > 0) {
    const mins = Math.floor(latestRun.movingTime / 60);
    const secs = latestRun.movingTime % 60;
    timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  
  // Mock or use calories
  const caloriesStr = latestRun?.calories ? `${latestRun.calories}kcal` : '163kcal';

  if (isLoading) {
    return (
      <section className="runner-card" aria-label="Running summary loading">
        <div className="runner-card-header" style={{ width: '100%' }}>
          <span className="runner-eyebrow">RUNNING SUMMARY</span>
          <div className="runner-distance-row" style={{ marginTop: '8px', marginBottom: '12px' }}>
            <div className="skeleton-shimmer skeleton-rect" style={{ width: '110px', height: '40px', borderRadius: '8px' }} />
          </div>
          <div className="runner-stats" style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
            <div className="runner-stat" style={{ flex: 1 }}>
              <span className="runner-stat-label">Pace</span>
              <div className="skeleton-shimmer skeleton-rect" style={{ width: '55px', height: '14px', marginTop: '6px', borderRadius: '4px' }} />
            </div>
            <div className="runner-stat" style={{ flex: 1 }}>
              <span className="runner-stat-label">Running Time</span>
              <div className="skeleton-shimmer skeleton-rect" style={{ width: '55px', height: '14px', marginTop: '6px', borderRadius: '4px' }} />
            </div>
            <div className="runner-stat" style={{ flex: 1 }}>
              <span className="runner-stat-label">Calories</span>
              <div className="skeleton-shimmer skeleton-rect" style={{ width: '55px', height: '14px', marginTop: '6px', borderRadius: '4px' }} />
            </div>
          </div>
        </div>
        <div className="runner-card-image-wrapper" style={{ minHeight: '130px', background: 'rgba(20,24,22,0.02)' }}>
          <div className="skeleton-shimmer" style={{ width: '100%', height: '100%', minHeight: '130px' }} />
        </div>
      </section>
    )
  }

  return (
    <section className="runner-card" aria-label="12 kilometer running">
      <div className="runner-card-header">
        <span className="runner-eyebrow">RUNNING SUMMARY</span>
        <div className="runner-distance-row">
          <h1 className="runner-distance">{distanceKm} <span>km</span></h1>
          <span className="runner-badge">+19%</span>
        </div>
        <div className="runner-stats">
          <div className="runner-stat">
            <span className="runner-stat-label">Pace</span>
            <span className="runner-stat-value">{paceStr}</span>
          </div>
          <div className="runner-stat">
            <span className="runner-stat-label">Running Time</span>
            <span className="runner-stat-value">{timeStr}</span>
          </div>
          <div className="runner-stat">
            <span className="runner-stat-label">Calories</span>
            <span className="runner-stat-value">{caloriesStr}</span>
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
