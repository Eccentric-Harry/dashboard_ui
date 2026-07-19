import { useCallback, useEffect, useState } from 'react'
import type { DailyRing, ManualMovePayload, RingDay } from '../../lib/api'
import { fetchRingsRange, fetchRingsToday, logManualMove, undoManualMove } from '../../lib/api'

/** Window-event name for cross-view ring refreshes — the `calendar-updated` convention. */
export const RINGS_UPDATED_EVENT = 'rings-updated'

export function emitRingsUpdated(): void {
  window.dispatchEvent(new CustomEvent(RINGS_UPDATED_EVENT))
}

export interface RingsData {
  /** Today's rings + streak + level; null while loading or after failure. */
  today: RingDay | null
  /** Ring days for the requested history window, ascending. */
  range: DailyRing[] | null
  loading: boolean
  failed: boolean
  refetch: () => Promise<void>
  /**
   * Log a manual move with an optimistic MOVE close; rolls back on failure
   * (the thrown error is the caller's cue to toast).
   */
  logMove: (payload: ManualMovePayload) => Promise<DailyRing>
  undoMove: (date: string) => Promise<void>
}

/** yyyy-MM-dd in local time (matches home-types isoDate). */
function iso(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * The rings data hook: fetches today + a history window, listens for
 * `rings-updated`, and applies optimistic closes for the manual move flow.
 * Failures leave `failed` set and everything else null — consumers isolate
 * the slice, they never blank the page.
 */
export function useRings(rangeDays = 21): RingsData {
  const [today, setToday] = useState<RingDay | null>(null)
  const [range, setRange] = useState<DailyRing[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  const refetch = useCallback(async () => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - (rangeDays - 1))
    try {
      const [todayRes, rangeRes] = await Promise.all([
        fetchRingsToday(),
        fetchRingsRange(iso(start), iso(end)),
      ])
      setToday(todayRes.data)
      setRange(rangeRes.data)
      setFailed(false)
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }, [rangeDays])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refetch()
  }, [refetch])

  useEffect(() => {
    const handleUpdate = () => {
      void refetch()
    }
    window.addEventListener(RINGS_UPDATED_EVENT, handleUpdate)
    return () => window.removeEventListener(RINGS_UPDATED_EVENT, handleUpdate)
  }, [refetch])

  const logMove = useCallback(
    async (payload: ManualMovePayload): Promise<DailyRing> => {
      const snapshot = today
      // Optimistic close: assume the manual minutes win and the ring shuts.
      if (today?.ring && payload.minutes >= today.ring.moveTargetMinutes) {
        const optimistic: DailyRing = {
          ...today.ring,
          moveMinutes: Math.max(today.ring.moveMinutes, payload.minutes),
          moveClosed: true,
          moveSource: 'MANUAL',
          ringsClosed: (today.ring.restClosed ? 1 : 0) + (today.ring.deepClosed ? 1 : 0) + 1,
        }
        setToday({ ...today, ring: { ...optimistic, perfect: optimistic.ringsClosed === 3 } })
      }
      try {
        const res = await logManualMove(payload)
        // Every mounted useRings (this one included) refetches off the event.
        emitRingsUpdated()
        return res.data
      } catch (error) {
        setToday(snapshot)
        throw error
      }
    },
    [today],
  )

  const undoMove = useCallback(async (date: string): Promise<void> => {
    await undoManualMove(date)
    emitRingsUpdated()
  }, [])

  return { today, range, loading, failed, refetch, logMove, undoMove }
}
