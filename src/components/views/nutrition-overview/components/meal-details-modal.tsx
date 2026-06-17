import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Info, AlertTriangle, Activity, Database } from 'lucide-react'
import './meal-details-modal.css'
import { getFoodIconDetails } from './food-icon-helper'

// Assume FoodEntry is imported or defined here (will import from food-log-card or shared types)
export interface MealDetailsModalProps {
  open: boolean
  onClose: () => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  entry: any | null // Typing as any here temporarily to match the enriched FoodEntry
}

export function MealDetailsModal({ open, onClose, entry }: MealDetailsModalProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'items' | 'insights'>('overview')

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsVisible(true)
      setActiveTab('overview')
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300)
      return () => clearTimeout(timer)
    }
  }, [open])

  if (!isVisible && !open) return null
  if (!entry) return null

  const hasRichData = Array.isArray(entry.meal_items) && entry.meal_items.length > 0
  const isLegacy = !hasRichData

  const mealType = entry.mealType || 'Snack'
  const description = entry.description || 'Food item'
  const iconDetails = getFoodIconDetails(description, mealType)
  const FoodIcon = iconDetails.icon

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formatNum = (num: any) => (typeof num === 'number' ? num.toFixed(1) : num || '0')

  const modalContent = (
    <div className={`meal-details-modal-backdrop ${open ? 'fade-in' : 'fade-out'}`} onClick={onClose}>
      <div className={`meal-details-modal-popover ${open ? 'slide-up' : 'slide-down'}`} onClick={(e) => e.stopPropagation()}>
        <div className="meal-modal-header">
          <div className="meal-modal-title-area">
            <div className="meal-modal-icon" style={{ background: iconDetails.bg }}>
              <FoodIcon size={24} color={iconDetails.color} />
            </div>
            <div className="meal-modal-title">
              <h2>{description}</h2>
              <p>
                {mealType} • {entry.date || 'Unknown Date'}
              </p>
            </div>
          </div>
          <button type="button" className="meal-modal-close" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <div className="meal-modal-content">
          {isLegacy ? (
            <div className="meal-legacy-state">
              <Database size={48} strokeWidth={1} />
              <p>This is a legacy entry. Detailed macro and micro nutrient breakdowns were not recorded.</p>
              
              <div className="meal-macro-summary" style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', gap: '2rem' }}>
                <div className="macro-stat-box">
                  <span>Calories</span>
                  <strong>{entry.calories || 0} kcal</strong>
                </div>
                <div className="macro-stat-box">
                  <span>Protein</span>
                  <strong>{entry.proteinGrams || 0}g</strong>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="meal-modal-tabs">
                <button 
                  className={`meal-modal-tab ${activeTab === 'overview' ? 'active' : ''}`}
                  onClick={() => setActiveTab('overview')}
                >
                  Overview
                </button>
                <button 
                  className={`meal-modal-tab ${activeTab === 'items' ? 'active' : ''}`}
                  onClick={() => setActiveTab('items')}
                >
                  Items ({entry.meal_items.length})
                </button>
                <button 
                  className={`meal-modal-tab ${activeTab === 'insights' ? 'active' : ''}`}
                  onClick={() => setActiveTab('insights')}
                >
                  Insights
                </button>
              </div>

              {activeTab === 'overview' && (
                <div className="meal-tab-content">
                  <div className="meal-macro-summary">
                    <div className="macro-stat-box">
                      <span>Calories</span>
                      <strong>{formatNum(entry.total_summary?.calories_kcal)}</strong>
                    </div>
                    <div className="macro-stat-box">
                      <span>Protein</span>
                      <strong>{formatNum(entry.total_summary?.protein_g)}g</strong>
                    </div>
                    <div className="macro-stat-box">
                      <span>Carbs</span>
                      <strong>{formatNum(entry.total_summary?.carbs_g)}g</strong>
                    </div>
                    <div className="macro-stat-box">
                      <span>Fats</span>
                      <strong>{formatNum(entry.total_summary?.fats_g)}g</strong>
                    </div>
                  </div>
                  
                  {entry.analysis_metadata && (
                    <div className="insight-card" style={{ marginTop: '1rem' }}>
                      <Activity size={18} className="insight-icon" style={{ color: '#a855f7' }} />
                      <div className="insight-content">
                        <h4>Analysis Metadata</h4>
                        <p>Confidence: <strong>{entry.analysis_metadata.overall_confidence}</strong></p>
                        <p>Detected Type: <strong>{entry.analysis_metadata.meal_type_detected}</strong></p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'items' && (
                <div className="meal-items-list">
                  {entry.meal_items.map((item: { name: string, serving_size: string, calories_kcal: number, protein_g: number, carbs_g: number, fats_g: number }, idx: number) => (
                    <div className="meal-item-row" key={idx}>
                      <div className="meal-item-info">
                        <h4>{item.name}</h4>
                        <p>{item.serving_size}</p>
                      </div>
                      <div className="meal-item-macros">
                        <div className="meal-item-macro">
                          <span>Kcal</span>
                          <strong>{formatNum(item.calories_kcal)}</strong>
                        </div>
                        <div className="meal-item-macro">
                          <span>Pro</span>
                          <strong>{formatNum(item.protein_g)}g</strong>
                        </div>
                        <div className="meal-item-macro">
                          <span>Carb</span>
                          <strong>{formatNum(item.carbs_g)}g</strong>
                        </div>
                        <div className="meal-item-macro">
                          <span>Fat</span>
                          <strong>{formatNum(item.fats_g)}g</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'insights' && (
                <div className="meal-insights-section">
                  {entry.technical_diagnostic && (
                    <div className="insight-card">
                      <Info size={18} className="insight-icon" />
                      <div className="insight-content">
                        <h4>Technical Diagnostic</h4>
                        <p>Recovery Score: {entry.technical_diagnostic.recovery_score}</p>
                        {entry.technical_diagnostic.suggested_additions && (
                          <p>Suggested: {entry.technical_diagnostic.suggested_additions}</p>
                        )}
                        {entry.technical_diagnostic.top_3_micronutrient_gaps && entry.technical_diagnostic.top_3_micronutrient_gaps.length > 0 && (
                          <>
                            <p style={{ marginTop: '0.5rem' }}>Top Micronutrient Gaps:</p>
                            <ul>
                              {entry.technical_diagnostic.top_3_micronutrient_gaps.map((gap: string, i: number) => (
                                <li key={i}>{gap}</li>
                              ))}
                            </ul>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {entry.gaps_and_warnings && entry.gaps_and_warnings.length > 0 && (
                    <div className="insight-card warning">
                      <AlertTriangle size={18} className="insight-icon" />
                      <div className="insight-content">
                        <h4>Warnings & Gaps</h4>
                        <ul>
                          {entry.gaps_and_warnings.map((warning: string, i: number) => (
                            <li key={i}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                  
                  {(!entry.technical_diagnostic && (!entry.gaps_and_warnings || entry.gaps_and_warnings.length === 0)) && (
                    <p style={{ textAlign: 'center', color: '#64748b', padding: '2rem 0' }}>No insights or warnings generated for this meal.</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
