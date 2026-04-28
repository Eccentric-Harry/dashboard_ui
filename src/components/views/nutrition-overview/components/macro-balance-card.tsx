import type { CSSProperties } from 'react'
import { useState } from 'react'

import { calorieSummary, macroNutrients, nutritionStatus } from '../data'
import { RingProgress } from './ring-progress'

function MacroBalanceCard() {
  const [selectedMacroId, setSelectedMacroId] = useState(macroNutrients[0].id)
  const selectedMacro = macroNutrients.find((macro) => macro.id === selectedMacroId) ?? macroNutrients[0]

  const caloriesRemaining = Math.max(calorieSummary.target - calorieSummary.logged, 0)
  const selectedRemaining = Math.max(selectedMacro.target - selectedMacro.logged, 0)
  const calorieProgress = Math.round((calorieSummary.logged / calorieSummary.target) * 100)

  return (
    <section className="nutrition-card nutrition-macro-card">
      <div className="nutrition-card-head">
        <div>
          <p>Daily Macro Balance</p>
          <h2>{calorieProgress}% of calories logged</h2>
        </div>
        <span>{nutritionStatus.recoveryTarget}</span>
      </div>

      <div className="nutrition-calorie-summary">
        <div>
          <strong>{calorieSummary.logged.toLocaleString()}</strong>
          <small>{calorieSummary.unit} logged</small>
        </div>
        <div>
          <strong>{caloriesRemaining.toLocaleString()}</strong>
          <small>{calorieSummary.unit} remaining</small>
        </div>
      </div>

      <div className="nutrition-rings" aria-label="Macro progress rings">
        {macroNutrients.map((macro) => (
          <RingProgress
            key={macro.id}
            label={macro.label}
            value={macro.logged}
            target={macro.target}
            unit={macro.unit}
            color={macro.color}
            active={macro.id === selectedMacroId}
            onSelect={() => setSelectedMacroId(macro.id)}
          />
        ))}
      </div>

      <div className="nutrition-selected-macro" style={{ '--macro-soft': selectedMacro.softColor } as CSSProperties}>
        <span>{selectedMacro.label}</span>
        <b>
          {selectedMacro.logged}
          {selectedMacro.unit} logged
        </b>
        <em>
          {selectedRemaining}
          {selectedMacro.unit} remaining
        </em>
        <small>{selectedMacro.calories} kcal from this macro</small>
      </div>

      <p className="nutrition-status-message">{nutritionStatus.message}</p>
    </section>
  )
}

export { MacroBalanceCard }
