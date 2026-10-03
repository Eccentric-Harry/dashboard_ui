import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Keyboard, Palette, Trash2, X } from 'lucide-react'

import { colorForCategory, EVENT_COLOR_SWATCHES } from '../calendar-colors'
import { cn } from '@/lib/utils'

function Dialog({ label, onClose, className, children }: { label: string; onClose: () => void; className?: string; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])
  return createPortal(
    <div className="cv-portal cv-dialog-backdrop" role="presentation" onClick={onClose}>
      <div className={cn('cv-dialog', className)} role="dialog" aria-modal="true" aria-label={label} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body,
  )
}

/** A repeating block: delete this date only, or the whole series. */
export function DeleteSeriesDialog({ title, onOnlyThis, onAll, onCancel }: { title: string; onOnlyThis: () => void; onAll: () => void; onCancel: () => void }) {
  return (
    <Dialog label="Delete repeating block" onClose={onCancel} className="is-narrow">
      <span className="cv-dialog-ic is-danger" aria-hidden="true">
        <Trash2 size={18} />
      </span>
      <h2>Delete “{title}”?</h2>
      <p>It repeats. Remove just this date, or every occurrence?</p>
      <div className="cv-dialog-stack">
        <button type="button" className="cv-btn is-danger" onClick={onOnlyThis}>
          Only this one
        </button>
        <button type="button" className="cv-btn is-danger-soft" onClick={onAll}>
          The whole series
        </button>
        <button type="button" className="cv-btn is-ghost" onClick={onCancel}>
          Keep it
        </button>
      </div>
    </Dialog>
  )
}

/** Pick a colour per category. Stored locally (see calendar-colors.ts). */
export function ColorEditDialog({
  categories,
  onApply,
  onReset,
  onClose,
}: {
  categories: string[]
  onApply: (colors: Record<string, string>) => void
  onReset: () => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState<Record<string, string>>(() => Object.fromEntries(categories.map((c) => [c, colorForCategory(c)])))
  const [picking, setPicking] = useState<string | null>(null)

  return (
    <Dialog label="Category colours" onClose={onClose}>
      <header className="cv-dialog-head">
        <Palette size={15} />
        <h2>Category colours</h2>
        <button type="button" className="cv-icon-btn is-sm" onClick={onClose} aria-label="Close">
          <X size={14} />
        </button>
      </header>
      <ul className="cv-colors">
        {categories.map((c) => (
          <li key={c}>
            <button type="button" className={cn('cv-colors-row', picking === c && 'is-open')} onClick={() => setPicking(picking === c ? null : c)}>
              <i style={{ background: draft[c] }} aria-hidden="true" />
              <span>{c}</span>
              <small>{picking === c ? 'Choose below' : 'Change'}</small>
            </button>
            {picking === c && (
              <div className="cv-colors-swatches">
                {EVENT_COLOR_SWATCHES.map((s) => (
                  <button
                    key={s.hex}
                    type="button"
                    className={cn('cv-swatch', draft[c]?.toLowerCase() === s.hex && 'is-selected')}
                    style={{ background: s.hex }}
                    title={s.name}
                    aria-label={s.name}
                    onClick={() => setDraft((d) => ({ ...d, [c]: s.hex }))}
                  />
                ))}
                <label className="cv-swatch is-custom" title="Any colour">
                  <input type="color" value={draft[c]?.startsWith('#') ? draft[c] : '#7c3aed'} onChange={(e) => setDraft((d) => ({ ...d, [c]: e.target.value }))} />
                </label>
              </div>
            )}
          </li>
        ))}
      </ul>
      <footer className="cv-dialog-foot">
        <button
          type="button"
          className="cv-btn is-ghost"
          onClick={() => {
            onReset()
            setDraft(Object.fromEntries(categories.map((c) => [c, colorForCategory(c)])))
          }}
        >
          Reset to defaults
        </button>
        <button type="button" className="cv-btn is-primary" onClick={() => onApply(draft)}>
          Apply
        </button>
      </footer>
    </Dialog>
  )
}

const SHORTCUTS: [string, string][] = [
  ['T', 'Jump to today'],
  ['← →  or  J K', 'Previous / next'],
  ['D  X  W  M  A', 'Day · Work week · Week · Month · Agenda'],
  ['N  or  C', 'New block'],
  ['Q', 'Quick add'],
  ['/', 'Search'],
  ['E', 'Edit the open block'],
  ['⌫', 'Delete the open block'],
  ['[', 'Show / hide the sidebar'],
  ['Esc', 'Close'],
  ['?', 'This list'],
]

export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  return (
    <Dialog label="Keyboard shortcuts" onClose={onClose} className="is-narrow">
      <header className="cv-dialog-head">
        <Keyboard size={15} />
        <h2>Keyboard shortcuts</h2>
        <button type="button" className="cv-icon-btn is-sm" onClick={onClose} aria-label="Close">
          <X size={14} />
        </button>
      </header>
      <dl className="cv-keys">
        {SHORTCUTS.map(([keys, what]) => (
          <div key={keys}>
            <dt>
              {keys.split('  ').map((k) => (k === 'or' ? <span key={k}>or</span> : <kbd key={k}>{k}</kbd>))}
            </dt>
            <dd>{what}</dd>
          </div>
        ))}
      </dl>
      <p className="cv-keys-foot">Drag on the grid to sweep out a block · drag a block to move it · drag its bottom edge to resize.</p>
    </Dialog>
  )
}
