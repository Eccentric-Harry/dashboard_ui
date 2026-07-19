// One grade system for the whole nutrition route. Meal quality arrives in
// two formats — words ("excellent"/"fair") on older records, letter grades
// (A/B/C) plus recomposition_assessment.letter_grade on newer ones — so all
// grade badges must go through normalizeMealGrade / gradeFromEntry.
//
// Semantic ramp: A→green, B→lime, C→amber, D→warm orange. Red is reserved
// for HIGH_RISK clinical flags only.

export type MealGrade = {
  letter: 'A' | 'B' | 'C' | 'D'
  label: string
  ink: string
  bg: string
  border: string
}

const GRADES: Record<MealGrade['letter'], MealGrade> = {
  A: { letter: 'A', label: 'Excellent', ink: '#1e7a33', bg: '#e0f4e3', border: '#bde5c3' },
  B: { letter: 'B', label: 'Good', ink: '#5c7519', bg: '#eef6cf', border: '#dcecab' },
  C: { letter: 'C', label: 'Fair', ink: '#96660f', bg: '#faeed3', border: '#f0ddab' },
  D: { letter: 'D', label: 'Poor', ink: '#a3491d', bg: '#fbe4d5', border: '#f2ccb2' },
}

const WORD_TO_LETTER: Record<string, MealGrade['letter']> = {
  excellent: 'A',
  great: 'A',
  good: 'B',
  balanced: 'B',
  fair: 'C',
  average: 'C',
  moderate: 'C',
  poor: 'D',
  bad: 'D',
  unhealthy: 'D',
}

export function normalizeMealGrade(value?: string | null): MealGrade | null {
  if (!value) return null
  const clean = value.trim().toLowerCase()
  if (!clean) return null

  // Letter grades, tolerating suffixes like "A+", "B-", "a grade"
  const letterMatch = /^([a-f])(?:[+-]|\s|$)/.exec(clean)
  if (letterMatch) {
    const letter = letterMatch[1].toUpperCase()
    if (letter === 'A' || letter === 'B' || letter === 'C' || letter === 'D') {
      return GRADES[letter]
    }
    return GRADES.D // E/F collapse into the lowest tier
  }

  const mapped = WORD_TO_LETTER[clean]
  return mapped ? GRADES[mapped] : null
}

/** Best available grade for a food entry: the AI letter grade wins,
 *  then the AI's word grade, then the top-level mealQuality field. */
export function gradeFromEntry(entry: {
  mealQuality?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recomposition_assessment?: Record<string, any>
}): MealGrade | null {
  const assessment = entry.recomposition_assessment
  return (
    normalizeMealGrade(assessment?.letter_grade) ||
    normalizeMealGrade(assessment?.meal_quality) ||
    normalizeMealGrade(entry.mealQuality)
  )
}

// ── Clinical item flags ───────────────────────────────────────────────
// Flags arrive as enum-ish strings from the AI ("HIGH_SUGAR",
// "ANTIINFLAMMATORY"), sometimes with a ":detail" suffix. Each known flag
// maps to a severity + human label; substring matching alone is wrong
// because HIGH_PROTEIN and HIGH_FIBER are positives, and fruit sugar is a
// caution, not a danger. Red is reserved for genuinely risky flags.

export type ClinicalFlagTone = {
  kind: 'high' | 'moderate' | 'info' | 'protective'
  label: string
  detail: string
  ink: string
  bg: string
  border: string
}

const TONES: Record<ClinicalFlagTone['kind'], Pick<ClinicalFlagTone, 'ink' | 'bg' | 'border'>> = {
  high: { ink: '#a02c2c', bg: '#fbe3e0', border: '#f2c5bf' },
  moderate: { ink: '#96660f', bg: '#faeed3', border: '#f0ddab' },
  info: { ink: '#6b7165', bg: '#f2f1ea', border: '#e3e2d8' },
  protective: { ink: '#1e7a33', bg: '#e0f4e3', border: '#bde5c3' },
}

const FLAG_REGISTRY: Record<string, { kind: ClinicalFlagTone['kind']; label: string }> = {
  // Red — genuinely risky regardless of context
  HIGH_TRANS_FAT: { kind: 'high', label: 'Trans fat' },
  ULTRA_PROCESSED: { kind: 'high', label: 'Ultra-processed' },
  HIGH_SODIUM: { kind: 'high', label: 'High sodium' },
  HIGH_SAT_FAT: { kind: 'high', label: 'High saturated fat' },
  // Amber — context-dependent cautions
  HIGH_CHOLESTEROL: { kind: 'moderate', label: 'High cholesterol' },
  HIGH_GI: { kind: 'moderate', label: 'High GI' },
  HIGH_GL: { kind: 'moderate', label: 'High glycaemic load' },
  HIGH_SUGAR: { kind: 'moderate', label: 'High sugar' },
  FREE_SUGAR: { kind: 'moderate', label: 'Added sugar' },
  HIGH_OMEGA6: { kind: 'moderate', label: 'High omega-6' },
  LOW_FIBER: { kind: 'moderate', label: 'Low fiber' },
  ACNE_TRIGGER: { kind: 'moderate', label: 'Acne trigger' },
  // Neutral — informational, not a warning
  INTRINSIC_SUGAR: { kind: 'info', label: 'Natural fruit sugar' },
  // Green — positives
  HIGH_PROTEIN: { kind: 'protective', label: 'High protein' },
  HIGH_FIBER: { kind: 'protective', label: 'High fiber' },
  ANTIINFLAMMATORY: { kind: 'protective', label: 'Anti-inflammatory' },
  ANTI_INFLAMMATORY: { kind: 'protective', label: 'Anti-inflammatory' },
  WHOLE_FOOD: { kind: 'protective', label: 'Whole food' },
  FERMENTED: { kind: 'protective', label: 'Fermented' },
  PROBIOTIC: { kind: 'protective', label: 'Probiotic' },
  NUTRIENT_DENSE: { kind: 'protective', label: 'Nutrient dense' },
}

export function parseClinicalFlag(flag?: string | null): ClinicalFlagTone | null {
  if (!flag) return null
  const [head, ...rest] = flag.split(':')
  const detail = rest.join(':').trim()
  const key = head.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '')

  const known = FLAG_REGISTRY[key]
  if (known) {
    return { kind: known.kind, label: known.label, detail, ...TONES[known.kind] }
  }

  // Fallback heuristic — also handles bare risk words ("high"/"medium"/"low")
  // passed by the health-context badges.
  if (key.includes('HIGH')) {
    return { kind: 'high', label: 'High risk', detail, ...TONES.high }
  }
  if (key.includes('MODERATE') || key.includes('MEDIUM')) {
    return { kind: 'moderate', label: 'Moderate', detail, ...TONES.moderate }
  }
  if (key.includes('PROTECTIVE') || key.includes('LOW')) {
    return { kind: 'protective', label: 'Protective', detail, ...TONES.protective }
  }
  return { kind: 'info', label: head.trim(), detail, ...TONES.info }
}
