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
      <section className="nutrition-card nutrition-hydration-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '24px' }} aria-label="Loading hydration">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px', color: '#3b82f6' }}>
          <RefreshCw size={36} style={{ animation: 'spin 2s linear infinite' }} />
          <span>Refreshing...</span>
        </div>
      </section>
    )
  }

  return (
    <section className="nutrition-card nutrition-hydration-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '20px 24px' }} aria-label="Daily hydration">
      <div className="nutrition-card-head">
        <div>
          <p>Daily Hydration</p>
          <h2 style={{ fontSize: '18px', paddingTop: '2px' }}>Water Intake</h2>
        </div>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: isComplete ? '#101312' : undefined,
            color: isComplete ? '#ffffff' : 'inherit',
          }}
        >
          {isComplete ? <Check size={12} strokeWidth={3} /> : <Droplet size={12} strokeWidth={2.5} />}
          {progressPercent}%
        </span>
      </div>

      <div className="nutrition-rings" style={{ marginTop: 'auto', marginBottom: 'auto', justifyContent: 'center', display: 'flex' }}>
        <div style={{ width: '170px', height: '170px', display: 'flex' }}>
          <RingProgress
            label="Water Intake"
            value={logged}
            target={target}
            color="#3b82f6"
            unit="ml"
            active={false}
            centerTextOverride={`${(logged / 1000).toFixed(2)}L`}
            hideLabel={true}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
        <button
          type="button"
          className="nutrition-day-log-btn"
          style={{ padding: '0 16px', height: '40px', justifyContent: 'center', flexShrink: 0 }}
          onClick={() => handleAddWater(-250)}
          disabled={adding || logged < 250}
        >
          <Minus size={16} />
        </button>

        {quickAmounts.map(({ amount, label, icon: Icon }) => (
          <button
            key={amount}
            type="button"
            className="nutrition-day-log-btn"
            style={{ flex: 1, padding: '0 10px', height: '40px', justifyContent: 'center' }}
            onClick={() => handleAddWater(amount)}
            disabled={adding}
          >
            <Icon size={16} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {error && (
        <div className="hydration-error-toast">
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
