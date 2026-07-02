import { useMemo, useState, useRef, useCallback, useEffect } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { getFoodIconDetails, sortFoodEntries } from './food-icon-helper'
import { MealDetailsModal } from './meal-details-modal'

const mealDotColors: Record<string, string> = {
  Breakfast: '#f97316',
  Lunch: '#059669',
  Dinner: '#38bdf8',
  Snack: '#a78bfa',
  Midnight: '#6366f1',
  'Post Workout': '#f87171',
  'Mid-Morning': '#c2410c',
}

import { RingProgress } from './ring-progress'
import { useDashboard } from '../../../../contexts/DashboardContext'
import { deleteFoodEntry } from '../../../../lib/api'
import { ConfirmDialog } from '../../../ui/confirm-dialog'

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
  const [selectedMacroId, setSelectedMacroId] = useState('protein')
  const [isEditMode, setIsEditMode] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<FoodEntry | null>(null)
  const [selectedEntry, setSelectedEntry] = useState<FoodEntry | null>(null)
  const [isScrolling, setIsScrolling] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleScrollStart = useCallback(() => {
    setIsScrolling(true)
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }
  }, [])

  const handleScrollEnd = useCallback(() => {
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false)
    }, 300)
  }, [])

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])

  if (isLoading) {
    return (
      <section className="nutrition-card nutrition-macro-card" aria-label="Daily nutrition summary loading">
        <div className="nutrition-card-head">
          <div>
            <p>Daily Nutrition Summary</p>
            <div className="skeleton-shimmer skeleton-rect" style={{ width: '200px', height: '18px', marginTop: '6px', borderRadius: '4px' }} />
          </div>
        </div>

        <div className="nutrition-rings nutrition-rings-two" style={{ display: 'flex', gap: '24px', justifyContent: 'center', margin: '20px 0' }}>
          {Array.from({ length: 2 }).map((_, idx) => (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <div className="skeleton-shimmer skeleton-circle" style={{ width: '76px', height: '76px' }} />
              <div className="skeleton-shimmer skeleton-rect" style={{ width: '50px', height: '12px', borderRadius: '3px' }} />
            </div>
          ))}
        </div>

        <div className="nutrition-today-log">
          <div className="nutrition-today-log-head">
            <div>
              <p>Daily Log</p>
              <h3>Today's Food Log</h3>
            </div>
          </div>
          <div className="nutrition-today-log-list" style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'hidden' }}>
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '8px 14px' }}>
                <div className="skeleton-shimmer skeleton-circle" style={{ width: '28px', height: '28px' }} />
                <div style={{ flex: 1 }}>
                  <div className="skeleton-shimmer skeleton-rect" style={{ width: '60%', height: '12px', borderRadius: '3px' }} />
                  <div className="skeleton-shimmer skeleton-rect" style={{ width: '30%', height: '8px', marginTop: '6px', borderRadius: '2px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <div className="skeleton-shimmer skeleton-rect" style={{ width: '35px', height: '12px', borderRadius: '3px' }} />
                  <div className="skeleton-shimmer skeleton-rect" style={{ width: '45px', height: '8px', borderRadius: '2px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const proteinGoal = circularGoals.find((goal) => goal.label === 'Protein')
  const proteinLogged = proteinGoal?.value || 0
  const proteinTarget = proteinGoal?.target || dailyFood.proteinGoalGrams || PROTEIN_TARGET
  const proteinProgress = Math.round((proteinLogged / proteinTarget) * 100) || 0
  const caloriesLogged = Number(dailyFood.calories) || 0
  const caloriesTarget = dailyFood.calorieGoal || circularGoals.find((goal) => goal.label === 'Calories')?.target || CALORIE_TARGET

  const progressRings = [
    {
      id: 'protein',
      label: 'Protein',
      logged: proteinLogged,
      target: proteinTarget,
      unit: 'g',
      color: '#35b64b',
    },
    {
      id: 'calories',
      label: 'Total Calories',
      logged: caloriesLogged,
      target: caloriesTarget,
      unit: ' kcal',
      color: '#eab308',
    },
  ]

  // Inline add/edit form has been moved to AddFoodModal

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
    <section className="nutrition-card nutrition-macro-card">
      <div className="nutrition-card-head">
        <div>
          <p>Daily Nutrition Summary</p>
          <h2>{proteinProgress}% of daily protein logged</h2>
        </div>
      </div>

      <div className="nutrition-rings nutrition-rings-two" aria-label="Daily nutrition progress rings">
        {progressRings.map((macro) => (
          <RingProgress
            key={macro.id}
            label={macro.label}
            value={macro.logged}
            target={macro.target}
            unit={macro.unit}
            color={macro.color}
            active={macro.id === selectedMacroId}
            onSelect={() => setSelectedMacroId(macro.id)}
          />
        ))}
      </div>

      <div className="nutrition-today-log">
        <div className="nutrition-today-log-head">
          <div>
            <p>Daily Log</p>
            <h3>Today's Food Log</h3>
          </div>
          <div className="nutrition-today-log-actions">
            <button
              type="button"
              className={`nutrition-food-log-add-btn compact ${isEditMode ? 'active' : ''}`}
              onClick={() => setIsEditMode(!isEditMode)}
              title={isEditMode ? 'Finish Editing' : 'Edit Food Logs'}
              aria-label="Toggle edit mode"
              style={{
                width: '32px',
                height: '32px',
                padding: '0',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                borderRadius: '8px',
                background: isEditMode ? 'rgba(20, 24, 22, 0.06)' : 'transparent'
              }}
            >
              <Pencil size={14} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        <div
          ref={listRef}
          className={`nutrition-today-log-list${isScrolling ? ' scrolling' : ''}`}
          onScroll={(e) => {
            if (e.currentTarget.scrollTop === 0) {
              handleScrollStart()
            }
            handleScrollEnd()
          }}
        >
          {foodEntries.length === 0 && <p>No food logged.</p>}

          {foodEntries.map((entry, index) => {
            const id = entry.id
            const description = entry.description || 'Food item'
            const mealType = entry.mealType || 'Snack'
            const proteinGrams = Number(entry.proteinGrams) || 0
            const calories = Number(entry.calories) || 0

            const iconDetails = getFoodIconDetails(description, mealType)
            const FoodIcon = iconDetails.icon

return (
              <div 
                className="nutrition-today-log-row" 
                key={id || `${description}-${index}`} 
                onClick={() => !isEditMode && id && setSelectedEntry(entry)}
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'auto 1fr auto auto', 
                  alignItems: 'center', 
                  gap: '12px', 
                  padding: `8px ${id && isEditMode ? '18px' : '14px'} 8px 14px`,
                  cursor: !isEditMode && id ? 'pointer' : 'default',
                  transition: 'background-color 0.2s',
                  borderRadius: '12px'
                }}
                onMouseEnter={(e) => {
                  if (!isEditMode && id) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.4)'
                }}
                onMouseLeave={(e) => {
                  if (!isEditMode && id) e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                <span aria-hidden="true" style={{ background: iconDetails.bg }}>
                  <FoodIcon size={16} color={iconDetails.color} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <span title={description} style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500, color: '#171c19' }}>{description}</span>
                  <span
                    className="nutrition-meal-tag"
                    style={{
                      backgroundColor: `${mealDotColors[mealType] || '#94a3b8'}15`,
                      color: mealDotColors[mealType] || '#94a3b8',
                      border: `1px solid ${mealDotColors[mealType] || '#94a3b8'}30`,
                      fontSize: '10px',
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.02em',
                      display: 'inline-block',
                      marginTop: '4px',
                    }}
                  >
                    {mealType}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', textAlign: 'right' }}>
                  <strong style={{ fontSize: '13px', color: '#26953a' }}>{proteinGrams}g</strong>
                  <small style={{ color: 'rgba(23, 28, 25, 0.5)', fontSize: '11px' }}>{calories.toLocaleString()} kcal</small>
                </div>
                {id && isEditMode ? (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => { setIsEditMode(false); onEdit?.(entry); }}
                      title="Edit entry"
                      aria-label="Edit entry"
                      style={{
                        display: 'grid',
                        width: '28px',
                        height: '28px',
                        placeItems: 'center',
                        border: '0',
                        borderRadius: '6px',
                        background: 'rgba(23, 28, 25, 0.05)',
                        color: 'rgba(23, 28, 25, 0.7)',
                        cursor: 'pointer',
                        transition: 'background 0.2s, color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(23, 28, 25, 0.1)'
                        e.currentTarget.style.color = 'rgba(23, 28, 25, 0.9)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(23, 28, 25, 0.05)'
                        e.currentTarget.style.color = 'rgba(23, 28, 25, 0.7)'
                      }}
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setItemToDelete(entry)}
                      title="Delete entry"
                      aria-label="Delete entry"
                      style={{
                        display: 'grid',
                        width: '28px',
                        height: '28px',
                        placeItems: 'center',
                        border: '0',
                        borderRadius: '6px',
                        background: 'rgba(239, 68, 68, 0.08)',
                        color: '#dc2626',
                        cursor: 'pointer',
                        transition: 'background 0.2s, color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'
                        e.currentTarget.style.color = '#b91c1c'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'
                        e.currentTarget.style.color = '#dc2626'
                      }}
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