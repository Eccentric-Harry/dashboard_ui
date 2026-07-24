import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Loader2, ClipboardCheck, ClipboardPaste, Camera, CheckCircle, AlertTriangle, RotateCcw, Upload, Wifi, Bell, Scan, Shield, TrendingUp, Sparkles, Copy, ChevronLeft, ChevronRight } from 'lucide-react'
import { createPortal } from 'react-dom'
import toast from 'react-hot-toast'
import { addFoodEntry, updateFoodEntry, type MealAnalysisApiResponse, type ClinicalFlag, type IngredientBreakdown } from '../../../../lib/api'
import { useNotifications } from '../../../../contexts/NotificationContext'
import { normalizeMealGrade } from './meal-grade'
import { NUTRILOG_PROMPT } from './nutrilog-prompt'

// ─── Types ────────────────────────────────────────────────────────────────

type Phase = 'input' | 'processing' | 'results'

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Post Workout', 'Mid-Morning', 'Midnight']

// AI Scan accepts up to 3 photos per meal.
const MAX_AI_IMAGES = 3

const NUTRITION_TRIVIA = [
  {
    title: 'Iron Bioavailability',
    text: 'Pairing vitamin C (lemon juice, bell peppers) with plant iron (spinach, lentils) boosts absorption by up to 300%.',
    tag: 'Nutrient Timing',
  },
  {
    title: 'Fat-Soluble Bioavailability',
    text: 'Vitamins A, D, E & K in leafy greens require healthy fats (avocado, nuts, seeds, ghee) to be absorbed effectively.',
    tag: 'Pro-Tip',
  },
  {
    title: 'Complete Amino Profiles',
    text: 'Combining legumes (dal, rajma, chickpeas) with grains (rice, roti) delivers all 9 essential amino acids for muscle health.',
    tag: 'Protein Synergy',
  },
  {
    title: 'Mindful Satiety',
    text: 'Chewing each bite 20-30 times allows your brain to register fullness hormones (leptin) naturally.',
    tag: 'Satiety Science',
  },
  {
    title: 'Gut Microbiome Diversity',
    text: 'Eating 30+ unique plant foods per week (herbs, seeds, legumes, veggies) drastically enhances gut flora.',
    tag: 'Microbiome',
  },
  {
    title: 'Pre-Meal Hydration',
    text: 'Drinking 300ml of water 15 minutes before meals supports optimal digestive enzyme secretion.',
    tag: 'Hydration',
  },
]

const MACRO_COLORS: Record<string, string> = {
  Calories: '#e8a23a',
  Protein:  '#35b64b',
  Carbs:    '#3b82f6',
  Fat:      '#ef4444',
  Sodium:   '#8b5cf6',
}

// ─── AI JSON payload parsing ──────────────────────────────────────────────
// The paste flow accepts the NutriLog JSON (camelCase or snake_case keys).
// Scalars autofill the visible form fields — the form is the source of
// truth on submit, so user edits always win over the raw payload. The rich
// analysis blocks pass through to the backend keyed exactly as
// FoodEntryRequest binds them (@JsonProperty snake_case).

interface ParsedMealJson {
  description?: string
  calories?: number
  proteinGrams?: number
  mealType?: string
  date?: string
  grade?: string
  itemCount: number
  rich: Record<string, unknown>
}

type JsonParseResult = { ok: true; parsed: ParsedMealJson } | { ok: false; error: string }

function canonicalMealType(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const clean = value.trim().toLowerCase()
  return MEAL_TYPES.find(t => t.toLowerCase() === clean)
}

