import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { AlignLeft, Check, ChevronDown, CircleCheck, Clock, ListChecks, Loader2, Plus, Repeat, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'

import type { CalendarItem, CalendarItemPayload, CalendarItemType, CalendarRecurrence } from '@/types/calendar'
import { calendarService } from '@/services/calendar-service'
import { useConfirmClose } from '@/hooks/use-confirm-close'
import { getErrorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'
import {
  CATEGORY_OPTIONS,
  EVENT_COLOR_SWATCHES,
  clearCustomItemColor,
  colorForCategory,
  getCustomItemColor,
  readCustomCategories,
  saveCustomCategories,
  setCustomItemColor,
} from '../calendar-colors'
import { DAY_MINUTES, DEFAULT_BLOCK_MINUTES, formatDuration, formatMinuteRange, minutesToTime, timeToMinutes } from '../calendar-time'
import { parseEntry, type ParseKind } from '../natural-language'
import { DayGlance } from './composer/day-glance'
import { MenuItem, PopoverMenu } from './composer/popover-menu'
import { TimeSelect } from './composer/time-select'
import { MiniMonth } from './mini-month'

import './calendar-item-modal.css'

const SLOTS = Array.from({ length: DAY_MINUTES / 15 }, (_, i) => i * 15)

export type CalendarDraft = { startTime: string; endTime: string }

type Props = {
  date: string
  item?: CalendarItem
  /** Times swept out on the grid — a new block starts from these. */
  draft?: CalendarDraft
  /** A new block prefilled from another one (Duplicate). Its title is taken as typed, not re-parsed. */
  seed?: Partial<CalendarItem>
  /** Words carried over from Quick add — parsed like anything typed here. */
  initialText?: string
  /** Loaded items: the day glance and overlap check read these. */
  items: CalendarItem[]
  existingCustomCategories?: string[]
  onClose: () => void
  onSaved: () => void
  onDelete?: (item: CalendarItem) => void
}

type When = { date: string; start: number; end: number; allDay: boolean; recurrence: CalendarRecurrence }

// ── Date helpers ─────────────────────────────────────────────────────────────

function parseISODate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

/** 'Today, Oct 4' / 'Tomorrow, Oct 5' / 'Wed, Oct 7' — what the date control reads. */
function dateButtonLabel(iso: string, todayIso: string) {
  const d = parseISODate(iso)
  const md = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const rel = dayLabel(iso, todayIso)
  if (rel === 'Today' || rel === 'Tomorrow' || rel === 'Yesterday') return `${rel}, ${md}`
  return `${d.toLocaleDateString('en-US', { weekday: 'short' })}, ${md}`
}

function dayLabel(iso: string, todayIso: string) {
  const d = parseISODate(iso)
  const diff = Math.round((d.getTime() - parseISODate(todayIso).getTime()) / 86_400_000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function repeatLabel(r: CalendarRecurrence, iso: string) {
  const d = parseISODate(iso)
  if (r === 'DAILY') return 'Every day'
  if (r === 'WEEKLY') return `Every ${d.toLocaleDateString('en-US', { weekday: 'long' })}`
  if (r === 'MONTHLY') return `Monthly on the ${ordinal(d.getDate())}`
  return 'Doesn’t repeat'
}

// ── Composer ─────────────────────────────────────────────────────────────────

export function CalendarItemModal({
  date,
  item,
  draft,
  seed,
  initialText,
  items,
  existingCustomCategories = [],
  onClose,
  onSaved,
  onDelete,
}: Props) {
  useEffect(() => {
    document.body.classList.add('calendar-modal-open')
    return () => document.body.classList.remove('calendar-modal-open')
  }, [])

  const isEdit = Boolean(item?.id)
  const isSeries = Boolean(item?.recurrenceFrequency && item.recurrenceFrequency !== 'NONE')
  const formRef = useRef<HTMLFormElement>(null)
  const [today] = useState(() => new Date())
  const todayIso = toISO(today)

  // ── Form state ──
  const [initialWhen] = useState<When>(() => {
    const from = item ?? seed
    const start = timeToMinutes(from?.startTime ?? draft?.startTime ?? '09:00')
    const endRaw = from?.endTime ?? draft?.endTime
    // Some synced items carry a start but no end — treat them as an hour long.
    const end = endRaw ? timeToMinutes(endRaw) : Math.min(DAY_MINUTES, start + DEFAULT_BLOCK_MINUTES)
    return {
      date: item?.originalDate ?? item?.date ?? seed?.date ?? date,
      start,
      end: end >= DAY_MINUTES - 1 ? DAY_MINUTES : end,
      allDay: from ? Boolean(from.allDay || !from.startTime) : false,
      recurrence: from?.recurrenceFrequency ?? 'NONE',
    }
  })

  const [text, setText] = useState(item?.title ?? seed?.title ?? initialText ?? '')
  const [base, setBase] = useState<When>(initialWhen)
  const [dismissed, setDismissed] = useState<ParseKind[]>(() => (seed ? ['date', 'time', 'duration', 'repeat', 'allDay'] : []))
  const [itemType, setItemType] = useState<CalendarItemType>(item?.itemType ?? seed?.itemType ?? 'EVENT')
  const [category, setCategory] = useState(item?.category ?? seed?.category ?? 'Personal')
  const [colorOverride, setColorOverride] = useState<string | undefined>(() => getCustomItemColor(item ?? seed ?? {}))
  const [recurrenceUntil, setRecurrenceUntil] = useState(item?.recurrenceUntil ?? seed?.recurrenceUntil ?? '')
  const [notes, setNotes] = useState(item?.notes ?? seed?.notes ?? '')
  const [completed, setCompleted] = useState(item?.completed ?? false)
  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    const standard = new Set(CATEGORY_OPTIONS.map((o) => o.label))
    const unique = new Set([...existingCustomCategories, ...readCustomCategories()])
    const current = item?.category?.trim()
    if (current && !standard.has(current)) unique.add(current)
    return [...unique].filter((c) => c && !standard.has(c))
  })
  const [newCategory, setNewCategory] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [menu, setMenu] = useState<null | 'date' | 'category' | 'repeat'>(null)
  const [dateAnchor, setDateAnchor] = useState<HTMLElement | null>(null)
  const [categoryAnchor, setCategoryAnchor] = useState<HTMLElement | null>(null)
  const [repeatAnchor, setRepeatAnchor] = useState<HTMLElement | null>(null)

  // ── Natural language (new blocks only — never rewrite an existing title) ──
  const parsed = useMemo(
    () => (isEdit ? null : parseEntry(text, today, dismissed)),
    [isEdit, text, today, dismissed],
  )
  const when = useMemo<When>(() => {
    if (!parsed || parsed.found.length === 0) return base
    const w = { ...base }
    const len = base.end - base.start > 0 ? base.end - base.start : DEFAULT_BLOCK_MINUTES
    if (parsed.date) w.date = parsed.date
    if (parsed.recurrence) w.recurrence = parsed.recurrence
    if (parsed.allDay) w.allDay = true
    if (parsed.start != null) {
      w.start = parsed.start
      w.end = parsed.end ?? Math.min(DAY_MINUTES, parsed.start + (parsed.duration ?? len))
      w.allDay = false
    } else if (parsed.duration != null) {
      w.end = Math.min(DAY_MINUTES, w.start + parsed.duration)
    }
    return w
  }, [parsed, base])
  const title = (parsed ? parsed.title : text).trim()

  /** Touching a field accepts what was parsed: the phrases leave the name, the values stay. */
  const edit = (patch: Partial<When>) => {
    if (parsed && parsed.found.length) {
      setText(parsed.title)
      setDismissed([])
    }
    setBase({ ...when, ...patch })
  }

  // ── Derived ──
  const categoryColor = colorForCategory(category)
  const accent = colorOverride ?? categoryColor
  const duration = when.end - when.start
  const timesValid = when.allDay || duration > 0
  const categories = [...CATEGORY_OPTIONS.map((o) => o.label), ...customCategories]
  const editingId = item?.id
  const dayOthers = useMemo(
    () => items.filter((o) => o.date === when.date && !(editingId && o.id === editingId)),
    [items, when.date, editingId],
  )

  // The date picker's dots come from the loaded blocks.
  const itemsByDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>()
    for (const it of items) map.set(it.date, [...(map.get(it.date) ?? []), it])
    return map
  }, [items])

  const isDirty = item
    ? text.trim() !== (item.title ?? '') ||
      notes.trim() !== (item.notes ?? '').trim() ||
      category !== (item.category ?? 'Personal') ||
      when.date !== initialWhen.date ||
      when.allDay !== initialWhen.allDay ||
      (!when.allDay && (when.start !== initialWhen.start || when.end !== initialWhen.end))
    : text.trim() !== '' || notes.trim() !== ''

  const { requestClose, dialog: confirmCloseDialog } = useConfirmClose(isDirty, onClose)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) requestClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [requestClose])

  // ── Actions ──
  const addCategory = () => {
    const name = newCategory.trim()
    setNewCategory('')
    if (!name) return
    if (!categories.includes(name)) {
      setCustomCategories((prev) => [...prev, name])
      saveCustomCategories([...new Set([...readCustomCategories(), name])])
    }
    setCategory(name)
    setMenu(null)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!title) return setError('Give it a name')
    if (!timesValid) return setError('It needs to end after it starts')

    setSaving(true)
    setError('')
    const payload: CalendarItemPayload = {
      title,
      date: when.date,
      itemType,
      category,
      color: accent,
      allDay: when.allDay,
      startTime: when.allDay ? undefined : minutesToTime(when.start),
      endTime: when.allDay ? undefined : minutesToTime(when.end),
      notes: notes.trim() || undefined,
      completed,
      cancelled: item?.cancelled,
      recurrenceFrequency: when.recurrence,
      recurrenceUntil: when.recurrence === 'NONE' ? undefined : recurrenceUntil || undefined,
    }

    try {
      if (item?.id) {
        const res = await calendarService.updateItem(item.id, payload)
        if (res.error) throw new Error(res.error.message)
        if (colorOverride) setCustomItemColor(item.id, colorOverride)
        else clearCustomItemColor(item.id)
        toast.success(`Updated “${title}”`)
      } else {
        const res = await calendarService.createItem(payload)
        if (res.error) throw new Error(res.error.message)
        if (colorOverride && res.data?.id) setCustomItemColor(res.data.id, colorOverride)
        toast.success(`Added “${title}” · ${dayLabel(when.date, todayIso)}`)
      }
      onSaved()
    } catch (err) {
      setError(getErrorMessage(err, 'Couldn’t save that'))
    } finally {
      setSaving(false)
    }
  }

  // ── Parsed chips ──
  const parsedChips: { kind: ParseKind; label: string }[] = []
  if (parsed) {
    for (const kind of parsed.found) {
      if (kind === 'date' && parsed.date) parsedChips.push({ kind, label: dayLabel(parsed.date, todayIso) })
      if (kind === 'time' && parsed.start != null) parsedChips.push({ kind, label: formatMinuteRange(when.start, when.end) })
      if (kind === 'duration' && parsed.duration != null) parsedChips.push({ kind, label: formatDuration(parsed.duration) })
      if (kind === 'repeat' && parsed.recurrence) parsedChips.push({ kind, label: repeatLabel(parsed.recurrence, when.date) })
      if (kind === 'allDay') parsedChips.push({ kind, label: 'All day' })
    }
  }

  const heading = isEdit ? 'Edit block' : seed ? 'Duplicate block' : 'New block'
  const endOptions = [...SLOTS.filter((m) => m > when.start), DAY_MINUTES]
  const isTask = itemType === 'TASK'
  const toggle = (m: 'date' | 'category' | 'repeat') => setMenu(menu === m ? null : m)

  return (
    <>
      <div className="cv-portal cal-modal-backdrop" role="presentation" onClick={requestClose}>
        <div
          className="cal-composer-modal"
          role="dialog"
          aria-modal="true"
          aria-label={heading}
          style={{ '--ev': accent } as CSSProperties}
          onClick={(e) => e.stopPropagation()}
        >
          <form
            ref={formRef}
            className="cal-composer"
            onSubmit={handleSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                formRef.current?.requestSubmit()
              }
            }}
          >
            <header className="cal-head">
              <span className="cal-head-label">{heading}</span>
              <button type="button" className="cal-icon-btn" onClick={requestClose} aria-label="Close">
                <X size={16} />
              </button>
            </header>

            {/* ── Title ── */}
            <div className="cal-row cal-title-row">
              <button
                type="button"
                className="cal-swatch-btn"
                onClick={() => toggle('category')}
                aria-label={`Calendar: ${category}`}
                title={category}
              />
              <div className="cal-title-stack">
                <input
                  className="cal-title-input"
                  type="text"
                  autoFocus
                  autoComplete="off"
                  maxLength={160}
                  placeholder="Add a title"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  aria-label="Title"
                />
                {parsedChips.length > 0 ? (
                  <div className="cal-parsed" aria-live="polite">
                    {parsedChips.map((chip) => (
                      <span key={chip.kind} className="cal-parsed-chip">
                        {chip.label}
                        <button
                          type="button"
                          aria-label={`Keep “${chip.label}” in the title instead`}
                          title="Keep this in the title instead"
                          onClick={() => setDismissed((d) => [...d, chip.kind])}
                        >
                          <X size={10} strokeWidth={2.8} />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  !isEdit &&
                  !text && <p className="cal-hint">Type it naturally — “Gym tomorrow 7am for 45m”</p>
                )}
              </div>
            </div>

            <div className="cal-group">
              {/* ── When ── */}
              <div className="cal-row is-top">
                <span className="cal-row-ic" aria-hidden="true">
                  <Clock size={17} strokeWidth={2} />
                </span>
                <div className="cal-when">
                  <div className="cal-when-line">
                    <button
                      ref={setDateAnchor}
                      type="button"
                      className={cn('cal-pick', menu === 'date' && 'is-open')}
                      aria-haspopup="dialog"
                      aria-expanded={menu === 'date'}
                      onClick={() => toggle('date')}
                    >
                      {dateButtonLabel(when.date, todayIso)}
                    </button>
                    {!when.allDay && (
                      <>
                        <TimeSelect
                          ariaLabel="Starts"
                          value={when.start}
                          options={SLOTS}
                          onChange={(st) => edit({ start: st, end: Math.min(DAY_MINUTES, st + (duration > 0 ? duration : 60)) })}
                        />
                        <span className="cal-dash" aria-hidden="true">–</span>
                        <TimeSelect ariaLabel="Ends" value={when.end} from={when.start} options={endOptions} onChange={(en) => edit({ end: en })} />
                        <span className={cn('cal-len', !timesValid && 'is-bad')}>{timesValid ? formatDuration(duration) : 'Ends too early'}</span>
                      </>
                    )}
                    <label className="cal-switch is-inline">
                      <input type="checkbox" checked={when.allDay} onChange={(e) => edit({ allDay: e.target.checked })} />
                      <span className="cal-switch-track" aria-hidden="true" />
                      <span>All day</span>
                    </label>
                  </div>
                  {!when.allDay && (
                    <DayGlance
                      others={dayOthers}
                      start={when.start}
                      end={timesValid ? when.end : when.start + 15}
                      now={when.date === todayIso ? today.getHours() * 60 + today.getMinutes() : undefined}
                      onChange={(st, en) => edit({ start: st, end: en })}
                    />
                  )}
                </div>
              </div>

              {/* ── Repeat ── */}
              <div className="cal-row">
                <span className="cal-row-ic" aria-hidden="true">
                  <Repeat size={17} strokeWidth={2} />
                </span>
                <div>
                  <button
                    ref={setRepeatAnchor}
                    type="button"
                    className={cn('cal-pick', menu === 'repeat' && 'is-open', when.recurrence === 'NONE' && 'is-muted')}
                    aria-haspopup="menu"
                    aria-expanded={menu === 'repeat'}
                    onClick={() => toggle('repeat')}
                  >
                    {repeatLabel(when.recurrence, when.date)}
                    {when.recurrence !== 'NONE' && recurrenceUntil && (
                      <span className="cal-pick-sub">
                        until {parseISODate(recurrenceUntil).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                    <ChevronDown size={14} strokeWidth={2.2} className="cal-pick-caret" />
                  </button>
                </div>
              </div>

              {/* ── Calendar ── */}
              <div className="cal-row">
                <span className="cal-row-ic" aria-hidden="true">
                  <span className="cal-dot is-lg" style={{ background: accent }} />
                </span>
                <div>
                  <button
                    ref={setCategoryAnchor}
                    type="button"
                    className={cn('cal-pick', menu === 'category' && 'is-open')}
                    aria-haspopup="menu"
                    aria-expanded={menu === 'category'}
                    onClick={() => toggle('category')}
                  >
                    {category}
                    {colorOverride && <span className="cal-pick-sub">custom colour</span>}
                    <ChevronDown size={14} strokeWidth={2.2} className="cal-pick-caret" />
                  </button>
                </div>
              </div>

              {/* ── Task ── */}
              <label className="cal-row is-switch">
                <span className="cal-row-ic" aria-hidden="true">
                  <ListChecks size={17} strokeWidth={2} />
                </span>
                <span className="cal-row-text">
                  <b>Add to task list</b>
                  <small>{isTask ? 'Shows on Tasks with a checkbox' : 'Calendar only'}</small>
                </span>
                <span className="cal-switch">
                  <input
                    type="checkbox"
                    checked={isTask}
                    onChange={(e) => setItemType(e.target.checked ? 'TASK' : item?.itemType && item.itemType !== 'TASK' ? item.itemType : 'EVENT')}
                  />
                  <span className="cal-switch-track" aria-hidden="true" />
                </span>
              </label>

              {isEdit && (
                <label className="cal-row is-switch">
                  <span className="cal-row-ic" aria-hidden="true">
                    <CircleCheck size={17} strokeWidth={2} />
                  </span>
                  <span className="cal-row-text">
                    <b>Done</b>
                  </span>
                  <span className="cal-switch">
                    <input type="checkbox" checked={completed} onChange={(e) => setCompleted(e.target.checked)} />
                    <span className="cal-switch-track" aria-hidden="true" />
                  </span>
                </label>
              )}

              {/* ── Notes ── */}
              <div className="cal-row is-top">
                <span className="cal-row-ic" aria-hidden="true">
                  <AlignLeft size={17} strokeWidth={2} />
                </span>
                <textarea
                  className="cal-notes"
                  placeholder="Add notes or a checklist (- [ ] item)"
                  aria-label="Notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={notes.split('\n').length > 1 ? 3 : 1}
                />
              </div>
            </div>

            {isSeries && <p className="cal-series-note">Changes apply to every occurrence of this repeating block.</p>}

            <footer className="cal-foot">
              <div className="cal-foot-lead">
                {error ? (
                  <p className="cal-error" role="alert">
                    {error}
                  </p>
                ) : isEdit && onDelete && item ? (
                  <button type="button" className="cal-delete" onClick={() => onDelete(item)}>
                    <Trash2 size={14} strokeWidth={2.2} /> Delete
                  </button>
                ) : (
                  <span className="cal-keys" aria-hidden="true">
                    <kbd>⌘</kbd>
                    <kbd>↵</kbd> to save
                  </span>
                )}
              </div>
              <button type="button" className="cal-btn is-neutral" onClick={requestClose}>
                Cancel
              </button>
              <button type="submit" className="cal-btn is-primary" disabled={saving || !title}>
                {saving ? <Loader2 className="animate-spin" size={15} /> : isEdit ? 'Save' : 'Add to calendar'}
              </button>
            </footer>
          </form>
        </div>
      </div>

      {/* ── Menus (portalled so nothing can clip them) ── */}
      <PopoverMenu anchor={dateAnchor} open={menu === 'date'} onClose={() => setMenu(null)} width={268} className="cal-date-menu">
        <div className="cal-date-quick">
          {[0, 1, 7].map((n) => {
            const iso = toISO(new Date(today.getFullYear(), today.getMonth(), today.getDate() + n))
            return (
              <button
                key={n}
                type="button"
                className={cn(when.date === iso && 'is-on')}
                onClick={() => {
                  edit({ date: iso })
                  setMenu(null)
                }}
              >
                {n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : 'In a week'}
              </button>
            )
          })}
        </div>
        <MiniMonth
          selected={when.date}
          todayIso={todayIso}
          inView={[]}
          itemsByDay={itemsByDay}
          onSelect={(iso) => {
            edit({ date: iso })
            setMenu(null)
          }}
        />
      </PopoverMenu>

      <PopoverMenu anchor={categoryAnchor} open={menu === 'category'} onClose={() => setMenu(null)} width={264} className="cal-cat-menu">
        <div className="cal-menu-list">
          {categories.map((c) => (
            <MenuItem
              key={c}
              icon={<span className="cal-dot" style={{ background: colorForCategory(c) }} />}
              label={c}
              selected={category === c}
              onSelect={() => {
                setCategory(c)
                setMenu(null)
              }}
            />
          ))}
        </div>
        <label className="cal-menu-new">
          <Plus size={14} strokeWidth={2.2} />
          <input
            placeholder="New calendar"
            value={newCategory}
            maxLength={32}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addCategory()
              }
            }}
          />
        </label>
        <div className="cal-menu-section">
          <span className="cal-menu-heading">Colour for this block</span>
          <div className="cal-swatches">
            <button
              type="button"
              className={cn('cal-swatch is-auto', !colorOverride && 'is-selected')}
              style={{ '--swatch': categoryColor } as CSSProperties}
              onClick={() => setColorOverride(undefined)}
              title={`Same as ${category}`}
              aria-label={`Same as ${category}`}
            >
              {!colorOverride && <Check size={11} strokeWidth={3} />}
            </button>
            {EVENT_COLOR_SWATCHES.map((sw) => (
              <button
                key={sw.hex}
                type="button"
                className={cn('cal-swatch', colorOverride === sw.hex && 'is-selected')}
                style={{ '--swatch': sw.hex } as CSSProperties}
                onClick={() => setColorOverride(sw.hex)}
                title={sw.name}
                aria-label={sw.name}
              >
                {colorOverride === sw.hex && <Check size={11} strokeWidth={3} />}
              </button>
            ))}
          </div>
        </div>
      </PopoverMenu>

      <PopoverMenu anchor={repeatAnchor} open={menu === 'repeat'} onClose={() => setMenu(null)} width={240}>
        {(['NONE', 'DAILY', 'WEEKLY', 'MONTHLY'] as CalendarRecurrence[]).map((r) => (
          <MenuItem
            key={r}
            label={repeatLabel(r, when.date)}
            selected={when.recurrence === r}
            onSelect={() => {
              edit({ recurrence: r })
              if (r === 'NONE') setMenu(null)
            }}
          />
        ))}
        {when.recurrence !== 'NONE' && (
          <label className="cal-menu-until">
            <span>Ends</span>
            <input type="date" value={recurrenceUntil} min={when.date} onChange={(e) => setRecurrenceUntil(e.target.value)} />
            {recurrenceUntil && (
              <button type="button" onClick={() => setRecurrenceUntil('')} aria-label="Repeat forever" title="Repeat forever">
                <X size={12} strokeWidth={2.4} />
              </button>
            )}
          </label>
        )}
      </PopoverMenu>

      {confirmCloseDialog}
    </>
  )
}

