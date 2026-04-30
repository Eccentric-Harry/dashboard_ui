import { useState } from 'react'

import { calorieSummary, macroNutrients } from '../data'
import { RingProgress } from './ring-progress'

function MacroBalanceCard() {
  const [selectedMacroId, setSelectedMacroId] = useState(macroNutrients[0].id)

  const caloriesRemaining = Math.max(calorieSummary.target - calorieSummary.logged, 0)
  const calorieProgress = Math.round((calorieSummary.logged / calorieSummary.target) * 100)

  return (
    <section className="nutrition-card nutrition-macro-card">
      <div className="nutrition-card-head">
        <div>
          <p>Daily Macro Balance</p>
          <h2>{calorieProgress}% of calories logged</h2>
        </div>
        <span>160 g recovery target</span>
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

    </section>
  )
}

export { MacroBalanceCard }
