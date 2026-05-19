import { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { addLearning, updateLearning } from '../../../../lib/api'
import type { LearningLog } from '../../../../lib/api'
import './add-learning-modal.css'

interface AddLearningModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  isEdit?: boolean
  initialData?: LearningLog
  defaultDate: string
}

const PREDEFINED_CATEGORIES = [
  'Development', 'GitHub', 'AI', 'DevOps', 'Personal'
]

export function AddLearningModal({ isOpen, onClose, onSuccess, isEdit, initialData, defaultDate }: AddLearningModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form State
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState(PREDEFINED_CATEGORIES[0])
  const [customCategory, setCustomCategory] = useState('')
  const [isCustomCategory, setIsCustomCategory] = useState(false)
  const [date, setDate] = useState(defaultDate)

  useEffect(() => {
    if (isOpen) {
      setError('')
      if (isEdit && initialData) {
        setTitle(initialData.title)
        setDescription(initialData.description)
        setDate(initialData.date)
        
        const isPredefined = PREDEFINED_CATEGORIES.includes(initialData.category)
        if (isPredefined) {
          setCategory(initialData.category)
          setIsCustomCategory(false)
          setCustomCategory('')
        } else {
          setCategory('Custom')
          setIsCustomCategory(true)
          setCustomCategory(initialData.category)
        }
      } else {
        // Reset to defaults
        setTitle('')
        setDescription('')
        setCategory(PREDEFINED_CATEGORIES[0])
        setCustomCategory('')
        setIsCustomCategory(false)
        setDate(defaultDate)
      }
    }
  }, [isOpen, isEdit, initialData, defaultDate])

  if (!isOpen) return null

  const handleCategoryChange = (val: string) => {
    setCategory(val)
    if (val === 'Custom') {
      setIsCustomCategory(true)
    } else {
      setIsCustomCategory(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const finalCategory = isCustomCategory ? customCategory.trim() : category
    
    if (!title.trim() || !description.trim() || !finalCategory.trim() || !date) {
      setError('Please fill in all fields')
      return
    }

    setLoading(true)
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        category: finalCategory,
        date
      }

      if (isEdit && initialData?.id) {
        await updateLearning(initialData.id, payload)
        toast.success(`Updated learning: "${title.trim()}"`)
      } else {
        await addLearning(payload)
        toast.success(`Logged learning: "${title.trim()}"`)
      }
      
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to save learning log')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="learning-modal-backdrop" role="presentation" onClick={onClose}>
      <div 
        className="learning-modal-popover" 
        role="dialog" 
        aria-modal="true" 
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="learning-modal-close" onClick={onClose}>
          <X size={16} />
        </button>
        
        <h2 className="learning-modal-title">
          {isEdit ? 'Edit Learning Log' : 'Record Learning Log'}
        </h2>
        
        <form onSubmit={handleSubmit} className="learning-modal-form">
          <div className="form-group">
            <label htmlFor="learning-title">Topic / Title</label>
            <input 
              id="learning-title"
              type="text" 
              placeholder="e.g. SSH vs HTTP, React Server Components..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="learning-description">What did you learn?</label>
            <textarea 
              id="learning-description"
              rows={4}
              placeholder="Describe your key takeaways and details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="learning-category">Category</label>
              <select 
                id="learning-category"
                value={category} 
                onChange={(e) => handleCategoryChange(e.target.value)}
              >
                {PREDEFINED_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                <option value="Custom">Custom Category...</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="learning-date">Date</label>
              <input 
                id="learning-date"
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          {isCustomCategory && (
            <div className="form-group fade-in">
              <label htmlFor="learning-custom-category">Custom Category Name</label>
              <input 
                id="learning-custom-category"
                type="text" 
                placeholder="e.g. Personal Development, System Design..."
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
              />
            </div>
          )}

          {error && <p className="learning-modal-error">{error}</p>}

          <button type="submit" className="learning-modal-submit" disabled={loading}>
            {loading ? <Loader2 className="spinner animate-spin" size={18} /> : 'Save Learning Log'}
          </button>
        </form>
      </div>
    </div>
  )
}
