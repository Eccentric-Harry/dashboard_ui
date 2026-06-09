import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarCheck, ChevronDown, ChevronLeft, ChevronRight, X, Plus, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import type { DailyFinancialLog } from '../../../../lib/api'
import { getConsistentColor, getIconForCategory } from '../utils'
import { isStandalone } from '../../../../lib/utils'

interface FinanceHeaderProps {
  onAddClick?: () => void
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

const formatMonth = (date: Date) =>
  date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

const isFutureDate = (date: Date) => isoDate(date) > isoDate(new Date())

const getPastelBG = (colorHex: string) => {
  const hex = colorHex.toLowerCase()
  if (hex === '#4684ff') return '#e6f0ff'
  if (hex === '#ff6c61') return '#ffebee'
  if (hex === '#039855') return '#e6fcf0'
  if (hex === '#10b981') return '#e6faf4'
  if (hex === '#7a5af8') return '#f3e8ff'
  if (hex === '#0ba5ec') return '#ecf8ff'
  if (hex === '#f97316') return '#fff4e6'
  if (hex === '#dd2590') return '#fff0f6'
  if (hex === '#8b5cf6') return '#f7f4ff'
  if (hex === '#12b76a') return '#e6faf0'
  if (hex === '#32d583') return '#f0fdf4'

  try {
    const c = hex.replace('#', '')
    const r = parseInt(c.substring(0, 2), 16)
    const g = parseInt(c.substring(2, 4), 16)
    const b = parseInt(c.substring(4, 6), 16)
    const pr = Math.round(r * 0.08 + 255 * 0.92)
    const pg = Math.round(g * 0.08 + 255 * 0.92)
    const pb = Math.round(b * 0.08 + 255 * 0.92)
    return `rgb(${pr}, ${pg}, ${pb})`
  } catch (e) {
    return '#f3f4f6'
  }
}

function FinanceHeader({ onAddClick, logs, selectedDate, onDateChange }: FinanceHeaderProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [pickedDate, setPickedDate] = useState<string | null>(null)
  const [visibleMonth, setVisibleMonth] = useState(() => parseIsoDate(selectedDate))
  const calendarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search)
      const nextDate = params.get('date') || isoDate(new Date())
      setVisibleMonth(parseIsoDate(nextDate))
    }

    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

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
  
  const calendarDays = useMemo(() => {
    const year = visibleMonth.getFullYear()
    const month = visibleMonth.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days = []

    for (let index = 0; index < firstDay; index += 1) {
      days.push(null)
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      days.push(new Date(year, month, day))
    }

    return days
  }, [visibleMonth])

  const handleMonthChange = (offset: number) => {
    setVisibleMonth((currentMonth) => new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1))
  }

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

  const selectedDateTransactionsCount = useMemo(() => {
    const log = logs.find((l) => l.id === selectedDate || l.date.startsWith(selectedDate))
    if (!log) return 0
    let count = 0
    Object.values(log.transactions || {}).forEach((txs) => {
      count += (txs as any[]).length
    })
    return count
  }, [logs, selectedDate])

  const pickedDateObject = pickedDate ? parseIsoDate(pickedDate) : null

  const pickedDateTransactions = useMemo(() => {
    if (!pickedDate) return []
    const log = logs.find((l) => l.id === pickedDate || l.date.startsWith(pickedDate))
    if (!log) return []
    
    const allTxs: any[] = []
    Object.entries(log.transactions || {}).forEach(([category, txs]) => {
      (txs as any[]).forEach((tx: any) => {
        const isIncome = category.toLowerCase().includes('income')
        allTxs.push({
          id: tx.id,
          merchant: tx.description,
          detail: new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          category: category,
          amount: `${isIncome ? '+' : '-'}₹${tx.amount.toLocaleString()}`,
          tone: isIncome ? 'income' : 'expense',
          icon: getIconForCategory(category),
          timestamp: new Date(tx.timestamp).getTime(),
          rawAmount: tx.amount,
          rawDate: new Date(tx.timestamp).toISOString().split('T')[0],
          rawType: isIncome ? 'Income' : 'Expense',
        })
      })
    })
    
    return allTxs.sort((a, b) => b.timestamp - a.timestamp)
  }, [logs, pickedDate])

  const pickedDateTotals = useMemo(() => {
    if (!pickedDate) return { income: 0, expense: 0 }
    const log = logs.find((l) => l.id === pickedDate || l.date.startsWith(pickedDate))
    if (!log) return { income: 0, expense: 0 }
    
    return {
      income: log.dailyTotals?.totalIncome || 0,
      expense: log.dailyTotals?.totalExpense || 0,
    }
  }, [logs, pickedDate])

  const isNextMonthFuture = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1) > new Date(new Date().getFullYear(), new Date().getMonth(), 1)

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
              <strong>{formatHeaderDate(selectedDateObject)}</strong>
              <ChevronDown size={22} className="finance-date-chevron" />
            </span>
            <small>Finance Overview | {selectedDateTransactionsCount} transactions logged</small>
          </span>
        </button>

        {isCalendarOpen && (
          <>
            <div 
              className="finance-calendar-overlay" 
              onClick={() => setIsCalendarOpen(false)}
            />
            <div className="finance-calendar-popover" role="dialog" aria-label="Choose finance date">
              <div className="finance-calendar-head">
                <b>{formatMonth(visibleMonth)}</b>
                <span>
                  <button type="button" aria-label="Previous month" onClick={() => handleMonthChange(-1)}>
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    aria-label="Next month"
                    disabled={isNextMonthFuture}
                    onClick={() => handleMonthChange(1)}
                  >
                    <ChevronRight size={16} />
                  </button>
                </span>
              </div>

              <div className="finance-calendar-weekdays" aria-hidden="true">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                  <span key={`${day}-${index}`}>{day}</span>
                ))}
              </div>

              <div className="finance-calendar-grid">
                {calendarDays.map((date, index) => {
                  const dateValue = date ? isoDate(date) : `empty-${index}`
                  const isSelected = dateValue === selectedDate
                  const isToday = dateValue === isoDate(new Date())
                  const isFuture = date ? isFutureDate(date) : false

                  const dayLog = date ? logs.find((l) => l.date === dateValue) : null
                  const hasTransactions = dayLog && Object.values(dayLog.transactions || {}).some(txs => (txs as any[]).length > 0)

                  return (
                    <button
                      key={dateValue}
                      type="button"
                      className={`${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''} ${isFuture ? 'future' : ''}`}
                      disabled={!date || isFuture}
                      onClick={() => date && handleDateSelect(date)}
                      style={{ position: 'relative' }}
                    >
                      {date?.getDate() ?? ''}
                      {hasTransactions && !isSelected && (
                        <span style={{
                          position: 'absolute',
                          bottom: '4px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: '4px',
                          height: '4px',
                          borderRadius: '50%',
                          background: '#12b76a'
                        }} />
                      )}
                    </button>
                  )
                })}
              </div>
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
                <div className="summary-card income">
                  <div className="summary-icon">
                    <ArrowUpRight size={16} />
                  </div>
                  <div>
                    <span className="summary-label">Daily Income</span>
                    <strong className="summary-amount">₹{pickedDateTotals.income.toLocaleString()}</strong>
                  </div>
                </div>
                <div className="summary-card expense">
                  <div className="summary-icon">
                    <ArrowDownLeft size={16} />
                  </div>
                  <div>
                    <span className="summary-label">Daily Expenses</span>
                    <strong className="summary-amount">₹{pickedDateTotals.expense.toLocaleString()}</strong>
                  </div>
                </div>
              </div>
              <div className="finance-picked-date-entries">
                <div className="finance-transaction-table" role="table" aria-label="Transactions for selected date">
                  <div className="finance-transaction-row header" role="row">
                    <span role="columnheader">Merchant</span>
                    <span role="columnheader">Category</span>
                    <span role="columnheader">Amount (INR)</span>
                  </div>
                  <div className="finance-transaction-list" role="rowgroup">
                    {pickedDateTransactions.length === 0 ? (
                      <p style={{
                        textAlign: 'center',
                        color: 'rgba(23, 28, 25, 0.5)',
                        fontSize: '13px',
                        padding: '24px 0',
                        margin: 0,
                      }}>No transactions logged on this day.</p>
                    ) : (
                      pickedDateTransactions.map((tx, index) => {
                        const { merchant, detail, category, amount, tone, icon: Icon } = tx;
                        return (
                          <div className="finance-transaction-row" key={`${merchant}-${detail}-${index}`} role="row" style={{ cursor: 'default' }}>
                            <div className="finance-transaction-merchant" role="cell">
                              <span style={{ 
                                background: getPastelBG(getConsistentColor(category)), 
                                color: getConsistentColor(category),
                                border: 'none',
                                borderRadius: '12px',
                                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
                                width: '42px',
                                height: '42px',
                                display: 'grid',
                                placeItems: 'center',
                              }}>
                                <Icon size={14} strokeWidth={2.6} />
                              </span>
                              <p>
                                <b>{merchant}</b>
                                <small>{detail}</small>
                              </p>
                            </div>
                            <div className="finance-transaction-category" role="cell">
                              <em style={{ 
                                backgroundColor: `${getConsistentColor(category)}15`, 
                                color: getConsistentColor(category),
                                border: `1px solid ${getConsistentColor(category)}30`,
                                padding: '5px 10px',
                                borderRadius: '8px',
                                fontSize: '9px',
                                fontStyle: 'normal',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                              }}>
                                {(() => {
                                  const CatIcon = getIconForCategory(category);
                                  return <CatIcon size={10} style={{ marginRight: '4px' }} />;
                                })()}
                                {category}
                              </em>
                            </div>
                            <div className="finance-transaction-amount-group" role="cell" style={{ justifySelf: 'end' }}>
                              <strong className={tone} style={{
                                fontSize: '13px',
                                fontWeight: 800,
                                color: tone === 'income' ? '#1a8b30' : '#d83542',
                              }}>
                                {amount}
                              </strong>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {onAddClick && (
        <div className="finance-header-actions">
          <button
            type="button"
            onClick={onAddClick}
            className="finance-add-btn"
          >
            <Plus size={14} strokeWidth={3} />
            <span>Add</span>
          </button>
        </div>
      )}
    </header>
  )
}

export { FinanceHeader }
