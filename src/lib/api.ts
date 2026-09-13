import { incrementActiveGets, decrementActiveGets } from '../services/http/axios-client';
import { downscaleImages } from './image-downscale';

// The active-GET counter now lives in services/http/axios-client (its final home).
// Re-exported here so existing importers (e.g. App.tsx) don't move during migration.
export { subscribeToActiveRequests } from '../services/http/axios-client';

// Finance domain types now live in types/finance.ts (single source of truth).
// Imported for this module's own signatures and re-exported for existing consumers.
import type {
  FinancialTotals,
  FinancialTransaction,
  DailyFinancialLog,
  FinanceAccount,
  RepaymentInstallment,
  SubscriptionDTO,
  LendingRecord,
} from '../types/finance';
export type {
  FinancialTotals,
  FinancialTransaction,
  DailyFinancialLog,
  FinanceAccount,
  RepaymentInstallment,
  SubscriptionDTO,
  LendingRecord,
};

// Workouts (Strava) domain types now live in types/workouts.ts.
import type { StravaActivity, StravaActivityStats } from '../types/workouts';
export type { StravaActivity, StravaActivityStats };

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1';


// ─── Gemini AI Meal Analysis (Stage 2 Clinical Assessment Schema) ──────────

export interface IngredientNutrients {
  calories_kcal: number;
  protein_g: number;
  carbohydrates_g: number;
  fat_g: number;
  saturated_fat_g: number;
  dietary_fiber_g: number;
  sugar_g: number;
  sodium_mg: number;
}

export interface IngredientBreakdown {
  item_id: number;
  name: string;
  common_name: string;
  estimated_weight_g: number;
  is_hidden: boolean;
  nutrients: IngredientNutrients;
  clinical_item_flags: string[];
}

export interface MacroTotals {
  calories_kcal: number;
  protein_g: number;
  carbohydrates_g: number;
  fat_g: number;
  saturated_fat_g: number;
  trans_fat_g: number;
  dietary_fiber_g: number;
  sugar_g: number;
  added_sugar_g: number;
  sodium_mg: number;
  potassium_mg: number;
  cholesterol_mg: number;
  /**
   * Energy band implied by the vision stage's portion-confidence brackets. Portion size
   * is the dominant error source in photo-based assessment, so a single figure implies
   * precision the image cannot support.
   */
  calories_low_kcal?: number;
  calories_high_kcal?: number;
}

export interface GlycaemicAssessment {
  total_meal_glycaemic_load: number;
  gl_classification: string;
  insulin_impact_summary: string;
}

export interface BudgetStatus {
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  sodium: string;
}

export interface DailyGoalPercentages {
  calories_pct: number;
  protein_pct: number;
  carbs_pct: number;
  fat_pct: number;
  sodium_pct: number;
}

/**
 * Computed on the backend from the meal totals and the user's daily targets — not
 * returned by the model. Asking an LLM for this division cost output tokens and
 * risked arithmetic drift on a value the server already knows exactly.
 */
export interface DailyBudgetAnalysis {
  budget_status: BudgetStatus;
  percentage_of_daily_goals_this_meal: DailyGoalPercentages;
}

export interface ClinicalFlag {
  severity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  condition_link: string;
  title: string;
  mechanistic_pathway: string;
  quantified_risk: string;
}

