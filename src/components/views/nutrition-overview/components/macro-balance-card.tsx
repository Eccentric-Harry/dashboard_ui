import { useMemo, useState, useRef, useCallback, useEffect } from 'react'
import { Pencil, Trash2, Utensils } from 'lucide-react'
import toast from 'react-hot-toast'
import { getFoodIconDetails } from './food-icon-helper'

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
  const { data, refetch } = useDashboard()
  const selectedDate = data?.date || isoDate(new Date())
  const dailyFood = data?.health?.dailyFood || { calories: 0, calorieGoal: CALORIE_TARGET }
  const circularGoals = useMemo<CircularGoal[]>(() => data?.health?.circularGoals || [], [data?.health?.circularGoals])
  const foodEntries = useMemo<FoodEntry[]>(() => data?.health?.foodEntries || [], [data?.health?.foodEntries])
  const [selectedMacroId, setSelectedMacroId] = useState('protein')
  const [isEditMode, setIsEditMode] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<FoodEntry | null>(null)
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

  const proteinGoal = circularGoals.find((goal) => goal.label === 'Protein')
  const proteinLogged = proteinGoal?.value || 0
  const proteinTarget = PROTEIN_TARGET
  const proteinProgress = Math.round((proteinLogged / PROTEIN_TARGET) * 100) || 0
  const caloriesLogged = Number(dailyFood.calories) || 0

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
      target: CALORIE_TARGET,
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
        <span>{proteinTarget} g recovery target</span>
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
            <h3>Daily Food Log</h3>
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
            const calories = Number(entry.calories) || 0

            const iconDetails = getFoodIconDetails(description, mealType)
            const FoodIcon = iconDetails.icon

            return (
              <div className="nutrition-today-log-row" key={id || `${description}-${index}`}>
                <span aria-hidden="true" style={{ background: iconDetails.bg }}>
                  <FoodIcon size={16} color={iconDetails.color} />
                </span>
                <div>
                  <b title={description}>{description}</b>
                  <small>{mealType} | {calories.toLocaleString()} kcal</small>
                </div>
                {id && isEditMode && (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => onEdit && onEdit(entry)}
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
                )}
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