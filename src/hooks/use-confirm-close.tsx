import { useCallback, useState } from 'react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

/**
 * Guards a modal's close path behind a real dialog instead of `window.confirm`
 * — replaces `confirmCloseIfDirty` from `lib/modal-utils.ts`. Call the hook
 * unconditionally near the top of the modal component (before any early
 * `return null` for a closed/unmounted state, same as any other hook), use
 * `requestClose` everywhere the old guarded close handler was called (the
 * backdrop, the × button, Escape), and render `{dialog}` once inside the
 * modal's returned JSX — it portals itself, so placement doesn't matter.
 *
 * When the form isn't dirty, `requestClose` closes immediately, same as
 * before. When it is, it opens the dialog instead of blocking on
 * `window.confirm`; the modal stays mounted (and `isDirty` keeps updating)
 * until the user actually confirms.
 */
export function useConfirmClose(isDirty: boolean, onClose: () => void) {
  const [pending, setPending] = useState(false)

  const requestClose = useCallback(() => {
    if (isDirty) {
      setPending(true)
      return
    }
    onClose()
  }, [isDirty, onClose])

  const confirmDiscard = useCallback(() => {
    setPending(false)
    onClose()
  }, [onClose])

  const cancelDiscard = useCallback(() => setPending(false), [])

  const dialog = (
    <ConfirmDialog
      open={pending}
      title="Discard changes?"
      message="You have unsaved changes. Are you sure you want to discard them and close?"
      confirmLabel="Discard"
      cancelLabel="Keep editing"
      onConfirm={confirmDiscard}
      onCancel={cancelDiscard}
    />
  )

  return { requestClose, dialog }
}