export interface MealScore {
  meal_context: 'main' | 'light';
  overall_score: number;
  score_rationale: string;
  letter_grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

export interface Recommendation {
  priority: string;
  title: string;
  action: string;
  condition_targeted: string;
}

export interface PositiveHighlight {
  ingredient_or_aspect: string;
  benefit: string;
}

/**
 * Stage-2 clinical assessment.
 *
 * The schema is deliberately narrow: it carries only fields that are persisted onto
 * the MealEntry or rendered in the UI. Output tokens are the most expensive part of a
 * scan, so a field nothing reads is the costliest kind of dead code — if you add one
 * here, add the corresponding renderer too. Keep this in sync with the Stage-2 output
 * schema in NutritionPipelineService.
 */
export interface GeminiAnalysisResult {
  /** Compact arithmetic trace (macro→calorie sum, gate result, glycaemic load). */
  _verification?: string;
  meal_label: string;
  meal_type: string;
  macro_totals: MacroTotals;
  ingredients_breakdown: IngredientBreakdown[];
  glycaemic_assessment: GlycaemicAssessment;
  daily_budget_analysis: DailyBudgetAnalysis;
  clinical_flags: ClinicalFlag[];
  meal_score: MealScore;
  recommendations: Recommendation[];
  positive_highlights: PositiveHighlight[];
  /** Share of meal energy backed by a measured USDA record, 0-1. */
  data_confidence?: number;
  /** 'USDA_DETERMINISTIC' when totals came from database lookup rather than model recall. */
  nutrient_source?: string;
  /** True when served from the repeat-meal cache with no model call. */
  served_from_cache?: boolean;
  /** Share of meal mass matched to a nutrient record, 0-1. Low values mean macros — protein
   *  especially — are understated, since unmatched items contribute nothing. */
  mass_coverage?: number;
  /** What this specific analysis cost to produce. */
  api_cost?: ApiCostSummary;
}

export interface ApiCostStage {
  stage: string;
  provider: string;
  model: string;
  input_tokens: number;
  cached_input_tokens: number;
  output_tokens: number;
  thinking_tokens: number;
  cost_usd: number;
  from_cache: boolean;
}

/** Per-analysis API spend, recorded at scan time and persisted with the meal. */
export interface ApiCostSummary {
  total_cost_usd: number;
  total_cost_inr: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cached_tokens: number;
  fully_cached: boolean;
  usd_to_inr: number;
  stages: ApiCostStage[];
}

export interface MealAnalysisApiResponse {
  mealEntryId: string;
  mealType: string;
  date: string;
  description: string;
  calories: number;
  proteinGrams: number;
  /** AI-generated pastel dish image as a data: URI (null if generation was skipped/failed) */
  imageUrl?: string | null;
  analysis: GeminiAnalysisResult;
}

/** fetch() wrapper that aborts after `timeoutMs` so a single hop can't hang. */
async function fetchWithTimeout(input: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * Submit up to 3 meal images and/or a text description for two-stage Gemini AI analysis.
 *
 * The analysis is a long-running background job: this POSTs to start it (which
 * returns a jobId almost instantly), then polls the status endpoint until the job
 * reaches a terminal state. Because each hop is short, the request can't be lost
 * to a proxy read-timeout the way a single ~90s request could. Job status lives in
 * the DB, so a dropped poll is simply retried on the next tick.
 *
 * Resolves with the full analysis on success; rejects with a `${code}: ${json}`
 * error (carrying `meta.source`) on a genuine failure, or a plain timeout error if
 * the job never finished within `timeoutMs` (the caller then reconciles against
 * persisted entries).
 */
export async function analyzeMeal(
  files: File[],
  description: string | null,
  mealType: string,
  date: string,
  // Sized to the server's stage budget with room for one fallback attempt:
  // extraction 75s + narrative 45s, each able to fail over to the secondary provider
  // (~45s), lands the worst case near 210s. 180s cut into that and surfaced as a
  // spurious timeout on slow analyses that were in fact still running server-side.
  timeoutMs = 240000
): Promise<{ data: MealAnalysisApiResponse }> {
  const formData = new FormData();
  // Downscale before upload: vision models bill images by resolution, so a native
  // 12MP camera photo costs several times a 1MP render for no gain in identifying
  // what is on the plate. The backend downscales again independently.
  const prepared = await downscaleImages(files.slice(0, 3).filter(Boolean));
  // Send each image under the repeated "files" part (backend binds List<MultipartFile>).
  for (const f of prepared) {
    formData.append('files', f);
  }
  if (description && description.trim()) formData.append('description', description.trim());
  formData.append('mealType', mealType);
  formData.append('date', date);

  // ── 1) Start the job (short request) ───────────────────────────────────
  // Do NOT set Content-Type manually — browser sets multipart/form-data boundary
  const startRes = await fetchWithTimeout(`${API_BASE_URL}/meals/analyze`, {
    method: 'POST',
    body: formData,
  }, 30000)

  if (!startRes.ok) {
    let detail = ''
    try { detail = await startRes.text() } catch { /* ignore */ }
    throw new Error(`${startRes.status}: ${detail || startRes.statusText}`)
  }

  const startJson = await startRes.json()
  const jobId: string | undefined = startJson?.data?.jobId
  if (!jobId) {
    throw new Error(`500: ${JSON.stringify({ meta: { source: 'meal-analysis-gemini-error' } })}`)
  }

  // ── 2) Poll for the terminal status ────────────────────────────────────
  const deadline = Date.now() + timeoutMs
  const POLL_INTERVAL_MS = 2500

  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS)

    let statusData: { status?: string; result?: MealAnalysisApiResponse; errorSource?: string } | undefined
    try {
      const pollRes = await fetchWithTimeout(`${API_BASE_URL}/meals/analyze/${jobId}`, { method: 'GET' }, 20000)
      if (!pollRes.ok) {
        // Transient (e.g. a 404 from an instance that hasn't seen the write yet,
        // or a 5xx) — keep polling until the deadline.
        continue
      }
      statusData = (await pollRes.json())?.data
    } catch {
      // Network blip on a single poll — retry on the next tick.
      continue
    }

    const status = statusData?.status
    if (status === 'COMPLETED' && statusData?.result) {
      return { data: statusData.result }
    }
    if (status === 'FAILED') {
      const source = statusData?.errorSource
        ? `meal-analysis-${statusData.errorSource}`
        : 'meal-analysis-gemini-error'
      throw new Error(`500: ${JSON.stringify({ meta: { source } })}`)
    }
    // PENDING / PROCESSING → keep waiting.
  }

