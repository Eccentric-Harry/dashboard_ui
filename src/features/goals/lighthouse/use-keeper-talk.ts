import { useEffect, useMemo, useState } from 'react'
import type { ChatLine } from './lighthouse-voice'

const HEARD_KEY = 'lh.pip.heard'
/** Enough to tap through; more and the dots stop meaning anything. */
const MAX_LINES = 8

function readHeard(day: string): Set<string> {
  try {
    const v = JSON.parse(window.localStorage.getItem(HEARD_KEY) ?? 'null') as { day?: string; keys?: string[] } | null
    return new Set(v?.day === day && Array.isArray(v.keys) ? v.keys : [])
  } catch {
    return new Set()
  }
}

function markHeard(day: string, key: string) {
  try {
    const keys = readHeard(day)
    if (keys.has(key)) return
    keys.add(key)
    window.localStorage.setItem(HEARD_KEY, JSON.stringify({ day, keys: [...keys] }))
  } catch {
    // Without storage every visit simply opens on the most useful line.
  }
}

/**
 * Pip's queue of things to say. Pinned lines lead; the rest open on what wasn't heard yet
 * today (remembered per day), so a return visit starts somewhere new. The order is decided
 * from a snapshot taken when the day starts, so it never reshuffles under your finger.
 */
export function useKeeperTalk(lines: ChatLine[], day: string) {
  const [snap, setSnap] = useState(() => ({ day, heard: readHeard(day) }))
  const [at, setAt] = useState(0)
  if (snap.day !== day) {
    setSnap({ day, heard: readHeard(day) })
    setAt(0)
  }

  const ordered = useMemo(() => {
    const pinned = lines.filter((l) => l.pinned)
    const rest = lines.filter((l) => !l.pinned)
    return [...pinned, ...rest.filter((l) => !snap.heard.has(l.key)), ...rest.filter((l) => snap.heard.has(l.key))].slice(0, MAX_LINES)
  }, [lines, snap])

  // Something new and pinned (an offer, a phase starting) jumps to the front.
  const lead = ordered[0]?.pinned ? ordered[0].key : null
  const [lastLead, setLastLead] = useState(lead)
  if (lead !== lastLead) {
    setLastLead(lead)
    if (lead) setAt(0)
  }

  const index = ordered.length ? at % ordered.length : 0
  const line = ordered[index] ?? null
  useEffect(() => {
    if (line) markHeard(day, line.key)
  }, [day, line?.key]) // eslint-disable-line react-hooks/exhaustive-deps

  return { line, index, count: ordered.length, next: () => setAt((a) => a + 1) }
}
