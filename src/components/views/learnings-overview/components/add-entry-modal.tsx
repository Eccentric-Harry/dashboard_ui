import { useState, useEffect } from 'react'
import { X, Loader2, ListTodo, BookOpen } from 'lucide-react'
import { createPortal } from 'react-dom'
import toast from 'react-hot-toast'
import { addLearning, updateLearning, addTask, updateTask } from '../../../../lib/api'
import type { LearningLog, DailyTask } from '../../../../lib/api'
import './add-learning-modal.css'

function formatTimeTo12Hour(time24: string): string {
  if (!time24) return ''
  const [hourStr, minStr] = time24.split(':')
  const hour = parseInt(hourStr, 10)
  const min = parseInt(minStr, 10)
  const period = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 === 0 ? 12 : hour % 12
  const formattedHour = displayHour.toString().padStart(2, '0')
  const formattedMin = min.toString().padStart(2, '0')
  return `${formattedHour}:${formattedMin} ${period}`
}

function formatTimeTo24Hour(time12: string): string {
  if (!time12) return ''
  if (/^\d{2}:\d{2}$/.test(time12)) return time12
  
  const match = time12.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!match) return ''
  let hour = parseInt(match[1], 10)
  const min = match[2]
  const period = match[3].toUpperCase()
  
  if (period === 'PM' && hour < 12) hour += 12
  if (period === 'AM' && hour === 12) hour = 0
  
  return `${hour.toString().padStart(2, '0')}:${min}`
}

interface AddEntryModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  isEdit?: boolean
  initialTab?: 'Task' | 'Learning'
  initialLearningData?: LearningLog | null
  initialTaskData?: DailyTask | null
  defaultDate: string
}

const PREDEFINED_CATEGORIES = [
  'Development', 'GitHub', 'AI', 'DevOps', 'Personal'
]

const TASK_CATEGORIES = ['Personal', 'Work', 'Learning', 'Fitness', 'Shopping', 'Chores', 'Finance', 'General']

