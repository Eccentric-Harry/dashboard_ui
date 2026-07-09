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

// ── Clinical item flags (HIGH_RISK / MODERATE_RISK / PROTECTIVE) ──────
// These are the only place warm red appears in the grade system.

export type ClinicalFlagTone = {
  kind: 'high' | 'moderate' | 'protective'
  label: string
  detail: string
  ink: string
  bg: string
  border: string
}

export function parseClinicalFlag(flag?: string | null): ClinicalFlagTone | null {
  if (!flag) return null
  const [head, ...rest] = flag.split(':')
  const detail = rest.join(':').trim()
  const key = head.trim().toUpperCase()

  if (key.includes('HIGH')) {
    return { kind: 'high', label: 'High risk', detail, ink: '#a02c2c', bg: '#fbe3e0', border: '#f2c5bf' }
  }
  if (key.includes('MODERATE') || key.includes('MEDIUM')) {
    return { kind: 'moderate', label: 'Moderate', detail, ink: '#96660f', bg: '#faeed3', border: '#f0ddab' }
  }
  if (key.includes('PROTECTIVE') || key.includes('LOW')) {
    return { kind: 'protective', label: 'Protective', detail, ink: '#1e7a33', bg: '#e0f4e3', border: '#bde5c3' }
  }
  return { kind: 'moderate', label: head.trim(), detail, ink: '#6b7165', bg: '#f2f1ea', border: '#e3e2d8' }
}
