import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarCheck, ChevronDown, LoaderCircle, X, Plus, Sparkles } from 'lucide-react'
import { useDashboard } from '../../../../contexts/DashboardContext'
import { fetchFoodEntries } from '../../../../lib/api'
import { isStandalone } from '../../../../lib/utils'
import { MiniMonth } from '../../../ui/mini-month'
import { getFoodIconDetails } from './food-icon-helper'

type FoodEntry = {
  id?: string
  description?: string
  mealType?: string
  proteinGrams?: number
  calories?: number
  date?: string
  mealQuality?: string
  notes?: string
  recipeCategory?: string
  serving?: string
  servingNotes?: string
  sourceNotes?: string
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

const formatHeaderDate = (date: Date) =>
  date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
const isFutureDate = (date: Date) => isoDate(date) > isoDate(new Date())

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

interface NutritionHeaderProps {
  onAddClick?: () => void
  onAiClick?: () => void
}

function NutritionHeader({ onAddClick, onAiClick }: NutritionHeaderProps) {
  const { data } = useDashboard()
  const foodEntries = useMemo<FoodEntry[]>(() => data?.health?.foodEntries || [], [data?.health?.foodEntries])
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [pickedDate, setPickedDate] = useState<string | null>(null)
  const [pickedDateEntries, setPickedDateEntries] = useState<FoodEntry[]>([])
  const [isPickedDateLoading, setIsPickedDateLoading] = useState(false)
  const [pickedDateError, setPickedDateError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('date') || isoDate(new Date())
  })
  const calendarRef = useRef<HTMLDivElement>(null)

  const [activeNutritionDates, setActiveNutritionDates] = useState<Set<string>>(new Set())
  const [calendarRange, setCalendarRange] = useState<{ start: string; end: string } | null>(null)

  useEffect(() => {
    if (!calendarRange) return
    let active = true
    fetchFoodEntries(undefined, calendarRange.start, calendarRange.end)
      .then((res) => {
        if (!active) return
        const entries = extractEntries(res)
        const dates = new Set(
          entries
            .map((entry) => entry.date?.split('T')[0])
            .filter(Boolean) as string[],
        )
        setActiveNutritionDates(dates)
      })
      .catch((err) => {
        console.error('Failed to fetch food entries for range', err)
      })
    return () => {
      active = false
    }
  }, [calendarRange])

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search)
      const nextDate = params.get('date') || isoDate(new Date())
      setSelectedDate(nextDate)
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!calendarRef.current?.contains(event.target as Node)) {
        setIsCalendarOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsCalendarOpen(false)
        setPickedDate(null)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const selectedDateObject = useMemo(() => parseIsoDate(selectedDate), [selectedDate])


  const handleDateSelect = (date: Date) => {
    if (isFutureDate(date)) {
      return
    }

    const dateValue = isoDate(date)
    setPickedDate(dateValue)
    setSelectedDate(dateValue)
    setIsCalendarOpen(false)

    const nextUrl = isStandalone()
      ? `${window.location.pathname}?date=${dateValue}`
      : `/nutrition?date=${dateValue}`

    if (window.location.pathname + window.location.search !== nextUrl) {
      if (isStandalone()) {
        window.history.replaceState({}, '', nextUrl)
        localStorage.setItem('pwa_last_search', `?date=${dateValue}`)
      } else {
        window.history.pushState({}, '', nextUrl)
      }
      window.dispatchEvent(new PopStateEvent('popstate'))
    }
  }

  const pickedDateObject = pickedDate ? parseIsoDate(pickedDate) : null
  const pickedDateTotals = useMemo(() => {
    return pickedDateEntries.reduce<{ calories: number; protein: number }>(
      (totals, entry) => ({
        calories: totals.calories + (Number(entry.calories) || 0),
        protein: totals.protein + (Number(entry.proteinGrams) || 0),
      }),
      { calories: 0, protein: 0 },
    )
  }, [pickedDateEntries])


  useEffect(() => {
    if (!pickedDate) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPickedDateEntries([])
      return
    }

    if (data?.date === pickedDate) {
      setPickedDateEntries(foodEntries)
      setIsPickedDateLoading(false)
      setPickedDateError(null)
      return
    }

    let isActive = true
    setIsPickedDateLoading(true)
    setPickedDateError(null)

    fetchFoodEntries(undefined, pickedDate, pickedDate)
      .then((response) => {
        if (isActive) {
          setPickedDateEntries(extractEntries(response))
        }
      })
      .catch((error) => {
        console.error('Failed to load picked date food entries', error)
        if (isActive) {
          setPickedDateEntries([])
          setPickedDateError('Could not load this day.')
        }
      })
      .finally(() => {
        if (isActive) {
          setIsPickedDateLoading(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [data?.date, foodEntries, pickedDate])
  
  return (
    <header className="nutrition-header">
      <div className="nutrition-date-picker" ref={calendarRef}>
        <button
          type="button"
          className="nutrition-date-trigger"
          aria-expanded={isCalendarOpen}
          aria-haspopup="dialog"
          onClick={() => setIsCalendarOpen((isOpen) => !isOpen)}
        >
          <span>
            <span className="nutrition-date-title-wrap">
              <strong>{formatHeaderDate(selectedDateObject)}</strong>
              <ChevronDown size={20} className="nutrition-date-chevron" />
            </span>
            <small>Nutrition Overview | {foodEntries.length} meals logged</small>
          </span>
        </button>

        {isCalendarOpen && (
          <>
            <div 
              className="nutrition-calendar-overlay" 
              onClick={() => setIsCalendarOpen(false)}
            />
            <div className="nutrition-calendar-popover" role="dialog" aria-label="Choose nutrition date">
              <MiniMonth
                selectedDate={selectedDate}
                activeDates={activeNutritionDates}
                maxDate={isoDate(new Date())}
                disableFutureMonths
                onMonthChange={(start, end) => setCalendarRange({ start, end })}
                onSelect={(dateStr) => {
                  handleDateSelect(parseIsoDate(dateStr))
                  setIsCalendarOpen(false)
                }}
              />
            </div>
          </>
        )}

        {pickedDateObject && (
          <div className="nutrition-picked-date-backdrop" role="presentation" onClick={() => setPickedDate(null)}>
            <div className="nutrition-picked-date-popover" role="dialog" aria-label="Selected nutrition date" aria-modal="true" onClick={(event) => event.stopPropagation()}>
              <button type="button" className="nutrition-picked-date-close" aria-label="Close selected date" onClick={() => setPickedDate(null)}>
                <X size={15} />
              </button>
              <span>
                <CalendarCheck size={18} />
              </span>
              <div className="nutrition-picked-date-meta">
                <p>Selected Date</p>
                <h2>{formatHeaderDate(pickedDateObject)}</h2>
                <small>
                  {isPickedDateLoading
                    ? 'Loading food log'
                    : `${pickedDateEntries.length} meals | ${pickedDateTotals.protein}g protein | ${pickedDateTotals.calories.toLocaleString()} kcal`}
                </small>
              </div>
              <div className="nutrition-picked-date-summary" aria-label="Selected day nutrition totals">
                <span>
                  <i>PRO</i>
                  <b>{pickedDateTotals.protein}g</b>
                  <small>Protein</small>
                </span>
                <span>
                  <i>KCAL</i>
                  <b>{pickedDateTotals.calories.toLocaleString()}</b>
                  <small>Calories</small>
                </span>
              </div>
              <div className="nutrition-picked-date-entries">
                {isPickedDateLoading && (
                  <p className="nutrition-picked-date-state">
                    <LoaderCircle size={14} />
                    Loading food log
                  </p>
                )}
                {!isPickedDateLoading && pickedDateError && <p className="nutrition-picked-date-state">{pickedDateError}</p>}
                {!isPickedDateLoading && !pickedDateError && pickedDateEntries.length === 0 && (
                  <p className="nutrition-picked-date-state">No food logged.</p>
                )}
                {!isPickedDateLoading && !pickedDateError && pickedDateEntries.map((entry, index) => {
                  const detailLine = [
                    entry.mealQuality,
                    entry.recipeCategory,
                    entry.serving ? `${entry.serving} serving` : '',
                    entry.servingNotes,
                  ].filter(Boolean).join(' | ')
                  const notesLine = [entry.notes, entry.sourceNotes].filter(Boolean).join(' | ')

                  const iconDetails = getFoodIconDetails(entry.description, entry.mealType)
                  const FoodIcon = iconDetails.icon

                  return (
                    <article key={entry.id || `${entry.description}-${index}`}>
                      <span aria-hidden="true" style={{ background: iconDetails.bg }}>
                        <FoodIcon size={13} color={iconDetails.color} />
                      </span>
                      <div>
                        <b>{entry.description || 'Food item'}</b>
                        <small>{entry.mealType || 'Snack'} | {Number(entry.proteinGrams) || 0}g protein | {(Number(entry.calories) || 0).toLocaleString()} kcal</small>
                        {detailLine && <em>{detailLine}</em>}
                        {notesLine && <em>{notesLine}</em>}
                      </div>
                    </article>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="nutrition-header-actions">
        {onAiClick && (
          <button
            type="button"
            onClick={onAiClick}
            className="nutrition-ai-btn"
            id="ai-meal-scan-btn"
            aria-label="AI Meal Scan"
          >
            <Sparkles size={13} />
            <span>AI Scan</span>
          </button>
        )}
        {onAddClick && (
          <button
            type="button"
            onClick={onAddClick}
            className="nutrition-add-btn"
          >
            <Plus size={14} strokeWidth={3} />
            <span>Add</span>
          </button>
        )}
      </div>
    </header>
  )
}

export { NutritionHeader }
