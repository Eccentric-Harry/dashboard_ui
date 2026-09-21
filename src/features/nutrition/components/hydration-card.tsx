import { useState, useEffect, useCallback, useRef, type CSSProperties } from 'react'
import { RefreshCw, Minus, GlassWater, Droplet, Milk, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { nutritionService } from '@/services/nutrition-service'
import { useDashboard } from '@/store/dashboard-store'
import { useNutritionStore } from '@/store/nutrition-store'
import { isAwaitingData } from '@/store/zustand-utils'
import { getErrorMessage } from '@/lib/errors'
import { isoDate } from '@/lib/insights/engine'
import { useGoalCelebration } from '@/hooks/use-goal-celebration'

const TARGET_ML = 3000
const GLASS_ML = 250
// pace window: hydration expected linearly between 07:00 and 23:00
const PACE_START_MIN = 7 * 60
const PACE_END_MIN = 23 * 60

type PaceTone = 'good' | 'warn' | 'done' | 'muted'

function getPace(
  logged: number,
  target: number,
  isComplete: boolean,
  selectedDate: string,
): { tone: PaceTone; label: string } {
  const todayStr = new Date().toISOString().split('T')[0]
  if (isComplete) return { tone: 'done', label: 'Goal met' }
  if (selectedDate === todayStr) {
    const now = new Date()
    const mins = now.getHours() * 60 + now.getMinutes()
    const frac = Math.min(1, Math.max(0, (mins - PACE_START_MIN) / (PACE_END_MIN - PACE_START_MIN)))
    const diffGlasses = Math.round((logged - target * frac) / GLASS_ML)
    if (diffGlasses > 0) return { tone: 'good', label: `${diffGlasses} glass${diffGlasses > 1 ? 'es' : ''} ahead of pace` }
    if (diffGlasses === 0) return { tone: 'good', label: 'On pace' }
    return { tone: 'warn', label: `${-diffGlasses} glass${diffGlasses < -1 ? 'es' : ''} behind pace` }
  }
  if (selectedDate < todayStr) {
    return { tone: 'muted', label: `Ended at ${Math.round((logged / target) * 100)}%` }
  }
  return { tone: 'muted', label: 'Upcoming day' }
}

function HydrationCard() {
  const { data: dashboardData } = useDashboard()
  const selectedDate = dashboardData?.date || new Date().toISOString().split('T')[0]
  const hydrationState = useNutritionStore.use.hydration()
  const { loadHydration, applyHydration } = useNutritionStore.use.actions()
  const data = hydrationState.data
  const loading = isAwaitingData(hydrationState)
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [bounceBtn, setBounceBtn] = useState<string | null>(null)
  const error = addError ?? (hydrationState.hasErrors ? 'Connection Error' : null)

  useEffect(() => {
    void loadHydration(selectedDate)
  }, [loadHydration, selectedDate])

  const retry = useCallback(() => {
    setAddError(null)
    void loadHydration(selectedDate)
  }, [loadHydration, selectedDate])

  const handleAddWater = async (amount: number, key: string) => {
    if (adding || amount === 0) return
    setBounceBtn(key)
    setTimeout(() => setBounceBtn(null), 400)
    setAdding(true)
    setAddError(null)
    try {
      const res = await nutritionService.addWaterIntake(amount, selectedDate)
      if (res.error) throw new Error(res.error.message)
      toast.success(`${amount > 0 ? 'Logged' : 'Removed'} ${Math.abs(amount)}ml of water`)
      // The add endpoint returns the updated day; re-read only if it didn't.
      if (typeof res.data?.waterIntakeMl === 'number') applyHydration(res.data)
      else await loadHydration(selectedDate)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to log water'))
      setAddError('Failed to log water')
      console.error(err)
    } finally {
      setAdding(false)
    }
  }

  const logged = data?.waterIntakeMl ?? 0
  const target = data?.targetMl ?? TARGET_ML
  const progressPercent = Math.round((logged / target) * 100)
  const isComplete = logged >= target
  const totalGlasses = Math.max(1, Math.ceil(target / GLASS_ML))
  const overMl = Math.max(0, logged - target)
  const remainingL = Math.max(0, target - logged) / 1000
  const pace = getPace(logged, target, isComplete, selectedDate)

  // Water goal met → a full-screen celebration launched from the glasses, every time the
  // route opens with it met. 'hydration' is the same goal key Home records. Today only.
  const segmentsRef = useRef<HTMLDivElement | null>(null)
  const today = isoDate()
  const viewedDay = selectedDate.slice(0, 10)
  const hydrationCelebrating = useGoalCelebration({
    goal: 'hydration',
    scope: viewedDay,
    met: target > 0 && isComplete,
    // The store can still hold another day's reading until this date's load lands.
    ready: !loading && !hydrationState.hasErrors && data != null && (!data.date || data.date.slice(0, 10) === viewedDay),
    enabled: viewedDay === today,
    anchorRef: segmentsRef,
    palette: 'water',
    // Full effect on every visit while the goal stands, not just the first of the day.
    repeat: 'full',
    label: 'Water goal met',
    detail: `${(logged / 1000).toFixed(1)}L`,
    icon: 'droplet',
    // Below the glasses is the "Goal met" pace row — the one line the caption repeats.
    placement: 'below',
  })

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
        <div className="skeleton-shimmer skeleton-rect" style={{ width: '150px', height: '40px', borderRadius: '12px', marginTop: '14px' }} />
        <div className="skeleton-shimmer skeleton-rect" style={{ width: '100%', height: '64px', borderRadius: '10px', marginTop: '16px' }} />
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

      <div className="ntr-hydro-hero">
        <div className="ntr-hydro-figure">
          <strong>
            {(logged / 1000).toFixed(1)}
            <em>L</em>
          </strong>
          <small>of {(target / 1000).toFixed(1)}L</small>
        </div>
      </div>

      <div
        ref={segmentsRef}
        className={`ntr-hydro-segments${hydrationCelebrating ? ' is-celebrating' : ''}`}
        role="group"
        aria-label="Water logged, one segment per 250ml glass"
      >
        {Array.from({ length: totalGlasses }, (_, i) => {
          const fill = Math.max(0, Math.min(1, (logged - i * GLASS_ML) / GLASS_ML))
          const levelMl = (i + 1) * GLASS_ML
          return (
            <button
              key={i}
              type="button"
              className={`ntr-hydro-cell${fill >= 1 ? ' full' : ''}`}
              style={{ '--i': i } as CSSProperties}
              onClick={() => handleAddWater(levelMl - logged, 'cell')}
              disabled={adding}
              title={`Set to ${levelMl.toLocaleString()}ml`}
              aria-label={`Set water intake to ${levelMl}ml`}
            >
              <span className="ntr-hydro-cell-fill" style={{ height: `${fill * 100}%` }} />
            </button>
          )
        })}
      </div>

      <div className="ntr-hydro-meta-row">
        <span className={`ntr-hydro-pace ${pace.tone}`}>
          <i aria-hidden="true" />
          {pace.label}
        </span>
        {isComplete ? (
          overMl > 0 && <span className="ntr-hydro-remaining">+{(overMl / 1000).toFixed(1)}L extra</span>
        ) : (
          <span className="ntr-hydro-remaining">{remainingL.toFixed(1)}L to go</span>
        )}
      </div>

      <div className="ntr-hydro-btns">
        <button
          type="button"
          className={`ntr-soft-btn${bounceBtn === 'minus' ? ' ntr-hydro-btn-bounce' : ''}`}
          onClick={() => handleAddWater(-GLASS_ML, 'minus')}
          disabled={adding || logged < GLASS_ML}
          aria-label="Remove 250ml"
        >
          <Minus size={15} />
        </button>

        <button
          type="button"
          className={`ntr-soft-btn grow${bounceBtn === '250' ? ' ntr-hydro-btn-bounce' : ''}`}
          onClick={() => handleAddWater(250, '250')}
          disabled={adding}
        >
          <GlassWater size={15} />
          <span>250ml</span>
        </button>

        <button
          type="button"
          className={`ntr-soft-btn grow${bounceBtn === '750' ? ' ntr-hydro-btn-bounce' : ''}`}
          onClick={() => handleAddWater(750, '750')}
          disabled={adding}
        >
          <Milk size={15} />
          <span>750ml</span>
        </button>
      </div>

      {error && (
        <div className="ntr-error">
          <span>{error}</span>
          <button onClick={retry} aria-label="Retry">
            <RefreshCw size={14} />
          </button>
        </div>
      )}
    </section>
  )
}

export { HydrationCard }
