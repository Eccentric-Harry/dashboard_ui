import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { 
  X, Info, AlertTriangle, Activity, Database, 
  Sparkles, Heart, PlusCircle, ChevronRight
} from 'lucide-react'
import './meal-details-modal.css'
import { getFoodIconDetails } from './food-icon-helper'

export interface MealDetailsModalProps {
  open: boolean
  onClose: () => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  entry: any | null
}

export function MealDetailsModal({ open, onClose, entry }: MealDetailsModalProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'items' | 'insights'>('overview')
  const [insightSubTab, setInsightSubTab] = useState<'skin' | 'recomp' | 'satiety' | 'warnings'>('skin')

  useEffect(() => {
    if (open) {
      setIsVisible(true)
      setActiveTab('overview')
      setInsightSubTab('skin')
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300)
      return () => clearTimeout(timer)
    }
  }, [open])

  if (!isVisible && !open) return null
  if (!entry) return null

  // Has rich data if we have meal items or any rich assessment fields
  const hasRichData = (Array.isArray(entry.meal_items) && entry.meal_items.length > 0) || 
                      !!entry.acne_impact_assessment || 
                      !!entry.recomposition_assessment
  const isLegacy = !hasRichData

  const mealType = entry.mealType || 'Snack'
  const description = entry.description || 'Food item'
  const iconDetails = getFoodIconDetails(description, mealType)
  const FoodIcon = iconDetails.icon

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formatNum = (num: any) => (typeof num === 'number' ? num.toFixed(1) : num || '0')

  // Render severity badge
  const renderSeverityBadge = (severity: string) => {
    const clean = (severity || '').toLowerCase()
    let bg = '#f1f5f9'
    let color = '#475569'
    if (clean === 'high') {
      bg = '#fee2e2'
      color = '#ef4444'
    } else if (clean === 'moderate' || clean === 'medium' || clean === 'elevated') {
      bg = '#fef3c7'
      color = '#d97706'
    } else if (clean === 'low' || clean === 'healthy') {
      bg = '#dcfce7'
      color = '#10b981'
    }
    return (
      <span className="severity-badge" style={{ backgroundColor: bg, color }}>
        {severity}
      </span>
    )
  }

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
                  Items ({entry.meal_items?.length || 0})
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

                  {entry.total_summary && (
                    <div className="nutrition-extra-details">
                      <div className="detail-row">
                        <span>Fiber</span>
                        <strong>{formatNum(entry.total_summary.fiber_g)} g</strong>
                      </div>
                      <div className="detail-row">
                        <span>Sugar</span>
                        <strong>{formatNum(entry.total_summary.sugar_g)} g</strong>
                      </div>
                      <div className="detail-row">
                        <span>Sodium</span>
                        <strong>{formatNum(entry.total_summary.sodium_mg)} mg</strong>
                      </div>
                      <div className="detail-row">
                        <span>Saturated Fat</span>
                        <strong>{formatNum(entry.total_summary.saturated_fat_g)} g</strong>
                      </div>
                    </div>
                  )}
                  
                  {entry.analysis_metadata && (
                    <div className="insight-card" style={{ marginTop: '1rem' }}>
                      <Activity size={18} className="insight-icon" style={{ color: '#a855f7' }} />
                      <div className="insight-content">
                        <h4>Analysis Metadata</h4>
                        <p>Confidence: <strong>{entry.analysis_metadata.overall_confidence}</strong></p>
                        <p>Detected Type: <strong>{entry.analysis_metadata.meal_type_detected}</strong></p>
                        {entry.analysis_metadata.confidence_notes && (
                          <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>
                            {entry.analysis_metadata.confidence_notes}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'items' && (
                <div className="meal-items-list">
                  {entry.meal_items?.map((item: any, idx: number) => (
                    <div className="meal-item-row-enriched" key={idx}>
                      <div className="meal-item-header-row">
                        <div>
                          <h4>{item.name}</h4>
                          <p className="item-source-badge">{item.serving_size} • {item.data_source || 'Recipe estimate'}</p>
                        </div>
                        <div className="meal-item-calories-badge">
                          <strong>{formatNum(item.calories_kcal)}</strong> kcal
                        </div>
                      </div>

                      <div className="meal-item-macros-grid">
                        <div><span>Protein</span><strong>{formatNum(item.protein_g)}g</strong></div>
                        <div><span>Carbs</span><strong>{formatNum(item.carbs_g)}g</strong></div>
                        <div><span>Fat</span><strong>{formatNum(item.fats_g)}g</strong></div>
                        <div><span>Fiber</span><strong>{formatNum(item.fiber_g)}g</strong></div>
                      </div>

                      {(item.acne_flags?.dairy_present || item.acne_flags?.high_gi_risk || item.acne_flags?.omega6_concern) && (
                        <div className="item-acne-flags">
                          {item.acne_flags.dairy_present && <span className="acne-tag dairy">Dairy ({item.acne_flags.dairy_type || 'present'})</span>}
                          {item.acne_flags.high_gi_risk && <span className="acne-tag gi">High GI Risk</span>}
                          {item.acne_flags.omega6_concern && <span className="acne-tag omega6">High Omega-6</span>}
                        </div>
                      )}

                      {item.acne_flags?.anti_acne_positives && item.acne_flags.anti_acne_positives.length > 0 && (
                        <div className="item-anti-acne-positives">
                          <Sparkles size={12} className="text-emerald-500" />
                          <span>Skin Positives: {item.acne_flags.anti_acne_positives.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'insights' && (
                <div className="meal-insights-section">
                  {/* Insights Subtabs */}
                  <div className="meal-insights-subtabs">
                    <button 
                      type="button"
                      className={`meal-insights-subtab ${insightSubTab === 'skin' ? 'active' : ''}`}
                      onClick={() => setInsightSubTab('skin')}
                    >
                      Skin & Acne
                    </button>
                    <button 
                      type="button"
                      className={`meal-insights-subtab ${insightSubTab === 'recomp' ? 'active' : ''}`}
                      onClick={() => setInsightSubTab('recomp')}
                    >
                      Recomp
                    </button>
                    <button 
                      type="button"
                      className={`meal-insights-subtab ${insightSubTab === 'satiety' ? 'active' : ''}`}
                      onClick={() => setInsightSubTab('satiety')}
                    >
                      Satiety & Balance
                    </button>
                    <button 
                      type="button"
                      className={`meal-insights-subtab ${insightSubTab === 'warnings' ? 'active' : ''}`}
                      onClick={() => setInsightSubTab('warnings')}
                    >
                      Warnings ({(entry.gaps_and_warnings?.length || 0) + (entry.technical_diagnostic ? 1 : 0)})
                    </button>
                  </div>

                  {/* SUBTAB 1: Skin & Acne */}
                  {insightSubTab === 'skin' && (
                    <div className="insight-subtab-content animate-fade-in">
                      {entry.acne_impact_assessment ? (
                        <div className="rich-diagnostic-card">
                          <div className="assessment-card-header">
                            <span className="card-label">Acne Risk Assessment</span>
                            {renderSeverityBadge(entry.acne_impact_assessment.overall_acne_risk)}
                          </div>
                          
                          <div className="skin-verdict-box">
                            <Heart size={16} className="heart-icon-skin" />
                            <p className="skin-verdict-text">{entry.acne_impact_assessment.skin_verdict}</p>
                          </div>

                          <p className="description-text">{entry.acne_impact_assessment.overall_acne_risk_reason}</p>

                          <div className="diagnostic-grid">
                            <div className="grid-item">
                              <span className="grid-label">Glycemic Load (GL)</span>
                              <div className="flex-value">
                                <strong>{formatNum(entry.acne_impact_assessment.glycemic_load_total)}</strong>
                                {renderSeverityBadge(entry.acne_impact_assessment.glycemic_load_verdict)}
                              </div>
                              {entry.acne_impact_assessment.insulin_spike_risk && (
                                <p className="grid-subtext">Insulin Spike Risk: <strong>{entry.acne_impact_assessment.insulin_spike_risk}</strong></p>
                              )}
                              {entry.acne_impact_assessment.insulin_spike_drivers && entry.acne_impact_assessment.insulin_spike_drivers.length > 0 && (
                                <p className="grid-subtext text-rose-500">Drivers: {entry.acne_impact_assessment.insulin_spike_drivers.join(', ')}</p>
                              )}
                            </div>

                            <div className="grid-item">
                              <span className="grid-label">Omega-6 to Omega-3 Ratio</span>
                              <div className="flex-value">
                                <strong>{entry.acne_impact_assessment.omega6_to_omega3_ratio_meal ? `${formatNum(entry.acne_impact_assessment.omega6_to_omega3_ratio_meal)}:1` : 'Unknown'}</strong>
                                {renderSeverityBadge(entry.acne_impact_assessment.omega_ratio_verdict)}
                              </div>
                              <p className="grid-subtext">Target: &lt;4:1</p>
                            </div>

                            <div className="grid-item">
                              <span className="grid-label">Saturated Fat</span>
                              <div className="flex-value">
                                <strong>{formatNum(entry.acne_impact_assessment.saturated_fat_total_g)}g</strong>
                                {renderSeverityBadge(entry.acne_impact_assessment.saturated_fat_verdict)}
                              </div>
                              <p className="grid-subtext">Limit: 12g per meal</p>
                            </div>

                            {entry.acne_impact_assessment.dairy_summary && (
                              <div className="grid-item full-width">
                                <span className="grid-label">Dairy Summary</span>
                                <p className="dairy-summary-text">{entry.acne_impact_assessment.dairy_summary}</p>
                              </div>
                            )}
                          </div>

                          {entry.acne_impact_assessment.anti_acne_credits && entry.acne_impact_assessment.anti_acne_credits.length > 0 && (
                            <div className="skin-positives-container">
                              <h5><Sparkles size={14} className="text-emerald-500 mr-1" /> Skin-Positive Elements</h5>
                              <ul>
                                {entry.acne_impact_assessment.anti_acne_credits.map((credit: string, idx: number) => (
                                  <li key={idx}>{credit}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="no-rich-data-msg">No Acne Impact details available for this log.</p>
                      )}
                    </div>
                  )}

                  {/* SUBTAB 2: Muscle & Recomposition */}
                  {insightSubTab === 'recomp' && (
                    <div className="insight-subtab-content animate-fade-in">
                      {entry.recomposition_assessment ? (
                        <div className="rich-diagnostic-card">
                          <div className="assessment-card-header">
                            <span className="card-label">Muscle Support Score</span>
                            <div className="score-badge">
                              <strong>{entry.recomposition_assessment.muscle_support_score}</strong>/10
                            </div>
                          </div>

                          <div className="visual-gauge-container">
                            <div 
                              className="visual-gauge-bar" 
                              style={{ width: `${(parseFloat(entry.recomposition_assessment.muscle_support_score) || 0) * 10}%` }}
                            />
                          </div>

                          <p className="description-text mb-4">{entry.recomposition_assessment.muscle_support_reason}</p>

                          <div className="diagnostic-grid">
                            <div className="grid-item">
                              <span className="grid-label">Fat Loss Alignment</span>
                              <div className="flex-value">
                                <strong style={{ textTransform: 'capitalize' }}>{entry.recomposition_assessment.fat_loss_alignment}</strong>
                                {renderSeverityBadge(entry.recomposition_assessment.fat_loss_alignment === 'good' ? 'low' : entry.recomposition_assessment.fat_loss_alignment === 'neutral' ? 'moderate' : 'high')}
                              </div>
                              <p className="grid-subtext mt-1">{entry.recomposition_assessment.fat_loss_reason}</p>
                            </div>

                            <div className="grid-item">
                              <span className="grid-label">Protein Target (per meal)</span>
                              <div className="flex-value">
                                <strong>{formatNum(entry.recomposition_assessment.protein_this_meal_g)}g</strong>
                                <span className="slash-target">/ {entry.recomposition_assessment.protein_per_meal_target || '35-40g'}</span>
                              </div>
                              {entry.recomposition_assessment.protein_gap_g > 0 ? (
                                <p className="grid-subtext text-rose-500">Protein Gap: <strong>{formatNum(entry.recomposition_assessment.protein_gap_g)}g</strong></p>
                              ) : (
                                <p className="grid-subtext text-emerald-500">Target hit!</p>
                              )}
                            </div>

                            <div className="grid-item full-width">
                              <span className="grid-label">Leucine Trigger Level</span>
                              <div className="flex-value">
                                <strong style={{ textTransform: 'capitalize' }}>{entry.recomposition_assessment.leucine_adequacy}</strong>
                                {renderSeverityBadge(entry.recomposition_assessment.leucine_adequacy === 'sufficient' ? 'low' : entry.recomposition_assessment.leucine_adequacy === 'borderline' ? 'moderate' : 'high')}
                              </div>
                              <p className="grid-subtext mt-1">Leucine initiates muscle protein synthesis.</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="no-rich-data-msg">No Recomposition details available for this log.</p>
                      )}
                    </div>
                  )}

                  {/* SUBTAB 3: Satiety & Balance */}
                  {insightSubTab === 'satiety' && (
                    <div className="insight-subtab-content animate-fade-in">
                      {entry.satiety_and_energy_profile && (
                        <div className="rich-diagnostic-card">
                          <div className="assessment-card-header">
                            <span className="card-label">Satiety Score</span>
                            <div className="score-badge">
                              <strong>{entry.satiety_and_energy_profile.satiety_score}</strong>/10
                            </div>
                          </div>
                          
                          <p className="description-text mb-4">{entry.satiety_and_energy_profile.satiety_reason}</p>

                          <div className="diagnostic-grid">
                            <div className="grid-item">
                              <span className="grid-label">Expected Hunger Return</span>
                              <strong>{entry.satiety_and_energy_profile.expected_hunger_return}</strong>
                            </div>

                            <div className="grid-item">
                              <span className="grid-label">Energy Crash Risk</span>
                              <div className="flex-value">
                                <strong style={{ textTransform: 'capitalize' }}>{entry.satiety_and_energy_profile.energy_crash_risk}</strong>
                                {renderSeverityBadge(entry.satiety_and_energy_profile.energy_crash_risk)}
                              </div>
                            </div>

                            <div className="grid-item">
                              <span className="grid-label">Digestion Speed</span>
                              <strong>{entry.satiety_and_energy_profile.digestion_speed}</strong>
                            </div>

                            <div className="grid-item">
                              <span className="grid-label">Best Timing</span>
                              <span className="timing-text">{entry.satiety_and_energy_profile.best_timing_for_this_meal}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {entry.nutritional_balance_diagnostic && (
                        <div className="rich-diagnostic-card" style={{ marginTop: '1rem' }}>
                          <div className="assessment-card-header">
                            <span className="card-label">Nutritional Balance Diagnostic</span>
                            <div className="score-badge font-semibold text-pine">
                              {entry.nutritional_balance_diagnostic.balance_score}
                            </div>
                          </div>
                          
                          <p className="description-text mb-4">{entry.nutritional_balance_diagnostic.balance_score_reasoning}</p>

                          <div className="macronutrient-qualities">
                            <div className="macro-quality-item">
                              <span className="macro-tag-label bg-emerald-50 text-emerald-700">Protein</span>
                              <p>{entry.nutritional_balance_diagnostic.protein_quality_assessment}</p>
                            </div>
                            <div className="macro-quality-item">
                              <span className="macro-tag-label bg-amber-50 text-amber-700">Fats</span>
                              <p>{entry.nutritional_balance_diagnostic.fat_quality_assessment}</p>
                            </div>
                            <div className="macro-quality-item">
                              <span className="macro-tag-label bg-sky-50 text-sky-700">Carbs</span>
                              <p>{entry.nutritional_balance_diagnostic.carb_quality_assessment}</p>
                            </div>
                          </div>

                          {/* Gaps and Strengths */}
                          <div className="micronutrient-analysis-section">
                            {entry.nutritional_balance_diagnostic.top_3_micronutrient_gaps && 
                             entry.nutritional_balance_diagnostic.top_3_micronutrient_gaps.length > 0 && (
                              <div className="micro-block gaps">
                                <h5>Micro Gaps</h5>
                                <div className="micro-rows">
                                  {entry.nutritional_balance_diagnostic.top_3_micronutrient_gaps.map((gap: any, idx: number) => (
                                    <div className="micro-row" key={idx}>
                                      <div className="micro-row-info">
                                        <span className="micro-name">{gap.nutrient}</span>
                                        <span className="micro-amount">{gap.this_meal_estimate} vs {gap.daily_target}</span>
                                      </div>
                                      <div className="micro-row-progress-container">
                                        <div className="micro-row-progress-bar bg-rose-500" style={{ width: `${Math.min(100, gap.gap_pct || 0)}%` }} />
                                        <span className="micro-pct">-{Math.round(gap.gap_pct || 0)}%</span>
                                      </div>
                                      {gap.acne_link && <p className="micro-acne-link">Skin Link: {gap.acne_link}</p>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {entry.nutritional_balance_diagnostic.top_3_micronutrient_strengths && 
                             entry.nutritional_balance_diagnostic.top_3_micronutrient_strengths.length > 0 && (
                              <div className="micro-block strengths">
                                <h5>Micro Strengths</h5>
                                <div className="micro-rows">
                                  {entry.nutritional_balance_diagnostic.top_3_micronutrient_strengths.map((str: any, idx: number) => (
                                    <div className="micro-strength-item" key={idx}>
                                      <strong>{str.nutrient} ({str.amount})</strong>
                                      <p>{str.why_good}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Additions & Swaps */}
                          {entry.nutritional_balance_diagnostic.suggested_additions && 
                           entry.nutritional_balance_diagnostic.suggested_additions.length > 0 && (
                            <div className="balance-suggestions-block">
                              <h5>Suggested Additions</h5>
                              <div className="suggestions-cards">
                                {entry.nutritional_balance_diagnostic.suggested_additions.map((addition: any, idx: number) => (
                                  <div className="suggestion-item-card" key={idx}>
                                    <div className="item-card-header">
                                      <PlusCircle size={14} className="text-emerald-500 mr-1" />
                                      <span className="addition-title">{addition.food}</span>
                                      <span className="effort-badge">{addition.effort} effort</span>
                                    </div>
                                    <p>{addition.reason}</p>
                                    {addition.acne_benefit && (
                                      <p className="acne-benefit-text"><Sparkles size={11} className="mr-1 text-emerald-500" /> {addition.acne_benefit}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {entry.nutritional_balance_diagnostic.swap_suggestions && 
                           entry.nutritional_balance_diagnostic.swap_suggestions.length > 0 && (
                            <div className="balance-suggestions-block">
                              <h5>Suggested Swaps</h5>
                              <div className="suggestions-cards">
                                {entry.nutritional_balance_diagnostic.swap_suggestions.map((swap: any, idx: number) => (
                                  <div className="suggestion-item-card swap-card" key={idx}>
                                    <div className="swap-details">
                                      <span className="swap-out-label">{swap.swap_out}</span>
                                      <ChevronRight size={14} className="mx-2 text-slate-400" />
                                      <span className="swap-in-label">{swap.swap_in}</span>
                                    </div>
                                    <p className="swap-benefit">{swap.benefit}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* SUBTAB 4: Warnings & Gaps */}
                  {insightSubTab === 'warnings' && (
                    <div className="insight-subtab-content animate-fade-in">
                      {entry.gaps_and_warnings && entry.gaps_and_warnings.length > 0 ? (
                        <div className="warnings-list">
                          {entry.gaps_and_warnings.map((warning: any, i: number) => {
                            // Support both legacy String lists and new Object lists
                            if (typeof warning === 'string') {
                              return (
                                <div className="insight-card warning" key={i}>
                                  <AlertTriangle size={18} className="insight-icon" />
                                  <div className="insight-content">
                                    <p>{warning}</p>
                                  </div>
                                </div>
                              )
                            }
                            
                            // Structured warning object
                            return (
                              <div className={`rich-warning-card severity-${(warning.severity || 'low').toLowerCase()}`} key={i}>
                                <div className="warning-card-header">
                                  <div className="warning-title-block">
                                    <AlertTriangle size={16} className="warning-icon" />
                                    <h4>{warning.issue}</h4>
                                  </div>
                                  <div className="warning-badge-block">
                                    {warning.acne_relevant && <span className="warning-acne-badge">Acne Relevant</span>}
                                    {renderSeverityBadge(warning.severity)}
                                  </div>
                                </div>
                                
                                <p className="warning-matters"><strong>Why it matters:</strong> {warning.why_it_matters}</p>
                                
                                {warning.fix && (
                                  <div className="warning-fix-block">
                                    <span className="fix-label">Suggested Fix:</span>
                                    <p>{warning.fix}</p>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      ) : null}

                      {entry.technical_diagnostic && (
                        <div className="insight-card info-card" style={{ marginTop: entry.gaps_and_warnings?.length ? '1rem' : '0' }}>
                          <Info size={18} className="insight-icon" style={{ color: '#0284c7' }} />
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
                                  {entry.technical_diagnostic.top_3_micronutrient_gaps.map((gap: string, idx: number) => (
                                    <li key={idx}>{gap}</li>
                                  ))}
                                </ul>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {(!entry.technical_diagnostic && (!entry.gaps_and_warnings || entry.gaps_and_warnings.length === 0)) && (
                        <p className="no-rich-data-msg">No insights or warnings generated for this meal.</p>
                      )}
                    </div>
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

