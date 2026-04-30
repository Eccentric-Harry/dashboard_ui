import { Plus } from 'lucide-react'
import { foodLogs } from '../data'

const mealColors: Record<string, string> = {
  Breakfast: 'rgba(255, 196, 95, 0.18)',
  Lunch: 'rgba(53, 182, 75, 0.14)',
  Dinner: 'rgba(118, 228, 255, 0.15)',
  Snack: 'rgba(157, 199, 166, 0.2)',
  'Pre-Workout': 'rgba(255, 176, 164, 0.18)',
  'Post-Workout': 'rgba(53, 182, 75, 0.22)',
}

const mealTextColors: Record<string, string> = {
  Breakfast: '#b07000',
  Lunch: '#1f7a34',
  Dinner: '#0d7a99',
  Snack: '#3a6645',
  'Pre-Workout': '#a04030',
  'Post-Workout': '#1f7a34',
}

function FoodLogCard() {
  const totalProtein = foodLogs.reduce((s, l) => s + l.protein, 0)
  const totalCalories = foodLogs.reduce((s, l) => s + l.calories, 0)

  return (
    <section className="nutrition-card nutrition-food-log-card" aria-label="Food log">
      <div className="nutrition-food-log-head">
        <div className="nutrition-section-head compact">
          <div>
            <p>Food Log</p>
            <h2>Today's intake</h2>
          </div>
        </div>
        
        <div className="nutrition-food-log-actions">
          <button type="button" className="nutrition-food-log-add-btn">
            <Plus size={14} strokeWidth={3} />
            Log Food
          </button>
          <div className="nutrition-food-log-totals">
            <div className="total-stat">
              <b>{totalProtein}g</b>
              <small>Protein</small>
            </div>
            <div className="total-stat">
              <b>{totalCalories.toLocaleString()}</b>
              <small>kcal</small>
            </div>
          </div>
        </div>
      </div>

      <div className="nutrition-food-table" role="table" aria-label="Food log entries">
        {/* Header */}
        <div className="nutrition-food-row header" role="row">
          <span role="columnheader">Food</span>
          <span role="columnheader">Meal</span>
          <span role="columnheader">Protein</span>
          <span role="columnheader">Calories</span>
        </div>

        {/* Scrollable list */}
        <div className="nutrition-food-list" role="rowgroup">
          {foodLogs.map(({ id, food, meal, protein, calories, icon: Icon, iconColor }) => (
            <div className="nutrition-food-row" key={id} role="row">
              {/* Food */}
              <div className="nutrition-food-item" role="cell">
                <span style={{ background: `color-mix(in srgb, ${iconColor} 28%, white)` }}>
                  <Icon size={14} />
                </span>
                <b>{food}</b>
              </div>

              {/* Meal badge */}
              <em
                role="cell"
                style={{
                  background: mealColors[meal] ?? 'rgba(20,28,24,0.07)',
                  color: mealTextColors[meal] ?? '#253028',
                }}
              >
                {meal}
              </em>

              {/* Protein */}
              <strong className="nutrition-food-protein" role="cell">{protein}g</strong>

              {/* Calories */}
              <strong className="nutrition-food-cal" role="cell">{calories} kcal</strong>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export { FoodLogCard }
