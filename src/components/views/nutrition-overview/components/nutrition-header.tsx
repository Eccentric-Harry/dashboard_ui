import { nutritionStatus } from '../data'

function NutritionHeader() {
  return (
    <header className="nutrition-header">
      <div>
        <p>Nutrition Overview</p>
        <h1>Fueling today with intent</h1>
      </div>
      <span>{nutritionStatus.mealWindow}</span>
    </header>
  )
}

export { NutritionHeader }
