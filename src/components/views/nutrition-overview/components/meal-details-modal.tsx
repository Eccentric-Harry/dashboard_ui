import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Lightbulb,
  Check,
  Flame,
  Bean,
  Wheat,
  Droplets,
  Pencil,
  Activity,
  EyeOff,
} from 'lucide-react'
import './meal-details-modal.css'
import { getFoodImage } from './food-image-helper'
import { gradeFromEntry, parseClinicalFlag } from './meal-grade'

export interface MealDetailsModalProps {
  open: boolean
  onClose: () => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  entry: any | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onEdit?: (entry: any) => void
}

const DESCRIPTION_CLAMP = 96

// GL bands follow the standard classification: low <10, medium 10–19, high ≥20
const GL_SCALE_MAX = 30

const glBand = (gl: number) => {
  if (gl >= 20) return { label: 'High', ink: '#a3491d', bg: '#fbe4d5' }
  if (gl >= 10) return { label: 'Medium', ink: '#96660f', bg: '#faeed3' }
  return { label: 'Low', ink: '#1e7a33', bg: '#e0f4e3' }
}

export function MealDetailsModal({ open, onClose, entry, onEdit }: MealDetailsModalProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'items' | 'insights'>('overview')
  const [descExpanded, setDescExpanded] = useState(false)

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsVisible(true)
      setActiveTab('overview')
      setDescExpanded(false)
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300)
      return () => clearTimeout(timer)
    }
  }, [open])

  if (!isVisible && !open) return null
  if (!entry) return null

  const mealType = entry.mealType || 'Snack'
  const description = entry.description || 'Food item'
  const heroImage = getFoodImage(description, mealType)
  const grade = gradeFromEntry(entry)

  const isLongDescription = description.length > DESCRIPTION_CLAMP
  const shownDescription =
    !isLongDescription || descExpanded ? description : `${description.slice(0, DESCRIPTION_CLAMP).trimEnd()}…`

  // Safe macro getters supporting both legacy and new formats
  const summary = entry.total_summary || {}
  const totalCalories = entry.calories ?? summary.calories_kcal ?? summary.calories ?? 0
  const totalProtein = entry.proteinGrams ?? summary.protein_g ?? summary.protein ?? 0
  const totalCarbs = summary.carbs_g ?? summary.carbs ?? 0
  const totalFat = summary.fats_g ?? summary.fat_g ?? summary.fat ?? 0
  const totalFiber = summary.fiber_g ?? summary.fiber ?? 0
  const totalSugar = summary.sugar_g ?? summary.sugar ?? 0
  const totalSodium = summary.sodium_mg ?? summary.sodium ?? 0

  const assessment = entry.recomposition_assessment || {}
  const acneAssessment = entry.acne_impact_assessment || {}
  const healthAnalysis = entry.health_analysis || {}
  const medicalList = [
    ...(Array.isArray(acneAssessment.medical_analysis) ? acneAssessment.medical_analysis : []),
    ...(Array.isArray(healthAnalysis.medical_analysis) ? healthAnalysis.medical_analysis : []),
  ]
  const glycaemic = acneAssessment.glycaemic_assessment || healthAnalysis.glycaemic_assessment || null
  const glValue = Number(glycaemic?.total_meal_glycaemic_load)
  const hasGl = Number.isFinite(glValue)

  const strengths = Array.isArray(assessment.strengths) ? assessment.strengths : []
  const concerns = Array.isArray(assessment.concerns) ? assessment.concerns : []
  const improvements = Array.isArray(assessment.improvements) ? assessment.improvements : []
  const overallScore = Number(assessment.overall_score)
  const hasScore = Number.isFinite(overallScore)
  const hasInsights =
    strengths.length > 0 || concerns.length > 0 || improvements.length > 0 || medicalList.length > 0

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const visibleItems = (Array.isArray(entry.meal_items) ? entry.meal_items : []).filter((item: any) => !item?.is_hidden)

  const renderRiskBadge = (risk: string) => {
    const tone = parseClinicalFlag(`${risk}:`)
    if (!tone) return null
    return (
      <span
        className="ntr-risk-badge"
        style={{ backgroundColor: tone.bg, color: tone.ink, border: `1px solid ${tone.border}` }}
      >
        {risk}
      </span>
    )
  }

  const macroChips = [
    { icon: Flame, label: 'Kcal', value: Math.round(totalCalories).toLocaleString(), tone: 'kcal' },
    { icon: Bean, label: 'Protein', value: `${Math.round(totalProtein)}g`, tone: 'protein' },
    { icon: Wheat, label: 'Carbs', value: `${Math.round(totalCarbs)}g`, tone: 'carbs' },
    { icon: Droplets, label: 'Fats', value: `${Math.round(totalFat)}g`, tone: 'fat' },
  ]

  return (
    <section className={`ntr-meal-detail-view ${open ? 'ntr-detail-enter' : 'ntr-detail-exit'}`}>
      {/* Frosted circular controls over the hero */}
      <button type="button" className="ntr-detail-back" onClick={onClose} aria-label="Go back">
        <ArrowLeft size={20} />
      </button>
      {onEdit && (
        <button type="button" className="ntr-detail-edit" onClick={() => onEdit(entry)} aria-label="Edit this meal">
          <Pencil size={17} />
        </button>
      )}

      {/* Full-bleed hero photo */}
      <div className="ntr-detail-hero">
        <img src={heroImage.src} alt={heroImage.alt} />
      </div>

      {/* White card sliding up over the hero (Reference A) */}
      <div className="ntr-detail-card">
        <header className="ntr-detail-title-row">
          <div className="ntr-detail-title-main">
            <h2>{shownDescription}</h2>
            {isLongDescription && (
              <button type="button" className="ntr-detail-more" onClick={() => setDescExpanded((v) => !v)}>
                {descExpanded ? 'View Less' : 'View More'}
              </button>
            )}
          </div>
          <div className="ntr-detail-title-meta">
            <span className="ntr-detail-type-pill">{mealType}</span>
            <span className="ntr-detail-date">{entry.date || 'Today'}</span>
          </div>
        </header>

        {/* 2×2 macro chips with circular icons */}
        <div className="ntr-detail-macros">
          {macroChips.map(({ icon: Icon, label, value, tone }) => (
            <div className={`ntr-detail-macro tone-${tone}`} key={label}>
              <span className="ntr-detail-macro-ic">
                <Icon size={15} />
              </span>
              <div>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="ntr-detail-tabs" role="tablist" aria-label="Meal detail sections">
          <button
            role="tab"
            aria-selected={activeTab === 'overview'}
            className={`ntr-detail-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'items'}
            className={`ntr-detail-tab ${activeTab === 'items' ? 'active' : ''}`}
            onClick={() => setActiveTab('items')}
          >
            Items ({visibleItems.length})
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'insights'}
            className={`ntr-detail-tab ${activeTab === 'insights' ? 'active' : ''}`}
            onClick={() => setActiveTab('insights')}
            disabled={!hasInsights}
          >
            AI Insights
          </button>
        </div>

        {/* Tab Content */}
        <div className="ntr-detail-content">
          {activeTab === 'overview' && (
            <div className="ntr-detail-overview">
              {grade && (
                <div
                  className="ntr-detail-grade-hero"
                  style={{ backgroundColor: grade.bg, borderColor: grade.border }}
                >
                  <span className="ntr-detail-grade-letter" style={{ color: grade.ink }}>
                    {grade.letter}
                  </span>
                  <div>
                    <strong style={{ color: grade.ink }}>{grade.label} meal quality</strong>
                    {hasScore && <small>Score {Math.round(overallScore)}/100</small>}
                  </div>
                </div>
              )}

              <div className="ntr-detail-nutrition-grid">
                <div className="ntr-detail-nutri-item">
                  <span>Dietary Fiber</span>
                  <strong>{Number(totalFiber).toFixed(1)} g</strong>
                </div>
                <div className="ntr-detail-nutri-item">
                  <span>Sugar</span>
                  <strong>{Number(totalSugar).toFixed(1)} g</strong>
                </div>
                <div className="ntr-detail-nutri-item">
                  <span>Sodium</span>
                  <strong>{Math.round(totalSodium)} mg</strong>
                </div>
              </div>

              {hasGl && (
                <div className="ntr-detail-gl">
                  <div className="ntr-detail-gl-head">
                    <h3>
                      <Activity size={14} /> Glycaemic Load
                    </h3>
                    <span
                      className="ntr-detail-gl-badge"
                      style={{ backgroundColor: glBand(glValue).bg, color: glBand(glValue).ink }}
                    >
                      {glycaemic?.gl_classification || `${glBand(glValue).label} GL`}
                    </span>
                  </div>
                  <div className="ntr-detail-gl-bar" role="img" aria-label={`Glycaemic load ${Math.round(glValue)} out of a ${GL_SCALE_MAX}+ scale`}>
                    <i className="zone low" />
                    <i className="zone mid" />
                    <i className="zone high" />
                    <span
                      className="ntr-detail-gl-marker"
                      style={{ left: `${Math.min(glValue / GL_SCALE_MAX, 1) * 100}%` }}
                    >
                      {Math.round(glValue)}
                    </span>
                  </div>
                  {glycaemic?.insulin_impact_summary && (
                    <p className="ntr-detail-gl-note">{glycaemic.insulin_impact_summary}</p>
                  )}
                </div>
              )}

              {entry.notes && (
                <div className="ntr-detail-notes">
                  <p>
                    <strong>Notes:</strong> {entry.notes}
                  </p>
                </div>
              )}
              {entry.serving && (
                <div className="ntr-detail-notes">
                  <p>
                    <strong>Serving:</strong> {entry.serving} {entry.servingNotes || ''}
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'items' && (
            <div className="ntr-detail-items">
              {visibleItems.length > 0 ? (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                visibleItems.map((item: any, idx: number) => {
                  const itemKcal = item.calories ?? item.calories_kcal ?? 0
                  const itemP = item.protein ?? item.protein_g ?? 0
                  const itemC = item.carbs ?? item.carbs_g ?? 0
                  const itemF = item.fat ?? item.fats_g ?? 0
                  const itemFib = item.fiber ?? item.fiber_g ?? 0
                  const flags = (Array.isArray(item.clinical_item_flags) ? item.clinical_item_flags : [])
                    .map((flag: string) => parseClinicalFlag(flag))
                    .filter(Boolean)
                  return (
                    <div className="ntr-detail-item-card" key={idx}>
                      <div className="ntr-detail-item-head">
                        <div>
                          <h4>{item.name}</h4>
                          {item.serving_size && <small>{item.serving_size}</small>}
                        </div>
                        <span className="ntr-detail-item-kcal">{Math.round(itemKcal)} kcal</span>
                      </div>
                      <div className="ntr-detail-item-macros">
                        <div>
                          <span>Protein</span>
                          <strong>{Math.round(itemP)}g</strong>
                        </div>
                        <div>
                          <span>Carbs</span>
                          <strong>{Math.round(itemC)}g</strong>
                        </div>
                        <div>
                          <span>Fat</span>
                          <strong>{Math.round(itemF)}g</strong>
                        </div>
                        <div>
                          <span>Fiber</span>
                          <strong>{Math.round(itemFib)}g</strong>
                        </div>
                      </div>
                      {flags.length > 0 && (
                        <div className="ntr-detail-item-flags">
                          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                          {flags.map((flag: any, flagIdx: number) => (
                            <span
                              key={flagIdx}
                              className="ntr-detail-flag"
                              style={{ backgroundColor: flag.bg, color: flag.ink, borderColor: flag.border }}
                              title={flag.detail || flag.label}
                            >
                              {flag.kind === 'high' && <AlertTriangle size={10} />}
                              {flag.kind === 'protective' && <ShieldCheck size={10} />}
                              {flag.detail || flag.label}
                            </span>
                          ))}
                        </div>
                      )}
                      {item.confidence && (
                        <div className="ntr-detail-item-conf">
                          <span>{item.confidence} confidence</span>
                        </div>
                      )}
                    </div>
                  )
                })
              ) : (
                <p className="ntr-detail-empty">No itemised breakdown available for this meal.</p>
              )}
              {Array.isArray(entry.meal_items) && entry.meal_items.length > visibleItems.length && (
                <p className="ntr-detail-hidden-note">
                  <EyeOff size={11} /> {entry.meal_items.length - visibleItems.length} minor item(s) folded into the totals
                </p>
              )}
            </div>
          )}

          {activeTab === 'insights' && (
            <div className="ntr-detail-insights">
              {(strengths.length > 0 || concerns.length > 0 || improvements.length > 0 || assessment.fitness_alignment) && (
                <div className="ntr-insight-block">
                  <div className="ntr-insight-block-head">
                    <h3>
                      <Sparkles size={16} /> Meal Assessment
                    </h3>
                    {(grade || hasScore) && (
                      <span
                        className="ntr-insight-grade"
                        style={
                          grade
                            ? { backgroundColor: grade.bg, color: grade.ink, borderColor: grade.border }
                            : undefined
                        }
                      >
                        {grade ? `Grade ${grade.letter}` : ''}
                        {grade && hasScore ? ' · ' : ''}
                        {hasScore ? `${Math.round(overallScore)}/100` : ''}
                      </span>
                    )}
                  </div>
                  {assessment.fitness_alignment && <p className="ntr-insight-summary">{assessment.fitness_alignment}</p>}
                  <div className="ntr-insight-cards">
                    {strengths.map((str: string, i: number) => (
                      <div key={i} className="ntr-insight-card ntr-insight-strength">
                        <Check size={14} />
                        <span>{str}</span>
                      </div>
                    ))}
                    {improvements.map((imp: string, i: number) => (
                      <div key={`imp-${i}`} className="ntr-insight-card ntr-insight-improvement">
                        <Lightbulb size={14} />
                        <span>{imp}</span>
                      </div>
                    ))}
                    {concerns.map((con: string, i: number) => (
                      <div key={`con-${i}`} className="ntr-insight-card ntr-insight-concern">
                        <AlertTriangle size={14} />
                        <span>{con}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="ntr-insight-block">
                <h3>
                  <ShieldCheck size={16} /> Health Context
                </h3>
                {medicalList.length > 0 ? (
                  <div className="ntr-insight-cards">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {medicalList.map((med: any, i: number) => {
                      const tone = parseClinicalFlag(`${med.risk || ''}:`)
                      return (
                        <div
                          key={i}
                          className="ntr-insight-medical-card"
                          style={{
                            borderColor: tone?.border || 'var(--ntr-line, #eae9e0)',
                            background: tone ? `${tone.bg}66` : '#fbfaf5',
                          }}
                        >
                          <div className="ntr-medical-head">
                            <span>{med.condition}</span>
                            {med.risk ? renderRiskBadge(med.risk) : null}
                          </div>
                          {Array.isArray(med.findings) &&
                            med.findings.map((finding: string, j: number) => (
                              <p key={j} className="ntr-medical-finding">
                                — {finding}
                              </p>
                            ))}
                          {Array.isArray(med.recommendations) && med.recommendations.length > 0 && (
                            <div className="ntr-medical-reco">
                              {med.recommendations.map((reco: string, j: number) => (
                                <p key={j}>
                                  <Lightbulb size={11} /> {reco}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="ntr-insight-card ntr-insight-strength">
                    <ShieldCheck size={14} />
                    <span>All medical and physiological health checks passed.</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
