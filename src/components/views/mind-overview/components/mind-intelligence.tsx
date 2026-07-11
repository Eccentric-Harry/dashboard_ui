// Mind Intelligence — the "Patterns" panel: renders the shared engine's mind
// insights (lib/insights/mind.ts) plus three small at-a-glance charts (triage
// composition, 14-day capture trend, time-of-day share). No fetch of its own —
// takes the THOUGHT entries the parent dashboard already holds in state, so
// visiting /mind adds zero extra network calls. All math lives in lib/insights;
// this file only renders.

import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { Brain, Sparkles } from 'lucide-react'
import type { MindEntry } from '../../../../lib/api'
import { isoDate, shortDay } from '../../../../lib/insights/engine'
import type { Insight } from '../../../../lib/insights/engine'
import {
  buildMindDays,
  captureTrend,
  distortionFrequency,
  mindInsights,
  timeOfDayShare,
  triageComposition,
} from '../../../../lib/insights/mind'
import { InsightList } from '../../../ui/insight-list'
import './mind-intelligence.css'

const WINDOW_DAYS = 30

const TREND_TOOLTIP = ({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}) =>
  active && payload?.length ? (
    <div className="mind-intel-tooltip">
      {label ? shortDay(label) : ''}: {payload[0].value} thought{payload[0].value === 1 ? '' : 's'}
    </div>
  ) : null

function MindIntelligenceCard({ entries }: { entries: MindEntry[] }) {
  const today = isoDate()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true)
  }, [])

  const engineInput = useMemo(
    () => ({ today, days: buildMindDays(entries, today, WINDOW_DAYS), windowDays: WINDOW_DAYS }),
    [entries, today],
  )

  const composition = useMemo(() => triageComposition(engineInput), [engineInput])
  const distortions = useMemo(() => distortionFrequency(engineInput), [engineInput])
  const trend = useMemo(() => captureTrend(engineInput, 14), [engineInput])
  const timing = useMemo(() => timeOfDayShare(engineInput), [engineInput])
  const insights = useMemo(() => mindInsights(engineInput), [engineInput])

  const handleAction = (insight: Insight) => {
    if (insight.action?.route !== '/mind') return
    document.querySelector('.mind-card--inbox')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const compositionSegments = [
    { key: 'converted', label: 'Do', value: composition.converted, className: 'is-converted' },
    { key: 'reframed', label: 'Reframe', value: composition.reframed, className: 'is-reframed' },
    { key: 'parked', label: 'Park', value: composition.parked, className: 'is-parked' },
    { key: 'released', label: 'Release', value: composition.released, className: 'is-released' },
    { key: 'stillOpen', label: 'Still open', value: composition.stillOpen, className: 'is-open' },
  ].filter((s) => s.value > 0)

  return (
    <section className="mind-card mind-card--intelligence" aria-label="Mind patterns">
      <div className="mind-card-head">
        <span className="mind-card-icon">
          <Brain size={16} />
        </span>
        <div>
          <h2 className="mind-card-title">Patterns</h2>
          <p className="mind-card-sub">Why these thoughts keep circling — and how you're handling them</p>
        </div>
      </div>

      {composition.total === 0 ? (
        <div className="mind-empty">
          <Sparkles size={16} />
          <p>Capture a few thoughts and patterns will start showing up here.</p>
        </div>
      ) : (
        <div className="mind-intel-grid">
          <div className="mind-intel-block mind-intel-composition">
            <p className="mind-intel-eyebrow">How thoughts get handled</p>
            <div className="mind-intel-bar" role="img" aria-label="Triage breakdown">
              {compositionSegments.map((seg) => (
                <span
                  key={seg.key}
                  className={`mind-intel-bar-seg ${seg.className}`}
                  style={{ flexGrow: seg.value }}
                  title={`${seg.label}: ${seg.value}`}
                />
              ))}
            </div>
            <div className="mind-intel-legend">
              {compositionSegments.map((seg) => (
                <span key={seg.key} className="mind-intel-legend-item">
                  <i className={seg.className} />
                  {seg.label} <b>{seg.value}</b>
                </span>
              ))}
            </div>
          </div>

          <div className="mind-intel-block mind-intel-trend">
            <p className="mind-intel-eyebrow">Captured, last 14 days</p>
            <div className="mind-intel-chart">
              {isMounted && (
                <ResponsiveContainer width="99%" height="100%" minWidth={0} minHeight={0}>
                  <BarChart data={trend} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={shortDay}
                      interval={2}
                      tick={{ fill: 'rgba(16, 19, 18, 0.45)', fontSize: 9, fontWeight: 600 }}
                    />
                    <Tooltip content={<TREND_TOOLTIP />} cursor={{ fill: 'rgba(16, 19, 18, 0.05)' }} />
                    <Bar dataKey="captured" radius={[4, 4, 0, 0]} fill="rgba(65, 74, 120, 0.55)" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {distortions.length > 0 && (
            <div className="mind-intel-block mind-intel-distortions">
              <p className="mind-intel-eyebrow">Recurring patterns in reframes</p>
              <div className="mind-intel-chips">
                {distortions.map((d) => (
                  <span key={d.tag} className="mind-intel-chip">
                    {d.tag} <b>{d.count}</b>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mind-intel-block mind-intel-timing">
            <p className="mind-intel-eyebrow">When thoughts tend to arrive</p>
            <div className="mind-intel-timing-strip">
              {timing.map((b) => (
                <div key={b.bucket} className="mind-intel-timing-seg" style={{ flexGrow: Math.max(b.pct, 6) }}>
                  <span>{b.bucket}</span>
                  <b>{b.pct}%</b>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {insights.length > 0 && (
        <div className="mind-intel-list">
          <p className="mind-intel-eyebrow">Patterns worth knowing</p>
          <InsightList insights={insights} onAction={handleAction} />
        </div>
      )}
    </section>
  )
}

export { MindIntelligenceCard }
