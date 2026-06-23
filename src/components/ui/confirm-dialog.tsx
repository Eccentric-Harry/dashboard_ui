import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import './confirm-dialog.css'

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

  const modalContent = (
    <div className="confirm-modal-backdrop" onClick={onCancel}>
      <div className="confirm-popover" onClick={e => e.stopPropagation()}>
        <div className="confirm-header">
          <h2>{title}</h2>
          <button type="button" className="confirm-modal-close" onClick={onCancel}>
            <X size={16} />
          </button>
        </div>
        <div className="confirm-inner-card">
          <p className="confirm-message">{message}</p>
        </div>
        <div className="confirm-actions">
          <button type="button" className="confirm-btn cancel" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className="confirm-btn confirm" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
