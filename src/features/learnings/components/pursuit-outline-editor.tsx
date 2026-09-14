import { useEffect, useRef, useState, type ClipboardEvent, type CSSProperties, type KeyboardEvent } from 'react'
import { IndentDecrease, IndentIncrease, Plus, StickyNote, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  canIndent,
  createEmptyRow,
  normalizeRows,
  rowHasChildren,
  rowsFromPlainText,
  shiftSubtree,
  subtreeEnd,
  subtreeEstimate,
  type OutlineRow,
} from '../pursuit-import'
import { ESTIMATE_OPTIONS, MAX_TOTAL_STEPS, formatMinutes } from '../pursuit-tree'

const PLACEHOLDERS = ['Step — start with a verb', 'Sub-step', 'Detail']

interface PursuitOutlineEditorProps {
  rows: OutlineRow[]
  onChange: (rows: OutlineRow[]) => void
}

/**
 * Keyboard-first outline: Enter adds a step, Tab nests it, Shift+Tab lifts it out,
 * Backspace on an empty step removes it, and pasting a multi-line list splits it
 * into steps. Every action also has a button for touch screens.
 */
export function PursuitOutlineEditor({ rows, onChange }: PursuitOutlineEditorProps) {
  const inputs = useRef(new Map<string, HTMLInputElement>())
  const pendingFocus = useRef<string | null>(null)
  const [openNotes, setOpenNotes] = useState<Set<string>>(() => new Set())

  // Focus lands after the render that created/moved the row.
  useEffect(() => {
    if (!pendingFocus.current) return
    const el = inputs.current.get(pendingFocus.current)
    pendingFocus.current = null
    if (el) {
      el.focus()
      el.setSelectionRange(el.value.length, el.value.length)
    }
  })

  const commit = (next: OutlineRow[], focusKey?: string) => {
    if (focusKey) pendingFocus.current = focusKey
    onChange(next)
  }

  const update = (index: number, patch: Partial<OutlineRow>) =>
    commit(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))

  const insertAfter = (index: number) => {
    if (rows.length >= MAX_TOTAL_STEPS) return
    const row = rows[index]
    // A row with children gets its new step as the first child, like any outliner.
    const hasChildren = rows[index + 1] && rows[index + 1].depth > row.depth
    const created = createEmptyRow(hasChildren ? row.depth + 1 : row.depth)
    commit([...rows.slice(0, index + 1), created, ...rows.slice(index + 1)], created.key)
  }

  const append = () => {
    if (rows.length >= MAX_TOTAL_STEPS) return
    const created = createEmptyRow(0)
    commit([...rows, created], created.key)
  }

  const indent = (index: number) => {
    if (canIndent(rows, index)) commit(shiftSubtree(rows, index, 1), rows[index].key)
  }

  const outdent = (index: number) => {
    if (rows[index].depth > 0) commit(shiftSubtree(rows, index, -1), rows[index].key)
  }

  const removeWithChildren = (index: number) => {
    const next = [...rows.slice(0, index), ...rows.slice(subtreeEnd(rows, index))]
    commit(next.length ? normalizeRows(next) : [createEmptyRow()])
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.nativeEvent.isComposing) return
    const row = rows[index]
    if (e.key === 'Enter') {
      e.preventDefault()
      insertAfter(index)
    } else if (e.key === 'Tab' && !e.shiftKey && canIndent(rows, index)) {
      e.preventDefault()
      indent(index)
    } else if (e.key === 'Tab' && e.shiftKey && row.depth > 0) {
      e.preventDefault()
      outdent(index)
    } else if (e.key === 'Backspace' && row.text === '' && rows.length > 1) {
      e.preventDefault()
      // Only this row goes; its children are re-parented by normalizeRows.
      const next = normalizeRows(rows.filter((_, i) => i !== index))
      commit(next, next[Math.max(0, index - 1)].key)
    } else if (e.key === 'ArrowUp' && index > 0) {
      e.preventDefault()
      inputs.current.get(rows[index - 1].key)?.focus()
    } else if (e.key === 'ArrowDown' && index < rows.length - 1) {
      e.preventDefault()
      inputs.current.get(rows[index + 1].key)?.focus()
    }
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>, index: number) => {
    const text = e.clipboardData.getData('text')
    if (!text.includes('\n')) return
    e.preventDefault()
    const row = rows[index]
    const pasted = rowsFromPlainText(text, row.depth)
    if (pasted.length === 0) return
    const before = rows.slice(0, row.text.trim() ? index + 1 : index)
    const next = normalizeRows([...before, ...pasted, ...rows.slice(index + 1)]).slice(0, MAX_TOTAL_STEPS)
    commit(next, pasted[pasted.length - 1].key)
  }

  const toggleNote = (key: string) =>
    setOpenNotes((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  // 1-based position among top-level rows, shown as the row marker.
  const topLevelNumbers = rows.reduce<number[]>((acc, row, i) => {
    const prev = i > 0 ? acc[i - 1] : 0
    acc.push(row.depth === 0 ? prev + 1 : prev)
    return acc
  }, [])

  return (
    <div className="pursuit-outline">
      <ol className="pursuit-outline-list">
        {rows.map((row, index) => {
          const topLevelNumber = topLevelNumbers[index]
          const noteVisible = Boolean(row.note) || openNotes.has(row.key)
          return (
            <li
              key={row.key}
              className={cn('pursuit-outline-row', `is-depth-${row.depth}`)}
              style={{ '--outline-depth': row.depth } as CSSProperties}
            >
              <span className="pursuit-outline-marker" aria-hidden="true">
                {row.depth === 0 ? topLevelNumber : null}
              </span>
              <div className="pursuit-outline-fields">
                <input
                  ref={(el) => {
                    if (el) inputs.current.set(row.key, el)
                    else inputs.current.delete(row.key)
                  }}
                  className="pursuit-outline-input"
                  value={row.text}
                  placeholder={PLACEHOLDERS[row.depth]}
                  aria-label={`Level ${row.depth + 1} step`}
                  maxLength={200}
                  onChange={(e) => update(index, { text: e.target.value })}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  onPaste={(e) => handlePaste(e, index)}
                />
                {noteVisible && (
                  <input
                    className="pursuit-outline-note"
                    value={row.note}
                    placeholder="Note — what does done look like?"
                    aria-label="Step note"
                    maxLength={300}
                    onChange={(e) => update(index, { note: e.target.value })}
                  />
                )}
              </div>
              {rowHasChildren(rows, index) ? (
                subtreeEstimate(rows, index) > 0 && (
                  <span className="pursuit-outline-estimate is-sum" title="Sum of sub-steps">
                    {formatMinutes(subtreeEstimate(rows, index))}
                  </span>
                )
              ) : (
                <select
                  className={cn('pursuit-outline-estimate', !row.estimate && 'is-empty')}
                  value={row.estimate ?? ''}
                  onChange={(e) => update(index, { estimate: e.target.value ? Number(e.target.value) : null })}
                  aria-label="Estimated time"
                  title="Estimated time"
                >
                  <option value="">time</option>
                  {(row.estimate && !ESTIMATE_OPTIONS.includes(row.estimate)
                    ? [...ESTIMATE_OPTIONS, row.estimate].sort((a, b) => a - b)
                    : ESTIMATE_OPTIONS
                  ).map((m) => (
                    <option key={m} value={m}>{formatMinutes(m)}</option>
                  ))}
                </select>
              )}
              <div className="pursuit-outline-actions">
                <button
                  type="button"
                  className={cn('pursuit-icon-btn', noteVisible && 'is-active')}
                  onClick={() => {
                    if (row.note) update(index, { note: '' })
                    toggleNote(row.key)
                  }}
                  title={noteVisible ? 'Remove note' : 'Add note'}
                  aria-label={noteVisible ? 'Remove note' : 'Add note'}
                >
                  <StickyNote size={12} />
                </button>
                <button
                  type="button"
                  className="pursuit-icon-btn"
                  onClick={() => outdent(index)}
                  disabled={row.depth === 0}
                  title="Move out a level (Shift+Tab)"
                  aria-label="Move out a level"
                >
                  <IndentDecrease size={12} />
                </button>
                <button
                  type="button"
                  className="pursuit-icon-btn"
                  onClick={() => indent(index)}
                  disabled={!canIndent(rows, index)}
                  title="Nest under the step above (Tab)"
                  aria-label="Nest under the step above"
                >
                  <IndentIncrease size={12} />
                </button>
                <button
                  type="button"
                  className="pursuit-icon-btn is-danger"
                  onClick={() => removeWithChildren(index)}
                  title="Remove step and its sub-steps"
                  aria-label="Remove step"
                >
                  <X size={12} />
                </button>
              </div>
            </li>
          )
        })}
      </ol>

      <div className="pursuit-outline-footer">
        <button type="button" className="pursuit-outline-add" onClick={append} disabled={rows.length >= MAX_TOTAL_STEPS}>
          <Plus size={12} />
          Add step
        </button>
        <span className="pursuit-outline-hint">
          <kbd>Enter</kbd> new · <kbd>Tab</kbd> nest · <kbd>⇧ Tab</kbd> un-nest · paste a list to split it
        </span>
      </div>
    </div>
  )
}
