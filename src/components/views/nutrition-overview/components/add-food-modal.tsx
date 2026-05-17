import { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { addFoodEntry, updateFoodEntry } from '../../../../lib/api'

interface AddFoodModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  isEdit?: boolean
  initialData?: {
    id?: string
    description: string
    proteinGrams: number
    calories: number
    mealType: string
    date: string
  }
  selectedDate: string
}

export function AddFoodModal({ isOpen, onClose, onSuccess, isEdit, initialData, selectedDate }: AddFoodModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form State
  const [mealType, setMealType] = useState('Snack')
  const [description, setDescription] = useState('')
  const [proteinGrams, setProteinGrams] = useState('')
  const [calories, setCalories] = useState('')
  const [date, setDate] = useState(selectedDate)

  useEffect(() => {
    if (isOpen && isEdit && initialData) {
      setMealType(initialData.mealType)
      setDescription(initialData.description)
      setProteinGrams(initialData.proteinGrams.toString())
      setCalories(initialData.calories.toString())
      setDate(initialData.date)
    } else if (isOpen && !isEdit) {
      // Reset to defaults for new entry
      setMealType('Snack')
      setDescription('')
      setProteinGrams('')
      setCalories('')
      setDate(selectedDate)
    }
  }, [isOpen, isEdit, initialData, selectedDate])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!description || !calories || !proteinGrams || !date) {
      setError('Please fill in all fields')
      return
    }

    const numCalories = parseInt(calories, 10)
    const numProtein = parseFloat(proteinGrams)

    if (isNaN(numCalories) || numCalories < 0 || isNaN(numProtein) || numProtein < 0) {
      setError('Macros must be 0 or greater')
      return
    }

    setLoading(true)
    try {
      const payload = {
        description,
        calories: numCalories,
        proteinGrams: numProtein,
        mealType,
        date
      }

      if (isEdit && initialData?.id) {
        await updateFoodEntry(date, initialData.id, payload)
        toast.success(`Updated "${description}"`)
      } else {
        await addFoodEntry(payload)
        toast.success(`Logged "${description}"`)
      }
      
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to save food entry')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="finance-modal-backdrop" role="presentation" onClick={onClose}>
      <div 
        className="finance-modal-popover add-tx-modal" 
        role="dialog" 
        aria-modal="true" 
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(440px, calc(100vw - 42px))', padding: '28px' }}
      >
        <button type="button" className="finance-modal-close" onClick={onClose}>
          <X size={15} />
        </button>
        
        <h2 style={{ fontSize: '22px', marginBottom: '24px' }}>
          {isEdit ? 'Edit Food Entry' : 'Add Food Entry'}
        </h2>
        
        <form onSubmit={handleSubmit} className="add-tx-form">
          <div className="form-group">
            <label>Food Name</label>
            <input 
              type="text" 
              placeholder="e.g. Paneer Sandwich, Salad..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Meal</label>
              <select value={mealType} onChange={(e) => setMealType(e.target.value)}>
                <option value="Breakfast">Breakfast</option>
                <option value="Lunch">Lunch</option>
                <option value="Dinner">Dinner</option>
                <option value="Snack">Snack</option>
                <option value="Post Workout">Post Workout</option>
                <option value="Mid-Morning">Mid-Morning</option>
                <option value="Midnight">Midnight</option>
              </select>
            </div>

            <div className="form-group">
              <label>Date</label>
              <input 
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Protein (g)</label>
              <input 
                type="number" 
                min="0"
                step="0.01"
                placeholder="0.00"
                value={proteinGrams}
                onChange={(e) => setProteinGrams(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Calories (kcal)</label>
              <input 
                type="number" 
                min="0"
                placeholder="0"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
              />
            </div>
          </div>

          {error && <p className="add-tx-error">{error}</p>}

          <button type="submit" className="add-tx-submit" disabled={loading}>
            {loading ? <Loader2 className="spinner" size={18} /> : 'Save Food'}
          </button>
        </form>
      </div>
    </div>
  )
}
