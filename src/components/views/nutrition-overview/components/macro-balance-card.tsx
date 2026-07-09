import { useMemo, useState } from 'react'
import { ChevronRight, Pencil, Trash2, UtensilsCrossed } from 'lucide-react'
import toast from 'react-hot-toast'
import { sortFoodEntries } from './food-icon-helper'
import { getFoodImage } from './food-image-helper'
import { gradeFromEntry } from './meal-grade'
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
  carbs: 'tone-sky',
  fat: 'tone-apricot',
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

interface MacroBalanceCardProps {
  onEdit?: (food: FoodEntry) => void
  onSelectEntry?: (entry: FoodEntry) => void
}

function MacroBalanceCard({ onEdit, onSelectEntry }: MacroBalanceCardProps) {
  const { data, isLoading, refetch } = useDashboard()

  const selectedDate = data?.date || isoDate(new Date())
  const dailyFood = data?.health?.dailyFood || { calories: 0, calorieGoal: CALORIE_TARGET }
  const circularGoals = useMemo<CircularGoal[]>(() => data?.health?.circularGoals || [], [data?.health?.circularGoals])
  const foodEntries = useMemo<FoodEntry[]>(() => sortFoodEntries(data?.health?.foodEntries || []), [data?.health?.foodEntries])
  const [isEditMode, setIsEditMode] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<FoodEntry | null>(null)
  const [activeMetric, setActiveMetric] = useState<'calories' | 'protein' | 'carbs' | 'fat'>('calories')

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

  const carbsGoal = circularGoals.find((goal) => goal.label === 'Carbs')
  const carbsLogged = carbsGoal?.value || 0
  const carbsTarget = carbsGoal?.target || 252
  const carbsProgress = Math.round((carbsLogged / carbsTarget) * 100) || 0

  const fatGoal = circularGoals.find((goal) => goal.label === 'Fat')
  const fatLogged = fatGoal?.value || 0
  const fatTarget = fatGoal?.target || 59
  const fatProgress = Math.round((fatLogged / fatTarget) * 100) || 0

  const formatPlain = (n: number) => n.toLocaleString()
  const formatGrams = (n: number) => `${n.toLocaleString()}g`
  const metricMap = {
    calories: { value: caloriesLogged, target: caloriesTarget, progress: caloriesProgress, format: formatPlain, centerSub: `of ${caloriesTarget.toLocaleString()} kcal` },
    protein: { value: proteinLogged, target: proteinTarget, progress: proteinProgress, format: formatGrams, centerSub: `of ${proteinTarget}g protein` },
    carbs: { value: carbsLogged, target: carbsTarget, progress: carbsProgress, format: formatGrams, centerSub: `of ${carbsTarget}g carbs` },
    fat: { value: fatLogged, target: fatTarget, progress: fatProgress, format: formatGrams, centerSub: `of ${fatTarget}g fat` },
  }
  const activeGauge = metricMap[activeMetric]
  const isOverBudget = activeMetric === 'calories' && caloriesLogged > caloriesTarget

  // friendly status line under the gauge — the over-budget case must never
  // read as broken ("0 kcal remaining")
  let gaugeFoot: string
  if (activeMetric === 'calories') {
    if (caloriesLogged > caloriesTarget) {
      gaugeFoot = `${(caloriesLogged - caloriesTarget).toLocaleString()} kcal over — tomorrow's a fresh start`
    } else if (caloriesProgress >= 95) {
      gaugeFoot = "You've hit your energy target 🎯"
    } else {
      gaugeFoot = `${caloriesRemaining.toLocaleString()} kcal remaining today`
    }
  } else if (activeGauge.value >= activeGauge.target) {
    gaugeFoot = `${activeMetric.charAt(0).toUpperCase()}${activeMetric.slice(1)} goal reached 🎯`
  } else {
    gaugeFoot = `${(activeGauge.target - activeGauge.value).toLocaleString()}g of ${activeMetric} to go`
  }

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

      <div className={`ntr-gauge-panel${isOverBudget ? ' over' : ''}`}>
        <div className="ntr-gauge-wrap">
          <ArcGauge
            value={activeGauge.value}
            target={activeGauge.target}
            format={activeGauge.format}
            centerSub={activeGauge.centerSub}
            over={isOverBudget}
          />
          <span className={`ntr-gauge-badge${isOverBudget ? ' over' : ''}`}>{activeGauge.progress}%</span>
        </div>
        <p className="ntr-gauge-foot">{gaugeFoot}</p>
      </div>

      {circularGoals.length > 0 && (
        <div className="ntr-tiles" aria-label="Daily goals">
          {circularGoals.filter((goal) => goal.label !== 'Calories').map((goal) => {
            const metricKey = goal.label.toLowerCase() as 'protein' | 'carbs' | 'fat'
            const isActive = activeMetric === metricKey
            const fillPercent = Math.min(Math.round((goal.value / Math.max(goal.target, 1)) * 100), 100)
            return (
              <div
                key={goal.label}
                className={`ntr-tile ${goalTones[goal.label.toLowerCase()] || ''}${isActive ? ' ntr-tile-active' : ''}${metricKey === 'protein' ? ' priority' : ''}`}
                onClick={() => setActiveMetric(isActive ? 'calories' : metricKey)}
                style={{ cursor: 'pointer' }}
                role="button"
                tabIndex={0}
                aria-pressed={isActive}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActiveMetric(isActive ? 'calories' : metricKey) }}
              >
                <p>{goal.label}</p>
                <strong>
                  {goal.value.toLocaleString()}
                  <em>/{goal.target.toLocaleString()}{goal.unit}</em>
                </strong>
                <span className="ntr-tile-bar" aria-hidden="true">
                  <i style={{ width: `${fillPercent}%` }} />
                </span>
              </div>
            )
          })}
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
          {foodEntries.length === 0 && <p>No meals logged yet — add your first 🍽️</p>}

          {foodEntries.map((entry, index) => {
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

export { MacroBalanceCard }
