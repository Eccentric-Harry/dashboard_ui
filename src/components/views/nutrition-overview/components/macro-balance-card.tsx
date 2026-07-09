import { useMemo, useState } from 'react'
import { UtensilsCrossed } from 'lucide-react'
import { ArcGauge } from './arc-gauge'
import { useDashboard } from '../../../../contexts/DashboardContext'

const goalTones: Record<string, string> = {
  protein: 'tone-lime',
  carbs: 'tone-sky',
  fat: 'tone-apricot',
}

const PROTEIN_TARGET = 100
const CALORIE_TARGET = 2000

type CircularGoal = {
  label: string
  value: number
  target: number
  unit: string
}

function MacroBalanceCard() {
  const { data, isLoading } = useDashboard()

  const dailyFood = data?.health?.dailyFood || { calories: 0, calorieGoal: CALORIE_TARGET }
  const circularGoals = useMemo<CircularGoal[]>(() => data?.health?.circularGoals || [], [data?.health?.circularGoals])
  const foodEntries = useMemo(() => data?.health?.foodEntries || [], [data?.health?.foodEntries])
  const [activeMetric, setActiveMetric] = useState<'calories' | 'protein' | 'carbs' | 'fat'>('calories')

  if (isLoading) {
    return (
      <section className="ntr-card ntr-hero" aria-label="Daily nutrition summary loading">
        <div className="ntr-card-head">
          <div>
            <p className="ntr-eyebrow">Daily Nutrition</p>
            <div className="skeleton-shimmer skeleton-rect" style={{ width: '210px', height: '22px', marginTop: '6px', borderRadius: '6px' }} />
          </div>
        </div>
        <div className="skeleton-shimmer skeleton-rect" style={{ height: '210px', marginTop: '18px', borderRadius: '22px' }} />
      </section>
    )
  }

  const proteinGoal = circularGoals.find((goal) => goal.label === 'Protein')
  const proteinLogged = proteinGoal?.value || 0
  const proteinTarget = proteinGoal?.target || dailyFood.proteinGoalGrams || PROTEIN_TARGET
  const proteinProgress = Math.round((proteinLogged / proteinTarget) * 100) || 0
  const caloriesLogged = Number(dailyFood.calories) || 0
  const caloriesTarget = dailyFood.calorieGoal || circularGoals.find((goal) => goal.label === 'Calories')?.target || CALORIE_TARGET
  const caloriesProgress = Math.round((caloriesLogged / caloriesTarget) * 100) || 0

  const carbsGoal = circularGoals.find((goal) => goal.label === 'Carbs')
  const carbsLogged = carbsGoal?.value || 0
  const carbsTarget = carbsGoal?.target || 252
  const carbsProgress = Math.round((carbsLogged / carbsTarget) * 100) || 0

  const fatGoal = circularGoals.find((goal) => goal.label === 'Fat')
  const fatLogged = fatGoal?.value || 0
  const fatTarget = fatGoal?.target || 59
  const fatProgress = Math.round((fatLogged / fatTarget) * 100) || 0

  const formatPlain = (n: number) => n.toLocaleString()
  const formatGrams = (n: number) => `${n.toLocaleString()}g`
  const metricMap = {
    calories: { value: caloriesLogged, target: caloriesTarget, progress: caloriesProgress, format: formatPlain, centerSub: `of ${caloriesTarget.toLocaleString()} kcal` },
    protein: { value: proteinLogged, target: proteinTarget, progress: proteinProgress, format: formatGrams, centerSub: `of ${proteinTarget}g protein` },
    carbs: { value: carbsLogged, target: carbsTarget, progress: carbsProgress, format: formatGrams, centerSub: `of ${carbsTarget}g carbs` },
    fat: { value: fatLogged, target: fatTarget, progress: fatProgress, format: formatGrams, centerSub: `of ${fatTarget}g fat` },
  }
  const activeGauge = metricMap[activeMetric]
  const isOverBudget = activeMetric === 'calories' && caloriesLogged > caloriesTarget

  return (
    <section className="ntr-card ntr-hero" aria-label="Daily nutrition summary">
      <div className="ntr-card-head">
        <div>
          <p className="ntr-eyebrow">Daily Nutrition</p>
          <h2>{proteinProgress}% of protein goal reached</h2>
        </div>
        <span className="ntr-pill dark">
          <UtensilsCrossed size={12} strokeWidth={2.5} />
          {foodEntries.length} meals
        </span>
      </div>

      <div className="ntr-gauge-panel">
        <div className="ntr-gauge-left">
          <div className="ntr-gauge-wrap">
            <ArcGauge
              value={activeGauge.value}
              target={activeGauge.target}
              format={activeGauge.format}
              centerSub={activeGauge.centerSub}
              over={isOverBudget}
            />
            <span className={`ntr-gauge-badge${isOverBudget ? ' over' : ''}`}>{activeGauge.progress}%</span>
          </div>
        </div>

        {circularGoals.length > 0 && (
          <div className="ntr-hero-macros" aria-label="Daily goals">
            {/* Custom order: Protein, Carbs, Fat */}
            {['Protein', 'Carbs', 'Fat'].map((macroName) => {
              const goal = circularGoals.find(g => g.label === macroName)
              if (!goal) return null
              const metricKey = goal.label.toLowerCase() as 'protein' | 'carbs' | 'fat'
              const isActive = activeMetric === metricKey
              const fillPercent = Math.min(Math.round((goal.value / Math.max(goal.target, 1)) * 100), 100)
              
              return (
                <div
                  key={goal.label}
                  className={`ntr-macro-row ${goalTones[goal.label.toLowerCase()] || ''}${isActive ? ' active' : ''}${metricKey === 'protein' ? ' priority' : ''}`}
                  onClick={() => setActiveMetric(isActive ? 'calories' : metricKey)}
                  style={{ cursor: 'pointer' }}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isActive}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActiveMetric(isActive ? 'calories' : metricKey) }}
                >
                  <div className="ntr-macro-header">
                    <p>{goal.label}</p>
                    <strong>
                      {goal.value.toLocaleString()}
                      <em>/{goal.target.toLocaleString()}{goal.unit}</em>
                    </strong>
                  </div>
                  <span className="ntr-macro-bar" aria-hidden="true">
                    <i style={{ width: `${fillPercent}%` }} />
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

export { MacroBalanceCard }
