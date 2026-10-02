import { useState } from 'react'

/**
 * The last non-null value. A closing sheet keeps drawing what it showed while it shrinks
 * away, even though the parent has already cleared its state.
 */
export function useHeld<T>(value: T | null): T | null {
  const [held, setHeld] = useState<T | null>(value)
  if (value != null && value !== held) setHeld(value)
  return value ?? held
}
