import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Minus, GlassWater, Droplet, Milk, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { fetchHydration, addWaterIntake } from '../../../../lib/api'
import type { HydrationData } from '../../../../lib/api'
import { RingProgress } from './ring-progress'
import { useDashboard } from '../../../../contexts/DashboardContext'

const TARGET_ML = 4000

function HydrationCard() {
  const { data: dashboardData } = useDashboard()
  const selectedDate = dashboardData?.date || new Date().toISOString().split('T')[0]
  const [data, setData] = useState<HydrationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadHydration = useCallback(async () => {
    try {
      setError(null)
      setLoading(true)
      const response = await fetchHydration(selectedDate)
      setData(response.data)
    } catch (err) {
      setError('Connection Error')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [selectedDate])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadHydration()
  }, [loadHydration])

  const handleAddWater = async (amount: number) => {
    if (adding) return
    try {
      setAdding(true)
      await addWaterIntake(amount, selectedDate)
      toast.success(`Logged ${amount}ml of water`)
      const response = await fetchHydration(selectedDate)
      setData(response.data)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err.message || 'Failed to log water')
      setError('Failed to log water')
      console.error(err)
    } finally {
      setAdding(false)
    }
  }

  const logged = data?.waterIntakeMl ?? 0
  const target = data?.targetMl ?? TARGET_ML
  const progressPercent = Math.round((logged / target) * 100)
  const isComplete = logged >= target

  const quickAmounts = [
    { amount: 250, label: '250ml', icon: GlassWater },
    { amount: 750, label: '750ml', icon: Milk },
  ]

  if (loading) {
    return (
      <section className="ntr-card ntr-hydro" aria-label="Daily hydration loading">
        <div className="ntr-card-head">
          <div>
            <p className="ntr-eyebrow">Daily Hydration</p>
            <h2>Water Intake</h2>
          </div>
          <div className="skeleton-shimmer skeleton-rect" style={{ width: '52px', height: '26px', borderRadius: '999px' }} />
        </div>

        <div className="ntr-hydro-ring">
          <div className="skeleton-shimmer skeleton-circle" style={{ width: '160px', height: '160px' }} />
        </div>

        <div className="ntr-hydro-btns">
          <div className="skeleton-shimmer skeleton-rect" style={{ width: '48px', height: '42px', borderRadius: '999px' }} />
          <div className="skeleton-shimmer skeleton-rect" style={{ flex: 1, height: '42px', borderRadius: '999px' }} />
          <div className="skeleton-shimmer skeleton-rect" style={{ flex: 1, height: '42px', borderRadius: '999px' }} />
        </div>
      </section>
    )
  }

  return (
    <section className="ntr-card ntr-hydro" aria-label="Daily hydration">
      <div className="ntr-card-head">
        <div>
          <p className="ntr-eyebrow">Daily Hydration</p>
          <h2>Water Intake</h2>
        </div>
        <span className={`ntr-pill${isComplete ? ' dark' : ''}`}>
          {isComplete ? <Check size={12} strokeWidth={3} /> : <Droplet size={12} strokeWidth={2.5} />}
          {progressPercent}%
        </span>
      </div>

      <div className="ntr-hydro-ring">
        <div>
          <RingProgress
            label="Water Intake"
            value={logged}
            target={target}
            color="#7fb2e5"
            unit="ml"
            active={false}
            centerTextOverride={`${(logged / 1000).toFixed(2)}L`}
            hideLabel={true}
          />
        </div>
      </div>

      <div className="ntr-hydro-btns">
        <button
          type="button"
          className="ntr-soft-btn"
          onClick={() => handleAddWater(-250)}
          disabled={adding || logged < 250}
          aria-label="Remove 250ml"
        >
          <Minus size={15} />
        </button>

        {quickAmounts.map(({ amount, label, icon: Icon }) => (
          <button
            key={amount}
            type="button"
            className="ntr-soft-btn grow"
            onClick={() => handleAddWater(amount)}
            disabled={adding}
          >
            <Icon size={15} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {error && (
        <div className="ntr-error">
          <span>{error}</span>
          <button onClick={loadHydration} aria-label="Retry">
            <RefreshCw size={14} />
          </button>
        </div>
      )}
    </section>
  )
}

export { HydrationCard }
