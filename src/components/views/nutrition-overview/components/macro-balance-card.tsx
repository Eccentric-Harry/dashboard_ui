import { useMemo, useState, useRef, useCallback, useEffect } from 'react'
import { Check, Trash2, Utensils, X, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'

import { RingProgress } from './ring-progress'
import { useDashboard } from '../../../../contexts/DashboardContext'
import { addFoodEntry, deleteFoodEntry, updateFoodEntry } from '../../../../lib/api'

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

function MacroBalanceCard() {
  const { data, refetch } = useDashboard()
  const selectedDate = data?.date || isoDate(new Date())
  const dailyFood = data?.health?.dailyFood || { calories: 0, calorieGoal: CALORIE_TARGET }
  const circularGoals = useMemo<CircularGoal[]>(() => data?.health?.circularGoals || [], [data?.health?.circularGoals])
  const foodEntries = useMemo<FoodEntry[]>(() => data?.health?.foodEntries || [], [data?.health?.foodEntries])
  const [selectedMacroId, setSelectedMacroId] = useState('protein')
  const [isAddingFood, setIsAddingFood] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isSubmittingFood, setIsSubmittingFood] = useState(false)
  const [isScrolling, setIsScrolling] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [formData, setFormData] = useState({
    description: '',
    mealType: 'Snack',
    proteinGrams: '',
    calories: '',
  })

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
  const proteinProgress = Math.round((proteinLogged / proteinTarget) * 100) || 0
  const caloriesLogged = Number(dailyFood.calories) || 0
  const caloriesTarget = CALORIE_TARGET

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

  const resetFoodForm = () => {
    setFormData({ description: '', mealType: 'Snack', proteinGrams: '', calories: '' })
    setEditingId(null)
  }

  const handleEditClick = (entry: FoodEntry) => {
    if (!entry.id) return
    setFormData({
      description: entry.description || '',
      mealType: entry.mealType || 'Snack',
      proteinGrams: entry.proteinGrams?.toString() || '',
      calories: entry.calories?.toString() || '',
    })
    setEditingId(entry.id)
    setIsAddingFood(true)
  }

  const handleAddSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!formData.description || !formData.calories || !formData.proteinGrams) return

    try {
      setIsSubmittingFood(true)
      if (editingId) {
        await updateFoodEntry(selectedDate, editingId, {
          description: formData.description,
          mealType: formData.mealType,
          proteinGrams: parseInt(formData.proteinGrams, 10),
          calories: parseInt(formData.calories, 10),
          date: selectedDate,
        })
        toast.success(`Updated "${formData.description}"`)
      } else {
        await addFoodEntry({
          description: formData.description,
          mealType: formData.mealType,
          proteinGrams: parseInt(formData.proteinGrams, 10),
          calories: parseInt(formData.calories, 10),
          date: selectedDate,
        })
        toast.success(`Logged "${formData.description}"`)
      }
      await refetch()
      resetFoodForm()
      setIsAddingFood(false)
    } catch (error: any) {
      console.error('Failed to add food entry', error)
      toast.error(error.message || 'Failed to log food')
    } finally {
      setIsSubmittingFood(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this food entry?')) return

    try {
      await deleteFoodEntry(selectedDate, id)
      toast.success('Food entry deleted')
      await refetch()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete food entry')
      console.error('Failed to delete', error)
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
            <h3>{editingId ? 'Edit Food Entry' : 'Daily Food Log'}</h3>
          </div>
          <div className="nutrition-today-log-actions">
            <button
              type="button"
              className="nutrition-food-log-add-btn compact"
              onClick={() => {
                if (isAddingFood) {
                  resetFoodForm()
                }
                setIsAddingFood((value) => !value)
              }}
              title={isAddingFood ? 'Cancel' : 'Edit Food Logs'}
              aria-label={isAddingFood ? 'Cancel adding food' : 'Edit Food Logs'}
              style={{
                width: '32px',
                height: '32px',
                padding: '0',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                borderRadius: '50%'
              }}
            >
              {isAddingFood ? <X size={16} strokeWidth={2.5} /> : <Pencil size={16} strokeWidth={2.5} />}
            </button>
          </div>
        </div>

        {isAddingFood && (
          <form onSubmit={handleAddSubmit} className="nutrition-today-log-form">
            <input
              type="text"
              autoFocus
              placeholder="Food name"
              value={formData.description}
              onChange={(event) => setFormData({ ...formData, description: event.target.value })}
              required
            />
            <select
              value={formData.mealType}
              onChange={(event) => setFormData({ ...formData, mealType: event.target.value })}
            >
              <option value="Breakfast">Breakfast</option>
              <option value="Lunch">Lunch</option>
              <option value="Dinner">Dinner</option>
              <option value="Snack">Snack</option>
              <option value="Post Workout">Post Workout</option>
              <option value="Mid-Morning">Mid-Morning</option>
              <option value="Midnight">Midnight</option>
            </select>
            <input
              type="number"
              placeholder="Protein (g)"
              value={formData.proteinGrams}
              onChange={(event) => setFormData({ ...formData, proteinGrams: event.target.value })}
              required
              min="0"
            />
            <span>
              <input
                type="number"
                placeholder="Calories (kcal)"
                value={formData.calories}
                onChange={(event) => setFormData({ ...formData, calories: event.target.value })}
                required
                min="0"
              />
              <button type="submit" disabled={isSubmittingFood} aria-label="Save food entry">
                <Check size={14} />
              </button>
            </span>
          </form>
        )}

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

            return (
              <div className="nutrition-today-log-row" key={id || `${description}-${index}`}>
                <span aria-hidden="true">
                  <Utensils size={16} />
                </span>
                <div>
                  <b title={description}>{description}</b>
                  <small>{mealType} | {calories.toLocaleString()} kcal</small>
                </div>
                {id && isAddingFood && (
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button type="button" onClick={() => handleEditClick(entry)} title="Edit entry" aria-label="Edit entry">
                      <Pencil size={14} />
                    </button>
                    <button type="button" onClick={() => handleDelete(id)} title="Delete entry" aria-label="Delete entry">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export { MacroBalanceCard }