  // Never reached a terminal state in time — surface a non-structured error so the
  // caller reconciles against persisted entries before declaring failure.
  throw new Error('Analysis timed out while waiting for the result')
}


export interface HydrationData {
  id?: string;
  date: string;
  waterIntakeMl: number;
  targetMl: number;
  progress: number;
  notes?: string;
}

// ─── Learnings API ───────────────────────────────────────────────────

export interface LearningLog {
  id?: string;
  title: string;
  description: string;
  category: string;
  date: string; // YYYY-MM-DD
  notionUrl?: string;
  createdAt?: string;
}

// ─── Learnings Summary & Tasks ───────────────────────────────────────

export interface LearningsCategoryCount {
  name: string;
  count: number;
}

export interface LearningsTodaySummary {
  learningsCount: number;
  tasksTotal: number;
  tasksCompleted: number;
  categories: LearningsCategoryCount[];
}

export interface LearningsTimelineDay {
  date: string;
  learningsCount: number;
  tasksCompleted: number;
  intensity: number;
}

export interface LearningsStatsSummary {
  weeklyLearningCount: number;
  streakDays: number;
  totalTasksCompleted?: number;
  totalTasksCount?: number;
  totalLearningsCount?: number;
  totalPursuitsCount?: number;
}

export interface LearningsSummary {
  date: string;
  today: LearningsTodaySummary;
  timeline: LearningsTimelineDay[];
  stats: LearningsStatsSummary;
}

export interface SubTask {
  id?: string;
  text: string;
  completed?: boolean;
}

export interface DailyTask {
  id?: string;
  title: string;
  date: string;
  scheduledTime?: string;
  notes?: string;
  completed?: boolean;
  status?: string;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string;
  recurrenceFrequency?: CalendarRecurrence;
  category?: string;
  subtasks?: SubTask[];
  tags?: string[];
}

export type CalendarItemType = 'TASK' | 'EVENT' | 'REMINDER' | 'MILESTONE';
export type CalendarRecurrence = 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface TaskHistoryEvent {
  timestamp: string;
  message: string;
}

export interface CalendarItem {
  id?: string;
  occurrenceId?: string;
  date: string;
  originalDate?: string;
  title: string;
  startTime?: string;
  endTime?: string;
  allDay?: boolean;
  itemType?: CalendarItemType;
  category?: string;
  color?: string;
  notes?: string;
  completed?: boolean;
  cancelled?: boolean;
  sortOrder?: number;
  recurrenceFrequency?: CalendarRecurrence;
  recurrenceUntil?: string;
  history?: TaskHistoryEvent[];
  createdAt?: string;
}

