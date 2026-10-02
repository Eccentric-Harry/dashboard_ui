// Read-aloud for the Quiet Path's sessions, with the browser's own speech synthesis — a
// calm local voice if there is one, slowed down a little. Optional and remembered per
// device; it never sends text anywhere (speechSynthesis runs on the device).

import { useSyncExternalStore } from 'react'

const KEY = 'qp.voice'
const listeners = new Set<() => void>()
let enabled = (() => {
  try {
    return window.localStorage.getItem(KEY) === 'on'
  } catch {
    return false
  }
})()

const supported = () => typeof window !== 'undefined' && 'speechSynthesis' in window

// Gentle-sounding voices that ship with common systems, best first.
const PREFERRED = ['Samantha', 'Karen', 'Moira', 'Serena', 'Kate', 'Martha', 'Google UK English Female', 'Microsoft Sonia', 'Microsoft Aria', 'Daniel']

function voice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith('en'))
  for (const name of PREFERRED) {
    const v = voices.find((x) => x.name.includes(name) && x.localService)
    if (v) return v
  }
  return voices.find((v) => v.localService) ?? voices[0] ?? null
}

export const speech = {
  supported,
  get enabled() {
    return enabled && supported()
  },
  setEnabled(on: boolean) {
    enabled = on
    try {
      window.localStorage.setItem(KEY, on ? 'on' : 'off')
    } catch {
      // Lasts for this visit only.
    }
    if (!on) this.stop()
    listeners.forEach((fn) => fn())
  },
  say(text: string) {
    if (!this.enabled) return
    const synth = window.speechSynthesis
    synth.cancel()
    const u = new SpeechSynthesisUtterance(text.replace(/[“”]/g, ''))
    const v = voice()
    if (v) u.voice = v
    u.rate = 0.86
    u.pitch = 0.96
    u.volume = 0.9
    synth.speak(u)
  },
  stop() {
    if (supported()) window.speechSynthesis.cancel()
  },
}

export function useSpeechEnabled() {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    () => speech.enabled,
    () => false,
  )
}
