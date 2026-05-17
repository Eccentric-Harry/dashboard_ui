import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, Flame, Wheat, ChevronLeft, ChevronRight } from 'lucide-react'
import { useDashboard } from '../../../../contexts/DashboardContext'
import { fetchFoodEntries } from '../../../../lib/api'
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

const mealOrder = [
  'breakfast',
  'lunch',
  'snack',
  'snacks',
  'workout',
  'workouts',
  'post workout',
  'post-workout',
  'dinner',
  'midnight'
]

const getMealOrderIndex = (mealType?: string) => {
  if (!mealType) return 99
  const normalized = mealType.toLowerCase().trim()
  const index = mealOrder.findIndex(item => normalized.includes(item))
  return index !== -1 ? index : 99
}

interface DailyLogCardProps {
  dateValue: string
  entries: FoodEntry[]
  totalProtein: number
  totalCalories: number
}

function DailyLogCard({ dateValue, entries, totalProtein, totalCalories }: DailyLogCardProps) {
  const [entryPage, setEntryPage] = useState(1)
  const entriesPerPage = 4

  // Sort entries by meal order
  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => {
      return getMealOrderIndex(a.mealType) - getMealOrderIndex(b.mealType)
    })
  }, [entries])

  const totalEntryPages = Math.ceil(sortedEntries.length / entriesPerPage)

  const paginatedEntries = useMemo(() => {
    const start = (entryPage - 1) * entriesPerPage
    return sortedEntries.slice(start, start + entriesPerPage)
  }, [sortedEntries, entryPage])

  // Reset page if entries count changes
  useEffect(() => {
    setEntryPage(1)
  }, [entries.length])

  return (
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
        {paginatedEntries.length === 0 && <p>No food logged.</p>}

        {paginatedEntries.map((entry, index) => {
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

      {totalEntryPages > 1 && (
        <div className="nutrition-entry-pagination" aria-label="Entries pagination">
          <button
            disabled={entryPage === 1}
            onClick={() => setEntryPage((p) => p - 1)}
            className="nutrition-entry-page-btn"
            type="button"
            aria-label="Previous entries"
          >
            <ChevronLeft size={12} />
          </button>
          <span className="nutrition-entry-page-info">
            {entryPage} / {totalEntryPages}
          </span>
          <button
            disabled={entryPage === totalEntryPages}
            onClick={() => setEntryPage((p) => p + 1)}
            className="nutrition-entry-page-btn"
            type="button"
            aria-label="Next entries"
          >
            <ChevronRight size={12} />
          </button>
        </div>
      )}
    </article>
  )
}

function FoodLogCard() {
  const { data } = useDashboard()
  const foodEntries = useMemo<FoodEntry[]>(() => data?.health?.foodEntries || [], [data?.health?.foodEntries])
  const logAnchorDate = data?.date || isoDate(new Date())
  const [historyEntries, setHistoryEntries] = useState<FoodEntry[]>([])
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [logAnchorDate])

  const loadHistoryEntries = useCallback(async () => {
    try {
      const response = await fetchFoodEntries(3650)
      const rangeEntries = extractEntries(response)
      const selectedDateEntries = foodEntries.map((entry) => ({ ...entry, date: entry.date || logAnchorDate }))

      setHistoryEntries(mergeFoodEntries([...rangeEntries, ...selectedDateEntries], logAnchorDate))
    } catch (error) {
      console.error('Failed to load full food history', error)
      setHistoryEntries(foodEntries.map((entry) => ({ ...entry, date: entry.date || logAnchorDate })))
    }
  }, [foodEntries, logAnchorDate])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadHistoryEntries()
  }, [loadHistoryEntries])

  const logDays = useMemo(() => {
    // Get unique dates that have entries, always ensuring the active log date is included
    const datesSet = new Set<string>()
    datesSet.add(logAnchorDate)

    historyEntries.forEach((entry) => {
      const d = normalizeEntryDate(entry, logAnchorDate)
      if (d) {
        datesSet.add(d)
      }
    })

    // Sort dates in descending order (newest first)
    const sortedDates = Array.from(datesSet).sort((a, b) => b.localeCompare(a))

    return sortedDates.map((dateValue) => {
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

  const itemsPerPage = 4
  const totalPages = Math.ceil(logDays.length / itemsPerPage)
  
  const paginatedLogDays = useMemo(() => {
    const startIndex = (page - 1) * itemsPerPage
    return logDays.slice(startIndex, startIndex + itemsPerPage)
  }, [logDays, page])

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
      </div>

      <div className="nutrition-daily-log-grid">
        {paginatedLogDays.map(({ dateValue, entries, totalProtein, totalCalories }) => (
          <DailyLogCard
            key={dateValue}
            dateValue={dateValue}
            entries={entries}
            totalProtein={totalProtein}
            totalCalories={totalCalories}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="nutrition-pagination" aria-label="Food logs pagination">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="nutrition-pagination-btn"
            type="button"
            aria-label="Previous page"
          >
            <ChevronLeft size={16} />
          </button>
          
          <div className="nutrition-pagination-dots">
            {Array.from({ length: totalPages }).map((_, index) => {
              const dotPage = index + 1
              return (
                <button
                  key={dotPage}
                  onClick={() => setPage(dotPage)}
                  className={`nutrition-pagination-dot ${page === dotPage ? 'active' : ''}`}
                  aria-label={`Go to page ${dotPage}`}
                  aria-current={page === dotPage ? 'page' : undefined}
                />
              )
            })}
          </div>

          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="nutrition-pagination-btn"
            type="button"
            aria-label="Next page"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </section>
  )
}

export { FoodLogCard }