export type CalendarItemPayload = {
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  allDay?: boolean;
  itemType?: CalendarItemType;
  category?: string;
  color?: string;
  notes?: string;
  completed?: boolean;
  cancelled?: boolean;
  sortOrder?: number;
  recurrenceFrequency?: CalendarRecurrence;
  recurrenceUntil?: string;
};

export interface DailyLog {
  id?: string;
  date?: string;
  newLearnings?: string[];
  moodRating?: string;
  moodScore?: number | null;
  moodNote?: string | null;
}
// ─── Sleep API ────────────────────────────────────────────────────────
// Mirrors the `sleep_logs` collection + SleepController. One entry per night,
// keyed by the wake-up date. TODO: wearable sync will populate source: 'wearable'.

export type SleepSource = 'manual' | 'wearable';

export interface SleepEntry {
  id: string;
  date: string; // wake-up date, YYYY-MM-DD
  bedtime: string; // HH:mm
  wakeTime: string; // HH:mm
  durationMinutes: number;
  quality?: number | null; // 1–5
  note?: string | null;
  source: SleepSource;
  createdAt?: string;
  updatedAt?: string;
}

export interface SleepEntryPayload {
  date: string;
  bedtime: string;
  wakeTime: string;
  quality?: number | null;
  note?: string;
  source?: SleepSource;
}

// ─── Focus history (per-day completed minutes) ───────────────────────

export interface FocusDaySummary {
  date: string; // YYYY-MM-DD
  totalMinutes: number;
  sessions: number;
  /** Provenance split — measured by the timer vs entered later vs imported. */
  timerMinutes?: number;
  manualMinutes?: number;
  calendarMinutes?: number;
}


// ─── Learning Pursuits API ──────────────────────────────────────────

export interface PursuitStep {
  id: string;
  text: string;
  isCompleted: boolean;
}

export interface LearningPursuit {
  id: string;
  title: string;
  category: string;
  notionUrl: string;
  status: 'ACTIVE' | 'COMPLETED';
  steps: PursuitStep[];
}

// ─── Focus Session API ─────────────────────────────────────────────────

export interface FocusSession {
  id: string;
  userId?: string;
  activePursuit: string;
  durationMinutes: number;
  status: 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED';
  startTime?: string;
  endTime?: string;
  remainingSecondsOnPause?: number;
}
// ─── Prompts API ─────────────────────────────────────────────────────

export interface Prompt {
  id: string;
  title: string;
  content: string;
  category?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

// Global active-GET request tracking for the route navigation loader. The counter
// lives in axios-client (re-exported above); this patch feeds it during Phase A and
// also injects the bearer token. Normalizes (string | URL | Request, init) so that
// Axios's fetch adapter — which may call fetch with a Request — is covered too.
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const input = args[0];
    let options = args[1];
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input instanceof Request
            ? input.url
            : '';
    const method = (
      options?.method ??
      (input instanceof Request ? input.method : undefined) ??
      'GET'
    ).toUpperCase();
    const isGet = method === 'GET';
    const isLocalApi = url.includes('/api/v1/');

    const shouldTrack = isGet && isLocalApi;
    if (shouldTrack) {
      incrementActiveGets();
    }

    const isGuestMode = localStorage.getItem('isGuest') === 'true';
    if (!isGuestMode && isLocalApi && !url.includes('/auth/verify')) {
      const token = localStorage.getItem('authToken');
      if (token) {
        if (input instanceof Request) {
          const headers = new Headers(input.headers);
          if (!headers.has('Authorization')) {
            headers.set('Authorization', `Bearer ${token}`);
          }
          args[0] = new Request(input, { headers });
        } else {
          const headers = new Headers(options?.headers);
          if (!headers.has('Authorization')) {
            headers.set('Authorization', `Bearer ${token}`);
          }
          options = {
            ...options,
            headers,
          };
        }
      }
    }

    try {
      return await originalFetch(args[0], options);
    } finally {
      if (shouldTrack) {
        decrementActiveGets();
      }
    }
  };
}


export interface PhysicalMetrics {
  age?: number;
  gender?: string;
  height?: number;
  weight?: number;
}

