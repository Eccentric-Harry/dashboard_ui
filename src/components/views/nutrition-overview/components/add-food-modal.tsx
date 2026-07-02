import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Loader2, ClipboardCheck, Sparkles, Camera, CheckCircle, AlertTriangle, RotateCcw, ChevronRight } from 'lucide-react'
import { createPortal } from 'react-dom'
import toast from 'react-hot-toast'
import { addFoodEntry, updateFoodEntry, analyzeMeal, type MealAnalysisApiResponse, type GeminiMedicalAnalysis } from '../../../../lib/api'

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
  Fiber:    '#8b5cf6',
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
  const [aiResult, setAiResult] = useState<MealAnalysisApiResponse | null>(null)

  const stageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
      setMealType('')
      setDescription('')
      setProteinGrams('')
      setCalories('')
      setDate(selectedDate)
      setRichPayload(null)
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
      setAiResult(null)
    }
    return () => {
      if (stageTimerRef.current) clearTimeout(stageTimerRef.current)
    }
  }, [isOpen, isEdit, initialData, selectedDate])

  // ── Manual form submit ────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
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
    setLoading(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload: any = { description, calories: numCalories, proteinGrams: numProtein, mealType, date }
      if (richPayload) {
        payload.analysis_metadata = richPayload.analysis_metadata
        payload.meal_items = richPayload.meal_items
        payload.total_summary = richPayload.total_summary
        payload.gaps_and_warnings = richPayload.gaps_and_warnings
        payload.technical_diagnostic = richPayload.technical_diagnostic
        payload.acne_impact_assessment = richPayload.acne_impact_assessment
        payload.recomposition_assessment = richPayload.recomposition_assessment
        payload.satiety_and_energy_profile = richPayload.satiety_and_energy_profile
        payload.nutritional_balance_diagnostic = richPayload.nutritional_balance_diagnostic
        payload.daily_context = richPayload.daily_context
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
    if (!aiCanSubmit) {
      setAiError('Add an image or description, and select a meal type.')
      return
    }
    setAiPhase('processing')
    setStageIndex(0)
    cycleStages()
    try {
      const res = await analyzeMeal(imageFile, aiDescription || null, aiMealType, aiDate)
      if (stageTimerRef.current) clearTimeout(stageTimerRef.current)
      setAiResult(res.data)
      setAiPhase('results')
    } catch (err: unknown) {
      if (stageTimerRef.current) clearTimeout(stageTimerRef.current)
      const msg = err instanceof Error ? err.message : 'Analysis failed'
      setAiError(msg)
      setAiPhase('input')
      toast.error('AI analysis failed. Please try again.')
    }
  }

  const handleAiSave = () => {
    onSuccess()
    onClose()
    toast.success(`✨ Logged: ${aiResult?.description || 'AI meal'}`)
  }

  const handleReanalyze = () => {
    setAiPhase('input')
    setAiResult(null)
    setAiError('')
  }

  if (!isOpen) return null

  return createPortal(
    <div className="finance-modal-backdrop" role="presentation" onClick={aiPhase !== 'processing' ? onClose : undefined}>
      <div
        className="finance-modal-popover add-tx-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(560px, calc(100vw - 42px))', maxHeight: 'min(88vh, 740px)', overflowY: 'auto' }}
      >
        {aiPhase !== 'processing' && (
          <button type="button" className="finance-modal-close" onClick={onClose}>
            <X size={15} />
          </button>
        )}

        <h2 style={{ fontSize: '22px', marginBottom: '16px' }}>
          {isEdit ? 'Edit Food Entry' : 'Add Food Entry'}
        </h2>

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
              <Sparkles size={14} />
              AI Scan
            </button>
          </div>
        )}

        {/* ═══════════════ MANUAL TAB ═══════════════ */}
        {activeTab === 'manual' && (
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
                  <option value="" disabled>Select Meal Type...</option>
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

            {error && <p className="add-tx-error">{error}</p>}

            <button type="submit" className="add-tx-submit" disabled={loading}>
              {loading ? <Loader2 className="spinner" size={18} /> : 'Save Food'}
            </button>
          </form>
        )}

        {/* ═══════════════ AI TAB ═══════════════════ */}
        {activeTab === 'ai' && (
          <>
            {/* ── Phase 1: Input ──────────────────────────── */}
            {aiPhase === 'input' && (
              <form onSubmit={handleAiSubmit} className="add-tx-form" style={{ gap: 0 }}>
                <p style={{ fontSize: '13px', color: 'rgba(16,19,18,0.5)', margin: '0 0 16px', lineHeight: 1.5 }}>
                  Upload a photo or describe your meal — Gemini identifies every item and calculates full clinical nutrition.
                </p>

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
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/heic"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleImageDrop(f) }}
                      tabIndex={-1}
                      id="af-file-input"
                    />
                    <div className="af-drop-icon">
                      <Camera size={20} />
                    </div>
                    <p className="af-drop-label">Drop a photo here, or click to browse</p>
                    <p className="af-drop-sublabel">JPG, PNG, WEBP, HEIC · max 10 MB</p>
                  </div>
                )}

                <div className="af-or-divider"><span>or</span></div>

                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <textarea
                    className="af-description-textarea"
                    placeholder={`Describe your meal… e.g. "Grilled chicken breast with brown rice and steamed broccoli"`}
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

                {aiError && <p className="add-tx-error" style={{ marginBottom: '12px' }}>{aiError}</p>}

                <button type="submit" className="add-tx-submit af-submit-btn" disabled={!aiCanSubmit} id="ai-analyze-submit-btn">
                  <Sparkles size={15} />
                  Analyse with AI
                </button>
              </form>
            )}

            {/* ── Phase 2: Processing ──────────────────────── */}
            {aiPhase === 'processing' && (
              <div className="af-processing-container">
                <div className="af-loader-box">
                  <div className="af-glowing-ring">
                    <div className="af-glowing-ring-inner" />
                  </div>
                  <Sparkles className="af-loader-sparkles" size={22} />
                </div>
                <div className="af-loading-checklist">
                  <div className="af-check-item completed">
                    <span className="af-check-dot" />
                    <span>Loaded profile & target metrics</span>
                  </div>
                  <div className={`af-check-item ${stageIndex >= 1 ? 'completed' : 'active'}`}>
                    <span className="af-check-dot" />
                    <span>Gemini: Identifying food items</span>
                  </div>
                  <div className={`af-check-item ${stageIndex >= 2 ? 'completed' : stageIndex === 1 ? 'active' : 'pending'}`}>
                    <span className="af-check-dot" />
                    <span>Orchestrating clinical diagnostics</span>
                  </div>
                </div>
              </div>
            )}

            {/* ── Phase 3: Results ─────────────────────────── */}
            {aiPhase === 'results' && aiResult && (
              <div className="af-results-container">
                {/* Summary strip */}
                <div className="af-result-summary">
                  <div className="af-result-summary-left">
                    <p className="af-result-name">{aiResult.description}</p>
                    <p className="af-result-meta">{aiResult.calories} kcal · {aiResult.proteinGrams}g protein · {aiResult.mealType}</p>
                  </div>
                  {aiResult.analysis.overall_assessment && (
                    <QualityBadge quality={aiResult.analysis.overall_assessment.meal_quality} />
                  )}
                </div>

                {/* Macro bars */}
                {aiResult.analysis.daily_target_progress && (
                  <MacroBars progress={aiResult.analysis.daily_target_progress} />
                )}

                {/* Item list */}
                {aiResult.analysis.meal_items?.length > 0 && (
                  <div className="af-items-section">
                    <p className="af-section-label">Identified Items</p>
                    <div className="af-items-list">
                      {aiResult.analysis.meal_items.map((item, i) => (
                        <div className="af-item-row" key={i}>
                          <div className="af-item-name-col">
                            <span className="af-item-name">{item.name}</span>
                            <span className="af-item-serving">{item.serving_size}</span>
                          </div>
                          <span className="af-item-kcal">{Math.round(item.calories)} kcal</span>
                          <span className={`af-item-badge ${item.confidence}`}>{item.confidence}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Medical alerts */}
                {aiResult.analysis.medical_analysis?.length > 0 && (
                  <MedicalAlerts items={aiResult.analysis.medical_analysis} />
                )}

                {/* Assessment */}
                {aiResult.analysis.overall_assessment && (
                  <AssessmentRow assessment={aiResult.analysis.overall_assessment} />
                )}

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

function QualityBadge({ quality }: { quality: string }) {
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
      {quality}
    </span>
  )
}

function MacroBars({ progress }: { progress: MealAnalysisApiResponse['analysis']['daily_target_progress'] }) {
  const bars = [
    { label: 'Calories', pct: progress.calories_pct, color: MACRO_COLORS.Calories },
    { label: 'Protein',  pct: progress.protein_pct,  color: MACRO_COLORS.Protein },
    { label: 'Carbs',    pct: progress.carbs_pct,    color: MACRO_COLORS.Carbs },
    { label: 'Fat',      pct: progress.fat_pct,      color: MACRO_COLORS.Fat },
    { label: 'Fiber',    pct: progress.fiber_pct,    color: MACRO_COLORS.Fiber },
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

function MedicalAlerts({ items }: { items: GeminiMedicalAnalysis[] }) {
  const significant = items.filter(i => i.risk !== 'low' || (i.findings?.length ?? 0) > 0)
  if (significant.length === 0) return null
  return (
    <div>
      <p className="af-section-label">Health context</p>
      <div className="af-medical-list">
        {significant.map((item, i) => (
          <div className={`af-medical-card ${item.risk}`} key={i}>
            <div className="af-medical-header">
              <span className="af-medical-condition">{item.condition}</span>
              <span className={`af-risk-chip ${item.risk}`}>{item.risk}</span>
            </div>
            {item.findings?.slice(0, 2).map((f, j) => (
              <p className="af-medical-finding" key={j}>— {f}</p>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function AssessmentRow({ assessment }: { assessment: MealAnalysisApiResponse['analysis']['overall_assessment'] }) {
  const has = assessment.strengths?.length > 0 || assessment.improvements?.length > 0
  if (!has) return null
  return (
    <div>
      <p className="af-section-label">Assessment</p>
      <div className="af-assessment-grid">
        {assessment.strengths?.slice(0, 2).map((s, i) => (
          <div className="af-assess-item strength" key={i}>
            <ChevronRight size={11} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{s}</span>
          </div>
        ))}
        {assessment.improvements?.slice(0, 2).map((s, i) => (
          <div className="af-assess-item improve" key={i}>
            <ChevronRight size={11} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{s}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
