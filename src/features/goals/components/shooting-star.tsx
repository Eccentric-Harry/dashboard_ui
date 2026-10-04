import { useEffect, useState } from 'react'
import { campSound } from '../camp-sound'

type ShootingStarProps = {
  /** Caught one — Pip makes a wish. */
  onWish: () => void
}

/**
 * Now and then at night a shooting star crosses the sky. Catch it with a tap and Pip
 * makes a wish. Pure delight — it's not counted, scored or rewarded with anything.
 */
function ShootingStar({ onWish }: ShootingStarProps) {
  const [star, setStar] = useState<{ key: number; left: number; top: number } | null>(null)
  const [caught, setCaught] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let timer = 0
    let key = 0
    const schedule = (first: boolean) => {
      timer = window.setTimeout(
        () => {
          key += 1
          setCaught(false)
          setStar({ key, left: 12 + Math.random() * 50, top: 6 + Math.random() * 18 })
          timer = window.setTimeout(() => {
            setStar(null)
            schedule(false)
          }, 1900)
        },
        first ? 9000 + Math.random() * 8000 : 28000 + Math.random() * 30000,
      )
    }
    schedule(true)
    return () => window.clearTimeout(timer)
  }, [])

  if (!star) return null
  return (
    <button
      key={star.key}
      type="button"
      className={caught ? 'shooting-star is-caught' : 'shooting-star'}
      style={{ left: `${star.left}%`, top: `${star.top}%` }}
      aria-label="A shooting star — catch it to make a wish"
      onClick={() => {
        if (caught) return
        setCaught(true)
        campSound.play('wish')
        onWish()
      }}
    >
      <span className="shooting-star-tail" aria-hidden="true" />
      <span className="shooting-star-head" aria-hidden="true" />
    </button>
  )
}

export { ShootingStar }
