import { Activity, Brain, CheckSquare, GraduationCap, Moon } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { DayRecord } from './insights-engine'

export interface HabitStrip {
  id: string
  label: string
  /** Phone-width label — the icon carries the rest of the meaning. */
  shortLabel: string
  icon: LucideIcon
  /** Oldest → newest, one flag per day of the visible week. */
  days: boolean[]
  streak: number
  streakUnit?: string
}

/** Consecutive active days ending today (yesterday-grace like the Mind streak). */
export function computeStreak(activeFlags: boolean[]): number {
  let index = activeFlags.length - 1
  if (index >= 0 && !activeFlags[index]) index -= 1 // today may still be pending
  let streak = 0
  while (index >= 0 && activeFlags[index]) {
    streak += 1
    index -= 1
  }
  return streak
}

export function buildHabitStrips(records: DayRecord[], weekDates: string[]): HabitStrip[] {
  const week = new Set(weekDates)
  const weekRecords = records.filter((r) => week.has(r.date))
  const flags = (predicate: (r: DayRecord) => boolean) => ({
    week: weekRecords.map(predicate),
    all: records.map(predicate),
  })

  const learning = flags((r) => r.learnings > 0)
  const tasks = flags((r) => r.tasksCompleted > 0)
  const workout = flags((r) => r.workouts > 0)
  const mood = flags((r) => r.moodScore != null)
  const sleep = flags((r) => r.sleepMinutes != null)

  return [
    { id: 'learning', label: 'Learning', shortLabel: 'Learning', icon: GraduationCap, days: learning.week, streak: computeStreak(learning.all) },
    { id: 'tasks', label: 'Tasks done', shortLabel: 'Tasks', icon: CheckSquare, days: tasks.week, streak: computeStreak(tasks.all) },
    { id: 'workout', label: 'Workout', shortLabel: 'Workout', icon: Activity, days: workout.week, streak: computeStreak(workout.all) },
    { id: 'mood', label: 'Mood check-in', shortLabel: 'Mood', icon: Brain, days: mood.week, streak: computeStreak(mood.all) },
    { id: 'sleep', label: 'Sleep logged', shortLabel: 'Sleep', icon: Moon, days: sleep.week, streak: computeStreak(sleep.all) },
  ]
}
