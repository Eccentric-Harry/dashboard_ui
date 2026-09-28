import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { PieChart as PieChartIcon } from 'lucide-react'
import { isFixedEntry, type BudgetConfig, type LedgerEntry } from '@/lib/finance-ledger'
import type { ChartTooltipProps } from '@/lib/chart-tooltip'
import { cn } from '@/lib/utils'
import { getConsistentColor, getIconForCategory } from '../utils'

interface SpendingOverviewCardProps {
  /** The selected month's rows; only spending is charted (transfers never are). */
  monthEntries: LedgerEntry[]
  config: BudgetConfig
  selectedCategory?: string | null
  onCategorySelect?: (category: string | null) => void
  months: [string, string][]
  selectedMonthKey: string
  onMonthSelect?: (monthKey: string) => void
  loading?: boolean
  stagger?: number
}

interface Slice {
  label: string
  rawAmount: number
  share: number
  tone: string
  fixed: boolean
}

const rupees = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`

const DonutTooltip = ({ active, payload }: ChartTooltipProps) => {
  if (!active || !payload?.length) return null
  const data = payload[0].payload as Slice
  return (
    <div className="fin-donut-tooltip">
      <b>{data.label}</b>
      <strong>{rupees(data.rawAmount)}</strong>
      <small>{data.share.toFixed(1)}% of spending</small>
    </div>
  )
}

function SpendingOverviewCard({
  monthEntries,
  config,
  selectedCategory = null,
  onCategorySelect,
  months,
  selectedMonthKey,
  onMonthSelect,
  loading = false,
  stagger = 0,
}: SpendingOverviewCardProps) {
  const { slices, total, fixedTotal } = useMemo(() => {
    const totals = new Map<string, { amount: number; fixed: boolean }>()
    let sum = 0
    let fixed = 0
    for (const e of monthEntries) {
      if (e.kind !== 'spending') continue
      const isFixed = isFixedEntry(e, config)
      const prev = totals.get(e.category)
      totals.set(e.category, { amount: (prev?.amount ?? 0) + e.amount, fixed: (prev?.fixed ?? true) && isFixed })
      sum += e.amount
      if (isFixed) fixed += e.amount
    }
    const list: Slice[] = [...totals.entries()]
      .map(([label, v]) => ({
        label,
        rawAmount: v.amount,
        share: sum > 0 ? (v.amount / sum) * 100 : 0,
        tone: getConsistentColor(label),
        fixed: v.fixed,
      }))
      .sort((a, b) => b.rawAmount - a.rawAmount)
    return { slices: list, total: sum, fixedTotal: fixed }
  }, [monthEntries, config])

  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true)
  }, [])

  const [activeIndex, setActiveIndex] = useState(-1)
  const onPieEnter = useCallback((_: unknown, index: number) => setActiveIndex(index), [])
  const onPieLeave = useCallback(() => setActiveIndex(-1), [])
  const toggle = useCallback(
    (label: string) => onCategorySelect?.(selectedCategory === label ? null : label),
    [onCategorySelect, selectedCategory],
  )

  const selectedIndex = selectedCategory ? slices.findIndex((s) => s.label === selectedCategory) : -1
  const centerIndex = selectedIndex !== -1 ? selectedIndex : activeIndex
  const center = centerIndex !== -1 ? slices[centerIndex] : null

  return (
    <section className="finance-card finance-spending-card fin-spending" style={{ '--i': stagger } as CSSProperties}>
      <div className="finance-section-head">
        <div>
          <span className="finance-eyebrow">Breakdown</span>
          <h2>Where it went</h2>
          <p>
            {total > 0
              ? fixedTotal > 0
                ? `${rupees(total - fixedTotal)} everyday · ${rupees(fixedTotal)} rent & bills`
                : `${rupees(total)} spent across ${slices.length} categories`
              : 'Spending only — transfers are tracked separately'}
          </p>
        </div>
        {months.length > 0 && (
          <select
            className="fin-month-select"
            value={selectedMonthKey}
            onChange={(e) => onMonthSelect?.(e.target.value)}
            aria-label="Breakdown month"
          >
            {months.map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="finance-spending-body">
          <div className="finance-donut-container">
            <span className="skeleton-circle skeleton-shimmer fin-donut-skeleton" />
          </div>
          <div className="finance-category-list">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="fin-legend-row is-skeleton">
                <span className="skeleton-circle skeleton-shimmer" style={{ width: 22, height: 22 }} />
                <span className="skeleton-rect skeleton-shimmer" style={{ width: '40%', height: 11 }} />
                <span className="skeleton-rect skeleton-shimmer" style={{ width: '20%', height: 11, marginLeft: 'auto' }} />
              </div>
            ))}
          </div>
        </div>
      ) : slices.length === 0 ? (
        <div className="fin-empty">
          <span className="fin-empty-glyph">
            <PieChartIcon size={20} strokeWidth={2.2} />
          </span>
          <p className="fin-empty-title">No spending this month</p>
          <p className="fin-empty-sub">Once you log an expense, the breakdown by category shows up here.</p>
        </div>
      ) : (
        <div className="finance-spending-body">
          <div className="finance-donut-container">
            {isMounted && (
              <ResponsiveContainer width="99%" height="100%" minWidth={0} minHeight={0}>
                <PieChart>
                  <Pie
                    data={slices}
                    cx="50%"
                    cy="50%"
                    innerRadius="62%"
                    outerRadius="86%"
                    paddingAngle={slices.length > 1 ? 1.2 : 0}
                    cornerRadius={4}
                    dataKey="rawAmount"
                    nameKey="label"
                    onMouseEnter={onPieEnter}
                    onMouseLeave={onPieLeave}
                    onClick={(data: unknown) => toggle((data as Slice).label)}
                    stroke="none"
                    isAnimationActive={false}
                  >
                    {slices.map((entry, index) => (
                      <Cell
                        key={entry.label}
                        fill={entry.tone}
                        fillOpacity={
                          selectedCategory
                            ? selectedCategory === entry.label ? 1 : 0.28
                            : activeIndex === -1 || activeIndex === index ? 1 : 0.5
                        }
                        className="fin-donut-cell"
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<DonutTooltip />} wrapperStyle={{ zIndex: 100 }} offset={25} />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="fin-donut-center" aria-hidden="true">
              <span>{center ? center.label : 'Spent'}</span>
              <b>{rupees(center ? center.rawAmount : total)}</b>
              {center && <small>{center.share.toFixed(1)}%</small>}
            </div>
          </div>

          <div className="fin-legend">
            {slices.map((s) => {
              const Icon = getIconForCategory(s.label)
              return (
                <button
                  type="button"
                  key={s.label}
                  className={cn(
                    'fin-legend-row',
                    selectedCategory === s.label && 'is-selected',
                    selectedCategory && selectedCategory !== s.label && 'is-dimmed',
                  )}
                  onClick={() => toggle(s.label)}
                  aria-pressed={selectedCategory === s.label}
                  style={{ '--chip-hue': s.tone } as CSSProperties}
                >
                  <span className="fin-legend-swatch" aria-hidden="true">
                    <Icon size={12} strokeWidth={2.5} />
                  </span>
                  <span className="fin-legend-name">
                    {s.label}
                    {config.scope === 'FLEX' && s.fixed && <em>fixed</em>}
                  </span>
                  <b>{rupees(s.rawAmount)}</b>
                  <small>{s.share.toFixed(1)}%</small>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}

export { SpendingOverviewCard }
