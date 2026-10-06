import { Undo2 } from 'lucide-react'

interface UndoBarProps {
  /** The pending undo; `id` changes per offer so the strip re-animates. */
  undo: { id: number; label: string } | null
  onUndo: () => void
}

/** The route's own "took that away — undo?" strip, docked at the foot of the list. */
function UndoBar({ undo, onUndo }: UndoBarProps) {
  if (!undo) return null
  return (
    <div className="shopping-undo" role="status" key={undo.id}>
      <span>{undo.label}</span>
      <button type="button" onClick={onUndo}>
        <Undo2 size={13} strokeWidth={2.4} /> Undo
      </button>
    </div>
  )
}

export { UndoBar }
