import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Loader2, ClipboardCheck, Camera, CheckCircle, AlertTriangle, RotateCcw, Upload, Wifi, Bell, Scan, Shield, TrendingUp, Sparkles } from 'lucide-react'
import { createPortal } from 'react-dom'
import toast from 'react-hot-toast'
import { addFoodEntry, updateFoodEntry, type MealAnalysisApiResponse, type ClinicalFlag, type IngredientBreakdown } from '../../../../lib/api'
import { useNotifications } from '../../../../contexts/NotificationContext'

// ─── Types ────────────────────────────────────────────────────────────────

type Phase = 'input' | 'processing' | 'results'

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Post Workout', 'Mid-Morning', 'Midnight']

const STAGE_MESSAGES = [
  { stage: 'Stage 1 of 2', label: 'Identifying food items…', sub: 'Vision analysis in progress' },
  { stage: 'Stage 2 of 2', label: 'Calculating clinical nutrition…', sub: 'Consulting your health profile' },
  { stage: 'Finalising', label: 'Saving your meal log…', sub: 'Almost done' },
]

const MACRO_COLORS: Record<string, string> = {
  Calories: '#e8a23a',
  Protein:  '#35b64b',
  Carbs:    '#3b82f6',
  Fat:      '#ef4444',
  Sodium:   '#8b5cf6',
}

