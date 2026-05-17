import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, Flame,Wheat } from 'lucide-react'
import { useDashboard } from '../../../../contexts/DashboardContext'
import { fetchDashboardData, fetchFoodEntries } from '../../../../lib/api'
import { getFoodIconDetails } from './food-icon-helper'

const mealDotColors: Record<string, string> = {
  Breakfast: '#f97316', // Premium Orange
  Lunch: '#059669', // Premium Emerald Green
  Dinner: '#38bdf8',
  Snack: '#a78bfa',
  Midnight: '#6366f1',
  'Post Workout': '#f87171',
  'Mid-Morning': '#fb923c',
}

type FoodEntry = {
  id?: string
  description?: string
  mealType?: string
  proteinGrams?: number
  calories?: number
  date?: string
  loggedDate?: string
  createdAt?: string
}

type FoodEntriesResponse = {
  data?: FoodEntry[] | {
    entries?: FoodEntry[]
    foodEntries?: FoodEntry[]
  }
  entries?: FoodEntry[]
}

const isoDate = (date: Date) => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')

  return `${year}-${month}-${day}`
}

const parseIsoDate = (dateValue?: string) => {
  if (!dateValue) {
    return new Date()
  }

  const [year, month, day] = dateValue.split('-').map(Number)
  if (!year || !month || !day) {
    return new Date()
  }

  return new Date(year, month - 1, day)
}



const formatLogDate = (dateValue: string) => {
  const date = parseIsoDate(dateValue)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const isToday = date.toDateString() === today.toDateString()
  const isYesterday = date.toDateString() === yesterday.toDateString()

  if (isToday) {
    return 'Today'
  }

  if (isYesterday) {
    return 'Yesterday'
  }

  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' })
  const month = date.toLocaleDateString('en-US', { month: 'short' })
  const day = date.getDate()

  return `${weekday}, ${month} ${day}`
}

const normalizeEntryDate = (entry: FoodEntry, fallbackDate: string) => {
  const rawDate = entry.date || entry.loggedDate || entry.createdAt
  if (typeof rawDate === 'string' && /^\d{4}-\d{2}-\d{2}/.test(rawDate)) {
    return rawDate.slice(0, 10)
  }

  if (rawDate) {
    return isoDate(new Date(rawDate))
  }

  return fallbackDate
}

const extractEntries = (response: unknown): FoodEntry[] => {
  if (Array.isArray(response)) {
    return response as FoodEntry[]
  }

  const payload = response as FoodEntriesResponse

  if (Array.isArray(payload?.data)) {
    return payload.data
  }

  if (!Array.isArray(payload?.data) && Array.isArray(payload?.data?.entries)) {
    return payload.data.entries
  }

  if (!Array.isArray(payload?.data) && Array.isArray(payload?.data?.foodEntries)) {
    return payload.data.foodEntries
  }

  if (Array.isArray(payload?.entries)) {
    return payload.entries
  }

  return []
}

const getLogDates = (anchorDate: string) => {
  const baseDate = parseIsoDate(anchorDate)

  return Array.from({ length: 10 }, (_, index) => {
    const date = new Date(baseDate)
    date.setDate(baseDate.getDate() - index)
    return isoDate(date)
  })
}

const entryKey = (entry: FoodEntry, fallbackDate: string) => {
  if (entry.id) {
    return entry.id
  }

  return [
    normalizeEntryDate(entry, fallbackDate),
    entry.description || '',
    entry.mealType || '',
    Number(entry.proteinGrams) || 0,
    Number(entry.calories) || 0,
  ].join('|')
}

const mergeFoodEntries = (entries: FoodEntry[], fallbackDate: string) => {
  const seen = new Set<string>()

  return entries.filter((entry) => {
    const key = entryKey(entry, fallbackDate)
    if (seen.has(key)) {
      return false
    }

    seen.add(key)
    return true
  })
}

