import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Flame, LifeBuoy, Move, Music, Volume2, VolumeX } from 'lucide-react'
import { spiralActions } from '@/store/spiral-store'
import { cn } from '@/lib/utils'
import { campSound, useCampSoundPrefs } from '../camp-sound'

type WorldBarProps = {
  greeting: string
  dateLabel: string
  bestStreak: number
  sparks: number
  onExit: () => void
  /** Present when there's something in the meadow to move around. */
  onArrange?: () => void
}

/**
 * The only chrome in the camp: a small way out, the day, the streak and sparks counters,
 * sound, and the Spiral Breaker — which stays one tap away on every route, this one
 * included. The sparks chip is where earned sparks fly to (spark-fly.ts).
 */
function WorldBar({ greeting, dateLabel, bestStreak, sparks, onExit, onArrange }: WorldBarProps) {
  const { enabled, ambience } = useCampSoundPrefs()
  const [menu, setMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!menu) return
    const onDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenu(false)
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [menu])

  return (
    <header className="world-bar">
      <button type="button" className="world-exit" onClick={onExit} aria-label="Leave the camp — back to Life OS">
        <ArrowLeft size={16} strokeWidth={2.8} />
        <span>Life OS</span>
      </button>

      <p className="world-day">
        <span>{greeting}</span> · {dateLabel}
      </p>

      <div className="world-counters">
        <span className="world-chip world-chip--streak" title="Longest current run of kept weeks">
          <Flame size={15} strokeWidth={2.6} aria-hidden="true" />
          <strong>{bestStreak}</strong>
          <small>wk streak</small>
        </span>
        <span className="world-chip world-chip--sparks" title="Sparks — from the chest and Wren's quests; spend them at Fen's cart" data-sparks-target>
          <span className="world-spark" aria-hidden="true">
            ✦
          </span>
          <strong>{sparks}</strong>
          <small>sparks</small>
        </span>
        <div className="world-sound" ref={menuRef}>
          <button
            type="button"
            className={cn('world-breathe', !enabled && 'is-off')}
            onClick={() => setMenu((m) => !m)}
            aria-label={enabled ? 'Sound on — sound settings' : 'Sound off — sound settings'}
            aria-expanded={menu}
            title="Sound"
          >
            {enabled ? <Volume2 size={16} strokeWidth={2.4} /> : <VolumeX size={16} strokeWidth={2.4} />}
          </button>
          {menu && (
            <div className="world-sound-menu" role="menu">
              <button type="button" role="menuitemcheckbox" aria-checked={enabled} onClick={() => campSound.setEnabled(!enabled)}>
                {enabled ? <Volume2 size={15} strokeWidth={2.4} /> : <VolumeX size={15} strokeWidth={2.4} />}
                <span>
                  Sound effects<small>{enabled ? 'On' : 'Off'}</small>
                </span>
              </button>
              <button type="button" role="menuitemcheckbox" aria-checked={ambience} onClick={() => campSound.setAmbience(!ambience)}>
                <Music size={15} strokeWidth={2.4} />
                <span>
                  Camp ambience<small>{ambience ? 'Fire and crickets' : 'Off'}</small>
                </span>
              </button>
            </div>
          )}
        </div>
        {onArrange && (
          <button type="button" className="world-breathe" onClick={onArrange} aria-label="Arrange the camp — move decorations around" title="Arrange the camp">
            <Move size={16} strokeWidth={2.4} />
          </button>
        )}
        <button type="button" className="world-breathe" onClick={() => spiralActions.open()} aria-label="Spiral breaker" title="Spiral breaker">
          <LifeBuoy size={16} strokeWidth={2.4} />
        </button>
      </div>
    </header>
  )
}

export { WorldBar }
