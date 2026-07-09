import { useState, useMemo } from 'react'
import { ChevronRight, Pencil, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { sortFoodEntries } from './food-icon-helper'
import { getFoodImage } from './food-image-helper'
import { gradeFromEntry } from './meal-grade'
import { useDashboard } from '../../../../contexts/DashboardContext'
import { deleteFoodEntry } from '../../../../lib/api'
import { ConfirmDialog } from '../../../ui/confirm-dialog'

const mealToneColors: Record<string, string> = {
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
  mealQuality?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recomposition_assessment?: Record<string, any>
}

const isoDate = (date: Date) => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

interface TodaysMealsCardProps {
  onEdit?: (food: FoodEntry) => void
  onSelectEntry?: (entry: FoodEntry) => void
}

function TodaysMealsCard({ onEdit, onSelectEntry }: TodaysMealsCardProps) {
  const { data, isLoading, refetch } = useDashboard()
  const selectedDate = data?.date || isoDate(new Date())
  const foodEntries = useMemo<FoodEntry[]>(() => sortFoodEntries(data?.health?.foodEntries || []), [data?.health?.foodEntries])
  const [isEditMode, setIsEditMode] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<FoodEntry | null>(null)

  const handleDeleteConfirm = async () => {
    if (!itemToDelete?.id) return

    try {
      await deleteFoodEntry(selectedDate, itemToDelete.id)
      toast.success('Food entry deleted')
      await refetch()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete food entry')
      console.error('Failed to delete', error)
    } finally {
      setItemToDelete(null)
    }
  }

  if (isLoading) {
    return (
      <section className="ntr-card ntr-meals-card" aria-label="Today's meals loading">
        <div className="ntr-card-head" style={{ padding: '24px 26px 0' }}>
          <div>
            <div className="skeleton-shimmer skeleton-rect" style={{ width: '130px', height: '16px', borderRadius: '5px' }} />
          </div>
        </div>
        <div className="ntr-meals-list" style={{ padding: '0 26px 24px' }}>
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="ntr-skel-row" style={{ marginTop: '16px' }}>
              <div className="skeleton-shimmer skeleton-circle" style={{ width: '38px', height: '38px' }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton-shimmer skeleton-rect" style={{ width: '55%', height: '12px', borderRadius: '4px' }} />
                <div className="skeleton-shimmer skeleton-rect" style={{ width: '28%', height: '9px', marginTop: '6px', borderRadius: '4px' }} />
              </div>
              <div className="skeleton-shimmer skeleton-rect" style={{ width: '44px', height: '12px', borderRadius: '4px' }} />
            </div>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="ntr-card ntr-meals-card" aria-label="Today's meals">
      <div className="ntr-meals-head" style={{ padding: '24px 26px 12px' }}>
        <h3>Today's Meals</h3>
        <aside>
          <button
            type="button"
            className={`ntr-icon-btn${isEditMode ? ' active' : ''}`}
            onClick={() => setIsEditMode(!isEditMode)}
            title={isEditMode ? 'Finish Editing' : 'Edit Food Logs'}
            aria-label="Toggle edit mode"
            aria-pressed={isEditMode}
          >
            <Pencil size={14} strokeWidth={2.5} />
          </button>
        </aside>
      </div>

      <div className="ntr-meals-list" style={{ padding: '0 26px 24px' }}>
        {foodEntries.length === 0 && (
          <div className="ntr-meals-empty">
            <div className="ntr-empty-icon">🍽️</div>
            <p>No meals logged today</p>
            <span>Track your food to see your daily progress and macros</span>
          </div>
        )}        {foodEntries.map((entry, index) => {
          const id = entry.id
          const description = entry.description || 'Food item'
          const mealType = entry.mealType || 'Snack'
          const proteinGrams = Number(entry.proteinGrams) || 0
          const calories = Number(entry.calories) || 0
          const tone = mealToneColors[mealType] || '#8b9187'
          const foodImage = getFoodImage(description, mealType)
          const grade = gradeFromEntry(entry)
          const clickable = !isEditMode && !!id

          return (
            <div
              className={`ntr-meal-row${clickable ? ' clickable' : ''}`}
              key={id || `${description}-${index}`}
              onClick={() => clickable && onSelectEntry?.(entry)}
              role={clickable ? 'button' : undefined}
              tabIndex={clickable ? 0 : undefined}
              onKeyDown={(e) => {
                if (clickable && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault()
                  onSelectEntry?.(entry)
                }
              }}
            >
              <span className="ntr-meal-thumb" aria-hidden="true">
                <img src={foodImage.src} alt="" loading="lazy" />
              </span>
              <div className="ntr-meal-info">
                <b title={description}>{description}</b>
                <span className="ntr-meal-tag-row">
                  <span
                    className="ntr-meal-tag"
                    style={{ backgroundColor: `${tone}14`, color: tone, border: `1px solid ${tone}2e` }}
                  >
                    {mealType}
                  </span>
                  {grade && (
                    <span
                      className="ntr-grade-badge"
                      style={{ backgroundColor: grade.bg, color: grade.ink, borderColor: grade.border }}
                      title={`Meal quality: ${grade.label}`}
                    >
                      {grade.letter}
                    </span>
                  )}
                </span>
              </div>
              <div className="ntr-meal-stats">
                <strong>{proteinGrams}g</strong>
                <small>{calories.toLocaleString()} kcal</small>
              </div>
              {clickable && <ChevronRight size={14} className="ntr-meal-go" aria-hidden="true" />}
              {id && isEditMode ? (
                <div className="ntr-meal-actions">
                  <button
                    type="button"
                    className="ntr-icon-btn"
                    onClick={() => { setIsEditMode(false); onEdit?.(entry) }}
                    title="Edit entry"
                    aria-label="Edit entry"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    type="button"
                    className="ntr-icon-btn danger"
                    onClick={() => setItemToDelete(entry)}
                    title="Delete entry"
                    aria-label="Delete entry"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      <ConfirmDialog
        open={!!itemToDelete}
        title="Delete Food Entry"
        message={`Are you sure you want to delete "${itemToDelete?.description}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setItemToDelete(null)}
      />
    </section>
  )
}

export { TodaysMealsCard }
