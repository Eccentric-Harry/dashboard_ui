import { useEffect, useRef, useState } from 'react'
import { CheckSquare, Droplets, Flame, Lightbulb, MessageCircle, Moon, Plus, Trophy, Utensils } from 'lucide-react'
import type { QuickCaptureMode } from './quick-capture-card'

// One line per day — deterministic, gentle, never a demand.
const DAILY_LINES = [
  'Small steps still count.',
  'One thing at a time is a strategy.',
  'You showed up. That matters.',
  'Progress over perfection.',
  'Slow is smooth, smooth is fast.',
  'Rest is part of the work.',
  'Today only needs one good hour.',
]

export type QuickAddAction = QuickCaptureMode | 'meal' | 'water' | 'sleep'

type HomeHeaderProps = {
  dateIso: string
  onQuickAdd: (action: QuickAddAction) => void
  /** Longest active habit streak, in days — 0 hides the chip. */
  streak?: number
}

function HomeHeader({ dateIso, onQuickAdd, streak = 0 }: HomeHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const name = (localStorage.getItem('displayName') || 'friend').split(' ')[0]
  const date = new Date(`${dateIso}T00:00:00`)
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' })
  const monthDay = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000,
  )
  const dailyLine = DAILY_LINES[dayOfYear % DAILY_LINES.length]

  useEffect(() => {
    if (!menuOpen) return
    const handlePointer = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [menuOpen])

  const pick = (action: QuickAddAction) => {
    setMenuOpen(false)
    onQuickAdd(action)
  }

  return (
    <header className="home-header">
      <div className="home-header-greeting">
        <span className="home-header-eyebrow">Your day at a glance</span>
        <span className="home-header-date">
          <em>{weekday},</em> {monthDay}
        </span>
        <strong>
          {greeting}, {name}
        </strong>
        <span className="home-header-line">{dailyLine}</span>
      </div>

      <div className="home-header-actions">
        {streak > 0 && (
          <span className="home-streak-chip" title={`${streak}-day streak on your best habit`}>
            <Flame size={13} strokeWidth={2.6} className="home-streak-chip-flame" fill="currentColor" />
            {streak}d streak
          </span>
        )}
        <div className="home-quick-add" ref={menuRef}>
          <button
            type="button"
            className="ntr-add-btn home-quick-add-btn"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="ntr-add-ic">
              <Plus size={16} strokeWidth={2.75} />
            </span>
            Quick add
          </button>
          {menuOpen && (
            <div className="home-quick-add-menu" role="menu">
              <button type="button" role="menuitem" onClick={() => pick('task')}>
                <CheckSquare size={14} /> Task
              </button>
              <button type="button" role="menuitem" onClick={() => pick('meal')}>
                <Utensils size={14} /> Meal
              </button>
              <button type="button" role="menuitem" onClick={() => pick('water')}>
                <Droplets size={14} /> Water +250ml
              </button>
              <button type="button" role="menuitem" onClick={() => pick('win')}>
                <Trophy size={14} /> Win
              </button>
              <button type="button" role="menuitem" onClick={() => pick('thought')}>
                <MessageCircle size={14} /> Thought
              </button>
              <button type="button" role="menuitem" onClick={() => pick('learning')}>
                <Lightbulb size={14} /> Learning
              </button>
              <button type="button" role="menuitem" onClick={() => pick('sleep')}>
                <Moon size={14} /> Log Sleep
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export { HomeHeader }
