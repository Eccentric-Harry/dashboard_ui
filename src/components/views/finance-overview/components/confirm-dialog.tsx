import { X } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', cancelLabel = 'Cancel', onConfirm, onCancel }: ConfirmDialogProps) {
  if (!open) return null

  return (
    <div className="finance-modal-backdrop" onClick={onCancel}>
      <div className="finance-confirm-popover" onClick={e => e.stopPropagation()}>
        <button type="button" className="finance-modal-close" onClick={onCancel}>
          <X size={16} />
        </button>
        <h2>{title}</h2>
        <p className="finance-confirm-message">{message}</p>
        <div className="finance-confirm-actions">
          <button type="button" className="finance-confirm-btn cancel" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className="finance-confirm-btn confirm" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
