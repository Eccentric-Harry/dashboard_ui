// Nutrition, hydration and AI meal-analysis domain types — single source of truth.

// The backend doesn't return a single typed FoodEntry shape (each consumer reads it
// loosely); keep that honest here rather than inventing a stricter contract the
// backend doesn't actually guarantee.
export type FoodEntry = Record<string, unknown>;

export interface HydrationData {
  id?: string;
  date: string;
  waterIntakeMl: number;
  targetMl: number;
  progress: number;
  notes?: string;
}

/**
 * One day's meal-quality aggregate, from DashboardService.mealQualityOf.
 *
 * `averagePoints` runs on the GPA-shaped ramp the grade badges use (A=4 … D=1) and
 * covers only the graded meals — manual entries never get a grade, which is why
 * `gradedMeals` is reported separately from `mealsLogged`. Null average means
 * "nothing assessed yet", never "poor".
 */
export interface MealQualityDay {
  mealsLogged: number;
  gradedMeals: number;
  averagePoints: number | null;
  letter: 'A' | 'B' | 'C' | 'D' | null;
}

/** Shape of GET /dashboard/nutrition-summary (DashboardService.getNutritionSummary). */
export interface NutritionSummary {
  date: string;
  dailyCalories: Record<string, number>;
  dailyProtein: Record<string, number>;
  mealTypeBreakdown: Record<string, number>;
  todayTotalCalories: number;
  todayTotalProtein: number;
  calorieGoal: number;
  proteinGoal: number;
  /** Optional: absent when the UI is running against a backend older than the day-loop change. */
  dailyMealQuality?: Record<string, MealQualityDay>;
  todayMealQuality?: MealQualityDay | null;
}

// ── Request DTOs ──
export interface FoodEntryRequest {
  description: string;
  calories: number;
  proteinGrams: number;
  mealType: string;
  date: string;
}

export interface HydrationUpdateRequest {
  waterIntakeMl: number;
  targetMl?: number;
  notes?: string;
  date: string;
}

// ─── AI meal analysis (Stage 2 clinical assessment schema) ─────────────────

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

export interface MealAnalysisApiResponse {
  mealEntryId: string;
  mealType: string;
  date: string;
  description: string;
  calories: number;
  proteinGrams: number;
  /** AI-generated pastel dish image as a data: URI (null if generation was skipped/failed). */
  imageUrl?: string | null;
  analysis: GeminiAnalysisResult;
}

// ── Meal-analysis job (POST /meals/analyze → poll GET /meals/analyze/{jobId}) ──

export interface MealAnalysisJobStarted {
  jobId: string;
}

export type MealAnalysisJobState = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface MealAnalysisJobStatus {
  status: MealAnalysisJobState;
  result?: MealAnalysisApiResponse;
  /** Pipeline stage that failed (e.g. `gemini-error`, `validation-error`). */
  errorSource?: string;
}

export interface MealAnalysisRequest {
  /** Up to 3 images; extra files are ignored. */
  files: File[];
  description: string | null;
  mealType: string;
  date: string;
}