export interface DynamicTargets {
  calculatedCalories?: number;
  calculatedProtein?: number;
  calculatedCarbs?: number;
  calculatedFat?: number;
}

export interface UserProfile {
  id: string;
  displayName: string;
  avatarUrl?: string;
  email?: string;
  bio?: string;
  phoneNumber?: string;
  age?: number;
  weight?: number;
  height?: number;
  targetCalories?: number;
  targetProtein?: number;
  timezone?: string;
  workingHours?: string;
  title?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;

  physicalMetrics?: PhysicalMetrics;
  activityLevel?: 'SEDENTARY' | 'LIGHTLY_ACTIVE' | 'MODERATELY_ACTIVE' | 'ACTIVE' | 'VERY_ACTIVE';
  fitnessGoal?: 'LOSE_WEIGHT' | 'MAINTAIN_WEIGHT' | 'GAIN_MUSCLE';
  medicalConditions?: string[];
  dynamicTargets?: DynamicTargets;
  bmi?: number;
  bmr?: number;
  tdee?: number;
}

export interface GoogleCalendarAccount {
  email: string;
  lastSyncedAt?: string;
  webhookExpiration?: string;
}

export interface GoogleSyncStatus {
  connected: boolean;
  email?: string;            // first account (legacy compat)
  accounts: GoogleCalendarAccount[];
}



// ─── Mind (mental wellness) ────────────────────────────────────────────────
// Mirrors the `mind_entries` collection + MindController. Canonical types live here;
// mind-types.ts re-exports them alongside its UI constants.
export type MindEntryType =
  | 'THOUGHT'
  | 'WIN'
  | 'GRATITUDE'
  | 'AFFIRMATION'
  | 'REFLECTION'
  | 'INTENTION'
  | 'BREATH'
  | 'SPIRAL';
export type MindEntryStatus =
  | 'OPEN'
  | 'RESOLVED'
  | 'PARKED'
  | 'RELEASED'
  | 'CONVERTED'
  /** An intrusive thought that was noticed and let pass. Terminal — never returns to the inbox. */
  | 'NOTICED'
  /** A parked worry whose review date arrived and whose prediction is still unanswered. */
  | 'VERDICT_DUE';
export type MindValueTag = 'Coding' | 'Growth' | 'Calm' | 'Confidence' | 'Devotion' | 'Joy' | 'Fulfilment';
export type MindDistortionTag =
  | 'Catastrophizing'
  | 'Mind-reading'
  | 'All-or-nothing'
  | 'Fortune-telling'
  | 'Labeling';

/**
 * Which of the three handling lanes a thought was triaged into.
 *
 * This is the axis the UI branches on, and it matters more than it looks: a worry gets
 * better when it is examined and predicted, an intrusive thought gets worse. So the lane
 * — not the text — decides which actions are offered at all. Null means untriaged.
 */
export type MindLane = 'PROBLEM' | 'WORRY' | 'INTRUSIVE';

export type MindIntrusiveCategory = 'DOUBT' | 'HARM' | 'IMMORAL' | 'UNNAMED';
export type MindWorryOutcome = 'NOT_HAPPENED' | 'PARTLY' | 'HAPPENED';
export type MindWorrySeverity = 'BETTER' | 'AS_FEARED' | 'WORSE';

/** A worry's feared outcome and predicted likelihood, plus the verdict once it is known. */
export interface MindWorryPrediction {
  fearedOutcome?: string | null;
  /** Gut-feel likelihood at park time, 0-100. */
  predictedProbability?: number | null;
  outcome?: MindWorryOutcome | null;
  severity?: MindWorrySeverity | null;
  recordedAt?: string | null;
}

/** Coarse metadata on an INTRUSIVE-lane entry. Deliberately shallow — detail invites rumination. */
export interface MindIntrusiveMeta {
  category?: MindIntrusiveCategory | null;
  /** 1-5. */
  intensity?: number | null;
  urgeWaitedSeconds?: number | null;
  urgeFaded?: boolean | null;
}

/** A completed or abandoned Spiral Breaker session. */
export interface MindSpiralLog {
  solvableIn24h?: boolean | null;
  returnedToTaskId?: string | null;
  durationSeconds?: number | null;
}

