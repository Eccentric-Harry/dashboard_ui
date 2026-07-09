import { useMemo, useState } from 'react'
import { Beef, Flame, Pencil, Trash2, UtensilsCrossed } from 'lucide-react'
import toast from 'react-hot-toast'
import { getFoodIconDetails, sortFoodEntries } from './food-icon-helper'
import { MealDetailsModal } from './meal-details-modal'
import { ArcGauge } from './arc-gauge'
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

const goalTones: Record<string, string> = {
  protein: 'tone-lime',
  calories: 'tone-apricot',
  carbs: 'tone-sky',
  water: 'tone-sky',
}

const PROTEIN_TARGET = 100
const CALORIE_TARGET = 2000

type CircularGoal = {
  label: string
  value: number
  target: number
  unit: string
}

type FoodEntry = {
  id?: string
  description?: string
  mealType?: string
  proteinGrams?: number
  calories?: number
}

const isoDate = (date: Date) => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')

  return `${year}-${month}-${day}`
}

interface MacroBalanceCardProps {
  onEdit?: (food: FoodEntry) => void
}

function MacroBalanceCard({ onEdit }: MacroBalanceCardProps) {
  const { data, isLoading, refetch } = useDashboard()

  const selectedDate = data?.date || isoDate(new Date())
  const dailyFood = data?.health?.dailyFood || { calories: 0, calorieGoal: CALORIE_TARGET }
  const circularGoals = useMemo<CircularGoal[]>(() => data?.health?.circularGoals || [], [data?.health?.circularGoals])
  const foodEntries = useMemo<FoodEntry[]>(() => sortFoodEntries(data?.health?.foodEntries || []), [data?.health?.foodEntries])
  const [isEditMode, setIsEditMode] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<FoodEntry | null>(null)
  const [selectedEntry, setSelectedEntry] = useState<FoodEntry | null>(null)

  if (isLoading) {
    return (
      <section className="ntr-card ntr-hero" aria-label="Daily nutrition summary loading">
        <div className="ntr-card-head">
          <div>
            <p className="ntr-eyebrow">Daily Nutrition</p>
            <div className="skeleton-shimmer skeleton-rect" style={{ width: '210px', height: '22px', marginTop: '6px', borderRadius: '6px' }} />
          </div>
        </div>
        <div className="skeleton-shimmer skeleton-rect" style={{ height: '210px', marginTop: '18px', borderRadius: '22px' }} />
        <div className="ntr-meals">
          <div className="skeleton-shimmer skeleton-rect" style={{ width: '130px', height: '16px', borderRadius: '5px' }} />
          <div className="ntr-meals-list">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="ntr-skel-row">
                <div className="skeleton-shimmer skeleton-circle" style={{ width: '38px', height: '38px' }} />
                <div style={{ flex: 1 }}>
                  <div className="skeleton-shimmer skeleton-rect" style={{ width: '55%', height: '12px', borderRadius: '4px' }} />
                  <div className="skeleton-shimmer skeleton-rect" style={{ width: '28%', height: '9px', marginTop: '6px', borderRadius: '4px' }} />
                </div>
                <div className="skeleton-shimmer skeleton-rect" style={{ width: '44px', height: '12px', borderRadius: '4px' }} />
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  const proteinGoal = circularGoals.find((goal) => goal.label === 'Protein')
  const proteinLogged = proteinGoal?.value || 0
  const proteinTarget = proteinGoal?.target || dailyFood.proteinGoalGrams || PROTEIN_TARGET
  const proteinProgress = Math.round((proteinLogged / proteinTarget) * 100) || 0
  const caloriesLogged = Number(dailyFood.calories) || 0
  const caloriesTarget = dailyFood.calorieGoal || circularGoals.find((goal) => goal.label === 'Calories')?.target || CALORIE_TARGET
  const caloriesProgress = Math.round((caloriesLogged / caloriesTarget) * 100) || 0
  const caloriesRemaining = Math.max(caloriesTarget - caloriesLogged, 0)

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

  return (
    <section className="ntr-card ntr-hero" aria-label="Daily nutrition summary">
      <div className="ntr-card-head">
        <div>
          <p className="ntr-eyebrow">Daily Nutrition</p>
          <h2>{proteinProgress}% of protein goal reached</h2>
        </div>
        <span className="ntr-pill dark">
          <UtensilsCrossed size={12} strokeWidth={2.5} />
          {foodEntries.length} meals
        </span>
      </div>

      <div className="ntr-gauge-panel">
        <div style={{ position: 'relative' }}>
          <ArcGauge
            value={caloriesLogged}
            target={caloriesTarget}
            centerText={caloriesLogged.toLocaleString()}
            centerSub={`of ${caloriesTarget.toLocaleString()} kcal`}
          />
          <span className="ntr-gauge-badge">{caloriesProgress}%</span>
        </div>

        <div className="ntr-gauge-stats">
          <div className="ntr-stat-row">
            <span><Beef size={15} /></span>
            <div>
              <header>
                <p>Protein</p>
                <strong>{proteinLogged}<em>/{proteinTarget}g</em></strong>
              </header>
              <div className="ntr-stat-bar" aria-hidden="true">
                <i style={{ width: `${Math.min(proteinProgress, 100)}%` }} />
              </div>
            </div>
          </div>

          <div className="ntr-stat-row">
            <span><Flame size={15} /></span>
            <div>
              <header>
                <p>Calories</p>
                <strong>{caloriesLogged.toLocaleString()}<em>/{caloriesTarget.toLocaleString()}</em></strong>
              </header>
              <div className="ntr-stat-bar" aria-hidden="true">
                <i style={{ width: `${Math.min(caloriesProgress, 100)}%` }} />
              </div>
            </div>
          </div>

          <div className="ntr-stat-row">
            <span><UtensilsCrossed size={15} /></span>
            <div>
              <header>
                <p>Remaining</p>
                <strong>{caloriesRemaining.toLocaleString()}<em> kcal</em></strong>
              </header>
            </div>
          </div>
        </div>
      </div>

      {circularGoals.length > 0 && (
        <div className="ntr-tiles" aria-label="Daily goals">
          {circularGoals.map((goal) => (
            <div key={goal.label} className={`ntr-tile ${goalTones[goal.label.toLowerCase()] || ''}`}>
              <p>{goal.label}</p>
              <strong>
                {goal.value.toLocaleString()}
                <em>/{goal.target.toLocaleString()}{goal.unit}</em>
              </strong>
            </div>
          ))}
        </div>
      )}

      <div className="ntr-meals">
        <div className="ntr-meals-head">
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

        <div className="ntr-meals-list">
          {foodEntries.length === 0 && <p>No food logged yet — add your first meal.</p>}

          {foodEntries.map((entry, index) => {
            const id = entry.id
            const description = entry.description || 'Food item'
            const mealType = entry.mealType || 'Snack'
            const proteinGrams = Number(entry.proteinGrams) || 0
            const calories = Number(entry.calories) || 0
            const tone = mealToneColors[mealType] || '#8b9187'

            const iconDetails = getFoodIconDetails(description, mealType)
            const FoodIcon = iconDetails.icon

            return (
              <div
                className={`ntr-meal-row${!isEditMode && id ? ' clickable' : ''}`}
                key={id || `${description}-${index}`}
                onClick={() => !isEditMode && id && setSelectedEntry(entry)}
              >
                <span className="ntr-meal-ic" aria-hidden="true" style={{ background: iconDetails.bg }}>
                  <FoodIcon size={16} color={iconDetails.color} />
                </span>
                <div className="ntr-meal-info">
                  <b title={description}>{description}</b>
                  <span
                    className="ntr-meal-tag"
                    style={{ backgroundColor: `${tone}14`, color: tone, border: `1px solid ${tone}2e` }}
                  >
                    {mealType}
                  </span>
                </div>
                <div className="ntr-meal-stats">
                  <strong>{proteinGrams}g</strong>
                  <small>{calories.toLocaleString()} kcal</small>
                </div>
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
      </div>

      <ConfirmDialog
        open={!!itemToDelete}
        title="Delete Food Entry"
        message={`Are you sure you want to delete "${itemToDelete?.description}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setItemToDelete(null)}
      />

      <MealDetailsModal
        open={!!selectedEntry}
        onClose={() => setSelectedEntry(null)}
        entry={selectedEntry}
      />
    </section>
  )
}

export { MacroBalanceCard }
