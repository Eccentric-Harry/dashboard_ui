import { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  X, Upload, Sparkles, CheckCircle, AlertTriangle,
  ChevronRight, RotateCcw, Camera
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  analyzeMeal,
  type MealAnalysisApiResponse,
  type GeminiMedicalAnalysis,
} from '../../../../lib/api'
import './ai-meal-log-modal.css'

// ─── Types ────────────────────────────────────────────────────────────────

type Phase = 'input' | 'processing' | 'results'

const MEAL_TYPES = [
  'Breakfast', 'Lunch', 'Dinner', 'Snack',
  'Mid-Morning', 'Post Workout', 'Midnight',
]

const STAGE_MESSAGES = [
  { stage: 'Stage 1 of 2', label: 'Identifying food items from your meal…', sub: 'Vision analysis in progress' },
  { stage: 'Stage 2 of 2', label: 'Calculating clinical nutrition & medical analysis…', sub: 'Consulting your health profile' },
  { stage: 'Finalising', label: 'Saving your meal log…', sub: 'Almost done' },
]

const MACRO_COLORS: Record<string, string> = {
  Calories: '#ffc45f',
  Protein:  '#35b64b',
  Carbs:    '#76e4ff',
  Fat:      '#f87171',
  Fiber:    '#a78bfa',
}

// ─── Props ────────────────────────────────────────────────────────────────

interface AiMealLogModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  selectedDate: string
}

// ─── Component ────────────────────────────────────────────────────────────

