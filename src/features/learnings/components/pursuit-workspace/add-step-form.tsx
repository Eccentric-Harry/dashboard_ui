import { useState } from 'react'
import { Check, CornerDownRight, Loader2, X } from 'lucide-react'

interface AddStepFormProps {
  placeholder: string
  /** Resolves true once saved; the input then clears so several steps can go in a row. */
  onSubmit: (text: string) => Promise<boolean>
  onClose: () => void
}

export function AddStepForm({ placeholder, onSubmit, onClose }: AddStepFormProps) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    const value = text.trim()
    if (!value || busy) return
    setBusy(true)
    const ok = await onSubmit(value)
    setBusy(false)
    if (ok) setText('')
  }

  return (
    <form
      className="pw-add"
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      <CornerDownRight size={13} className="pw-add-glyph" aria-hidden="true" />
      <input
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose()
          // Handle Enter here rather than relying on implicit form submission, so rapid
          // entry works everywhere; skip while an IME is still composing.
          if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
            e.preventDefault()
            void submit()
          }
        }}
        placeholder={placeholder}
        maxLength={200}
        aria-label={placeholder}
      />
      <button type="submit" className="pw-act is-save" disabled={!text.trim() || busy} title="Save (Enter)" aria-label="Save step">
        {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={14} strokeWidth={2.8} />}
      </button>
      <button type="button" className="pw-act" onClick={onClose} title="Done adding (Esc)" aria-label="Stop adding steps">
        <X size={14} strokeWidth={2.8} />
      </button>
    </form>
  )
}
