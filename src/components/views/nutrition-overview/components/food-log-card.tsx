import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, Flame, Wheat, ChevronLeft, ChevronRight } from 'lucide-react'
import { useDashboard } from '../../../../contexts/DashboardContext'
import { fetchFoodEntries } from '../../../../lib/api'
import { getFoodIconDetails, sortFoodEntries } from './food-icon-helper'

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

const getFormattedDateHeader = (dateValue: string) => {
  const date = parseIsoDate(dateValue)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const isToday = date.toDateString() === today.toDateString()
  const isYesterday = date.toDateString() === yesterday.toDateString()

  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' })
  const month = date.toLocaleDateString('en-US', { month: 'short' })
  const day = date.getDate()

  if (isToday) {
    return {
      main: 'Today',
      sub: weekday,
    }
  }

  if (isYesterday) {
    return {
      main: 'Yesterday',
      sub: weekday,
    }
  }

  return {
    main: `${month} ${day}`,
    sub: weekday,
  }
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

interface DailyLogCardInstanceProps {
  dateValue: string
  entries: FoodEntry[]
  totalProtein: number
  totalCalories: number
}

// Sub-component to manage its own page state for entries (displaying 4 entries max per page)
function DailyLogCardInstance({ dateValue, entries, totalProtein, totalCalories }: DailyLogCardInstanceProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const entriesPerPage = 4
  const totalPages = Math.ceil(entries.length / entriesPerPage)

  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * entriesPerPage
    return entries.slice(start, start + entriesPerPage)
  }, [entries, currentPage])

  // Reset local page if the entries array changes
  useEffect(() => {
    setCurrentPage(1)
  }, [entries])

  return (
    <article className="nutrition-daily-log-card">
      <div className="nutrition-daily-log-card-head">
        <div className="nutrition-daily-log-title">
          <span>
            <CalendarDays size={14} />
          </span>
          <div className="nutrition-daily-log-date-text">
            <h3>{getFormattedDateHeader(dateValue).main}</h3>
            <span className="nutrition-daily-log-day-sub">
              {getFormattedDateHeader(dateValue).sub}
            </span>
          </div>
        </div>
        <div className="nutrition-daily-log-card-actions">
          <strong><Wheat size={13} /> {totalProtein}g</strong>
          <strong><Flame size={13} /> {totalCalories.toLocaleString()} kcal</strong>
        </div>
      </div>

      <div className="nutrition-daily-log-columns" aria-hidden="true">
        <span>Food</span>
        <div className="nutrition-column-stats-header">
          <span>Protein</span>
          <span>Calories</span>
        </div>
      </div>

      <div className="nutrition-daily-log-entries">
        {entries.length === 0 && <p>No food logged.</p>}

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
                <p className="nutrition-food-info">
                  <b title={description}>{description}</b>
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
                </p>
              </div>
              <div className="nutrition-food-stats">
                <strong className="nutrition-food-protein">{proteinGrams}g</strong>
                <strong className="nutrition-food-cal">
                  {calories} <small className="kcal-unit">kcal</small>
                </strong>
              </div>
            </div>
          )
        })}
      </div>

      {/* Mini Pagination controls for day entries */}
      {totalPages > 1 && (
        <div className="nutrition-mini-pagination">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className="mini-pagination-btn"
            type="button"
            aria-label="Previous page of food entries"
          >
            <ChevronLeft size={12} />
          </button>
          <span className="mini-pagination-info">
            {currentPage} of {totalPages}
          </span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="mini-pagination-btn"
            type="button"
            aria-label="Next page of food entries"
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
  
  // Pagination state for historical logs list
  const [currentHistoryPage, setCurrentHistoryPage] = useState(1)
  const historyPageSize = 4

  const loadHistoryEntries = useCallback(async () => {
    try {
      // 1. Fetch flat list of all entries from the past 365 days in a single optimized database call
      const response = await fetchFoodEntries(365)
      const rangeEntries = extractEntries(response)

      // 2. Extract food entries for Today from dashboard context
      const selectedDateEntries = foodEntries.map((entry) => ({ ...entry, date: entry.date || logAnchorDate }))

      // 3. Merge cleanly to prevent duplicates
      setHistoryEntries(mergeFoodEntries([...rangeEntries, ...selectedDateEntries], logAnchorDate))
    } catch (error) {
      console.error('Failed to load 365 days food history', error)
      setHistoryEntries(foodEntries.map((entry) => ({ ...entry, date: entry.date || logAnchorDate })))
    }
  }, [foodEntries, logAnchorDate])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadHistoryEntries()
  }, [loadHistoryEntries])

  // Dynamically extract and group logs by date, skipping Today to start from Yesterday, and skipping empty dates
  const logDays = useMemo(() => {
    const uniqueDates = new Set<string>()

    historyEntries.forEach((entry) => {
      const entryDate = normalizeEntryDate(entry, logAnchorDate)
      if (entryDate && entryDate !== logAnchorDate) {
        uniqueDates.add(entryDate)
      }
    })

    // Sort in descending order (newest first)
    const sortedDates = Array.from(uniqueDates).sort((a, b) => b.localeCompare(a))

    return sortedDates.map((dateValue) => {
      const entries = sortFoodEntries(
        historyEntries.filter((entry) => normalizeEntryDate(entry, logAnchorDate) === dateValue)
      )
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

  // Historical logs start from Yesterday (excluding Today)
  const historicalLogs = useMemo(() => logDays, [logDays])

  // Total pages of historical logs (Yesterday and older)
  const totalHistoryPages = Math.ceil(historicalLogs.length / historyPageSize)

  // Paginated historical daily cards
  const paginatedHistoricalLogs = useMemo(() => {
    const start = (currentHistoryPage - 1) * historyPageSize
    return historicalLogs.slice(start, start + historyPageSize)
  }, [historicalLogs, currentHistoryPage])

  // Reset page number on anchor date change
  useEffect(() => {
    setCurrentHistoryPage(1)
  }, [logAnchorDate])

  return (
    <section className="nutrition-food-log-card" aria-label="Food log">
      <div className="nutrition-food-log-head">
        <div className="nutrition-section-head compact">
          <span className="nutrition-section-icon">
            <CalendarDays size={15} />
          </span>
          <div>
            <p>Food Log</p>
            <h2>Recent Food Logs</h2>
          </div>
        </div>
        {/* REMOVED: 10 days div on top right as requested */}
      </div>

      <div className="nutrition-daily-log-grid">
        {/* Paginated Historical Food Logs (Yesterday and older) */}
        {paginatedHistoricalLogs.map(({ dateValue, entries, totalProtein, totalCalories }) => (
          <DailyLogCardInstance
            key={dateValue}
            dateValue={dateValue}
            entries={entries}
            totalProtein={totalProtein}
            totalCalories={totalCalories}
          />
        ))}
      </div>

      {/* Primary pagination control for historical daily cards */}
      {totalHistoryPages > 1 && (
        <div className="nutrition-pagination">
          <button
            disabled={currentHistoryPage === 1}
            onClick={() => setCurrentHistoryPage((p) => p - 1)}
            className="pagination-btn"
            type="button"
            aria-label="Previous page of daily history"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="pagination-info">
            Page {currentHistoryPage} of {totalHistoryPages}
          </span>
          <button
            disabled={currentHistoryPage === totalHistoryPages}
            onClick={() => setCurrentHistoryPage((p) => p + 1)}
            className="pagination-btn"
            type="button"
            aria-label="Next page of daily history"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </section>
  )
}

export { FoodLogCard }
