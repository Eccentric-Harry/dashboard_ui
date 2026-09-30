import { createElement, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import {
  AlignLeft,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  Flag,
  ListChecks,
  Loader2,
  Plus,
  Repeat,
  Sun,
  Trash2,
  Users,
  X,
} from 'lucide-react'
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
import { iconForItem } from '../calendar-icons'
import { DAY_MINUTES, DEFAULT_BLOCK_MINUTES, formatDuration, formatMinuteRange, minutesToTime, timeToMinutes } from '../calendar-time'
import { parseEntry, type ParseKind } from '../natural-language'
import { DayGlance } from './composer/day-glance'
import { MenuItem, PopoverMenu } from './composer/popover-menu'
import { TimeSelect } from './composer/time-select'

import './calendar-item-modal.css'

// ── Vocabulary ───────────────────────────────────────────────────────────────

const TYPES: { value: CalendarItemType; label: string; hint: string; icon: typeof ListChecks }[] = [
  { value: 'TASK', label: 'Task', hint: 'Something to get done', icon: ListChecks },
  { value: 'EVENT', label: 'Event', hint: 'Time you’re somewhere', icon: Users },
  { value: 'REMINDER', label: 'Reminder', hint: 'A nudge at a time', icon: Bell },
  { value: 'MILESTONE', label: 'Milestone', hint: 'A marker worth noting', icon: Flag },
]

const DURATIONS = [15, 30, 45, 60, 90, 120]
const SLOTS = Array.from({ length: DAY_MINUTES / 15 }, (_, i) => i * 15)

export type CalendarDraft = { startTime: string; endTime: string }

type Props = {
  date: string
  item?: CalendarItem
  /** Times swept out on the grid — a new block starts from these. */
  draft?: CalendarDraft
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
    const start = timeToMinutes(item?.startTime ?? draft?.startTime ?? '09:00')
    const endRaw = item?.endTime ?? draft?.endTime
    // Some synced items carry a start but no end — treat them as an hour long.
    const end = endRaw ? timeToMinutes(endRaw) : Math.min(DAY_MINUTES, start + DEFAULT_BLOCK_MINUTES)
    return {
      date: item?.originalDate ?? item?.date ?? date,
      start,
      end: end >= DAY_MINUTES - 1 ? DAY_MINUTES : end,
      allDay: item ? Boolean(item.allDay || !item.startTime) : false,
      recurrence: item?.recurrenceFrequency ?? 'NONE',
    }
  })

  const [text, setText] = useState(item?.title ?? '')
  const [base, setBase] = useState<When>(initialWhen)
  const [dismissed, setDismissed] = useState<ParseKind[]>([])
  const [itemType, setItemType] = useState<CalendarItemType>(item?.itemType ?? 'TASK')
  const [category, setCategory] = useState(item?.category ?? 'Personal')
  const [colorOverride, setColorOverride] = useState<string | undefined>(() => getCustomItemColor(item ?? {}))
  const [recurrenceUntil, setRecurrenceUntil] = useState(item?.recurrenceUntil ?? '')
  const [notes, setNotes] = useState(item?.notes ?? '')
  const [notesOpen, setNotesOpen] = useState(Boolean(item?.notes))
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
  const [menu, setMenu] = useState<null | 'type' | 'category' | 'repeat'>(null)
  const [typeAnchor, setTypeAnchor] = useState<HTMLElement | null>(null)
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
  const blockIcon = iconForItem({ title: title || text, category, itemType })
  const typeMeta = TYPES.find((t) => t.value === itemType) ?? TYPES[0]
  const duration = when.end - when.start
  const timesValid = when.allDay || duration > 0
  const categories = [...CATEGORY_OPTIONS.map((o) => o.label), ...customCategories]
  const editingId = item?.id
  const dayOthers = useMemo(
    () => items.filter((o) => o.date === when.date && !(editingId && o.id === editingId)),
    [items, when.date, editingId],
  )

  const dayChoices = useMemo(() => {
    const list = Array.from({ length: 7 }, (_, i) => toISO(new Date(today.getFullYear(), today.getMonth(), today.getDate() + i)))
    if (!list.includes(when.date)) list.unshift(when.date)
    return list
  }, [today, when.date])

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

  const heading = isEdit ? 'Edit block' : 'New block'
  const endOptions = [...SLOTS.filter((m) => m > when.start), DAY_MINUTES]

  return (
    <>
      <div className="cal-modal-backdrop" role="presentation" onClick={requestClose}>
        <div
          className="cal-composer-modal"
          role="dialog"
          aria-modal="true"
          aria-label={heading}
          style={{ '--cal-accent': accent } as CSSProperties}
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
            <header className="cal-composer-top">
              <span className="cal-eyebrow">{heading}</span>
              <button type="button" className="cal-icon-btn" onClick={requestClose} aria-label="Close">
                <X size={15} />
              </button>
            </header>

            <div className="cal-composer-body">
              {/* ── Name ── */}
              <div className="cal-name-row">
                <span className="cal-name-icon" aria-hidden="true">
                  {createElement(blockIcon, { size: 20, strokeWidth: 2.2 })}
                </span>
                <div className="cal-name-stack">
                  <input
                    className="cal-name-input"
                    type="text"
                    autoFocus
                    autoComplete="off"
                    maxLength={160}
                    placeholder={isEdit ? 'Name' : 'What’s the plan?'}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    aria-label="Name"
                  />
                  {parsedChips.length > 0 ? (
                    <div className="cal-parsed" aria-live="polite">
                      <span className="cal-parsed-lead">Understood</span>
                      {parsedChips.map((chip) => (
                        <span key={chip.kind} className="cal-parsed-chip">
                          {chip.label}
                          <button
                            type="button"
                            aria-label={`Keep “${chip.label}” in the name instead`}
                            title="Keep this in the name instead"
                            onClick={() => setDismissed((d) => [...d, chip.kind])}
                          >
                            <X size={10} strokeWidth={3} />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    !isEdit && (
                      <p className="cal-name-hint">
                        Type it how you’d say it — <em>“Gym tomorrow 7am for 45m”</em> or <em>“Standup 10–10:15 every day”</em>
                      </p>
                    )
                  )}
                </div>
              </div>

              {/* ── When ── */}
              <section className="cal-when" aria-label="When">
                <div className="cal-day-row" role="radiogroup" aria-label="Day">
                  {dayChoices.map((iso) => {
                    const d = parseISODate(iso)
                    const label = dayLabel(iso, todayIso)
                    const relative = label === 'Today' || label === 'Tomorrow'
                    return (
                      <button
                        key={iso}
                        type="button"
                        role="radio"
                        aria-checked={when.date === iso}
                        className={cn('cal-day-pill', when.date === iso && 'is-selected', relative && 'is-relative')}
                        onClick={() => edit({ date: iso })}
                      >
                        {relative ? (
                          <b>{label}</b>
                        ) : (
                          <>
                            <small>{d.toLocaleDateString('en-US', { weekday: 'short' })}</small>
                            <b>{d.getDate()}</b>
                          </>
                        )}
                      </button>
                    )
                  })}
                  <label className="cal-day-pill is-picker" title="Pick a date">
                    <CalendarDays size={15} strokeWidth={2.2} />
                    <input
                      type="date"
                      value={when.date}
                      aria-label="Pick a date"
                      onClick={(e) => {
                        try {
                          e.currentTarget.showPicker()
                        } catch {
                          // older browsers open the picker on their own
                        }
                      }}
                      onChange={(e) => e.target.value && edit({ date: e.target.value })}
                    />
                  </label>
                </div>

                <div className="cal-time-row">
                  {when.allDay ? (
                    <span className="cal-allday-note">
                      <Sun size={14} strokeWidth={2.2} /> All day · {dayLabel(when.date, todayIso)}
                    </span>
                  ) : (
                    <>
                      <TimeSelect
                        ariaLabel="Starts"
                        value={when.start}
                        options={SLOTS}
                        onChange={(s) => edit({ start: s, end: Math.min(DAY_MINUTES, s + (duration > 0 ? duration : 60)) })}
                      />
                      <span className="cal-time-arrow" aria-hidden="true">→</span>
                      <TimeSelect ariaLabel="Ends" value={when.end} from={when.start} options={endOptions} onChange={(e) => edit({ end: e })} />
                      <span className={cn('cal-length', !timesValid && 'is-bad')}>
                        {timesValid ? formatDuration(duration) : 'Ends before it starts'}
                      </span>
                    </>
                  )}
                  <label className="cal-switch">
                    <input type="checkbox" checked={when.allDay} onChange={(e) => edit({ allDay: e.target.checked })} />
                    <span className="cal-switch-track" aria-hidden="true" />
                    <span>All day</span>
                  </label>
                </div>

                {!when.allDay && (
                  <>
                    <div className="cal-length-row" role="group" aria-label="Length">
                      {DURATIONS.map((d) => (
                        <button
                          key={d}
                          type="button"
                          className={cn('cal-length-chip', duration === d && 'is-active')}
                          onClick={() => edit({ end: Math.min(DAY_MINUTES, when.start + d) })}
                        >
                          {formatDuration(d)}
                        </button>
                      ))}
                    </div>
                    <DayGlance
                      others={dayOthers}
                      start={when.start}
                      end={timesValid ? when.end : when.start + 15}
                      now={when.date === todayIso ? today.getHours() * 60 + today.getMinutes() : undefined}
                      onChange={(s, e) => edit({ start: s, end: e })}
                    />
                  </>
                )}
              </section>

              {/* ── Properties ── */}
              <div className="cal-props" aria-label="Details">
                <PropPill refFn={setTypeAnchor} open={menu === 'type'} onClick={() => setMenu(menu === 'type' ? null : 'type')} icon={createElement(typeMeta.icon, { size: 13, strokeWidth: 2.4 })}>
                  {typeMeta.label}
                </PropPill>
                <PropPill
                  refFn={setCategoryAnchor}
                  open={menu === 'category'}
                  onClick={() => setMenu(menu === 'category' ? null : 'category')}
                  icon={<span className="cal-dot" style={{ background: accent }} />}
                >
                  {category}
                </PropPill>
                <PropPill
                  refFn={setRepeatAnchor}
                  open={menu === 'repeat'}
                  active={when.recurrence !== 'NONE'}
                  onClick={() => setMenu(menu === 'repeat' ? null : 'repeat')}
                  icon={<Repeat size={13} strokeWidth={2.4} />}
                >
                  {repeatLabel(when.recurrence, when.date)}
                </PropPill>
                <button type="button" className={cn('cal-prop', notesOpen && 'is-active')} onClick={() => setNotesOpen((o) => !o)} aria-expanded={notesOpen}>
                  <AlignLeft size={13} strokeWidth={2.4} /> Notes
                </button>
                {isEdit && (
                  <button type="button" className={cn('cal-prop', completed && 'is-done')} onClick={() => setCompleted((c) => !c)} aria-pressed={completed}>
                    <Check size={13} strokeWidth={2.8} /> {completed ? 'Done' : 'Mark done'}
                  </button>
                )}
              </div>

              {isSeries && <p className="cal-series-note">Changes apply to every occurrence of this repeating block.</p>}

              {notesOpen && (
                <textarea
                  className="cal-notes"
                  placeholder="Context, links, a checklist ( - [ ] item )…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  autoFocus={!item?.notes}
                />
              )}
            </div>

            <footer className="cal-composer-foot">
              {isEdit && onDelete && item ? (
                <button type="button" className="cal-delete" onClick={() => onDelete(item)}>
                  <Trash2 size={14} strokeWidth={2.2} /> Delete
                </button>
              ) : (
                <span className="cal-keys" aria-hidden="true">
                  <kbd>⌘</kbd>
                  <kbd>↵</kbd> save <span className="cal-keys-sep" /> <kbd>esc</kbd> close
                </span>
              )}
              {error && <p className="cal-error" role="alert">{error}</p>}
              <div className="cal-foot-actions">
                <button type="button" className="cal-ghost-btn" onClick={requestClose}>Cancel</button>
                <button type="submit" className="cal-primary-btn" disabled={saving || !title}>
                  {saving ? <Loader2 className="animate-spin" size={16} /> : isEdit ? 'Save' : 'Add to calendar'}
                </button>
              </div>
            </footer>
          </form>
        </div>
      </div>

      {/* ── Menus (portalled so the body can never clip them) ── */}
      <PopoverMenu anchor={typeAnchor} open={menu === 'type'} onClose={() => setMenu(null)} width={230}>
        {TYPES.map((t) => (
          <MenuItem
            key={t.value}
            icon={createElement(t.icon, { size: 14, strokeWidth: 2.2 })}
            label={t.label}
            hint={t.hint}
            selected={itemType === t.value}
            onSelect={() => {
              setItemType(t.value)
              setMenu(null)
            }}
          />
        ))}
      </PopoverMenu>

      <PopoverMenu anchor={categoryAnchor} open={menu === 'category'} onClose={() => setMenu(null)} width={248}>
        <div className="cal-menu-scroll">
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
        <div className="cal-menu-new">
          <Plus size={13} strokeWidth={2.4} />
          <input
            placeholder="New category"
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
        </div>
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
              Auto
            </button>
            {EVENT_COLOR_SWATCHES.map((s) => (
              <button
                key={s.hex}
                type="button"
                className={cn('cal-swatch', colorOverride === s.hex && 'is-selected')}
                style={{ '--swatch': s.hex } as CSSProperties}
                onClick={() => setColorOverride(s.hex)}
                title={s.name}
                aria-label={s.name}
              />
            ))}
          </div>
        </div>
      </PopoverMenu>

      <PopoverMenu anchor={repeatAnchor} open={menu === 'repeat'} onClose={() => setMenu(null)} width={250}>
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
            <span>Until</span>
            <input type="date" value={recurrenceUntil} min={when.date} onChange={(e) => setRecurrenceUntil(e.target.value)} />
            {recurrenceUntil && (
              <button type="button" onClick={() => setRecurrenceUntil('')} aria-label="Repeat forever">
                <X size={11} strokeWidth={2.6} />
              </button>
            )}
          </label>
        )}
      </PopoverMenu>

      {confirmCloseDialog}
    </>
  )
}

function PropPill({
  refFn,
  open,
  active,
  onClick,
  icon,
  children,
}: {
  refFn: (el: HTMLElement | null) => void
  open: boolean
  active?: boolean
  onClick: () => void
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <button
      ref={refFn}
      type="button"
      className={cn('cal-prop', (open || active) && 'is-active')}
      aria-haspopup="menu"
      aria-expanded={open}
      onClick={onClick}
    >
      {icon}
      <span className="cal-prop-label">{children}</span>
      <ChevronDown size={12} strokeWidth={2.4} className="cal-prop-caret" />
    </button>
  )
}
