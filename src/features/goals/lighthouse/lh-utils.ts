// Hooks and formatting for The Lighthouse: day and time words, a render-pure stopwatch, the
// screen wake lock, the coach's device voice, the photo/recording loader and two file helpers.

import { useEffect, useState } from 'react'
import { programService } from '@/services/program-service'
import { programActions, useProgramStore } from '@/store/program-store'
import { campSound } from '../camp-sound'

export const formatMinutes = (min: number) => {
  const m = Math.round(min)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r ? `${h}h ${r}m` : `${h}h`
}

export const formatClock = (sec: number) => {
  const s = Math.max(0, Math.ceil(sec))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export const shortDay = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

export const dayMonth = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

/**
 * A stopwatch that survives a backgrounded tab: elapsed time is derived from timestamps,
 * never from counting ticks (phones throttle timers when the screen locks).
 */
export function useStopwatch() {
  const [s, setS] = useState({ running: false, startedAt: 0, banked: 0, now: 0 })

  useEffect(() => {
    if (!s.running) return
    const t = window.setInterval(() => setS((prev) => ({ ...prev, now: performance.now() })), 250)
    return () => window.clearInterval(t)
  }, [s.running])

  const elapsed = s.banked + (s.running ? Math.max(0, s.now - s.startedAt) / 1000 : 0)

  return {
    running: s.running,
    elapsed,
    start: () =>
      setS((prev) => {
        if (prev.running) return prev
        const t = performance.now()
        return { ...prev, running: true, startedAt: t, now: t }
      }),
    pause: () =>
      setS((prev) => {
        if (!prev.running) return prev
        const t = performance.now()
        return { running: false, startedAt: 0, now: 0, banked: prev.banked + Math.max(0, t - prev.startedAt) / 1000 }
      }),
    reset: () => setS({ running: false, startedAt: 0, banked: 0, now: 0 }),
    /** Jumps to `sec` elapsed, keeping it running if it was. */
    seek: (sec: number) =>
      setS((prev) => {
        const t = performance.now()
        return { ...prev, banked: Math.max(0, sec), startedAt: t, now: t }
      }),
  }
}

/** Keeps the screen awake while a timer runs (where the browser allows it). */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let released = false
    const request = () => {
      navigator.wakeLock
        .request('screen')
        .then((l) => {
          if (released) void l.release()
          else lock = l
        })
        .catch(() => {
          // Low battery or a background tab — the timer still works, the screen may sleep.
        })
    }
    request()
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !lock) request()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      released = true
      document.removeEventListener('visibilitychange', onVisible)
      void lock?.release()
    }
  }, [active])
}

/** Speaks a short cue in the device voice (the coach), when sound is on. */
export function say(text: string) {
  if (!campSound.enabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return
  try {
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.rate = 1.02
    u.pitch = 1.05
    window.speechSynthesis.speak(u)
  } catch {
    // No voice on this device — the chime and the vibration still mark the change.
  }
}

/** A photo or recording's data: URL, fetched once per session and kept in the store. */
export function useMediaUrl(programId: string | undefined, mediaId: string | null | undefined) {
  const cached = useProgramStore.use.mediaData()[mediaId ?? '']
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    if (!programId || !mediaId || cached) return
    let alive = true
    void programService.getMedia(programId, mediaId).then((res) => {
      if (!alive) return
      if (res.data?.dataUrl) programActions.cacheMedia(mediaId, res.data.dataUrl)
      else setFailed(true)
    })
    return () => {
      alive = false
    }
  }, [programId, mediaId, cached])
  return { url: cached ?? null, failed }
}

/** Shrinks a photo to a long edge of `edge` px as a JPEG data: URL (keeps uploads small). */
export async function photoToDataUrl(file: File, edge = 1280, quality = 0.82): Promise<string> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const g = canvas.getContext('2d')
  if (!g) throw new Error('No canvas')
  g.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', quality)
}

export const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })

/**
 * An if-then plan as its two halves — the cue and the action (Gollwitzer's implementation
 * intentions). "If it's 7:00, then shoes on." → { when: "it's 7:00", then: "shoes on" }.
 * Text that isn't in that shape keeps every word, as the action.
 */
export function splitIfThen(plan: string): { when: string; then: string } {
  const m = plan.trim().match(/^if\s+([\s\S]*?)\s*,?\s+then\s+([\s\S]*?)\s*\.?$/i)
  if (m) return { when: m[1].replace(/,$/, ''), then: m[2] }
  return { when: '', then: plan.trim() }
}

/** The two halves back into one sentence, the way the plan is stored. */
export function joinIfThen(when: string, then: string): string {
  const w = when.trim().replace(/^if\s+/i, '').replace(/[,.]+$/, '')
  const t = then.trim().replace(/^then\s+/i, '').replace(/\.+$/, '')
  if (!w && !t) return ''
  if (!w) return t
  return `If ${w}, then ${t}.`
}
