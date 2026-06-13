import { useState, useEffect } from 'react'
import { X, Loader2, ClipboardCheck, FileJson } from 'lucide-react'
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
  const [activeTab, setActiveTab] = useState<'manual' | 'json'>('manual')
  const [jsonInput, setJsonInput] = useState('')
  const [richPayload, setRichPayload] = useState<any>(null)
  
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
      setRichPayload(null)
      setActiveTab('manual')
    } else if (isOpen && !isEdit) {
      // Reset to defaults for new entry
      setMealType('Snack')
      setDescription('')
      setProteinGrams('')
      setCalories('')
      setDate(selectedDate)
      setJsonInput('')
      setRichPayload(null)
      setActiveTab('manual')
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

    const numCalories = Math.round(parseFloat(calories))
    const numProtein = Math.round(parseFloat(proteinGrams))

    if (isNaN(numCalories) || numCalories < 0 || isNaN(numProtein) || numProtein < 0) {
      setError('Macros must be 0 or greater')
      return
    }

    setLoading(true)
    try {
      const payload: any = {
        description,
        calories: numCalories,
        proteinGrams: numProtein,
        mealType,
        date
      }

      if (richPayload) {
        payload.analysis_metadata = richPayload.analysis_metadata
        payload.meal_items = richPayload.meal_items
        payload.total_summary = richPayload.total_summary
        payload.gaps_and_warnings = richPayload.gaps_and_warnings
        payload.technical_diagnostic = richPayload.technical_diagnostic
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

  const handleProcessJson = () => {
    try {
      const data = JSON.parse(jsonInput)
      setRichPayload(data)
      
      // Auto-fill form from rich payload
      if (data.total_summary) {
        setCalories(Math.round(data.total_summary.calories_kcal || 0).toString())
        setProteinGrams(Math.round(data.total_summary.protein_g || 0).toString())
      }
      if (data.analysis_metadata && data.analysis_metadata.meal_type_detected) {
        let rawType = String(data.analysis_metadata.meal_type_detected).trim().toLowerCase()
        const validTypes = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Midnight', 'Post Workout', 'Mid-Morning']
        let matchedType = validTypes.find(t => t.toLowerCase() === rawType) || 'Snack'
        setMealType(matchedType)
      }
      
      if (!description) {
        setDescription('Rich Nutritional Entry')
      }
      
      setActiveTab('manual')
      toast.success('JSON parsed! Please review macros and save.')
    } catch (err) {
      toast.error('Invalid JSON format')
    }
  }

  return (
    <div className="finance-modal-backdrop" role="presentation" onClick={onClose}>
      <div 
        className="finance-modal-popover add-tx-modal" 
        role="dialog" 
        aria-modal="true" 
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(440px, calc(100vw - 42px))' }}
      >
        <button type="button" className="finance-modal-close" onClick={onClose}>
          <X size={15} />
        </button>
        
        <h2 style={{ fontSize: '22px', marginBottom: '16px' }}>
          {isEdit ? 'Edit Food Entry' : 'Add Food Entry'}
        </h2>
        
        {!isEdit && (
          <div className="workouts-modal-tabs" style={{ marginBottom: '20px' }}>
            <button
              className={`tab-btn ${activeTab === 'manual' ? 'active' : ''}`}
              onClick={() => setActiveTab('manual')}
            >
              <ClipboardCheck size={14} />
              Manual Entry
            </button>
            <button
              className={`tab-btn ${activeTab === 'json' ? 'active' : ''}`}
              onClick={() => setActiveTab('json')}
            >
              <FileJson size={14} />
              JSON Payload
            </button>
          </div>
        )}
        
        {activeTab === 'manual' ? (
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

          <div className="form-row-macros">
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

          <div className="form-row-macros">
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
        ) : (
          <div className="strava-import-container">
            <p className="import-hint">Paste detailed JSON analysis payload from your AI pipeline.</p>
            <div className="form-group">
              <textarea
                className="json-textarea"
                placeholder='{ "analysis_metadata": { ... }, "meal_items": [ ... ], "total_summary": { ... } }'
                value={jsonInput}
                onChange={e => setJsonInput(e.target.value)}
              />
            </div>
            <button
              className="add-tx-submit"
              onClick={handleProcessJson}
              disabled={!jsonInput.trim()}
            >
              Process Payload
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
