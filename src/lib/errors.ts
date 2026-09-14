/**
 * Best-effort, human-readable message from anything a `catch` block can receive —
 * an Error, a string, or an error-shaped object such as a service `ApiError`.
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'string') return error || fallback
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const { message } = error as { message: unknown }
    if (typeof message === 'string' && message) return message
  }
  return fallback
}
