import { useState } from 'react'
import { Droplets, GlassWater, Plus } from 'lucide-react'

function HydrationCard() {
  const target = 2000
  const [logged, setLogged] = useState(1200)
  const progress = Math.min(logged / target, 1)
  const radius = 48
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - progress * circumference

  const addWater = (amount: number) => {
    setLogged((current) => Math.min(current + amount, target))
  }

  return (
    <section className="nutrition-card nutrition-hydration-card" aria-label="Daily hydration">
      <div className="nutrition-section-head compact" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
        <div>
          <p>Daily Hydration</p>
          <h2>Water Balance</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          <span>
            <Droplets size={14} />
            {Math.round(progress * 100)}%
          </span>
          <b style={{ fontSize: '11px', color: '#64748b' }}>
            {Math.max(target - logged, 0).toLocaleString()} ml left
          </b>
        </div>
      </div>

      <div className="nutrition-water-stage">
        <div className="nutrition-water-visual" aria-hidden="true">
          <div className="nutrition-water-fill" style={{ height: `${Math.max(progress * 100, 16)}%` }} />
          <div className="nutrition-water-bubbles">
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
        </div>

        <div className="nutrition-water-ring">
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle cx="60" cy="60" r={radius} className="track" />
            <circle
              cx="60"
              cy="60"
              r={radius}
              className="value"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
            />
          </svg>
          <span>
            <b>{logged.toLocaleString()}</b>
            <small>ml / {target.toLocaleString()} ml</small>
          </span>
        </div>
      </div>

      <div className="nutrition-water-actions">
        <button type="button" onClick={() => addWater(250)}>
          <GlassWater size={16} />
          <span>+250ml</span>
        </button>
        <button type="button" onClick={() => addWater(500)}>
          <Plus size={15} />
          <span>+500ml</span>
        </button>
      </div>
    </section>
  )
}

export { HydrationCard }
