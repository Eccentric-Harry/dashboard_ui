import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Sparkles, ShieldCheck, ChevronRight } from 'lucide-react'
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

  useEffect(() => {
    if (open) {
      setIsVisible(true)
      setActiveTab('overview')
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300)
      return () => clearTimeout(timer)
    }
  }, [open])

  if (!isVisible && !open) return null
  if (!entry) return null

  const mealType = entry.mealType || 'Snack'
  const description = entry.description || 'Food item'
  const iconDetails = getFoodIconDetails(description, mealType)
  const FoodIcon = iconDetails.icon

  // Safe macro getters supporting both legacy (e.g. protein_g) and new (protein) formats
  const summary = entry.total_summary || {};
  const totalCalories = entry.calories ?? summary.calories_kcal ?? summary.calories ?? 0;
  const totalProtein = entry.proteinGrams ?? summary.protein_g ?? summary.protein ?? 0;
  const totalCarbs = summary.carbs_g ?? summary.carbs ?? 0;
  const totalFat = summary.fats_g ?? summary.fat_g ?? summary.fat ?? 0;
  const totalFiber = summary.fiber_g ?? summary.fiber ?? 0;
  const totalSugar = summary.sugar_g ?? summary.sugar ?? 0;
  const totalSodium = summary.sodium_mg ?? summary.sodium ?? 0;

  // Render risk badge
  const renderRiskBadge = (risk: string) => {
    const clean = (risk || '').toLowerCase()
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
      <span className="severity-badge" style={{ backgroundColor: bg, color, fontSize: '10px', padding: '2px 8px', borderRadius: '999px', fontWeight: 700, textTransform: 'uppercase' }}>
        {risk}
      </span>
    )
  }

  // Parse new two-stage structures
  const assessment = entry.recomposition_assessment || {};
  const medical = entry.acne_impact_assessment || {};
  const medicalList = Array.isArray(medical.medical_analysis) ? medical.medical_analysis : [];

  const strengths = Array.isArray(assessment.strengths) ? assessment.strengths : [];
  const concerns = Array.isArray(assessment.concerns) ? assessment.concerns : [];
  const improvements = Array.isArray(assessment.improvements) ? assessment.improvements : [];
  const hasInsights = strengths.length > 0 || concerns.length > 0 || improvements.length > 0 || medicalList.length > 0;

  return createPortal(
    <div className={`meal-details-modal-backdrop ${open ? 'fade-in' : 'fade-out'}`} onClick={onClose}>
      <div className={`meal-details-modal-popover ${open ? 'slide-up' : 'slide-down'}`} onClick={(e) => e.stopPropagation()} style={{ width: 'min(580px, calc(100vw - 32px))' }}>
        <div className="meal-modal-header">
          <div className="meal-modal-title-area">
            <div className="meal-modal-icon" style={{ background: iconDetails.bg }}>
              <FoodIcon size={22} color={iconDetails.color} />
            </div>
            <div className="meal-modal-title">
              <h2>{description}</h2>
              <p>{mealType} • {entry.date || 'Unknown Date'}</p>
            </div>
          </div>
          <button type="button" className="meal-modal-close" onClick={onClose} aria-label="Close modal">
            <X size={16} />
          </button>
        </div>

        <div className="meal-modal-content">
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
              disabled={!hasInsights}
              style={{ opacity: hasInsights ? 1 : 0.4, cursor: hasInsights ? 'pointer' : 'not-allowed' }}
            >
              AI Insights
            </button>
          </div>

          {/* ─── TAB 1: OVERVIEW ───────────────────────────────────── */}
          {activeTab === 'overview' && (
            <div className="meal-tab-content">
              <div className="meal-macro-summary">
                <div className="macro-stat-box">
                  <span>Calories</span>
                  <strong>{Math.round(totalCalories)} <small style={{ fontSize: '12px', fontWeight: 500 }}>kcal</small></strong>
                </div>
                <div className="macro-stat-box">
                  <span>Protein</span>
                  <strong>{Math.round(totalProtein)}g</strong>
                </div>
                <div className="macro-stat-box">
                  <span>Carbs</span>
                  <strong>{Math.round(totalCarbs)}g</strong>
                </div>
                <div className="macro-stat-box">
                  <span>Fat</span>
                  <strong>{Math.round(totalFat)}g</strong>
                </div>
              </div>

              <div className="nutrition-extra-details">
                <div className="detail-row">
                  <span>Dietary Fiber</span>
                  <strong>{totalFiber.toFixed(1)} g</strong>
                </div>
                <div className="detail-row">
                  <span>Sugar</span>
                  <strong>{totalSugar.toFixed(1)} g</strong>
                </div>
                <div className="detail-row">
                  <span>Sodium</span>
                  <strong>{Math.round(totalSodium)} mg</strong>
                </div>
                {entry.mealQuality && (
                  <div className="detail-row">
                    <span>Meal Quality Verdict</span>
                    <strong style={{ textTransform: 'capitalize', color: entry.mealQuality === 'excellent' || entry.mealQuality === 'good' ? '#35b64b' : '#e8a23a' }}>{entry.mealQuality}</strong>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── TAB 2: ITEMS ──────────────────────────────────────── */}
          {activeTab === 'items' && (
            <div className="meal-items-list" style={{ maxHeight: '340px', overflowY: 'auto' }}>
              {entry.meal_items && entry.meal_items.length > 0 ? (
                entry.meal_items.map((item: any, idx: number) => {
                  const itemKcal = item.calories ?? item.calories_kcal ?? 0;
                  const itemP = item.protein ?? item.protein_g ?? 0;
                  const itemC = item.carbs ?? item.carbs_g ?? 0;
                  const itemF = item.fat ?? item.fats_g ?? 0;
                  const itemFib = item.fiber ?? item.fiber_g ?? 0;
                  return (
                    <div className="meal-item-row-enriched" key={idx} style={{ padding: '12px 14px', border: '1px solid rgba(20,24,22,0.06)', borderRadius: '10px', marginBottom: '8px' }}>
                      <div className="meal-item-header-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700 }}>{item.name}</h4>
                          <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'rgba(16,19,18,0.45)' }}>{item.serving_size}</p>
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(16,19,18,0.7)' }}>
                          {Math.round(itemKcal)} kcal
                        </div>
                      </div>

                      <div className="meal-item-macros-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', fontSize: '11px' }}>
                        <div><span style={{ color: 'rgba(16,19,18,0.45)', display: 'block' }}>Protein</span><strong>{Math.round(itemP)}g</strong></div>
                        <div><span style={{ color: 'rgba(16,19,18,0.45)', display: 'block' }}>Carbs</span><strong>{Math.round(itemC)}g</strong></div>
                        <div><span style={{ color: 'rgba(16,19,18,0.45)', display: 'block' }}>Fat</span><strong>{Math.round(itemF)}g</strong></div>
                        <div><span style={{ color: 'rgba(16,19,18,0.45)', display: 'block' }}>Fiber</span><strong>{Math.round(itemFib)}g</strong></div>
                      </div>

                      {item.confidence && (
                        <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'flex-end' }}>
                          <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '99px', background: 'rgba(20,24,22,0.04)', color: 'rgba(16,19,18,0.6)', fontWeight: 700, textTransform: 'uppercase' }}>
                            {item.confidence} confidence
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <p style={{ textAlign: 'center', color: 'rgba(16,19,18,0.4)', padding: '20px 0' }}>No itemised breakdown available.</p>
              )}
            </div>
          )}

          {/* ─── TAB 3: INSIGHTS ───────────────────────────────────── */}
          {activeTab === 'insights' && (
            <div className="meal-insights-section" style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '340px', overflowY: 'auto', paddingRight: '4px' }}>
              
              {/* Overall Assessment Block */}
              {(strengths.length > 0 || concerns.length > 0 || improvements.length > 0 || assessment.fitness_alignment) && (
                <div style={{ border: '1px solid rgba(20,24,22,0.06)', borderRadius: '12px', padding: '14px', background: 'rgba(20,24,22,0.01)' }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(16,19,18,0.4)' }}>
                    Clinical Assessment
                  </h4>

                  {assessment.fitness_alignment && (
                    <p style={{ fontSize: '13px', margin: '0 0 12px', lineHeight: 1.5, color: 'rgba(16,19,18,0.7)' }}>
                      {assessment.fitness_alignment}
                    </p>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {strengths.map((str: string, i: number) => (
                      <div key={i} style={{ display: 'flex', gap: '8px', fontSize: '12px', color: '#1a5e28', background: 'rgba(53,182,75,0.04)', border: '1px solid rgba(53,182,75,0.12)', padding: '6px 10px', borderRadius: '8px' }}>
                        <Sparkles size={13} style={{ marginTop: '2px', flexShrink: 0 }} />
                        <span>{str}</span>
                      </div>
                    ))}
                    {[...improvements, ...concerns].map((imp: string, i: number) => (
                      <div key={i} style={{ display: 'flex', gap: '8px', fontSize: '12px', color: '#6b4500', background: 'rgba(232,162,58,0.05)', border: '1px solid rgba(232,162,58,0.14)', padding: '6px 10px', borderRadius: '8px' }}>
                        <ChevronRight size={13} style={{ marginTop: '2px', flexShrink: 0 }} />
                        <span>{imp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Health context / Medical alert cards */}
              <div>
                <h4 style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(16,19,18,0.4)' }}>
                  Health Context
                </h4>
                {medicalList.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {medicalList.map((med: any, i: number) => (
                      <div key={i} style={{ border: '1px solid rgba(20,24,22,0.08)', borderRadius: '10px', padding: '10px 12px', background: med.risk === 'high' ? 'rgba(239,68,68,0.02)' : med.risk === 'moderate' ? 'rgba(232,162,58,0.02)' : 'rgba(53,182,75,0.02)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#101312' }}>{med.condition}</span>
                          {renderRiskBadge(med.risk)}
                        </div>
                        {Array.isArray(med.findings) && med.findings.map((finding: string, j: number) => (
                          <p key={j} style={{ fontSize: '11px', color: 'rgba(16,19,18,0.55)', margin: '2px 0 0', lineHeight: 1.4 }}>— {finding}</p>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: 'rgba(53,182,75,0.05)', border: '1px solid rgba(53,182,75,0.18)', borderRadius: '10px', color: '#1a8b30', fontSize: '12px', fontWeight: 600 }}>
                    <ShieldCheck size={16} />
                    <span>All medical and physiological health checks passed.</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