function parseMealJson(text: string): JsonParseResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Invalid JSON' }
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'Expected a JSON object with meal fields' }
  }
  const obj = raw as Record<string, unknown>
  const pick = (keys: string[]): unknown => {
    for (const k of keys) if (k in obj) return obj[k]
    return undefined
  }

  let timestamp = pick(['timestamp', 'createdAt'])
  if (timestamp && typeof timestamp === 'object' && '$date' in (timestamp as Record<string, unknown>)) {
    timestamp = (timestamp as Record<string, unknown>)['$date']
  }

  const totals = pick(['totalSummary', 'total_summary'])
  const totalsObj = totals && typeof totals === 'object' ? (totals as Record<string, unknown>) : {}
  const toInt = (v: unknown): number | undefined => {
    if (v === null || v === undefined || v === '') return undefined
    const n = parseFloat(String(v))
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : undefined
  }

  const dateRaw = pick(['date', 'dateString', 'date_string'])
  const gradeRaw = pick(['mealQuality', 'meal_quality', 'letterGrade', 'letter_grade'])
  const recomposition = pick(['recompositionAssessment', 'recomposition_assessment'])
  const recompositionGrade =
    recomposition && typeof recomposition === 'object'
      ? (recomposition as Record<string, unknown>).letter_grade
      : undefined
  const grade =
    typeof gradeRaw === 'string' ? gradeRaw
    : typeof recompositionGrade === 'string' ? recompositionGrade
    : undefined
  const items = pick(['mealItems', 'meal_items'])
  const descriptionRaw = pick(['description', 'mealLabel', 'meal_label'])

  return {
    ok: true,
    parsed: {
      description: typeof descriptionRaw === 'string' && descriptionRaw.trim() ? descriptionRaw.trim() : undefined,
      calories: toInt(pick(['calories', 'calories_kcal', 'totalCalories']) ?? totalsObj.calories_kcal),
      proteinGrams: toInt(pick(['proteinGrams', 'protein_grams', 'protein', 'totalProteinGrams']) ?? totalsObj.protein_g),
      mealType: canonicalMealType(pick(['mealType', 'meal_type', 'meal'])),
      date: typeof dateRaw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateRaw) ? dateRaw : undefined,
      grade,
      itemCount: Array.isArray(items) ? items.length : 0,
      rich: {
        timestamp: timestamp ?? null,
        mealQuality: grade ?? null,
        meal_quality: grade ?? null,
        notes: pick(['notes']) ?? null,
        recipe_category: pick(['recipeCategory', 'recipe_category']) ?? null,
        serving: pick(['serving']) ?? null,
        serving_notes: pick(['servingNotes', 'serving_notes']) ?? null,
        source_notes: pick(['sourceNotes', 'source_notes']) ?? null,
        import_key: pick(['importKey', 'import_key']) ?? null,
        analysis_metadata: pick(['analysisMetadata', 'analysis_metadata']) ?? null,
        meal_items: items ?? null,
        total_summary: totals ?? null,
        gaps_and_warnings: pick(['gapsAndWarnings', 'gaps_and_warnings']) ?? null,
        technical_diagnostic: pick(['technicalDiagnostic', 'technical_diagnostic']) ?? null,
        acne_impact_assessment: pick(['acneImpactAssessment', 'acne_impact_assessment']) ?? null,
        health_analysis: pick(['healthAnalysis', 'health_analysis']) ?? null,
        recomposition_assessment: recomposition ?? null,
        satiety_and_energy_profile: pick(['satietyAndEnergyProfile', 'satiety_and_energy_profile']) ?? null,
        nutritional_balance_diagnostic: pick(['nutritionalBalanceDiagnostic', 'nutritional_balance_diagnostic']) ?? null,
        daily_context: pick(['dailyContext', 'daily_context']) ?? null,
      },
    },
  }
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
  const [jsonPayload, setJsonPayload] = useState('')
  const [jsonPreview, setJsonPreview] = useState<JsonParseResult | null>(null)

  // AI tab state
  const [aiPhase, setAiPhase] = useState<Phase>('input')
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([])
  const [aiDescription, setAiDescription] = useState('')
  const [aiMealType, setAiMealType] = useState('')
  const [aiDate, setAiDate] = useState(selectedDate)
  const [isDragOver, setIsDragOver] = useState(false)
  const [aiError, setAiError] = useState('')
  const [aiErrorCode, setAiErrorCode] = useState<number | null>(null)
  const [aiResult, setAiResult] = useState<MealAnalysisApiResponse | null>(null)

  // Progressive progress bar & trivia state
  const [progressPercent, setProgressPercent] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [currentTipIndex, setCurrentTipIndex] = useState(0)

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
      setJsonPayload('')
      setJsonPreview(null)
      setActiveTab('manual')
      setCurrentTaskId(null)
    } else if (isOpen && !isEdit) {
      setMealType('')
      setDescription('')
      setProteinGrams('')
      setCalories('')
      setDate(selectedDate)
      setJsonPayload('')
      setJsonPreview(null)
      setActiveTab('manual')
      // Reset AI state
      setAiPhase('input')
      setImageFiles([])
      imagePreviewUrls.forEach(url => URL.revokeObjectURL(url))
      setImagePreviewUrls([])
      setAiDescription('')
      setAiMealType('')
      setAiDate(selectedDate)
      setAiError('')
      setAiErrorCode(null)
      setAiResult(null)
      setCurrentTaskId(null)
      setProgressPercent(0)
      setElapsedSeconds(0)
      setCurrentTipIndex(0)
    }
    return () => {
      if (stageTimerRef.current) clearTimeout(stageTimerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isEdit, initialData, selectedDate])

  // Realistic progressive progress bar timer (~90s duration) + Trivia carousel
  useEffect(() => {
    if (aiPhase !== 'processing') {
      setProgressPercent(0)
      setElapsedSeconds(0)
      return
    }

    const startTime = Date.now()
    const TARGET_DURATION_MS = 90000 // 90 seconds (1.5 mins)

    const timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      setElapsedSeconds(elapsed)

      const ratio = (Date.now() - startTime) / TARGET_DURATION_MS
      let pct: number
      if (ratio <= 1) {
        // Ease-out cubic curve up to 92%
        const ease = 1 - Math.pow(1 - ratio, 2.5)
        pct = Math.round(ease * 92)
      } else {
        // Crawl slowly from 92% to 98%
        const extraSec = elapsed - 90
        pct = Math.min(98, 92 + Math.floor(extraSec / 8))
      }
      setProgressPercent(Math.max(4, pct))
    }, 300)

    const triviaInterval = setInterval(() => {
      setCurrentTipIndex(prev => (prev + 1) % NUTRITION_TRIVIA.length)
    }, 7000)

    return () => {
      clearInterval(timerInterval)
      clearInterval(triviaInterval)
    }
  }, [aiPhase])

  const currentTask = currentTaskId ? backgroundScans.find(t => t.id === currentTaskId) : null

  useEffect(() => {
    if (!currentTask) return

    if (currentTask.status === 'success') {
      if (stageTimerRef.current) clearTimeout(stageTimerRef.current)
      setProgressPercent(100)
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

  const formatElapsed = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  const getDynamicStageInfo = (pct: number) => {
    if (pct < 35) return { label: 'Identifying food items…', sub: 'Vision analysis & ingredient detection in progress' }
    if (pct < 75) return { label: 'Calculating clinical nutrition…', sub: 'Consulting health profile & macro breakdown' }
    return { label: 'Finalising clinical diagnostics…', sub: 'Synthesizing recommendations & preparing log' }
  }

  const isNotificationsEnabled = desktopEnabled && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'

  // ── JSON paste handling ───────────────────────────────────────────────
  const applyJsonText = (text: string) => {
    setJsonPayload(text)
    const trimmed = text.trim()
    if (!trimmed) {
      setJsonPreview(null)
      return
    }
    const result = parseMealJson(trimmed)
    setJsonPreview(result)
    if (result.ok) {
      // Autofill the visible fields so the user can review/override
      const p = result.parsed
      if (p.description) setDescription(p.description)
      if (p.calories !== undefined) setCalories(String(p.calories))
      if (p.proteinGrams !== undefined) setProteinGrams(String(p.proteinGrams))
      if (p.mealType) setMealType(p.mealType)
      if (p.date) setDate(p.date)
    }
  }

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (!text.trim()) {
        toast.error('Clipboard is empty')
        return
      }
      applyJsonText(text)
    } catch {
      toast.error('Clipboard unavailable — paste directly into the field instead')
    }
  }

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(NUTRILOG_PROMPT)
      toast.success('Analysis prompt copied — paste it into your AI chatbot')
    } catch {
      toast.error('Clipboard unavailable — copy the prompt manually')
    }
  }

  // ── Manual form submit ────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const trimmedJson = jsonPayload.trim()
    let parsed: ParsedMealJson | null = null
    if (trimmedJson) {
      const result = parseMealJson(trimmedJson)
      if (!result.ok) {
        setError('JSON Error: ' + result.error)
        return
      }
      parsed = result.parsed
    }

    // The form fields are the source of truth — pasting JSON autofills
    // them, so anything the user edits afterwards wins over the payload.
    const finalDescription = description.trim() || parsed?.description || ''
    const finalMealType = mealType || parsed?.mealType || ''
    const finalDate = date || parsed?.date || ''
    const numCalories = calories.trim() ? Math.round(parseFloat(calories)) : parsed?.calories ?? NaN
    const numProtein = proteinGrams.trim() ? Math.round(parseFloat(proteinGrams)) : parsed?.proteinGrams ?? NaN

    if (!finalDescription) {
      setError('Food name is required')
      return
    }
    if (!Number.isFinite(numCalories) || numCalories < 0) {
      setError('Calories is required and must be 0 or greater')
      return
    }
    if (!Number.isFinite(numProtein) || numProtein < 0) {
      setError('Protein is required and must be 0 or greater')
      return
    }
    if (!finalMealType) {
      setError('Please select a meal type')
      return
    }
    if (!finalDate) {
      setError('Date is required')
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const finalPayload: any = {
      ...(parsed ? parsed.rich : {}),
      description: finalDescription,
      calories: numCalories,
      proteinGrams: numProtein,
      mealType: finalMealType,
      date: finalDate,
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

  // ── AI image handling (up to 3 photos) ────────────────────────────────
  const addImages = useCallback((incoming: File[]) => {
    const remaining = MAX_AI_IMAGES - imageFiles.length
    if (remaining <= 0) {
      toast.error(`You can attach up to ${MAX_AI_IMAGES} photos`)
      return
    }
    const accepted: File[] = []
    for (const file of incoming) {
      if (accepted.length >= remaining) break
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload image files only (JPG, PNG, WEBP, HEIC)')
        continue
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`"${file.name}" is over 10 MB`)
        continue
      }
      accepted.push(file)
    }
    if (accepted.length === 0) return
    if (incoming.length > remaining) {
      toast.error(`Up to ${MAX_AI_IMAGES} photos — extra images were skipped`)
    }
    setImageFiles(prev => [...prev, ...accepted])
    setImagePreviewUrls(prev => [...prev, ...accepted.map(f => URL.createObjectURL(f))])
  }, [imageFiles.length])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length) addImages(files)
  }, [addImages])

  const removeImage = (index: number) => {
    setImagePreviewUrls(prev => {
      const url = prev[index]
      if (url) URL.revokeObjectURL(url)
      return prev.filter((_, i) => i !== index)
    })
    setImageFiles(prev => prev.filter((_, i) => i !== index))
  }

  const aiCanSubmit = (imageFiles.length > 0 || aiDescription.trim().length > 0) && aiMealType !== ''

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

    try {
      const taskId = await startBackgroundScan(imageFiles, aiDescription || null, aiMealType, aiDate)
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
            {/* JSON import first — the primary flow when logging via an external AI */}
            <div className="form-group">
              <div className="af-json-head">
                <label>Import from AI (paste JSON)</label>
                <div className="af-json-head-actions">
                  <button
                    type="button"
                    className="af-json-paste-btn"
                    onClick={handleCopyPrompt}
                    id="af-json-copy-prompt-btn"
                  >
                    <Copy size={12} />
                    Copy AI prompt
                  </button>
                  <button
                    type="button"
                    className="af-json-paste-btn"
                    onClick={handlePasteFromClipboard}
                    id="af-json-paste-btn"
                  >
                    <ClipboardPaste size={12} />
                    Paste from clipboard
                  </button>
                </div>
              </div>
              <p className="af-json-hint">
                Copy the prompt into any AI chatbot with your meal, then paste its JSON back here.
              </p>
              <textarea
                className="json-textarea"
                placeholder='{&#10;  "description": "Lemon Rice",&#10;  "calories": 472,&#10;  "proteinGrams": 10,&#10;  "mealType": "Lunch",&#10;  "mealItems": [ ... ],&#10;  "totalSummary": { ... }&#10;}'
                value={jsonPayload}
                onChange={(e) => applyJsonText(e.target.value)}
                aria-label="AI meal JSON payload"
              />
              {jsonPreview && (
                jsonPreview.ok ? (
                  <JsonPreviewStrip parsed={jsonPreview.parsed} />
                ) : (
                  <div className="af-json-preview error" role="alert">
                    <AlertTriangle size={13} />
                    <span>{jsonPreview.error}</span>
                  </div>
                )
              )}
            </div>

            <div className="af-or-divider"><span>or enter manually</span></div>

            <div className="form-group">
              <label>Food Name</label>
              <input
                type="text"
                placeholder="e.g. Paneer Sandwich, Salad..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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

            <button type="submit" className="add-tx-submit af-submit-btn" disabled={loading}>
              {loading ? <Loader2 className="spinner" size={18} /> : <><CheckCircle size={16} />Save Food</>}
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

                {/* Hidden inputs — always mounted so the "Add" tile can trigger them */}
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic"
                  multiple
                  onChange={e => { const fs = Array.from(e.target.files ?? []); if (fs.length) addImages(fs); e.target.value = '' }}
                  tabIndex={-1}
                  id="af-file-input"
                  style={{ display: 'none' }}
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={e => { const f = e.target.files?.[0]; if (f) addImages([f]); e.target.value = '' }}
                  tabIndex={-1}
                  id="af-camera-input"
                  style={{ display: 'none' }}
                />

                {/* Image tray (up to 3) or empty drop-zone */}
                {imagePreviewUrls.length > 0 ? (
                  <div className="af-image-grid">
                    {imagePreviewUrls.map((url, i) => (
                      <div className="af-image-preview" key={url}>
                        <img src={url} alt={`Meal preview ${i + 1}`} />
                        <button type="button" className="af-image-remove" onClick={() => removeImage(i)} aria-label="Remove image">
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    {imageFiles.length < MAX_AI_IMAGES && (
                      <button
                        type="button"
                        className="af-image-add-tile"
                        onClick={() => galleryInputRef.current?.click()}
                        aria-label="Add another photo"
                      >
                        <Upload size={15} />
                        <span>Add<br />{imageFiles.length}/{MAX_AI_IMAGES}</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div
                    className={`af-drop-zone ${isDragOver ? 'drag-over' : ''}`}
                    onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={onDrop}
                  >
                    <p className="af-drop-label">Snap or upload your meal</p>
                    <p className="af-drop-sublabel" style={{ marginBottom: '14px' }}>Up to 3 photos · JPG, PNG, WEBP, HEIC · max 10 MB each</p>
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
                    <input type="date" value={aiDate} onChange={e => setAiDate(e.target.value)} />
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
                  <div className="af-processing-header-row">
                    <div className="af-loader-box">
                      <div className="af-ai-spinner-container">
                        <Loader2 size={24} className="af-spinner-icon" />
                      </div>
                    </div>
                    <div className="af-hub-header">
                      <div className="af-hub-title-row">
                        <h3 className="af-hub-title">{getDynamicStageInfo(progressPercent).label}</h3>
                        <span className="af-progress-badge">{progressPercent}%</span>
                      </div>
                      <p className="af-hub-subtitle">{getDynamicStageInfo(progressPercent).sub}</p>
                    </div>
                  </div>

                  {/* Smooth progressive progress bar */}
                  <div className="af-progress-wrapper">
                    <div className="af-progress-track" role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100}>
                      <div className="af-progress-fill" style={{ width: `${progressPercent}%` }} />
                    </div>
                    <div className="af-progress-meta">
                      <span className="af-elapsed-time">Elapsed: {formatElapsed(elapsedSeconds)}</span>
                      <span className="af-est-time">~1:30 min total</span>
                    </div>
                  </div>

                  <div className="af-loading-checklist">
                    <div className={`af-check-item ${progressPercent >= 10 ? 'completed' : 'active'}`}>
                      <CheckCircle size={15} className="af-check-icon completed" />
                      <span>Loaded profile & target metrics</span>
                    </div>
                    <div className={`af-check-item ${progressPercent >= 35 ? 'completed' : progressPercent >= 10 ? 'active' : 'pending'}`}>
                      {progressPercent >= 35 ? (
                        <CheckCircle size={15} className="af-check-icon completed" />
                      ) : progressPercent >= 10 ? (
                        <span className="af-check-dot active" />
                      ) : (
                        <span className="af-check-dot pending" />
                      )}
                      <span>Identifying food items & ingredients</span>
                    </div>
                    <div className={`af-check-item ${progressPercent >= 75 ? 'completed' : progressPercent >= 35 ? 'active' : 'pending'}`}>
                      {progressPercent >= 75 ? (
                        <CheckCircle size={15} className="af-check-icon completed" />
                      ) : progressPercent >= 35 ? (
                        <span className="af-check-dot active" />
                      ) : (
                        <span className="af-check-dot pending" />
                      )}
                      <span>Orchestrating clinical diagnostics</span>
                    </div>
                  </div>

                  {/* ── Interactive Nutrition Trivia & Pro-Tips Carousel ── */}
                  <div className="af-trivia-card">
                    <div className="af-trivia-top">
                      <div className="af-trivia-badge">
                        <Sparkles size={13} className="af-trivia-icon" />
                        <span>{NUTRITION_TRIVIA[currentTipIndex].tag}</span>
                      </div>
                      <div className="af-trivia-controls">
                        <button
                          type="button"
                          className="af-trivia-arrow"
                          onClick={() => setCurrentTipIndex(prev => (prev - 1 + NUTRITION_TRIVIA.length) % NUTRITION_TRIVIA.length)}
                          aria-label="Previous tip"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <button
                          type="button"
                          className="af-trivia-arrow"
                          onClick={() => setCurrentTipIndex(prev => (prev + 1) % NUTRITION_TRIVIA.length)}
                          aria-label="Next tip"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>

                    <h4 className="af-trivia-headline">{NUTRITION_TRIVIA[currentTipIndex].title}</h4>
                    <p className="af-trivia-body">{NUTRITION_TRIVIA[currentTipIndex].text}</p>

                    <div className="af-trivia-pagination">
                      {NUTRITION_TRIVIA.map((_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className={`af-trivia-dot ${idx === currentTipIndex ? 'active' : ''}`}
                          onClick={() => setCurrentTipIndex(idx)}
                          aria-label={`Jump to tip ${idx + 1}`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="af-processing-background-hint">
                    <Shield size={14} className="af-hint-icon" />
                    <span>AI analysis takes 1-2 minutes. You can close this modal — we'll notify you once ready!</span>
                  </div>
                  
                  <button
                    type="button"
                    className="af-background-run-btn"
                    onClick={onClose}
                  >
                    <Bell size={14} />
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
                  {aiResult.imageUrl && (
                    <img className="af-result-hero" src={aiResult.imageUrl} alt={aiResult.description} />
                  )}
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

function JsonPreviewStrip({ parsed }: { parsed: ParsedMealJson }) {
  const grade = normalizeMealGrade(parsed.grade)
  return (
    <div className="af-json-preview" role="status">
      <CheckCircle size={13} />
      <span>
        Parsed <strong>{parsed.description || 'meal'}</strong>
        {' · '}{parsed.calories ?? '?'} kcal · {parsed.proteinGrams ?? '?'}g protein
        {parsed.itemCount > 0 && <> · {parsed.itemCount} item{parsed.itemCount === 1 ? '' : 's'}</>}
        {grade && (
          <span
            className="af-json-grade"
            style={{ backgroundColor: grade.bg, color: grade.ink, borderColor: grade.border }}
          >
            Grade {grade.letter}
          </span>
        )}
      </span>
    </div>
  )
}

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