export function AiMealLogModal({ isOpen, onClose, onSuccess, selectedDate }: AiMealLogModalProps) {
  const [phase, setPhase] = useState<Phase>('input')
  const [stageIndex, setStageIndex] = useState(0)

  // Input state
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [mealType, setMealType] = useState('')
  const [date, setDate] = useState(selectedDate)
  const [isDragOver, setIsDragOver] = useState(false)
  const [error, setError] = useState('')

  // Results state
  const [result, setResult] = useState<MealAnalysisApiResponse | null>(null)

  const dropZoneRef = useRef<HTMLDivElement>(null)
  const stageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setPhase('input')
      setStageIndex(0)
      setImageFile(null)
      setImagePreviewUrl(null)
      setDescription('')
      setMealType('')
      setDate(selectedDate)
      setError('')
      setResult(null)
    }
    return () => {
      if (stageTimerRef.current) clearTimeout(stageTimerRef.current)
    }
  }, [isOpen, selectedDate])

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

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleImageDrop(file)
  }

  const removeImage = () => {
    setImageFile(null)
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl)
    setImagePreviewUrl(null)
  }

  const canSubmit = (imageFile !== null || description.trim().length > 0) && mealType !== ''

  // ── Stage cycling while processing ───────────────────────────────────
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

  // ── Submit ────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!canSubmit) {
      setError('Please add an image or description, and select a meal type.')
      return
    }

    setPhase('processing')
    setStageIndex(0)
    cycleStages()

    try {
      const res = await analyzeMeal(imageFile, description || null, mealType, date)
      if (stageTimerRef.current) clearTimeout(stageTimerRef.current)
      setResult(res.data)
      setPhase('results')
    } catch (err: unknown) {
      if (stageTimerRef.current) clearTimeout(stageTimerRef.current)
      const msg = err instanceof Error ? err.message : 'Analysis failed'
      setError(msg)
      setPhase('input')
      toast.error('AI analysis failed. Please try again.')
    }
  }

  const handleSave = () => {
    onSuccess()
    onClose()
    toast.success(`✨ Logged: ${result?.description || 'AI meal'}`)
  }

  const handleReanalyze = () => {
    setPhase('input')
    setResult(null)
    setError('')
  }

  if (!isOpen) return null

  const currentStage = STAGE_MESSAGES[stageIndex]

  return createPortal(
    <div className="ai-meal-backdrop" role="presentation" onClick={phase !== 'processing' ? onClose : undefined}>
      <div
        className="ai-meal-modal"
        role="dialog"
        aria-modal="true"
        aria-label="AI Meal Analysis"
        onClick={e => e.stopPropagation()}
      >
        {/* Close button — hidden while processing */}
        {phase !== 'processing' && (
          <button type="button" className="ai-modal-close" onClick={onClose} aria-label="Close">
            <X size={14} />
          </button>
        )}

        {/* ── Phase 1: Input ─────────────────────────────────────────── */}
        {phase === 'input' && (
          <>
            <div className="ai-modal-header">
              <p className="ai-modal-eyebrow">
                <Sparkles size={11} />
                AI Meal Analysis
              </p>
              <h2 className="ai-modal-title">Log a Meal with AI</h2>
              <p className="ai-modal-subtitle">
                Upload a photo or describe your meal — Gemini handles the rest.
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Image upload */}
              {imagePreviewUrl ? (
                <div className="ai-image-preview">
                  <img src={imagePreviewUrl} alt="Meal preview" />
                  <button type="button" className="ai-image-remove" onClick={removeImage} aria-label="Remove image">
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <div
                  ref={dropZoneRef}
                  className={`ai-drop-zone ${isDragOver ? 'drag-over' : ''}`}
                  onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={onDrop}
                >
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic"
                    onChange={onFileChange}
                    tabIndex={-1}
                    aria-label="Upload meal image"
                    id="ai-meal-file-input"
                  />
                  <div className="ai-drop-icon">
                    <Camera size={22} />
                  </div>
                  <p className="ai-drop-label">Drop a photo here, or click to browse</p>
                  <p className="ai-drop-sublabel">JPG, PNG, WEBP, HEIC · max 10 MB</p>
                </div>
              )}

              <div className="ai-or-divider">or</div>

              {/* Text description */}
              <textarea
                className="ai-description-textarea"
                placeholder="Describe your meal.."
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                aria-label="Meal description"
              />

              {/* Meal type + date */}
              <div className="ai-form-row">
                <div className="ai-form-group">
                  <label className="ai-form-label" htmlFor="ai-meal-type">Meal Type</label>
                  <select
                    id="ai-meal-type"
                    className="ai-form-select"
                    value={mealType}
                    onChange={e => setMealType(e.target.value)}
                  >
                    <option value="" disabled>Select…</option>
                    {MEAL_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div className="ai-form-group">
                  <label className="ai-form-label" htmlFor="ai-meal-date">Date</label>
                  <input
                    id="ai-meal-date"
                    type="date"
                    className="ai-form-input"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                  />
                </div>
              </div>

              {error && <p className="ai-error-msg">{error}</p>}

              <button
                type="submit"
                className="ai-submit-btn"
                disabled={!canSubmit}
                id="ai-meal-analyze-btn"
              >
                <Sparkles size={16} />
                Analyse with AI
              </button>
            </form>
          </>
        )}

        {/* ── Phase 2: Processing ────────────────────────────────────── */}
        {phase === 'processing' && (
          <>
            <div className="ai-modal-header">
              <p className="ai-modal-eyebrow"><Sparkles size={11} />Two-Stage Analysis</p>
              <h2 className="ai-modal-title">Analysing your meal…</h2>
            </div>
            <div className="ai-processing-container">
              <div className="ai-ring-spinner" aria-label="Loading">
                <div className="ai-ring-outer" />
                <div className="ai-ring-inner" />
              </div>
              <div style={{ textAlign: 'center' }}>
                <p className="ai-modal-eyebrow" style={{ justifyContent: 'center', marginBottom: 8 }}>
                  {currentStage.stage}
                </p>
                <p className="ai-processing-stage" key={stageIndex}>{currentStage.label}</p>
                <p className="ai-processing-sub">{currentStage.sub}</p>
              </div>
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="ai-shimmer-block" style={{ width: '80%' }} />
                <div className="ai-shimmer-block" style={{ width: '60%' }} />
                <div className="ai-shimmer-block" style={{ width: '70%' }} />
              </div>
            </div>
          </>
        )}

        {/* ── Phase 3: Results ──────────────────────────────────────── */}
        {phase === 'results' && result && (
          <>
            <div className="ai-modal-header">
              <p className="ai-modal-eyebrow"><CheckCircle size={11} />Analysis Complete</p>
              <h2 className="ai-modal-title">{result.description}</h2>
              <p className="ai-modal-subtitle">
                {result.calories} kcal · {result.proteinGrams}g protein · {result.mealType}
              </p>
            </div>

            <div className="ai-results-container">
              {/* Quality banner */}
              {result.analysis.overall_assessment && (
                <QualityBanner assessment={result.analysis.overall_assessment} />
              )}

              {/* Macro progress bars */}
              {result.analysis.daily_target_progress && (
                <MacroBars progress={result.analysis.daily_target_progress} />
              )}

              {/* Meal items */}
              {result.analysis.meal_items?.length > 0 && (
                <div>
                  <p className="ai-section-heading">
                    <Upload size={10} style={{ display: 'inline', marginRight: 4 }} />
                    Identified Items ({result.analysis.meal_items.length})
                  </p>
                  <div className="ai-items-list">
                    {result.analysis.meal_items.map((item, i) => (
                      <div className="ai-item-row" key={i}>
                        <div className="ai-item-name-col">
                          <p className="ai-item-name">{item.name}</p>
                          <p className="ai-item-serving">{item.serving_size}</p>
                        </div>
                        <div className="ai-item-macros">
                          <span className="ai-item-macro-chip">
                            <span>{Math.round(item.calories)}</span> kcal
                          </span>
                          <span className="ai-item-macro-chip">
                            <span>{Math.round(item.protein)}g</span> P
                          </span>
                          <span className="ai-item-macro-chip">
                            <span>{Math.round(item.carbs)}g</span> C
                          </span>
                          <span className="ai-item-macro-chip">
                            <span>{Math.round(item.fat)}g</span> F
                          </span>
                        </div>
                        <span className={`ai-item-confidence ${item.confidence}`}>
                          {item.confidence}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Medical analysis */}
              {result.analysis.medical_analysis?.length > 0 && (
                <MedicalAlerts items={result.analysis.medical_analysis} />
              )}

              {/* Strengths / Improvements */}
              {result.analysis.overall_assessment && (
                <AssessmentBlock assessment={result.analysis.overall_assessment} />
              )}

              {/* Action row */}
              <div className="ai-action-row">
                <button
                  type="button"
                  className="ai-reanalyze-btn"
                  onClick={handleReanalyze}
                  id="ai-reanalyze-btn"
                >
                  <RotateCcw size={14} style={{ display: 'inline', marginRight: 6 }} />
                  Re-analyse
                </button>
                <button
                  type="button"
                  className="ai-save-btn"
                  onClick={handleSave}
                  id="ai-save-meal-btn"
                >
                  <CheckCircle size={16} />
                  Save Meal Log
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────

function QualityBanner({ assessment }: { assessment: MealAnalysisApiResponse['analysis']['overall_assessment'] }) {
  const quality = assessment.meal_quality || 'good'
  return (
    <div className={`ai-quality-banner ${quality}`}>
      {quality === 'excellent' || quality === 'good'
        ? <CheckCircle size={20} />
        : <AlertTriangle size={20} />}
      <div className="ai-quality-label">
        <p className="ai-quality-title">{quality} meal quality</p>
        {assessment.fitness_alignment && (
          <p className="ai-quality-alignment">{assessment.fitness_alignment}</p>
        )}
      </div>
      <ChevronRight size={16} style={{ opacity: 0.4 }} />
    </div>
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
    <div className="ai-macro-bars">
      <p className="ai-section-heading">This meal's daily target contribution</p>
      {bars.map(bar => (
        <div className="ai-macro-bar-row" key={bar.label}>
          <span className="ai-macro-bar-label">{bar.label}</span>
          <div className="ai-macro-bar-track">
            <div
              className="ai-macro-bar-fill"
              style={{
                width: `${Math.min(bar.pct ?? 0, 100)}%`,
                background: bar.color,
              }}
            />
          </div>
          <span className="ai-macro-bar-pct">{Math.round(bar.pct ?? 0)}%</span>
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
      <p className="ai-section-heading">
        <AlertTriangle size={10} style={{ display: 'inline', marginRight: 4 }} />
        Health Context
      </p>
      <div className="ai-medical-alerts">
        {significant.map((item, i) => (
          <div className={`ai-medical-card ${item.risk}`} key={i}>
            <div className="ai-medical-card-header">
              <p className="ai-medical-condition">{item.condition}</p>
              <span className={`ai-risk-badge ${item.risk}`}>{item.risk}</span>
            </div>
            {item.findings?.length > 0 && (
              <ul className="ai-medical-findings">
                {item.findings.slice(0, 3).map((f, j) => <li key={j}>{f}</li>)}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function AssessmentBlock({ assessment }: { assessment: MealAnalysisApiResponse['analysis']['overall_assessment'] }) {
  const hasStrengths = assessment.strengths?.length > 0
  const hasImprovements = assessment.improvements?.length > 0
  if (!hasStrengths && !hasImprovements) return null
  return (
    <div className="ai-assessment-row">
      {hasStrengths && (
        <div className="ai-assessment-block">
          <p className="ai-assessment-title" style={{ color: '#35b64b' }}>Strengths</p>
          <ul className="ai-assessment-list">
            {assessment.strengths.slice(0, 3).map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      )}
      {hasImprovements && (
        <div className="ai-assessment-block">
          <p className="ai-assessment-title" style={{ color: '#ffc45f' }}>Improvements</p>
          <ul className="ai-assessment-list">
            {assessment.improvements.slice(0, 3).map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}
