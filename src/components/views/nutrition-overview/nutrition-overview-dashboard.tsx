import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Plus } from 'lucide-react'
import { FoodLogCard } from './components/food-log-card'
import { HydrationCard } from './components/hydration-card'
import { MacroBalanceCard } from './components/macro-balance-card'
import { TodaysMealsCard } from './components/todays-meals-card'
import { NutritionHeader } from './components/nutrition-header'
import { ProteinTrendCard } from './components/protein-trend-card'
import { AddFoodModal } from './components/add-food-modal'
import { MealDetailsModal } from './components/meal-details-modal'
import { useDashboard } from '../../../contexts/DashboardContext'
import { fetchFoodEntries } from '../../../lib/api'

import './nutrition-overview.css'
import './nutrition-redesign.css'

type FoodEntry = {
  id?: string
  description?: string
  mealType?: string
  proteinGrams?: number
  calories?: number
  date?: string
  [key: string]: unknown
}

type FoodEntriesResponse = {
  data?: FoodEntry[] | { entries?: FoodEntry[]; foodEntries?: FoodEntry[] }
  entries?: FoodEntry[]
}

const extractEntries = (response: unknown): FoodEntry[] => {
  if (Array.isArray(response)) return response as FoodEntry[]
  const payload = response as FoodEntriesResponse
  if (Array.isArray(payload?.data)) return payload.data
  if (!Array.isArray(payload?.data) && Array.isArray(payload?.data?.entries)) return payload.data.entries
  if (!Array.isArray(payload?.data) && Array.isArray(payload?.data?.foodEntries)) return payload.data.foodEntries
  if (Array.isArray(payload?.entries)) return payload.entries
  return []
}

const readItemParam = () => new URLSearchParams(window.location.search).get('item')

function NutritionOverviewDashboard() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingFood, setEditingFood] = useState<FoodEntry | null>(null)
  const { refetch, data } = useDashboard()

  // ── Immersive detail view, driven by ?item=<id> so the browser
  //    back button and deep links work naturally.
  const [itemId, setItemId] = useState<string | null>(() => readItemParam())
  const [detailEntry, setDetailEntry] = useState<FoodEntry | null>(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const pushedDetailRef = useRef(false)

  useEffect(() => {
    const onPopState = () => {
      const next = readItemParam()
      if (!next) pushedDetailRef.current = false
      setItemId(next)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const openEntry = useCallback((entry: FoodEntry) => {
    if (!entry?.id) return
    setDetailEntry(entry)
    const params = new URLSearchParams(window.location.search)
    params.set('item', entry.id)
    window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`)
    pushedDetailRef.current = true
    setItemId(entry.id)
  }, [])

  const closeDetail = useCallback(() => {
    if (pushedDetailRef.current) {
      // we created this history entry — going back keeps history coherent
      pushedDetailRef.current = false
      window.history.back()
      return
    }
    // deep link with no prior entry: strip the param in place
    const params = new URLSearchParams(window.location.search)
    params.delete('item')
    const qs = params.toString()
    window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : ''))
    setItemId(null)
  }, [])

  // Resolve the entry for the current ?item= id: today's dashboard data
  // first, then the food-entry history (covers deep links & older days).
  const dashboardEntries = data?.health?.foodEntries as FoodEntry[] | undefined
  useEffect(() => {
    if (!itemId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDetailEntry(null)
      return
    }
    if (detailEntry?.id === itemId) return

    const local = (dashboardEntries || []).find((entry) => entry.id === itemId)
    if (local) {
      setDetailEntry(local)
      return
    }

    let active = true
    setIsDetailLoading(true)
    fetchFoodEntries(365)
      .then((response) => {
        if (!active) return
        const entries = extractEntries(response)
        setDetailEntry(entries.find((entry) => entry.id === itemId) || null)
      })
      .catch((error) => console.error('Failed to resolve food entry for detail view', error))
      .finally(() => {
        if (active) setIsDetailLoading(false)
      })
    return () => {
      active = false
    }
  }, [itemId, dashboardEntries, detailEntry?.id])

  const handleSuccess = () => {
    refetch()
  }

  const openAdd = () => setIsAddModalOpen(true)
  const selectedDate = data?.date || new Date().toISOString().split('T')[0]
  const hideDecor = (event: React.SyntheticEvent<HTMLImageElement>) => {
    event.currentTarget.style.display = 'none'
  }

  return (
    <section className="nutrition-dashboard ntr" aria-label="Nutrition overview dashboard">
      {itemId && (
        <div
          className="ntr-detail-overlay-wrapper"
          style={{
            position: 'sticky',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 100,
            background: '#ffffff',
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            borderBottomLeftRadius: '28px',
            borderBottomRightRadius: '28px'
          }}
        >
          <div className="ntr-detail-stage" style={{ minHeight: '100%' }}>
            {detailEntry ? (
              <MealDetailsModal
                open
                onClose={closeDetail}
                entry={detailEntry}
                onEdit={(entry) => {
                  setEditingFood(entry)
                  setIsAddModalOpen(true)
                }}
              />
            ) : (
              <div className="ntr-card ntr-detail-fallback">
                <button type="button" className="ntr-icon-btn" onClick={closeDetail} aria-label="Back to nutrition overview">
                  <ArrowLeft size={16} />
                </button>
                <p>{isDetailLoading ? 'Loading meal details…' : 'Meal not found — it may have been deleted.'}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ visibility: itemId ? 'hidden' : 'visible', pointerEvents: itemId ? 'none' : 'auto' }}>
        <NutritionHeader onAddClick={openAdd} />
        <div className="ntr-grid">
          <MacroBalanceCard />
          <ProteinTrendCard />

          <TodaysMealsCard
            onEdit={(food) => {
              setEditingFood(food)
              setIsAddModalOpen(true)
            }}
            onSelectEntry={openEntry}
          />
          <HydrationCard />

          <FoodLogCard onSelectEntry={openEntry} />
        </div>

        {/* organic floating produce — save PNGs with transparency into
              dashboard_ui/public/assets/decor/ (hidden automatically if absent) */}
        <img src="/assets/decor/broccoli.png" alt="" aria-hidden="true" className="ntr-decor top-right" onError={hideDecor} />
        <img src="/assets/decor/lettuce.png" alt="" aria-hidden="true" className="ntr-decor bottom-left" onError={hideDecor} />

        <button type="button" className="ntr-mobile-fab" onClick={openAdd} aria-label="Add meal">
          <Plus size={22} strokeWidth={2.5} />
        </button>
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
        initialData={
          editingFood
            ? {
              id: editingFood.id,
              description: editingFood.description || '',
              proteinGrams: Number(editingFood.proteinGrams) || 0,
              calories: Number(editingFood.calories) || 0,
              mealType: editingFood.mealType || 'Snack',
              date: editingFood.date || selectedDate,
            }
            : undefined
        }
      />
    </section>
  )
}

export { NutritionOverviewDashboard }
