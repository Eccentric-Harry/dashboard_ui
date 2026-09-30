import { useEffect, useMemo, useRef, useState, type CSSProperties, type Ref } from 'react'
import { ArrowDownLeft, ArrowUpRight, CalendarCheck, ChevronDown, Plus, Repeat, X } from 'lucide-react'
import type { DailyFinancialLog } from '@/types/finance'
import { flattenLogs, isTransferKind, logDay, summarize, budgetConfigOf } from '@/lib/finance-ledger'
import { cn, isStandalone } from '@/lib/utils'
import { MiniMonth } from '@/components/ui/mini-month'
import { getConsistentColor, getIconForCategory } from '../utils'

interface FinanceHeaderProps {
  onAddClick?: () => void
  /** The add pill — the route watches it to show its floating twin once it scrolls away. */
  addButtonRef?: Ref<HTMLButtonElement>
  logs: DailyFinancialLog[]
  selectedDate: string
  onDateChange: (date: string) => void
}

const isoDate = (date: Date) => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')

  return `${year}-${month}-${day}`
}

const parseIsoDate = (dateValue?: string) => {
  if (!dateValue) {
    return new Date()
  }

  const [year, month, day] = dateValue.split('-').map(Number)
  if (!year || !month || !day) {
    return new Date()
  }

  return new Date(year, month - 1, day)
}

const formatHeaderDate = (date: Date) =>
  date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
/**
 * Weekday in italic, the rest roman — the same editorial split /nutrition's header
 * uses. It costs nothing and it is most of what gives that route its voice.
 */