// ─── Props ────────────────────────────────────────────────────────────────

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

  // Notifications & Background tasks context
  const { backgroundScans, startBackgroundScan, desktopEnabled, toggleDesktopNotifications } = useNotifications()
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null)

  // Tab state
  const [activeTab, setActiveTab] = useState<'manual' | 'ai'>('manual')

  // Manual form state
  const [mealType, setMealType] = useState('')
  const [description, setDescription] = useState('')
  const [proteinGrams, setProteinGrams] = useState('')
  const [calories, setCalories] = useState('')
  const [date, setDate] = useState(selectedDate)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [richPayload, setRichPayload] = useState<any>(null)
  const [jsonPayload, setJsonPayload] = useState('')

  // AI tab state
  const [aiPhase, setAiPhase] = useState<Phase>('input')
  const [stageIndex, setStageIndex] = useState(0)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [aiDescription, setAiDescription] = useState('')
  const [aiMealType, setAiMealType] = useState('')
  const [aiDate, setAiDate] = useState(selectedDate)
  const [isDragOver, setIsDragOver] = useState(false)
  const [aiError, setAiError] = useState('')
  const [aiErrorCode, setAiErrorCode] = useState<number | null>(null)
  const [aiResult, setAiResult] = useState<MealAnalysisApiResponse | null>(null)

  const stageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen && isEdit && initialData) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMealType(initialData.mealType)
      setDescription(initialData.description)
      setProteinGrams(initialData.proteinGrams.toString())
      setCalories(initialData.calories.toString())
      setDate(initialData.date)
      setRichPayload(null)
      setJsonPayload('')
      setActiveTab('manual')
      setCurrentTaskId(null)
    } else if (isOpen && !isEdit) {
      setMealType('')
      setDescription('')
      setProteinGrams('')
      setCalories('')
      setDate(selectedDate)
      setRichPayload(null)
      setJsonPayload('')
      setActiveTab('manual')
      // Reset AI state
      setAiPhase('input')
      setStageIndex(0)
      setImageFile(null)
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl)
      setImagePreviewUrl(null)
      setAiDescription('')
      setAiMealType('')
      setAiDate(selectedDate)
      setAiError('')
      setAiErrorCode(null)
      setAiResult(null)
      setCurrentTaskId(null)
    }
    return () => {
      if (stageTimerRef.current) clearTimeout(stageTimerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isEdit, initialData, selectedDate])

  const currentTask = currentTaskId ? backgroundScans.find(t => t.id === currentTaskId) : null

  useEffect(() => {
    if (!currentTask) return

    if (currentTask.status === 'success') {
      if (stageTimerRef.current) clearTimeout(stageTimerRef.current)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAiResult(currentTask.result)
      setAiPhase('results')
    } else if (currentTask.status === 'failed') {
      if (stageTimerRef.current) clearTimeout(stageTimerRef.current)
      const rawMsg = currentTask.error || 'Analysis failed'
      const codeMatch = rawMsg.match(/(\d{3})/)
      const code = codeMatch ? parseInt(codeMatch[1], 10) : null
      setAiErrorCode(code)
      setAiError(rawMsg)
      setAiPhase('input')
      setCurrentTaskId(null)
    }
  }, [currentTask])

  const isNotificationsEnabled = desktopEnabled && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'

  // ── Manual form submit ────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, no-useless-assignment
    let finalPayload: any = null

    if (jsonPayload.trim()) {
      try {
        const parsed = JSON.parse(jsonPayload)

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const getVal = (keys: string[], fallback: any = null) => {
          for (const k of keys) {
            if (parsed && typeof parsed === 'object' && k in parsed) {
              return parsed[k]
            }
          }
          return fallback
        }

        // Normalize timestamp
        let parsedTimestamp = getVal(['timestamp', 'createdAt'])
        if (parsedTimestamp && typeof parsedTimestamp === 'object' && '$date' in parsedTimestamp) {
          parsedTimestamp = parsedTimestamp['$date']
        }

        const parsedDate = getVal(['date', 'dateString', 'date_string'], date)
        const parsedMealType = getVal(['mealType', 'meal_type', 'meal'], mealType)
        const parsedDescription = getVal(['description', 'mealLabel', 'meal_label'], description)

        const parsedCalories = getVal(['calories', 'calories_kcal', 'totalCalories'])
        const parsedProtein = getVal(['proteinGrams', 'protein_grams', 'protein', 'totalProteinGrams'])

        const numCalories = parsedCalories !== null && parsedCalories !== undefined
          ? Math.round(parseFloat(parsedCalories))
          : (calories ? Math.round(parseFloat(calories)) : null)
        const numProtein = parsedProtein !== null && parsedProtein !== undefined
          ? Math.round(parseFloat(parsedProtein))
          : (proteinGrams ? Math.round(parseFloat(proteinGrams)) : null)

        if (!parsedDescription) {
          throw new Error('Description is required (not found in JSON or inputs)')
        }
        if (numCalories === null || isNaN(numCalories) || numCalories < 0) {
          throw new Error('Calories is required and must be non-negative (not found in JSON or inputs)')
        }
        if (numProtein === null || isNaN(numProtein) || numProtein < 0) {
          throw new Error('Protein is required and must be non-negative (not found in JSON or inputs)')
        }
        if (!parsedMealType) {
          throw new Error('Meal Type is required (not found in JSON or inputs)')
        }
        if (!parsedDate) {
          throw new Error('Date is required (not found in JSON or inputs)')
        }

        finalPayload = {
          description: parsedDescription,
          calories: numCalories,
          proteinGrams: numProtein,
          mealType: parsedMealType,
          date: parsedDate,
          timestamp: parsedTimestamp,
          mealQuality: getVal(['mealQuality', 'meal_quality', 'letterGrade', 'letter_grade']),
          notes: getVal(['notes']),
          recipeCategory: getVal(['recipeCategory', 'recipe_category']),
          serving: getVal(['serving']),
          servingNotes: getVal(['servingNotes', 'serving_notes']),
          sourceNotes: getVal(['sourceNotes', 'source_notes']),
          importKey: getVal(['importKey', 'import_key']),
          analysis_metadata: getVal(['analysisMetadata', 'analysis_metadata']),
          meal_items: getVal(['mealItems', 'meal_items']),
          total_summary: getVal(['totalSummary', 'total_summary']),
          gaps_and_warnings: getVal(['gapsAndWarnings', 'gaps_and_warnings']),
          technical_diagnostic: getVal(['technicalDiagnostic', 'technical_diagnostic']),
          acne_impact_assessment: getVal(['acneImpactAssessment', 'acne_impact_assessment']),
          health_analysis: getVal(['healthAnalysis', 'health_analysis']),
          recomposition_assessment: getVal(['recompositionAssessment', 'recomposition_assessment']),
          satiety_and_energy_profile: getVal(['satietyAndEnergyProfile', 'satiety_and_energy_profile']),
          nutritional_balance_diagnostic: getVal(['nutritionalBalanceDiagnostic', 'nutritional_balance_diagnostic']),
          daily_context: getVal(['dailyContext', 'daily_context'])
        }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        setError('JSON Error: ' + err.message)
        return
      }
    } else {
      if (!description || !calories || !proteinGrams || !date || !mealType) {
        setError('Please fill in all fields including Meal Type')
        return
      }
      const numCalories = Math.round(parseFloat(calories))
      const numProtein = Math.round(parseFloat(proteinGrams))
      if (isNaN(numCalories) || numCalories < 0 || isNaN(numProtein) || numProtein < 0) {
        setError('Macros must be 0 or greater')
        return
      }
      finalPayload = {
        description,
        calories: numCalories,
        proteinGrams: numProtein,
        mealType,
        date
      }
      if (richPayload) {
        finalPayload.analysis_metadata = richPayload.analysis_metadata
        finalPayload.meal_items = richPayload.meal_items
        finalPayload.total_summary = richPayload.total_summary
        finalPayload.gaps_and_warnings = richPayload.gaps_and_warnings
        finalPayload.technical_diagnostic = richPayload.technical_diagnostic
        finalPayload.acne_impact_assessment = richPayload.acne_impact_assessment
        finalPayload.health_analysis = richPayload.health_analysis
        finalPayload.recomposition_assessment = richPayload.recomposition_assessment
        finalPayload.satiety_and_energy_profile = richPayload.satiety_and_energy_profile
        finalPayload.nutritional_balance_diagnostic = richPayload.nutritional_balance_diagnostic
        finalPayload.daily_context = richPayload.daily_context
      }
    }

    setLoading(true)
    try {
      if (isEdit && initialData?.id) {
        await updateFoodEntry(finalPayload.date, initialData.id, finalPayload)
        toast.success(`Updated "${finalPayload.description}"`)
      } else {
        await addFoodEntry(finalPayload)
        toast.success(`Logged "${finalPayload.description}"`)
      }
      onSuccess()
      onClose()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || 'Failed to save food entry')
    } finally {
      setLoading(false)
    }
  }

  // ── AI image handling ─────────────────────────────────────────────────
  const handleImageDrop = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (JPG, PNG, WEBP, HEIC)')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be under 10 MB')
      return
    }
    setImageFile(file)
    setImagePreviewUrl(URL.createObjectURL(file))
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleImageDrop(file)
  }, [handleImageDrop])

  const removeImage = () => {
    setImageFile(null)
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl)
    setImagePreviewUrl(null)
  }

  const aiCanSubmit = (imageFile !== null || aiDescription.trim().length > 0) && aiMealType !== ''

  // ── AI stage cycling ──────────────────────────────────────────────────
  const cycleStages = useCallback(() => {
    let idx = 0
    const tick = () => {
      idx = Math.min(idx + 1, STAGE_MESSAGES.length - 1)
      setStageIndex(idx)
      if (idx < STAGE_MESSAGES.length - 1) {
        stageTimerRef.current = setTimeout(tick, 4500)
      }
    }
    stageTimerRef.current = setTimeout(tick, 4500)
  }, [])

  // ── AI submit ─────────────────────────────────────────────────────────
  const handleAiSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAiError('')
    setAiErrorCode(null)
    if (!aiCanSubmit) {
      setAiError('Add an image or description, and select a meal type.')
      return
    }

    setAiPhase('processing')
    setStageIndex(0)
    cycleStages()

    try {
      const taskId = await startBackgroundScan(imageFile, aiDescription || null, aiMealType, aiDate)
      setCurrentTaskId(taskId)
    } catch (err: unknown) {
      if (stageTimerRef.current) clearTimeout(stageTimerRef.current)
      const rawMsg = err instanceof Error ? err.message : 'Failed to start background scan'
      setAiError(rawMsg)
      setAiPhase('input')
    }
  }

  const handleAiSave = () => {
    onSuccess()
    onClose()
    toast.success(`Logged: ${aiResult?.description || 'AI meal'}`)
  }

  const handleReanalyze = () => {
    setAiPhase('input')
    setAiResult(null)
    setAiError('')
    setAiErrorCode(null)
  }

  if (!isOpen) return null

  return createPortal(
    <div className="finance-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="finance-modal-popover add-tx-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(560px, calc(100vw - 42px))', maxHeight: 'min(90vh, 760px)', display: 'flex', flexDirection: 'column' }}
      >
        <button type="button" className="finance-modal-close" onClick={onClose}>
          <X size={15} />
        </button>

        <div className="af-modal-header">
          <h2>{isEdit ? 'Edit Food Entry' : 'Add Food Entry'}</h2>
          <p>Log your meal and track your progress!</p>
        </div>

        {/* ── Tab switcher (hidden while processing or showing AI results) */}
        {!isEdit && aiPhase === 'input' && (
          <div className="type-toggle" style={{ marginBottom: '24px' }}>
            <div className={`type-toggle-slider ${activeTab === 'ai' ? 'slide-right' : ''}`} />
            <button
              type="button"
              className={activeTab === 'manual' ? 'active' : ''}
              onClick={() => setActiveTab('manual')}
            >
              <ClipboardCheck size={14} />
              Manual Entry
            </button>
            <button
              type="button"
              className={activeTab === 'ai' ? 'active' : ''}
              onClick={() => setActiveTab('ai')}
              id="ai-tab-btn"
            >
              <Scan size={14} />
              AI Scan
            </button>
          </div>
        )}

        {/* ═══════════════ MANUAL TAB ═══════════════ */}
        {activeTab === 'manual' && (
          <form onSubmit={handleSubmit} className="add-tx-form" style={{ flex: 1, overflowY: 'auto', paddingRight: '6px' }}>
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
              <div className="form-group" style={{ flex: 1 }}>
                <label>Meal Type</label>
                <select value={mealType} onChange={e => setMealType(e.target.value)}>
                  <option value="" disabled>Select…</option>
                  {MEAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>

            <div className="form-row-macros">
              <div className="form-group">
                <label>Protein (g)</label>
                <input
                  type="number" min="0" step="0.01" placeholder="0.00"
                  value={proteinGrams} onChange={(e) => setProteinGrams(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Calories (kcal)</label>
                <input
                  type="number" min="0" placeholder="0"
                  value={calories} onChange={(e) => setCalories(e.target.value)}
                />
              </div>
            </div>

            <div className="form-separator" style={{ margin: '16px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(20, 24, 22, 0.1)' }} />
              <span style={{ padding: '0 12px', fontSize: '11px', color: 'rgba(16, 19, 18, 0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>OR</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(20, 24, 22, 0.1)' }} />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ margin: 0 }}>Paste AI JSON Payload</label>
                <span className="import-hint" style={{ fontSize: '10px' }}>Paste raw meal log JSON response generated by AI</span>
              </div>
              <textarea
                className="json-textarea"
                placeholder='{&#10;  "description": "Lemon Rice",&#10;  "calories": 472,&#10;  "proteinGrams": 10,&#10;  "mealItems": [ ... ],&#10;  "totalSummary": { ... },&#10;  "acneImpactAssessment": { ... }&#10;}'
                value={jsonPayload}
                onChange={(e) => setJsonPayload(e.target.value)}
                style={{ height: '120px', minHeight: '120px', resize: 'vertical' }}
              />
            </div>

            {error && <p className="add-tx-error">{error}</p>}

            <div className="af-live-macro-preview">
              <div className="af-macro-preview-item">
                <span className="af-macro-label">Calories</span>
                <span className="af-macro-value">{calories || '0'} <em>kcal</em></span>
              </div>
              <div className="af-macro-preview-item">
                <span className="af-macro-label">Protein</span>
                <span className="af-macro-value">{proteinGrams || '0'} <em>g</em></span>
              </div>
            </div>

            <button type="submit" className="add-tx-submit af-submit-btn" disabled={loading} style={{ width: '100%', marginTop: '16px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {loading ? <Loader2 className="spinner" size={18} /> : 'Save Food'}
            </button>
          </form>
        )}

        {/* ═══════════════ AI TAB ═══════════════════ */}
        {activeTab === 'ai' && (
          <>
            {/* ── Phase 1: Input ──────────────────────────── */}
            {aiPhase === 'input' && (
              <form onSubmit={handleAiSubmit} className="add-tx-form" style={{ gap: 0, flex: 1, overflowY: 'auto', paddingRight: '6px' }}>
                <p style={{ fontSize: '13px', color: 'rgba(16,19,18,0.5)', margin: '0 0 16px', lineHeight: 1.5 }}>
                  Upload a photo or describe your meal — AI identifies every item and calculates full clinical nutrition.
                </p>

                {!isNotificationsEnabled && (
                  <div className="af-compact-alert">
                    <Bell size={16} className="af-compact-alert-icon" />
                    <span className="af-compact-alert-text">
                      Enable push alerts to close this modal while AI analyses (takes 1-2 mins).
                    </span>
                    <button type="button" onClick={toggleDesktopNotifications} className="af-compact-alert-btn">
                      Enable
                    </button>
                  </div>
                )}

                {/* Drag-drop zone */}
                {imagePreviewUrl ? (
                  <div className="af-image-preview">
                    <img src={imagePreviewUrl} alt="Meal preview" />
                    <button type="button" className="af-image-remove" onClick={removeImage} aria-label="Remove image">
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div
                    className={`af-drop-zone ${isDragOver ? 'drag-over' : ''}`}
                    onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={onDrop}
                  >
                    {/* Hidden gallery input */}
                    <input
                      ref={galleryInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/heic"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleImageDrop(f) }}
                      tabIndex={-1}
                      id="af-file-input"
                      style={{ display: 'none' }}
                    />
                    {/* Hidden camera capture input */}
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleImageDrop(f) }}
                      tabIndex={-1}
                      id="af-camera-input"
                      style={{ display: 'none' }}
                    />
                    <p className="af-drop-label">Snap or upload your meal</p>
                    <p className="af-drop-sublabel" style={{ marginBottom: '14px' }}>JPG, PNG, WEBP, HEIC · max 10 MB</p>
                    <div className="af-upload-actions">
                      <button
                        type="button"
                        className="af-upload-btn"
                        onClick={() => cameraInputRef.current?.click()}
                        aria-label="Take photo"
                      >
                        <Camera size={16} />
                        Camera
                      </button>
                      <button
                        type="button"
                        className="af-upload-btn af-upload-btn--secondary"
                        onClick={() => galleryInputRef.current?.click()}
                        aria-label="Browse gallery"
                      >
                        <Upload size={16} />
                        Gallery
                      </button>
                    </div>
                  </div>
                )}

                <div className="af-or-divider"><span>or</span></div>

                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <textarea
                    className="af-description-textarea"
                    placeholder={`Describe your meal…`}
                    value={aiDescription}
                    onChange={e => setAiDescription(e.target.value)}
                    rows={2}
                    aria-label="Meal description"
                  />
                </div>

                <div className="form-row-macros" style={{ marginBottom: '20px' }}>
                  <div className="form-group">
                    <label>Meal Type</label>
                    <select value={aiMealType} onChange={e => setAiMealType(e.target.value)}>
                      <option value="" disabled>Select…</option>
                      {MEAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Date</label>
                    <input type="date" value={aiDate} onChange={e => setAiDate(e.target.value)} className="form-input" />
                  </div>
                </div>

                {aiError && <AiErrorCard code={aiErrorCode} message={aiError} onRetry={() => { setAiError(''); setAiErrorCode(null) }} />}

                <button type="submit" className="add-tx-submit af-submit-btn" disabled={!aiCanSubmit} id="ai-analyze-submit-btn">
                  <Scan size={15} />
                  Analyse with AI
                </button>
              </form>
            )}

            {/* ── Phase 2: Processing ──────────────────────── */}
            {aiPhase === 'processing' && (
              <div className="af-processing-container-updated">
                {/* Central floating Glassmorphic Hub */}
                <div className="af-processing-hub">
                  <div className="af-loader-box">
                    <div className="af-pulse-rings">
                      <div className="af-pulse-ring af-pulse-ring--1" />
                      <div className="af-pulse-ring af-pulse-ring--2" />
                      <div className="af-pulse-ring af-pulse-ring--3" />
                    </div>
                    <div className="af-pulse-core" />
                  </div>
                  
                  <div className="af-hub-header">
                    <h3 className="af-hub-title">{STAGE_MESSAGES[stageIndex].label}</h3>
                    <p className="af-hub-subtitle">{STAGE_MESSAGES[stageIndex].sub}</p>
                  </div>
                  <div className="af-progress-track" role="progressbar" aria-valuenow={stageIndex + 1} aria-valuemin={1} aria-valuemax={STAGE_MESSAGES.length}>
                    <div className="af-progress-fill" style={{ width: `${((stageIndex + 1) / STAGE_MESSAGES.length) * 100}%` }} />
                  </div>
                  <div className="af-loading-checklist">
                    <div className="af-check-item completed">
                      <span className="af-check-dot" />
                      <span>Loaded profile & target metrics</span>
                    </div>
                    <div className={`af-check-item ${stageIndex >= 1 ? 'completed' : 'active'}`}>
                      <span className="af-check-dot" />
                      <span>Identifying food items</span>
                    </div>
                    <div className={`af-check-item ${stageIndex >= 2 ? 'completed' : stageIndex === 1 ? 'active' : 'pending'}`}>
                      <span className="af-check-dot" />
                      <span>Orchestrating clinical diagnostics</span>
                    </div>
                  </div>
                  <p className="af-processing-background-hint">
                    AI analysis usually takes 1 to 2 minutes. You may safely close this modal or leave the page; we will notify you once your meal log is ready!
                  </p>
                  
                  <button
                    type="button"
                    className="af-background-run-btn"
                    onClick={onClose}
                  >
                    Run in Background
                  </button>
                </div>

                {/* Background Pinterest-style loading skeletons */}
                <div className="af-skeleton-masonry">
                  {/* Card 1: Meal Summary skeleton */}
                  <div className="af-skeleton-card">
                    <div className="af-skeleton-header" style={{ width: '80%' }} />
                    <div className="af-skeleton-line" style={{ width: '50%' }} />
                  </div>

                  {/* Card 2: Macros Contribution skeleton */}
                  <div className="af-skeleton-card">
                    <div className="af-skeleton-header" style={{ width: '60%' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                      {[85, 45, 65, 30, 50].map((w, i) => (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div className="af-skeleton-line" style={{ width: '25%' }} />
                          <div className="af-skeleton-bar-track">
                            <div className="af-skeleton-bar-fill" style={{ width: `${w}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card 3: Identified Items list skeleton */}
                  <div className="af-skeleton-card" style={{ gridRow: 'span 2' }}>
                    <div className="af-skeleton-header" style={{ width: '70%' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
                      {[...Array(3)].map((_, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '6px 0', borderBottom: '1px solid rgba(20,24,22,0.03)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                            <div className="af-skeleton-line" style={{ width: '75%' }} />
                            <div className="af-skeleton-line" style={{ width: '40%', height: '8px' }} />
                          </div>
                          <div className="af-skeleton-line" style={{ width: '45px', height: '14px', borderRadius: '12px' }} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card 4: Health Context skeleton */}
                  <div className="af-skeleton-card">
                    <div className="af-skeleton-header" style={{ width: '65%' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="af-skeleton-line" style={{ width: '40%' }} />
                        <div className="af-skeleton-line" style={{ width: '30px', height: '14px', borderRadius: '10px' }} />
                      </div>
                      <div className="af-skeleton-line" style={{ width: '90%' }} />
                      <div className="af-skeleton-line" style={{ width: '85%' }} />
                    </div>
                  </div>

                  {/* Card 5: Assessment skeleton */}
                  <div className="af-skeleton-card" style={{ gridColumn: 'span 2' }}>
                    <div className="af-skeleton-header" style={{ width: '40%' }} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '4px' }}>
                      <div>
                        <div className="af-skeleton-line" style={{ width: '80%', marginBottom: '6px' }} />
                        <div className="af-skeleton-line" style={{ width: '90%' }} />
                      </div>
                      <div>
                        <div className="af-skeleton-line" style={{ width: '75%', marginBottom: '6px' }} />
                        <div className="af-skeleton-line" style={{ width: '85%' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Phase 3: Results ─────────────────────────── */}
            {aiPhase === 'results' && aiResult && (
              <div className="af-results-container" style={{ flex: 1, overflowY: 'auto', paddingRight: '6px' }}>
                {/* Summary strip */}
                <div className="af-result-summary">
                  <div className="af-result-summary-left">
                    <p className="af-result-name">{aiResult.description}</p>
                    <p className="af-result-meta">{aiResult.calories} kcal · {aiResult.proteinGrams}g protein · {aiResult.mealType}</p>
                  </div>
                  {aiResult.analysis.meal_score && (
                    <QualityBadge score={aiResult.analysis.meal_score} />
                  )}
                </div>

                {/* Macro bars */}
                {aiResult.analysis.daily_budget_analysis?.percentage_of_daily_goals_this_meal && (
                  <MacroBars progress={aiResult.analysis.daily_budget_analysis.percentage_of_daily_goals_this_meal} />
                )}

                {/* Ingredients breakdown */}
                {aiResult.analysis.ingredients_breakdown?.length > 0 && (
                  <div className="af-items-section">
                    <p className="af-section-label">Identified Items</p>
                    <div className="af-items-list">
                      {aiResult.analysis.ingredients_breakdown.map((item, i) => (
                        <AfIngredientRow key={i} item={item} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Clinical flags */}
                {aiResult.analysis.clinical_flags?.length > 0 && (
                  <AfClinicalFlagList flags={aiResult.analysis.clinical_flags} />
                )}

                {/* Assessment: positive highlights + recommendations */}
                <AfAssessmentRow analysis={aiResult.analysis} />

                {/* Actions */}
                <div className="af-action-row">
                  <button type="button" className="af-reanalyze-btn" onClick={handleReanalyze} id="af-reanalyze-btn">
                    <RotateCcw size={13} style={{ display: 'inline', marginRight: 5 }} />
                    Re-analyse
                  </button>
                  <button type="button" className="add-tx-submit af-save-btn" onClick={handleAiSave} id="af-save-btn">
                    <CheckCircle size={15} />
                    Save Meal Log
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>,
    document.body
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────

function QualityBadge({ score }: { score: MealAnalysisApiResponse['analysis']['meal_score'] }) {
  const grade = score.letter_grade || 'C'
  const quality = grade === 'A' ? 'excellent' : grade === 'B' ? 'good' : grade === 'C' ? 'fair' : 'poor'
  const colors: Record<string, { bg: string; color: string }> = {
    excellent: { bg: 'rgba(53,182,75,0.1)', color: '#1a8b30' },
    good:      { bg: 'rgba(53,182,75,0.07)', color: '#35b64b' },
    fair:      { bg: 'rgba(232,162,58,0.1)', color: '#b77a1a' },
    poor:      { bg: 'rgba(239,68,68,0.1)', color: '#dc2626' },
  }
  const { bg, color } = colors[quality] || colors.good
  return (
    <span className="af-quality-badge" style={{ background: bg, color }}>
      {quality === 'excellent' || quality === 'good'
        ? <CheckCircle size={11} />
        : <AlertTriangle size={11} />}
      {grade} · {score.overall_score}/100
    </span>
  )
}

function MacroBars({ progress }: { progress: MealAnalysisApiResponse['analysis']['daily_budget_analysis']['percentage_of_daily_goals_this_meal'] }) {
  const bars = [
    { label: 'Calories', pct: progress.calories_pct, color: MACRO_COLORS.Calories },
    { label: 'Protein',  pct: progress.protein_pct,  color: MACRO_COLORS.Protein },
    { label: 'Carbs',    pct: progress.carbs_pct,    color: MACRO_COLORS.Carbs },
    { label: 'Fat',      pct: progress.fat_pct,      color: MACRO_COLORS.Fat },
    { label: 'Sodium',   pct: progress.sodium_pct,   color: MACRO_COLORS.Sodium },
  ]
  return (
    <div className="af-macro-bars">
      <p className="af-section-label">Daily target contribution</p>
      {bars.map(bar => (
        <div className="af-macro-row" key={bar.label}>
          <span className="af-macro-label">{bar.label}</span>
          <div className="af-macro-track">
            <div className="af-macro-fill" style={{ width: `${Math.min(bar.pct ?? 0, 100)}%`, background: bar.color }} />
          </div>
          <span className="af-macro-pct">{Math.round(bar.pct ?? 0)}%</span>
        </div>
      ))}
    </div>
  )
}

function AfIngredientRow({ item }: { item: IngredientBreakdown }) {
  const n = item.nutrients
  return (
    <div className="af-item-row">
      <div className="af-item-name-col">
        <span className="af-item-name">
          {item.common_name || item.name}
          {item.is_hidden && <span style={{ fontSize: '9px', marginLeft: 4, padding: '1px 5px', borderRadius: 8, background: 'rgba(139,92,246,0.1)', color: '#7c3aed' }}>hidden</span>}
        </span>
        <span className="af-item-serving">{item.estimated_weight_g}g</span>
      </div>
      <div className="af-item-macros">
        <span className="af-item-macro-chip">
          <span>{Math.round(n?.calories_kcal ?? 0)}</span> kcal
        </span>
        <span className="af-item-macro-chip">
          <span>{Math.round(n?.protein_g ?? 0)}</span>g P
        </span>
        <span className="af-item-macro-chip">
          <span>{Math.round(n?.carbohydrates_g ?? 0)}</span>g C
        </span>
        <span className="af-item-macro-chip">
          <span>{Math.round(n?.fat_g ?? 0)}</span>g F
        </span>
      </div>
      {item.clinical_item_flags?.length > 0 && (
        <span className="af-item-badge low" title={item.clinical_item_flags.join(', ')}>⚠</span>
      )}
    </div>
  )
}

function AfClinicalFlagList({ flags }: { flags: ClinicalFlag[] }) {
  const significant = flags.filter(f => f.severity !== 'LOW')
  if (significant.length === 0) return null
  return (
    <div>
      <p className="af-section-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Shield size={11} style={{ color: 'rgba(16, 19, 18, 0.45)' }} />
        Clinical Flags ({significant.length})
      </p>
      <div className="af-medical-list">
        {significant.map((flag, i) => {
          const riskLevel = flag.severity === 'CRITICAL' || flag.severity === 'HIGH' ? 'high'
            : flag.severity === 'MODERATE' ? 'moderate' : 'low'
          return (
            <div className={`af-medical-card ${riskLevel}`} key={i}>
              <div className="af-medical-header">
                <span className="af-medical-condition">{flag.title}</span>
                <span className={`af-risk-chip ${riskLevel}`}>{flag.severity}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                {flag.mechanistic_pathway && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                    <span style={{ fontSize: '11px', color: 'rgba(16, 19, 18, 0.45)', lineHeight: '1.4', userSelect: 'none', marginTop: '1px' }}>•</span>
                    <p className="af-medical-finding" style={{ margin: 0, flex: 1 }}>{flag.mechanistic_pathway}</p>
                  </div>
                )}
                {flag.quantified_risk && (
                  <p style={{ fontSize: '0.68rem', opacity: 0.6, margin: '2px 0 0' }}>{flag.quantified_risk}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AfAssessmentRow({ analysis }: { analysis: MealAnalysisApiResponse['analysis'] }) {
  const hasHighlights = (analysis.positive_highlights?.length ?? 0) > 0
  const hasRecs = (analysis.recommendations?.length ?? 0) > 0
  if (!hasHighlights && !hasRecs) return null
  return (
    <div>
      <p className="af-section-label">Assessment</p>
      <div className="af-assessment-grid">
        {analysis.positive_highlights?.slice(0, 2).map((h, i) => (
          <div className="af-assess-item strength" key={i}>
            <TrendingUp size={12} style={{ flexShrink: 0, marginTop: 2, color: '#1a8b30' }} />
            <span><strong>{h.ingredient_or_aspect}</strong>: {h.benefit}</span>
          </div>
        ))}
        {analysis.recommendations?.slice(0, 2).map((r, i) => (
          <div className="af-assess-item improve" key={i}>
            <Sparkles size={12} style={{ flexShrink: 0, marginTop: 2, color: '#b77a1a' }} />
            <span><strong>{r.title}</strong>: {r.action}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── AI Error Card ─────────────────────────────────────────────────────────

function AiErrorCard({ code, message, onRetry }: { code: number | null; message: string; onRetry: () => void }) {
  const is503 = code === 503
  const is429 = code === 429
  const isTimeout = code === 408 || code === 504

  const { icon, title, body, hint } = (() => {
    if (is503) return {
      icon: <Wifi size={18} />,
      title: 'AI Service Busy',
      body: 'The AI provider is experiencing high demand right now. This is temporary.',
      hint: 'Try again in a few seconds — it usually clears up quickly.',
    }
    if (is429) return {
      icon: <AlertTriangle size={18} />,
      title: 'Too Many Requests',
      body: 'You have hit the API rate limit. Please wait a moment.',
      hint: 'Wait 30–60 seconds before retrying.',
    }
    if (isTimeout) return {
      icon: <Loader2 size={18} />,
      title: 'Analysis Timed Out',
      body: 'The analysis took too long and was interrupted.',
      hint: 'Try with a simpler description or a smaller image.',
    }
    return {
      icon: <AlertTriangle size={18} />,
      title: 'Analysis Failed',
      body: 'Something went wrong while processing your meal.',
      hint: message.length < 120 ? message : 'Please try again.',
    }
  })()

  return (
    <div className="af-error-card" role="alert">
      <div className="af-error-card-icon">{icon}</div>
      <div className="af-error-card-body">
        <p className="af-error-card-title">{title}</p>
        <p className="af-error-card-text">{body}</p>
        <p className="af-error-card-hint">{hint}</p>
      </div>
      <button type="button" className="af-error-card-retry" onClick={onRetry} aria-label="Dismiss error">
        <X size={13} />
      </button>
    </div>
  )
}
