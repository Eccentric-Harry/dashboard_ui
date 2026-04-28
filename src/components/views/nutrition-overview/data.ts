import type { LucideIcon } from 'lucide-react'
import {
  Apple,
  Bean,
  Beef,
  CupSoda,
  Drumstick,
  Egg,
  GlassWater,
  Milk,
  Pill,
  Salad,
  Sandwich,
  Wheat,
} from 'lucide-react'

export interface CalorieSummary {
  logged: number
  target: number
  unit: string
}

export interface MacroNutrient {
  id: 'protein' | 'carbs' | 'fat'
  label: string
  logged: number
  target: number
  unit: string
  calories: number
  color: string
  softColor: string
}

export interface ProteinTrendPoint {
  day: string
  grams: number
  target: number
}

export interface ProteinSource {
  name: string
  type: 'Complete' | 'Incomplete'
  grams: number
  percentage: number
  icon: LucideIcon
  color: string
}

export interface QuickLogShortcut {
  label: string
  amount: string
  calories: string
  icon: LucideIcon
  tone: string
}

export const calorieSummary: CalorieSummary = {
  logged: 1840,
  target: 2400,
  unit: 'kcal',
}

export const macroNutrients: MacroNutrient[] = [
  {
    id: 'protein',
    label: 'Protein',
    logged: 142,
    target: 180,
    unit: 'g',
    calories: 568,
    color: '#35b64b',
    softColor: 'rgba(53, 182, 75, 0.18)',
  },
  {
    id: 'carbs',
    label: 'Carbs',
    logged: 211,
    target: 275,
    unit: 'g',
    calories: 844,
    color: '#76e4ff',
    softColor: 'rgba(118, 228, 255, 0.18)',
  },
  {
    id: 'fat',
    label: 'Fat',
    logged: 58,
    target: 78,
    unit: 'g',
    calories: 522,
    color: '#ffc45f',
    softColor: 'rgba(255, 196, 95, 0.2)',
  },
]

export const proteinTrend: ProteinTrendPoint[] = [
  { day: 'Mon', grams: 118, target: 160 },
  { day: 'Tue', grams: 146, target: 160 },
  { day: 'Wed', grams: 132, target: 160 },
  { day: 'Thu', grams: 168, target: 160 },
  { day: 'Fri', grams: 154, target: 160 },
  { day: 'Sat', grams: 181, target: 160 },
  { day: 'Sun', grams: 142, target: 160 },
]

export const proteinSources: ProteinSource[] = [
  { name: 'Chicken Breast', type: 'Complete', grams: 54, percentage: 38, icon: Drumstick, color: '#35b64b' },
  { name: 'Greek Yogurt', type: 'Complete', grams: 28, percentage: 20, icon: Milk, color: '#d9ff8a' },
  { name: 'Eggs', type: 'Complete', grams: 22, percentage: 15, icon: Egg, color: '#f4ffe0' },
  { name: 'Lentils', type: 'Incomplete', grams: 24, percentage: 17, icon: Bean, color: '#9dc8a6' },
  { name: 'Whole Wheat', type: 'Incomplete', grams: 14, percentage: 10, icon: Wheat, color: '#d8e2cd' },
]

export const quickLogShortcuts: QuickLogShortcut[] = [
  { label: 'Water Glass', amount: '350 ml', calories: '0 kcal', icon: GlassWater, tone: '#76e4ff' },
  { label: 'Protein Shake', amount: '32 g protein', calories: '180 kcal', icon: CupSoda, tone: '#35b64b' },
  { label: 'Protein Bar', amount: '21 g protein', calories: '230 kcal', icon: Sandwich, tone: '#ffc45f' },
  { label: 'Creatine', amount: '5 g', calories: '0 kcal', icon: Pill, tone: '#f4ffe0' },
  { label: 'Lean Beef', amount: '26 g protein', calories: '240 kcal', icon: Beef, tone: '#ffb0a4' },
  { label: 'Fruit Bowl', amount: '48 g carbs', calories: '210 kcal', icon: Apple, tone: '#9df7a5' },
  { label: 'Salad Bowl', amount: '12 g fiber', calories: '160 kcal', icon: Salad, tone: '#36bd49' },
]

export const nutritionStatus = {
  message: 'Prioritizing protein for optimal performance',
  mealWindow: '2 meals logged',
  recoveryTarget: '160 g recovery target',
}

