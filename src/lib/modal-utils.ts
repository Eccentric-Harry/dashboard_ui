/**
 * Prompts user for confirmation before closing a modal if any form fields are filled or dirty.
 * @param isDirty Whether the form has unsaved or filled fields.
 * @param onClose Callback to close the modal.
 * @returns boolean True if the modal closed, false if the user cancelled closing.
 */
export function confirmCloseIfDirty(isDirty: boolean, onClose: () => void): boolean {
  if (isDirty) {
    const confirmed = window.confirm('You have unsaved changes. Are you sure you want to discard them and close?')
    if (!confirmed) {
      return false
    }
  }
  onClose()
  return true
}
