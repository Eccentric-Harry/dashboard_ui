import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, Flame, Wheat, ChevronLeft, ChevronRight } from 'lucide-react'
import { useDashboard } from '../../../../contexts/DashboardContext'
import { fetchFoodEntries } from '../../../../lib/api'
import { getFoodIconDetails, sortFoodEntries } from './food-icon-helper'
import { MealDetailsModal } from './meal-details-modal'

const mealDotColors: Record<string, string> = {
  Breakfast: '#bd7a3c',
  Lunch: '#4f8f63',
  Dinner: '#5b8fb3',
  Snack: '#8d7fb5',
  Midnight: '#6f74a8',
  'Post Workout': '#c06f6f',
  'Mid-Morning': '#a5683a',
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
  
  // Detailed nutrition payload
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  analysis_metadata?: Record<string, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  meal_items?: Array<Record<string, any>>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  total_summary?: Record<string, any>
  gaps_and_warnings?: string[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  technical_diagnostic?: Record<string, any>
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
  onSelectEntry: (entry: FoodEntry) => void
}

// Sub-component to manage its own page state for entries (displaying 4 entries max per page)
function DailyLogCardInstance({ dateValue, entries, totalProtein, totalCalories, onSelectEntry }: DailyLogCardInstanceProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const entriesPerPage = 4
  const totalPages = Math.ceil(entries.length / entriesPerPage)

  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * entriesPerPage
    return entries.slice(start, start + entriesPerPage)
  }, [entries, currentPage])

  // Reset local page if the entries array changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1)
  }, [entries])

  return (
    <article className="ntr-day-card">
      <div className="ntr-day-head">
        <div>
          <h3>{getFormattedDateHeader(dateValue).main}</h3>
          <p>{getFormattedDateHeader(dateValue).sub}</p>
        </div>
        <div className="ntr-day-totals">
          <span><Wheat size={11} /> {totalProtein}g</span>
          <span><Flame size={11} /> {totalCalories.toLocaleString()}</span>
        </div>
      </div>

      <div className="ntr-day-entries">
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
            <div
              className="ntr-day-entry"
              key={id || `${dateValue}-${index}`}
              onClick={() => onSelectEntry(entry)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelectEntry(entry) }}
            >
              <span className="ntr-meal-ic" style={{ background: iconDetails.bg }}>
                <FoodIcon size={13} color={iconDetails.color} />
              </span>
              <div>
                <b title={description}>{description}</b>
                <small style={{ color: mealDotColors[mealType] || '#8b9187' }}>{mealType}</small>
              </div>
              <aside>
                <strong>{proteinGrams}g</strong>
                <small>{calories.toLocaleString()} kcal</small>
              </aside>
            </div>
          )
        })}
      </div>

      {/* Mini Pagination controls for day entries */}
      {totalPages > 1 && (
        <div className="ntr-pgn mini">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            type="button"
            aria-label="Previous page of food entries"
          >
            <ChevronLeft size={12} />
          </button>
          <span>
            {currentPage} of {totalPages}
          </span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
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
  const { data, isLoading } = useDashboard()
  
  const foodEntries = useMemo<FoodEntry[]>(() => data?.health?.foodEntries || [], [data?.health?.foodEntries])
  const logAnchorDate = data?.date || isoDate(new Date())
  const [historyEntries, setHistoryEntries] = useState<FoodEntry[]>([])
  
  // Selected entry for modal
  const [selectedEntry, setSelectedEntry] = useState<FoodEntry | null>(null)
  
  // Pagination state for historical logs list
  const [currentHistoryPage, setCurrentHistoryPage] = useState(1)
  const historyPageSize = 4

  const loadHistoryEntries = useCallback(async () => {
    try {
      const response = await fetchFoodEntries(365)
      const rangeEntries = extractEntries(response)
      const selectedDateEntries = foodEntries.map((entry) => ({ ...entry, date: entry.date || logAnchorDate }))
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentHistoryPage(1)
  }, [logAnchorDate])

  if (isLoading) {
    return (
      <section className="ntr-card ntr-history" aria-label="Recent food logs loading">
        <div className="ntr-card-head">
          <div>
            <p className="ntr-eyebrow">Food Log</p>
            <h2>Recent Food Logs</h2>
          </div>
        </div>

        <div className="ntr-day-grid">
          {Array.from({ length: 4 }).map((_, idx) => (
            <article key={idx} className="ntr-day-card" style={{ pointerEvents: 'none' }}>
              <div className="ntr-day-head">
                <div style={{ width: '60%' }}>
                  <div className="skeleton-shimmer skeleton-rect" style={{ width: '80px', height: '14px', borderRadius: '4px' }} />
                  <div className="skeleton-shimmer skeleton-rect" style={{ width: '40px', height: '8px', marginTop: '6px', borderRadius: '3px' }} />
                </div>
                <div className="ntr-day-totals">
                  <div className="skeleton-shimmer skeleton-rect" style={{ width: '38px', height: '24px', borderRadius: '999px' }} />
                  <div className="skeleton-shimmer skeleton-rect" style={{ width: '52px', height: '24px', borderRadius: '999px' }} />
                </div>
              </div>
              <div className="ntr-day-entries">
                {Array.from({ length: 2 }).map((_, entryIdx) => (
                  <div key={entryIdx} className="ntr-skel-row" style={{ padding: '7px 9px' }}>
                    <div className="skeleton-shimmer skeleton-circle" style={{ width: '24px', height: '24px' }} />
                    <div style={{ flex: 1 }}>
                      <div className="skeleton-shimmer skeleton-rect" style={{ width: '70%', height: '10px', borderRadius: '3px' }} />
                    </div>
                    <div className="skeleton-shimmer skeleton-rect" style={{ width: '30px', height: '10px', borderRadius: '3px' }} />
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="ntr-card ntr-history" aria-label="Food log">
      <div className="ntr-card-head">
        <div>
          <p className="ntr-eyebrow">Food Log</p>
          <h2>Recent Food Logs</h2>
        </div>
        <span className="ntr-pill">
          <CalendarDays size={12} />
          History
        </span>
      </div>

      <div className="ntr-day-grid">
        {/* Paginated Historical Food Logs (Yesterday and older) */}
        {paginatedHistoricalLogs.map(({ dateValue, entries, totalProtein, totalCalories }) => (
          <DailyLogCardInstance
            key={dateValue}
            dateValue={dateValue}
            entries={entries}
            totalProtein={totalProtein}
            totalCalories={totalCalories}
            onSelectEntry={setSelectedEntry}
          />
        ))}
      </div>

      {/* Primary pagination control for historical daily cards */}
      {totalHistoryPages > 1 && (
        <div className="ntr-pgn">
          <button
            disabled={currentHistoryPage === 1}
            onClick={() => setCurrentHistoryPage((p) => p - 1)}
            type="button"
            aria-label="Previous page of daily history"
          >
            <ChevronLeft size={14} />
          </button>
          <span>
            Page {currentHistoryPage} of {totalHistoryPages}
          </span>
          <button
            disabled={currentHistoryPage === totalHistoryPages}
            onClick={() => setCurrentHistoryPage((p) => p + 1)}
            type="button"
            aria-label="Next page of daily history"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Meal Details Modal */}
      <MealDetailsModal
        open={!!selectedEntry}
        onClose={() => setSelectedEntry(null)}
        entry={selectedEntry}
      />
    </section>
  )
}

export { FoodLogCard }