function FoodLogCard() {
  const { data } = useDashboard()
  const foodEntries = useMemo<FoodEntry[]>(() => data?.health?.foodEntries || [], [data?.health?.foodEntries])
  const logAnchorDate = data?.date || isoDate(new Date())
  const [historyEntries, setHistoryEntries] = useState<FoodEntry[]>([])

  const loadHistoryEntries = useCallback(async () => {
    const logDates = getLogDates(logAnchorDate)

    try {
      const [rangeResponse, ...dashboardResponses] = await Promise.allSettled([
        fetchFoodEntries(undefined, logDates[logDates.length - 1], logAnchorDate),
        ...logDates.map((dateValue) => fetchDashboardData(dateValue)),
      ])

      const rangeEntries = rangeResponse.status === 'fulfilled' ? extractEntries(rangeResponse.value) : []
      const dashboardEntries = dashboardResponses.flatMap((response, index) => {
        if (response.status !== 'fulfilled') {
          return []
        }

        const dateValue = logDates[index]
        const entries = response.value?.data?.health?.foodEntries

        if (!Array.isArray(entries)) {
          return []
        }

        return entries.map((entry: FoodEntry) => ({ ...entry, date: entry.date || dateValue }))
      })
      const selectedDateEntries = foodEntries.map((entry) => ({ ...entry, date: entry.date || logAnchorDate }))

      setHistoryEntries(mergeFoodEntries([...rangeEntries, ...dashboardEntries, ...selectedDateEntries], logAnchorDate))
    } catch (error) {
      console.error('Failed to load 10 day food history', error)
      setHistoryEntries(foodEntries.map((entry) => ({ ...entry, date: entry.date || logAnchorDate })))
    }
  }, [foodEntries, logAnchorDate])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadHistoryEntries()
  }, [loadHistoryEntries])

  const logDays = useMemo(() => {
    return getLogDates(logAnchorDate).map((dateValue) => {
      const entries = historyEntries.filter((entry) => normalizeEntryDate(entry, logAnchorDate) === dateValue)
      const totalProtein = entries.reduce((sum, entry) => sum + (Number(entry.proteinGrams) || 0), 0)
      const totalCalories = entries.reduce((sum, entry) => sum + (Number(entry.calories) || 0), 0)

      return {
        dateValue,
        entries,
        totalProtein,
        totalCalories,
      }
    })
  }, [historyEntries, logAnchorDate])

  return (
    <section className="nutrition-food-log-card" aria-label="Food log">
      <div className="nutrition-food-log-head">
        <div className="nutrition-section-head compact">
          <span className="nutrition-section-icon">
            <CalendarDays size={15} />
          </span>
          <div>
            <p>Food Log</p>
            <h2>Daily Food Logs</h2>
          </div>
        </div>
        <span className="nutrition-food-log-count">{logDays.length} days</span>
      </div>

      <div className="nutrition-daily-log-grid">
        {logDays.map(({ dateValue, entries, totalProtein, totalCalories }) => (
          <article className="nutrition-daily-log-card" key={dateValue}>
            <div className="nutrition-daily-log-card-head">
              <div className="nutrition-daily-log-title">
                <span>
                  <CalendarDays size={14} />
                </span>
                <h3>{formatLogDate(dateValue)}</h3>
              </div>
              <div className="nutrition-daily-log-card-actions">
                <strong><Wheat size={13} /> {totalProtein}g</strong>
                <strong><Flame size={13} /> {totalCalories.toLocaleString()} kcal</strong>
              </div>
            </div>

            <div className="nutrition-daily-log-columns" aria-hidden="true">
              <span>Food</span>
              <span>Meal</span>
              <span>Protein</span>
              <span>Calories</span>
            </div>

            <div className="nutrition-daily-log-entries">
              {entries.length === 0 && <p>No food logged.</p>}

              {entries.map((entry, index) => {
                const { id } = entry
                const description = entry.description || 'Food item'
                const mealType = entry.mealType || 'Snack'
                const proteinGrams = Number(entry.proteinGrams) || 0
                const calories = Number(entry.calories) || 0

                const iconDetails = getFoodIconDetails(description, mealType)
                const FoodIcon = iconDetails.icon

                return (
                  <div className="nutrition-daily-log-entry" key={id || `${dateValue}-${index}`}>
                    <div className="nutrition-food-item">
                      <span style={{ background: iconDetails.bg }}>
                        <FoodIcon size={13} color={iconDetails.color} />
                      </span>
                      <b title={description}>{description}</b>
                    </div>
                    <span 
                      className="nutrition-meal-tag"
                      style={{
                        backgroundColor: `${mealDotColors[mealType] || '#94a3b8'}15`,
                        color: mealDotColors[mealType] || '#94a3b8',
                        border: `1px solid ${mealDotColors[mealType] || '#94a3b8'}30`
                      }}
                    >
                      {mealType}
                    </span>
                    <strong className="nutrition-food-protein">{proteinGrams}g</strong>
                    <strong className="nutrition-food-cal">
                      {calories}
                    </strong>
                  </div>
                )
              })}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export { FoodLogCard }
