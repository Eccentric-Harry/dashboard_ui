import { FoodLogCard } from './components/food-log-card'
import { HydrationCard } from './components/hydration-card'
import { MacroBalanceCard } from './components/macro-balance-card'
import { NutritionHeader } from './components/nutrition-header'
import { ProteinTrendCard } from './components/protein-trend-card'
import { AddFoodModal } from './components/add-food-modal'
import { useState } from 'react'
import { useDashboard } from '../../../contexts/DashboardContext'

import './nutrition-overview.css'

function NutritionOverviewDashboard() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingFood, setEditingFood] = useState<any>(null)
  const { refetch, data } = useDashboard()
  
  const handleSuccess = () => {
    refetch()
  }

  const selectedDate = data?.date || new Date().toISOString().split('T')[0]

  return (
    <section className="nutrition-dashboard" aria-label="Nutrition overview dashboard">
      <NutritionHeader onAddClick={() => setIsAddModalOpen(true)} />
      <div className="nutrition-dashboard-grid">
        <MacroBalanceCard onEdit={(food) => {
          setEditingFood(food)
          setIsAddModalOpen(true)
        }} />
        <ProteinTrendCard />
        <HydrationCard />
        <FoodLogCard />
      </div>

      <AddFoodModal 
        isOpen={isAddModalOpen} 
        onClose={() => {
          setIsAddModalOpen(false)
          setEditingFood(null)
        }} 
        onSuccess={handleSuccess} 
        selectedDate={selectedDate}
        isEdit={!!editingFood}
        initialData={editingFood}
      />
    </section>
  )
}

export { NutritionOverviewDashboard }
