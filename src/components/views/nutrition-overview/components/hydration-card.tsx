import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Minus, GlassWater, Droplet, Milk, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { fetchHydration, addWaterIntake } from '../../../../lib/api'
import type { HydrationData } from '../../../../lib/api'
import { useDashboard } from '../../../../contexts/DashboardContext'

const TARGET_ML = 4000

// Flask geometry (viewBox 0 0 120 186): neck → shoulders → rounded body
const BOTTLE_PATH =
  'M47 10 H73 V26 C73 33 96 37 96 52 V160 A16 16 0 0 1 80 176 H40 A16 16 0 0 1 24 160 V52 C24 37 47 33 47 26 Z'
const BOTTLE_BOTTOM = 174
const BOTTLE_FILL_HEIGHT = 130 // usable water column, bottom → shoulder

// seamless wave surface: 60px period, shifted -60px per animation loop
const wavePath = (y: number) =>
  `M-60 ${y.toFixed(1)} q15 -5 30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 V186 H-60 Z`

const HYDRATION_QUOTES = [
  "Water is the driving force of all nature.",
  "Stay hydrated, stay sharp.",
  "Your body is 60% water. Keep it that way!",
  "Drink water like it's your job.",
  "Sip by sip, you're getting closer to your goal.",
  "A glass a day keeps the dehydration away.",
]

function HydrationCard() {
  const { data: dashboardData } = useDashboard()
  const selectedDate = dashboardData?.date || new Date().toISOString().split('T')[0]
  const [data, setData] = useState<HydrationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bounceBtn, setBounceBtn] = useState<string | null>(null)

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

  const [quoteIndex, setQuoteIndex] = useState(0)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadHydration()
  }, [loadHydration])

  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % HYDRATION_QUOTES.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleAddWater = async (amount: number, key: string) => {
    if (adding) return
    setBounceBtn(key)
    setTimeout(() => setBounceBtn(null), 400)
    try {
      setAdding(true)
      await addWaterIntake(amount, selectedDate)
      toast.success(`Logged ${Math.abs(amount)}ml of water`)
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
  const fillPercent = Math.min(progressPercent, 100)
  const isComplete = logged >= target
  const currentQuote = HYDRATION_QUOTES[quoteIndex]
  const waterY = BOTTLE_BOTTOM - (fillPercent / 100) * BOTTLE_FILL_HEIGHT

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
        <div className="ntr-hydro-bottle-wrap">
          <div className="skeleton-shimmer skeleton-rect" style={{ width: '120px', height: '160px', borderRadius: '16px', margin: '0 auto' }} />
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

      <div className="ntr-hydro-bottle-wrap">
        <div className="ntr-water-bottle">
          <svg viewBox="0 0 120 186" className="ntr-bottle-svg" aria-hidden="true">
            <defs>
              <clipPath id="ntrBottleClip">
                <path d={BOTTLE_PATH} />
              </clipPath>
              <linearGradient id="ntrWaterGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7ac1ff" />
                <stop offset="100%" stopColor="#2a86ff" />
              </linearGradient>
            </defs>

            {/* Flask silhouette */}
            <path d={BOTTLE_PATH} fill="rgba(230, 242, 255, 0.5)" stroke="#a8d1ff" strokeWidth="2" />

            {/* Water with layered animated waves + bubbles */}
            <g clipPath="url(#ntrBottleClip)">
              {fillPercent > 0 && (
                <>
                  <path d={wavePath(waterY + 4)} fill="#5b9cf5" opacity="0.45" className="ntr-wave ntr-wave-back" />
                  <path d={wavePath(waterY)} fill="url(#ntrWaterGrad)" className="ntr-wave ntr-wave-front" />
                </>
              )}
              {fillPercent >= 20 && fillPercent < 100 && (
                <>
                  <circle className="ntr-bubble b1" cx="46" cy="164" r="3" />
                  <circle className="ntr-bubble b2" cx="62" cy="168" r="2.2" />
                  <circle className="ntr-bubble b3" cx="77" cy="162" r="2.6" />
                </>
              )}
            </g>

            {/* Level ticks */}
            {[25, 50, 75].map((percent) => (
              <line
                key={percent}
                x1="86"
                x2="93"
                y1={BOTTLE_BOTTOM - (percent / 100) * BOTTLE_FILL_HEIGHT}
                y2={BOTTLE_BOTTOM - (percent / 100) * BOTTLE_FILL_HEIGHT}
                stroke="rgba(23, 27, 21, 0.18)"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            ))}

            {/* Cap */}
            <rect x="44" y="4" width="32" height="10" rx="5" fill="#171b15" opacity="0.88" />
          </svg>
          <div className="ntr-bottle-center">
            <strong>{(logged / 1000).toFixed(1)}L</strong>
            <small>{logged.toLocaleString()}/{target.toLocaleString()}ml</small>
          </div>
        </div>

        <div className="ntr-hydro-meta">
          <p className="ntr-hydro-fun-text" style={{ fontStyle: 'italic', color: 'var(--ntr-ink-soft)', transition: 'opacity 0.5s', textAlign: 'center', margin: '8px 0 0 0' }}>
            "{currentQuote}"
          </p>
        </div>
      </div>

      <div className="ntr-hydro-btns">
        <button
          type="button"
          className={`ntr-soft-btn${bounceBtn === 'minus' ? ' ntr-hydro-btn-bounce' : ''}`}
          onClick={() => handleAddWater(-250, 'minus')}
          disabled={adding || logged < 250}
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
          <button onClick={loadHydration} aria-label="Retry">
            <RefreshCw size={14} />
          </button>
        </div>
      )}
    </section>
  )
}

export { HydrationCard }
