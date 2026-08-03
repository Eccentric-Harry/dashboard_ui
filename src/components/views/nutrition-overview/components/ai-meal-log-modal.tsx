import { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  X, Upload, Sparkles, CheckCircle, AlertTriangle,
  ChevronRight, RotateCcw, Camera, Shield, TrendingUp
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  analyzeMeal,
  type MealAnalysisApiResponse,
  type ClinicalFlag,
  type IngredientBreakdown,
} from '../../../../lib/api'
import './ai-meal-log-modal.css'

// ─── Types ────────────────────────────────────────────────────────────────

type Phase = 'input' | 'processing' | 'results'

const MEAL_TYPES = [
  'Breakfast', 'Lunch', 'Dinner', 'Snack',
  'Mid-Morning', 'Post Workout', 'Midnight',
]

const STAGE_MESSAGES = [
  { stage: 'Step 1 of 3', label: 'Identifying ingredients and portions…', sub: 'Vision analysis in progress' },
  { stage: 'Step 2 of 3', label: 'Looking up nutrients and running clinical checks…', sub: 'USDA FoodData Central' },
  { stage: 'Step 3 of 3', label: 'Writing your personalised guidance…', sub: 'Almost done' },
]

//-- test--
const MACRO_COLORS: Record<string, string> = {
  Calories: '#ffc45f',
  Protein:  '#35b64b',
  Carbs:    '#76e4ff',
  Fat:      '#f87171',
  Sodium:   '#a78bfa',
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
      const res = await analyzeMeal(imageFile ? [imageFile] : [], description || null, mealType, date)
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
     toast.success(`Logged: ${result?.description || 'AI meal'}`)
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
              {/*
                Portion size, not nutrient composition, is the largest error source in
                photo-based estimation. Showing the range the photo actually supports is
                more honest than a single number the image cannot justify.
              */}
              {result.analysis.macro_totals?.calories_low_kcal != null &&
               result.analysis.macro_totals?.calories_high_kcal != null && (
                <p className="ai-modal-range">
                  Portion estimate spans {Math.round(result.analysis.macro_totals.calories_low_kcal)}–
                  {Math.round(result.analysis.macro_totals.calories_high_kcal)} kcal
                </p>
              )}
              {/* Unmatched ingredients contribute nothing to the totals, so a low coverage
                  figure means the macros — protein most of all — are understated. */}
              {result.analysis.mass_coverage != null && result.analysis.mass_coverage < 0.9 && (
                <p className="ai-modal-warning">
                  Only {Math.round(result.analysis.mass_coverage * 100)}% of this meal matched a
                  nutrient record — macros below are understated.
                </p>
              )}
              {result.analysis.api_cost && (
                <p className="ai-modal-cost">
                  {result.analysis.api_cost.fully_cached
                    ? 'Served from cache — no API cost'
                    : `Analysis cost ₹${result.analysis.api_cost.total_cost_inr.toFixed(2)} · ` +
                      `${result.analysis.api_cost.total_input_tokens.toLocaleString()} in / ` +
                      `${result.analysis.api_cost.total_output_tokens.toLocaleString()} out tokens`}
                </p>
              )}
            </div>

            <div className="ai-results-container">
              {/* Meal Score Banner */}
              {result.analysis.meal_score && (
                <ScoreBanner score={result.analysis.meal_score} />
              )}

              {/* Macro progress bars */}
              {result.analysis.daily_budget_analysis?.percentage_of_daily_goals_this_meal && (
                <MacroBars progress={result.analysis.daily_budget_analysis.percentage_of_daily_goals_this_meal} />
              )}

              {/* Ingredients breakdown */}
              {result.analysis.ingredients_breakdown?.length > 0 && (
                <div>
                  <p className="ai-section-heading">
                    <Upload size={10} style={{ display: 'inline', marginRight: 4 }} />
                    Identified Items ({result.analysis.ingredients_breakdown.length})
                  </p>
                  <div className="ai-items-list">
                    {result.analysis.ingredients_breakdown.map((item, i) => (
                      <IngredientRow key={i} item={item} />
                    ))}
                  </div>
                </div>
              )}

              {/* Clinical flags */}
              {result.analysis.clinical_flags?.length > 0 && (
                <ClinicalFlagList flags={result.analysis.clinical_flags} />
              )}

              {/* Positive highlights + Recommendations */}
              <AssessmentBlock analysis={result.analysis} />

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

function ScoreBanner({ score }: { score: MealAnalysisApiResponse['analysis']['meal_score'] }) {
  const grade = score.letter_grade || 'C'
  const quality = grade === 'A' ? 'excellent' : grade === 'B' ? 'good' : grade === 'C' ? 'fair' : 'poor'
  return (
    <div className={`ai-quality-banner ${quality}`}>
      {quality === 'excellent' || quality === 'good'
        ? <CheckCircle size={20} />
        : <AlertTriangle size={20} />}
      <div className="ai-quality-label">
        <p className="ai-quality-title">
          {grade} · {score.overall_score}/100 — {quality} meal quality
        </p>
        {score.score_rationale && (
          <p className="ai-quality-alignment">{score.score_rationale}</p>
        )}
      </div>
      <ChevronRight size={16} style={{ opacity: 0.4 }} />
    </div>
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

function IngredientRow({ item }: { item: IngredientBreakdown }) {
  const n = item.nutrients
  return (
    <div className="ai-item-row">
      <div className="ai-item-name-col">
        <p className="ai-item-name">
          {item.common_name || item.name}
          {item.is_hidden && <span className="ai-hidden-badge" title="Hidden ingredient (inferred)">hidden</span>}
        </p>
        <p className="ai-item-serving">{item.estimated_weight_g}g</p>
      </div>
      <div className="ai-item-macros">
        <span className="ai-item-macro-chip">
          <span>{Math.round(n?.calories_kcal ?? 0)}</span> kcal
        </span>
        <span className="ai-item-macro-chip">
          <span>{Math.round(n?.protein_g ?? 0)}g</span> P
        </span>
        <span className="ai-item-macro-chip">
          <span>{Math.round(n?.carbohydrates_g ?? 0)}g</span> C
        </span>
        <span className="ai-item-macro-chip">
          <span>{Math.round(n?.fat_g ?? 0)}g</span> F
        </span>
      </div>
      {item.clinical_item_flags?.length > 0 && (
        <span className="ai-item-confidence low" title={item.clinical_item_flags.join(', ')}>
          ⚠
        </span>
      )}
    </div>
  )
}

function ClinicalFlagList({ flags }: { flags: ClinicalFlag[] }) {
  const significant = flags.filter(f => f.severity !== 'LOW')
  if (significant.length === 0) return null
  return (
    <div>
      <p className="ai-section-heading">
        <Shield size={10} style={{ display: 'inline', marginRight: 4 }} />
        Clinical Flags ({significant.length})
      </p>
      <div className="ai-medical-alerts">
        {significant.map((flag, i) => {
          const riskLevel = flag.severity === 'CRITICAL' ? 'high'
            : flag.severity === 'HIGH' ? 'high'
            : flag.severity === 'MODERATE' ? 'moderate' : 'low'
          return (
            <div className={`ai-medical-card ${riskLevel}`} key={i}>
              <div className="ai-medical-card-header">
                <p className="ai-medical-condition">{flag.title}</p>
                <span className={`ai-risk-badge ${riskLevel}`}>{flag.severity}</span>
              </div>
              {flag.mechanistic_pathway && (
                <ul className="ai-medical-findings">
                  <li>{flag.mechanistic_pathway}</li>
                </ul>
              )}
              {flag.quantified_risk && (
                <p style={{ fontSize: '0.7rem', opacity: 0.7, margin: '4px 0 0' }}>{flag.quantified_risk}</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AssessmentBlock({ analysis }: { analysis: MealAnalysisApiResponse['analysis'] }) {
  const hasHighlights = (analysis.positive_highlights?.length ?? 0) > 0
  const hasRecommendations = (analysis.recommendations?.length ?? 0) > 0
  if (!hasHighlights && !hasRecommendations) return null
  return (
    <div className="ai-assessment-row">
      {hasHighlights && (
        <div className="ai-assessment-block">
          <p className="ai-assessment-title" style={{ color: '#35b64b' }}>
            <TrendingUp size={10} style={{ display: 'inline', marginRight: 4 }} />
            Strengths
          </p>
          <ul className="ai-assessment-list">
            {analysis.positive_highlights!.slice(0, 3).map((h, i) => (
              <li key={i}><strong>{h.ingredient_or_aspect}</strong>: {h.benefit}</li>
            ))}
          </ul>
        </div>
      )}
      {hasRecommendations && (
        <div className="ai-assessment-block">
          <p className="ai-assessment-title" style={{ color: '#ffc45f' }}>
            <Sparkles size={10} style={{ display: 'inline', marginRight: 4 }} />
            Recommendations
          </p>
          <ul className="ai-assessment-list">
            {analysis.recommendations!.slice(0, 3).map((r, i) => (
              <li key={i}><strong>{r.title}</strong>: {r.action}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