export interface MindEntry {
  id: string;
  type: MindEntryType;
  /**
   * Null when the entry is sealed — the backend strips it on every read except the
   * sealed archive, so never assume this is present on an INTRUSIVE-lane entry.
   */
  text: string | null;
  reframedText?: string | null;
  distortionTag?: MindDistortionTag | null;
  status: MindEntryStatus;
  linkedTaskId?: string | null;
  valueTag?: MindValueTag | null;
  pinned?: boolean;
  lane?: MindLane | null;
  /** True when `text` is withheld from normal reads. Render nothing in its place. */
  textSealed?: boolean;
  prediction?: MindWorryPrediction | null;
  intrusive?: MindIntrusiveMeta | null;
  spiral?: MindSpiralLog | null;
  reviewDate?: string | null;
  /** True once this entry has ever been PARKED — unlike reviewDate, this never clears on resurface. */
  wasParked?: boolean;
  /** INTENTION (Home anchor) only — freeform notes kept against the day's one thing. */
  note?: string | null;
  /** INTENTION only — how the anchor landed; null until the user records it. */
  outcome?: MindAnchorOutcome | null;
  date: string;
  createdAt?: string;
  resolvedAt?: string | null;
}

/**
 * The accumulating case against catastrophising: what the gut predicted against what
 * actually happened. Rates are null until at least one verdict exists — show an empty
 * state rather than inventing a reassuring 0%.
 */
export interface MindWorryLedger {
  totalPredicted: number;
  totalResolved: number;
  notHappened: number;
  partly: number;
  happened: number;
  meanPredictedProbability: number | null;
  /** 0-100. PARTLY counts as half an occurrence. */
  actualOccurrenceRate: number | null;
  copedBetter: number;
  copedAsFeared: number;
  copedWorse: number;
}

/** One day of mind activity next to the Life OS signals that plausibly move it. */
export interface MindLoopRadarDay {
  date: string;
  problems: number;
  worries: number;
  intrusive: number;
  untriaged: number;
  spirals: number;
  sleepHours: number | null;
  focusMinutes: number | null;
  tasksCompleted: number | null;
  workouts: number | null;
  moodScore: number | null;
}

export interface MindSummary {
  focusMinutes: number;
  tasksCompleted: number;
  workouts: number;
  learnings: number;
  streakDays: number;
  captured: number;
  converted: number;
  reframed: number;
  released: number;
  moodScore: number | null;
}

/** How a Home anchor (INTENTION) landed, once the user records it. */
export type MindAnchorOutcome = 'ACHIEVED' | 'PARTIAL' | 'MISSED';

export interface MindEntryPayload {
  text: string;
  type?: MindEntryType;
  valueTag?: MindValueTag | null;
  pinned?: boolean;
  date?: string;
  /** INTENTION only — freeform notes kept against the day's anchor. */
  note?: string | null;
  /** INTENTION only — send '' to clear. */
  outcome?: MindAnchorOutcome | '' | null;
}

export interface MindStatusPayload {
  status: MindEntryStatus;
  reviewDate?: string;
  reframedText?: string;
  distortionTag?: MindDistortionTag | null;
  pinned?: boolean;
}

/** Every field optional — the primary path is a single tap with an empty body. */
export interface MindNoticedPayload {
  text?: string;
  category?: MindIntrusiveCategory;
  intensity?: number;
  urgeWaitedSeconds?: number;
  urgeFaded?: boolean;
  date?: string;
}

export interface MindLanePayload {
  lane: MindLane;
}

export interface MindPredictionPayload {
  fearedOutcome?: string;
  predictedProbability?: number;
}

export interface MindVerdictPayload {
  outcome: MindWorryOutcome;
  severity?: MindWorrySeverity;
}

export interface MindSpiralPayload {
  solvableIn24h?: boolean;
  returnedToTaskId?: string;
  durationSeconds?: number;
  date?: string;
}


export interface SleepLog {
  id?: string;
  date: string;
  bedTime: string;
  wakeTime: string;
  durationMinutes: number;
  notes?: string;
  createdAt?: string;
}
