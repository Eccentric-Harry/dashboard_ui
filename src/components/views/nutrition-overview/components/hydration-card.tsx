import { useState, useEffect, useCallback } from 'react'
import { Droplets, Minus, RefreshCw, GlassWater, Coffee } from 'lucide-react'
import { fetchHydration, addWaterIntake } from '../../../../lib/api'
import type { HydrationData } from '../../../../lib/api'

const TARGET_ML = 4000

function HydrationCard() {
  const [data, setData] = useState<HydrationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getSelectedDate = () => {
    const params = new URLSearchParams(window.location.search)
    return params.get('date') || new Date().toISOString().split('T')[0]
  }

  const loadHydration = useCallback(async () => {
    try {
      setError(null)
      setLoading(true)
      const date = getSelectedDate()
      const response = await fetchHydration(date)
      setData(response.data)
    } catch (err) {
      setError('Failed to load hydration data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadHydration()

    // Listen for URL changes (popstate is triggered by NutritionHeader)
    const handleUrlChange = () => {
      loadHydration()
    }
    window.addEventListener('popstate', handleUrlChange)
    return () => window.removeEventListener('popstate', handleUrlChange)
  }, [loadHydration])

  const handleAddWater = async (amount: number) => {
    if (adding) return
    try {
      setAdding(true)
      const date = getSelectedDate()
      await addWaterIntake(amount, date)
      const response = await fetchHydration(date)
      setData(response.data)
    } catch (err) {
      setError('Failed to add water')
      console.error(err)
    } finally {
      setAdding(false)
    }
  }


  const logged = data?.waterIntakeMl ?? 0
  const target = data?.targetMl ?? TARGET_ML
  const progress = Math.min(logged / target, 1)
  const progressPercent = Math.round(progress * 100)
  const isComplete = progress >= 1

  const radius = 52
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - progress * circumference

  const quickAmounts = [
    { amount: 250, label: '+250ml', icon: GlassWater, color: '#3b82f6' },
    { amount: 750, label: '+750ml', icon: Coffee, color: '#8b5cf6' },
  ]

  if (loading) {
    return (
      <section className="nutrition-card nutrition-hydration-card" aria-label="Daily hydration">
        <div className="hydration-header">
          <div className="hydration-icon">
            <Droplets size={18} />
          </div>
          <div className="hydration-title">
            <p>Daily Hydration</p>
            <h2>Water Intake</h2>
          </div>
        </div>
        <div className="hydration-loading">
          <RefreshCw size={24} className="spin" />
          <span>Loading...</span>
        </div>
      </section>
    )
  }

  return (
    <section className="nutrition-card nutrition-hydration-card" aria-label="Daily hydration">
      <div className="hydration-header">
        <div className="hydration-icon" style={{ '--icon-glow': 'rgba(59, 130, 246, 0.2)' } as React.CSSProperties}>
          <Droplets size={18} />
        </div>
        <div className="hydration-title">
          <p>Daily Hydration</p>
          <h2>Water Intake</h2>
        </div>
        <div className="hydration-status" data-complete={isComplete}>
          {isComplete ? (
            <span className="status-complete">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Goal Met
            </span>
          ) : (
            <span>
              <Droplets size={12} />
              {progressPercent}%
            </span>
          )}
        </div>
      </div>

      <div className="hydration-body">
        <div className="hydration-visual-container">
          <div className="hydration-wave-container">
            <div className="hydration-water-fill" style={{ height: `${Math.max(progress * 100, 8)}%` }}>
              <div className="hydration-wave hydration-wave-1" />
              <div className="hydration-wave hydration-wave-2" />
            </div>
            <div className="hydration-bubbles">
              {[...Array(6)].map((_, i) => (
                <i key={i} className={`hydration-bubble hydration-bubble-${i + 1}`} />
              ))}
            </div>
          </div>

          <div className="hydration-progress-ring">
            <svg viewBox="0 0 120 120">
              <circle cx="60" cy="60" r={radius} className="hydration-track" />
              <circle
                cx="60"
                cy="60"
                r={radius}
                className="hydration-value"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
              />
            </svg>
            <div className="hydration-center">
              <span className="hydration-value-display">
                <b>{(logged / 1000).toFixed(1)}</b>
                <small>L</small>
              </span>
              <small className="hydration-target-label">of {target / 1000}L</small>
            </div>
          </div>
        </div>
      </div>

      <div className="hydration-actions">
        <button
          type="button"
          className="hydration-btn hydration-btn-minus"
          onClick={() => handleAddWater(-250)}
          disabled={adding || logged < 250}
          aria-label="Remove 250ml"
        >
          <Minus size={16} />
        </button>
        {quickAmounts.map(({ amount, label, icon: Icon, color }) => (
          <button
            key={amount}
            type="button"
            className="hydration-btn hydration-btn-add"
            onClick={() => handleAddWater(amount)}
            disabled={adding}
            aria-label={label}
            style={{ '--btn-color': color } as React.CSSProperties}
          >
            <Icon size={16} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {error && (
        <div className="hydration-error">
          <span>{error}</span>
          <button onClick={loadHydration} aria-label="Retry">
            <RefreshCw size={12} />
          </button>
        </div>
      )}
    </section>
  )
}

export { HydrationCard }