const HeaderDate = ({ date }: { date: Date }) => (
  <>
    <em>{date.toLocaleDateString('en-US', { weekday: 'long' })},</em>{' '}
    {date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
  </>
)

const isFutureDate = (date: Date) => isoDate(date) > isoDate(new Date())

function FinanceHeader({ onAddClick, addButtonRef, logs, selectedDate, onDateChange }: FinanceHeaderProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [pickedDate, setPickedDate] = useState<string | null>(null)
  const calendarRef = useRef<HTMLDivElement>(null)

  const activeFinanceDates = useMemo(() => {
    const dates = new Set<string>()
    logs.forEach((log) => {
      const hasTransactions = Object.values(log.transactions || {}).some(
        (txs) => txs.length > 0,
      )
      if (hasTransactions) {
        dates.add(logDay(log))
      }
    })
    return dates
  }, [logs])



  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!calendarRef.current?.contains(event.target as Node)) {
        setIsCalendarOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsCalendarOpen(false)
        setPickedDate(null)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const selectedDateObject = useMemo(() => parseIsoDate(selectedDate), [selectedDate])


  const handleDateSelect = (date: Date) => {
    if (isFutureDate(date)) {
      return
    }

    const dateValue = isoDate(date)
    setPickedDate(dateValue)
    onDateChange(dateValue)
    setIsCalendarOpen(false)

    const nextUrl = isStandalone()
      ? `${window.location.pathname}?date=${dateValue}`
      : `/finance?date=${dateValue}`

    if (window.location.pathname + window.location.search !== nextUrl) {
      if (isStandalone()) {
        window.history.replaceState({}, '', nextUrl)
        localStorage.setItem('pwa_last_search', `?date=${dateValue}`)
      } else {
        window.history.pushState({}, '', nextUrl)
      }
      window.dispatchEvent(new PopStateEvent('popstate'))
    }
  }

  // Data-truth: the cards below show the selected *month*, so the header
  // reports that month's transaction count (plus the selected day's, when
  // it has any) instead of a misleading day-scoped "0 transactions logged".
  const transactionCounts = useMemo(() => {
    const monthKey = selectedDate.slice(0, 7)
    let month = 0
    let day = 0
    logs.forEach((log) => {
      const logDate = logDay(log)
      if (!logDate.startsWith(monthKey)) return
      let count = 0
      Object.values(log.transactions || {}).forEach((txs) => {
        count += txs.length
      })
      month += count
      if (logDate === selectedDate) day = count
    })
    return { month, day }
  }, [logs, selectedDate])

  const pickedDateObject = pickedDate ? parseIsoDate(pickedDate) : null

  // The picked day's rows through the shared ledger, so a transfer home shows as a
  // transfer here too (this popover used to call anything not named "income" an expense).
  const pickedDateTransactions = useMemo(
    () => (pickedDate ? flattenLogs(logs).filter((e) => e.day === pickedDate) : []),
    [logs, pickedDate],
  )
  const pickedDateTotals = useMemo(() => summarize(pickedDateTransactions, budgetConfigOf(null)), [pickedDateTransactions])

  return (
    <header className="finance-header">
      <div className="finance-date-picker" ref={calendarRef}>
        <button
          type="button"
          className="finance-date-trigger"
          aria-expanded={isCalendarOpen}
          aria-haspopup="dialog"
          onClick={() => setIsCalendarOpen((isOpen) => !isOpen)}
        >
          <span>
            <span className="finance-date-title-wrap">
              <strong>
                <HeaderDate date={selectedDateObject} />
              </strong>
              <ChevronDown size={20} className="finance-date-chevron" />
            </span>
            <small>
              Finance Overview | {transactionCounts.month} transaction{transactionCounts.month === 1 ? '' : 's'} in{' '}
              {selectedDateObject.toLocaleDateString('en-US', { month: 'long' })}
              {transactionCounts.day > 0 ? ` · ${transactionCounts.day} on this day` : ''}
            </small>
          </span>
        </button>

        {isCalendarOpen && (
          <>
            <div 
              className="finance-calendar-overlay" 
              onClick={() => setIsCalendarOpen(false)}
            />
            <div className="finance-calendar-popover" role="dialog" aria-label="Choose finance date">
              <MiniMonth
                selectedDate={selectedDate}
                activeDates={activeFinanceDates}
                maxDate={isoDate(new Date())}
                disableFutureMonths
                onSelect={(dateStr) => {
                  handleDateSelect(parseIsoDate(dateStr))
                  setIsCalendarOpen(false)
                }}
              />
            </div>
          </>
        )}

        {pickedDateObject && (
          <div className="finance-picked-date-backdrop" role="presentation" onClick={() => setPickedDate(null)}>
            <div className="finance-picked-date-popover finance-modal-popover" role="dialog" aria-label="Selected finance date" aria-modal="true" onClick={(event) => event.stopPropagation()}>
              <button type="button" className="finance-modal-close" aria-label="Close selected date" onClick={() => setPickedDate(null)}>
                <X size={15} />
              </button>
              <span className="finance-picked-date-icon">
                <CalendarCheck size={18} />
              </span>
              <div className="finance-picked-date-meta">
                <p>Selected Date</p>
                <h2>{formatHeaderDate(pickedDateObject)}</h2>
                <small>
                  {pickedDateTransactions.length} transactions logged
                </small>
              </div>
              <div className="finance-picked-date-summary">
                <div className="summary-card expense">
                  <div className="summary-icon">
                    <ArrowUpRight size={16} />
                  </div>
                  <div>
                    <span className="summary-label">Spent</span>
                    <strong className="summary-amount">₹{Math.round(pickedDateTotals.spending).toLocaleString('en-IN')}</strong>
                  </div>
                </div>
                <div className="summary-card income">
                  <div className="summary-icon">
                    <ArrowDownLeft size={16} />
                  </div>
                  <div>
                    <span className="summary-label">
                      {pickedDateTotals.transferOut > 0 ? 'Income · sent' : 'Income'}
                    </span>
                    <strong className="summary-amount">
                      ₹{Math.round(pickedDateTotals.income).toLocaleString('en-IN')}
                      {pickedDateTotals.transferOut > 0 && (
                        <small> · ₹{Math.round(pickedDateTotals.transferOut).toLocaleString('en-IN')} sent</small>
                      )}
                    </strong>
                  </div>
                </div>
              </div>
              <div className="finance-picked-date-entries fin-ledger">
                {pickedDateTransactions.length === 0 ? (
                  <p className="fin-picked-empty">No transactions logged on this day.</p>
                ) : (
                  pickedDateTransactions.map((tx, index) => {
                    const Icon = getIconForCategory(tx.category)
                    return (
                      <div
                        className={cn('fin-ledger-row', `is-${tx.kind}`)}
                        key={tx.id || `${tx.description}-${index}`}
                        style={{ '--chip-hue': getConsistentColor(tx.category) } as CSSProperties}
                      >
                        <span className="fin-ledger-icon" aria-hidden="true">
                          <Icon size={14} strokeWidth={2.3} />
                        </span>
                        <span className="fin-ledger-main">
                          <b>{tx.description || 'Untitled'}</b>
                          <small>
                            <em>{tx.category}</em>
                            {isTransferKind(tx.kind) && <span className="fin-ledger-tag">transfer</span>}
                            {tx.subscriptionId && (
                              <span className="fin-ledger-tag"><Repeat size={10} strokeWidth={2.6} /> bill</span>
                            )}
                            {tx.time && <span className="fin-ledger-time">{tx.time}</span>}
                          </small>
                        </span>
                        <strong className="fin-ledger-amount">
                          {tx.kind === 'spending' ? '−' : tx.kind === 'income' ? '+' : ''}₹{Math.round(tx.amount).toLocaleString('en-IN')}
                        </strong>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {onAddClick && (
        <div className="finance-header-actions">
          <button
            ref={addButtonRef}
            type="button"
            onClick={onAddClick}
            className="finance-add-btn add-pill"
          >
            <span className="add-pill-ic"><Plus size={16} strokeWidth={2.75} /></span>
            <span>Add transaction</span>
          </button>
        </div>
      )}
    </header>
  )
}

export { FinanceHeader }