export function AddEntryModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  isEdit, 
  initialTab = 'Task',
  initialLearningData, 
  initialTaskData,
  defaultDate 
}: AddEntryModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'Task' | 'Learning'>('Task')

  // Learning Form State
  const [learningTitle, setLearningTitle] = useState('')
  const [learningDescription, setLearningDescription] = useState('')
  const [learningCategory, setLearningCategory] = useState(PREDEFINED_CATEGORIES[0])
  const [customCategory, setCustomCategory] = useState('')
  const [isCustomCategory, setIsCustomCategory] = useState(false)
  const [learningDate, setLearningDate] = useState(defaultDate)

  // Task Form State
  const [taskTitle, setTaskTitle] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [taskNotes, setTaskNotes] = useState('')
  const [taskDate, setTaskDate] = useState(defaultDate)
  const [taskCategory, setTaskCategory] = useState(TASK_CATEGORIES[0])

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError('')
      const tab = initialTab || (initialLearningData ? 'Learning' : 'Task')
      setActiveTab(tab)

      if (isEdit) {
        if (tab === 'Learning' && initialLearningData) {
          setLearningTitle(initialLearningData.title)
          setLearningDescription(initialLearningData.description)
          setLearningDate(initialLearningData.date)
          
          const isPredefined = PREDEFINED_CATEGORIES.includes(initialLearningData.category)
          if (isPredefined) {
            setLearningCategory(initialLearningData.category)
            setIsCustomCategory(false)
            setCustomCategory('')
          } else {
            setLearningCategory('Custom')
            setIsCustomCategory(true)
            setCustomCategory(initialLearningData.category)
          }
        } else if (tab === 'Task' && initialTaskData) {
          setTaskTitle(initialTaskData.title)
          setScheduledTime(initialTaskData.scheduledTime ? formatTimeTo24Hour(initialTaskData.scheduledTime) : '')
          setTaskNotes(initialTaskData.notes || '')
          setTaskDate(initialTaskData.date)
          setTaskCategory(initialTaskData.category || TASK_CATEGORIES[0])
        }
      } else {
        // Reset Learning
        setLearningTitle('')
        setLearningDescription('')
        setLearningCategory(PREDEFINED_CATEGORIES[0])
        setCustomCategory('')
        setIsCustomCategory(false)
        setLearningDate(defaultDate)

        // Reset Task
        setTaskTitle('')
        setScheduledTime('')
        setTaskNotes('')
        setTaskDate(defaultDate)
        setTaskCategory(TASK_CATEGORIES[0])
      }
    }
  }, [isOpen, isEdit, initialTab, initialLearningData, initialTaskData, defaultDate])

  if (!isOpen) return null

  const handleCategoryChange = (val: string) => {
    setLearningCategory(val)
    if (val === 'Custom') {
      setIsCustomCategory(true)
    } else {
      setIsCustomCategory(false)
    }
  }

  const handleLearningSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const finalCategory = isCustomCategory ? customCategory.trim() : learningCategory
    
    if (!learningTitle.trim() || !learningDescription.trim() || !finalCategory.trim() || !learningDate) {
      setError('Please fill in all fields')
      return
    }

    setLoading(true)
    try {
      const payload = {
        title: learningTitle.trim(),
        description: learningDescription.trim(),
        category: finalCategory,
        date: learningDate
      }

      if (isEdit && initialLearningData?.id) {
        await updateLearning(initialLearningData.id, payload)
        toast.success(`Updated learning: "${learningTitle.trim()}"`)
      } else {
        await addLearning(payload)
        toast.success(`Logged learning: "${learningTitle.trim()}"`)
      }
      
      onSuccess()
      onClose()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || 'Failed to save learning log')
    } finally {
      setLoading(false)
    }
  }

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!taskTitle.trim() || !taskDate) {
      setError('Title and date are required')
      return
    }

    setLoading(true)
    try {
      const payload = {
        title: taskTitle.trim(),
        date: taskDate,
        scheduledTime: scheduledTime ? formatTimeTo12Hour(scheduledTime) : undefined,
        notes: taskNotes.trim() || undefined,
        completed: initialTaskData?.completed ?? false,
        category: taskCategory || undefined,
      }

      if (isEdit && initialTaskData?.id) {
        await updateTask(initialTaskData.id, payload)
        toast.success(`Updated task: "${taskTitle.trim()}"`)
      } else {
        await addTask(payload)
        toast.success(`Added task: "${taskTitle.trim()}"`)
      }

      onSuccess()
      onClose()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save task'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const renderTitle = () => {
    if (isEdit) {
      return activeTab === 'Task' ? 'Edit Task' : 'Edit Learning Log'
    }
    return 'Add Entry'
  }

  return createPortal(
    <div className={`learning-modal-backdrop ${activeTab === 'Task' ? 'is-tasks-theme' : ''}`} role="presentation" onClick={onClose}>
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
          {renderTitle()}
        </h2>
        
        {!isEdit && (
          <div className="type-toggle" style={{ marginBottom: '24px' }}>
            <div className={`type-toggle-slider ${activeTab === 'Learning' ? 'slide-right' : ''}`} />
            <button
              type="button"
              className={activeTab === 'Task' ? 'active' : ''}
              onClick={() => setActiveTab('Task')}
            >
              <ListTodo size={14} />
              Task
            </button>
            <button
              type="button"
              className={activeTab === 'Learning' ? 'active' : ''}
              onClick={() => setActiveTab('Learning')}
            >
              <BookOpen size={14} />
              Learning
            </button>
          </div>
        )}
        
        {activeTab === 'Learning' ? (
          <form onSubmit={handleLearningSubmit} className="learning-modal-form">
            <div className="form-group">
              <label htmlFor="learning-title">Topic / Title</label>
              <input 
                id="learning-title"
                type="text" 
                placeholder="e.g. SSH vs HTTP, React Server Components..."
                value={learningTitle}
                onChange={(e) => setLearningTitle(e.target.value)}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="learning-description">What did you learn?</label>
              <textarea 
                id="learning-description"
                rows={4}
                placeholder="Describe your key takeaways and details..."
                value={learningDescription}
                onChange={(e) => setLearningDescription(e.target.value)}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="learning-category">Category</label>
                <select 
                  id="learning-category"
                  value={learningCategory} 
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
                  value={learningDate}
                  onChange={(e) => setLearningDate(e.target.value)}
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
        ) : (
          <form onSubmit={handleTaskSubmit} className="learning-modal-form">
            <div className="form-group">
              <label htmlFor="task-title">Task</label>
              <input
                id="task-title"
                type="text"
                placeholder="e.g. Code review, Study session..."
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                autoFocus
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="task-time">Time (optional)</label>
                <input
                  id="task-time"
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="task-date">Date</label>
                <input
                  id="task-date"
                  type="date"
                  value={taskDate}
                  onChange={(e) => setTaskDate(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="task-category">Category</label>
              <select
                id="task-category"
                value={taskCategory}
                onChange={(e) => setTaskCategory(e.target.value)}
              >
                {TASK_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="task-notes">Notes (optional)</label>
              <textarea
                id="task-notes"
                rows={2}
                placeholder="Extra context..."
                value={taskNotes}
                onChange={(e) => setTaskNotes(e.target.value)}
              />
            </div>

            {error && <p className="learning-modal-error">{error}</p>}

            <button type="submit" className="learning-modal-submit" disabled={loading}>
              {loading ? <Loader2 className="spinner animate-spin" size={18} /> : 'Save Task'}
            </button>
          </form>
        )}
      </div>
    </div>,
    document.body
  )
}
