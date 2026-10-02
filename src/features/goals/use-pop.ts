import { useEffect, useRef, useState } from 'react'

/** True for a moment after `lit` turns on — the lantern's swing-and-flash. */
export function usePop(lit: boolean, ms = 900): boolean {
  const [popped, setPopped] = useState(false)
  const was = useRef(lit)
  useEffect(() => {
    if (lit && !was.current) {
      was.current = lit
      setPopped(true)
      const t = window.setTimeout(() => setPopped(false), ms)
      return () => window.clearTimeout(t)
    }
    was.current = lit
  }, [lit, ms])
  return popped
}
