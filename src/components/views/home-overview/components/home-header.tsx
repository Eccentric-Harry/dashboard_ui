import { useEffect, useRef, useState } from 'react'
import { CheckSquare, Droplets, Lightbulb, MessageCircle, Moon, Plus, Trophy, Utensils } from 'lucide-react'
import type { QuickCaptureMode } from './quick-capture-card'
import { formatMinutes, SLEEP_TARGET_MINUTES } from '../home-types'

// Gentle, generic fallback for days with nothing yet to react to —
// deterministic per day, never a demand.
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

export type HomeHeaderSignals = {
  overdueCount: number
  moodScore: number | null
  sleepMinutes: number | null
  focusMinutes: number | null
  tasksCompleted: number
  tasksTotal: number
  workoutStreakWeeks: number
  learningStreakDays: number
}

type HomeHeaderProps = {
  dateIso: string
  onQuickAdd: (action: QuickAddAction) => void
  signals: HomeHeaderSignals
}

type PersonalizedCopy = {
  /** The word(s) before the name — replaces the fixed "Good {time}" when something more specific is true. */
  greeting: string
  /** The subheading line underneath. */
  line: string
}

/**
 * One ranked read of "what's actually going on today," in order of what a
 * person would want reflected back to them: how they're feeling, momentum
 * already in motion, what's outstanding, then what's already done — falling
 * back to a generic greeting + line only when today has nothing to say yet.
 * Both halves come from the same branch so they never contradict each other.
 */
function personalizedCopy(signals: HomeHeaderSignals, hour: number, dayOfYear: number): PersonalizedCopy {
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const {
    overdueCount,
    moodScore,
    sleepMinutes,
    focusMinutes,
    tasksCompleted,
    tasksTotal,
    workoutStreakWeeks,
    learningStreakDays,
  } = signals

  // A flat "Good evening" reads false-cheerful against a hard day, so the
  // greeting itself softens here instead of only the line underneath it.
  if (moodScore != null && moodScore <= 2) {
    return moodScore === 1
      ? { greeting: 'Hey', line: 'A heavy one today — go easy on yourself.' }
      : { greeting: 'Hi', line: 'A little off today. That’s alright.' }
  }
  if (workoutStreakWeeks >= 2) {
    return { greeting: 'Welcome back', line: `${workoutStreakWeeks} weeks of workouts running — that’s a habit now.` }
  }
  if (learningStreakDays >= 3) {
    return { greeting: 'Nice going', line: `${learningStreakDays} days of learning in a row.` }
  }
  if (overdueCount > 0) {
    return {
      greeting: timeGreeting,
      line: `${overdueCount} task${overdueCount === 1 ? '' : 's'} carried over — clear one when you’re ready.`,
    }
  }
  if (tasksTotal > 0 && tasksCompleted === tasksTotal) {
    return { greeting: 'Well done', line: 'Everything on today’s list is done already.' }
  }
  if (focusMinutes != null && focusMinutes >= 60) {
    return { greeting: timeGreeting, line: `Already ${formatMinutes(focusMinutes)} of focus today.` }
  }
  if (sleepMinutes != null) {
    if (sleepMinutes >= SLEEP_TARGET_MINUTES) {
      return { greeting: timeGreeting, line: `Slept ${formatMinutes(sleepMinutes)} — good fuel for today.` }
    }
    if (sleepMinutes < 360) {
      return { greeting: timeGreeting, line: `Only ${formatMinutes(sleepMinutes)} last night — take it easier if you can.` }
    }
  }
  if (moodScore != null && moodScore >= 4) {
    return { greeting: timeGreeting, line: 'Good headspace today — make it count.' }
  }
  return { greeting: timeGreeting, line: DAILY_LINES[dayOfYear % DAILY_LINES.length] }
}

function HomeHeader({ dateIso, onQuickAdd, signals }: HomeHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const hour = new Date().getHours()
  const name = (localStorage.getItem('displayName') || 'friend').split(' ')[0]
  const date = new Date(`${dateIso}T00:00:00`)
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' })
  const monthDay = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000,
  )
  const { greeting, line: dailyLine } = personalizedCopy(signals, hour, dayOfYear)

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
        <strong>
          {greeting}, {name}
        </strong>
        <span className="home-header-line">
          <em>{weekday}, {monthDay}</em> · {dailyLine}
        </span>
      </div>

      <div className="home-header-actions">
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
