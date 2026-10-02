// The camp's sound — every effect synthesized with the Web Audio API, so there are no
// audio files to fetch or license. Short, soft and musical: a lantern pops on a pentatonic
// note that climbs as the day fills (Duolingo's combo idea), a claim rings a rising major
// third, each character "talks" in quick pitched blips (Animal Crossing's animalese idea).
//
// Effects are on by default and muted with one tap (remembered per device); the ambience
// (fire crackle, crickets at night, birds by day) is a separate opt-in. Nothing plays until
// the first gesture — browsers only start an AudioContext from one, and every effect here
// answers a gesture anyway.

import { useSyncExternalStore } from 'react'
import { HOLD_MS } from './use-hold'

export type CampSoundName =
  | 'tap'
  | 'nudge'
  | 'pop'
  | 'chime'
  | 'coin'
  | 'sparkle'
  | 'open'
  | 'close'
  | 'page'
  | 'step-up'
  | 'step-down'
  | 'chest-shake'
  | 'chest-open'
  | 'sticker'
  | 'buy'
  | 'equip'
  | 'day-done'
  | 'week-kept'
  | 'soft-no'
  | 'wish'
  | 'step'
  | 'bell'
  | 'breath-in'
  | 'breath-top'
  | 'breath-out'

export type CampVoice = 'pip' | 'wren' | 'fen' | 'moss' | 'kiri' | 'bo' | 'tova' | 'ollie' | 'bram' | 'luma' | 'dot' | 'gus' | 'sora'

type AmbienceScene = 'dawn' | 'day' | 'golden' | 'night'

const SOUND_KEY = 'camp.sound'
const AMBIENCE_KEY = 'camp.ambience'

const readPref = (key: string, fallback: boolean) => {
  try {
    const v = window.localStorage.getItem(key)
    return v == null ? fallback : v === 'on'
  } catch {
    return fallback
  }
}
const writePref = (key: string, on: boolean) => {
  try {
    window.localStorage.setItem(key, on ? 'on' : 'off')
  } catch {
    // Private mode or blocked storage: the choice just lasts for this visit.
  }
}

// C major pentatonic from C5 — any run of these sounds pleasant together.
const PENTATONIC = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51, 1567.98, 1760.0]

const VOICES: Record<CampVoice, { base: number; speed: number; wave: OscillatorType; spread: number; max: number }> = {
  pip: { base: 520, speed: 0.052, wave: 'triangle', spread: 0.07, max: 16 },
  wren: { base: 980, speed: 0.036, wave: 'sine', spread: 0.1, max: 20 },
  fen: { base: 330, speed: 0.06, wave: 'square', spread: 0.06, max: 15 },
  moss: { base: 165, speed: 0.1, wave: 'sine', spread: 0.04, max: 10 },
  // The Quiet Path: Kiri, and a voice for each resident (worlds/quiet-path/residents.ts).
  kiri: { base: 196, speed: 0.11, wave: 'sine', spread: 0.035, max: 9 },
  bo: { base: 240, speed: 0.075, wave: 'triangle', spread: 0.05, max: 11 },
  tova: { base: 150, speed: 0.12, wave: 'sine', spread: 0.03, max: 8 },
  ollie: { base: 560, speed: 0.045, wave: 'triangle', spread: 0.08, max: 16 },
  bram: { base: 262, speed: 0.065, wave: 'triangle', spread: 0.05, max: 12 },
  luma: { base: 1180, speed: 0.034, wave: 'sine', spread: 0.09, max: 18 },
  dot: { base: 720, speed: 0.09, wave: 'sine', spread: 0.04, max: 9 },
  gus: { base: 300, speed: 0.06, wave: 'square', spread: 0.05, max: 13 },
  sora: { base: 880, speed: 0.05, wave: 'triangle', spread: 0.07, max: 15 },
}

interface ToneOpts {
  type?: OscillatorType
  gain?: number
  attack?: number
  slideTo?: number
  slideFrom?: number
  lowpass?: number
}

interface NoiseOpts {
  filter?: BiquadFilterType
  freq?: number
  freqTo?: number
  q?: number
  gain?: number
}

class CampSoundEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private noiseBuffer: AudioBuffer | null = null
  private charge: { osc: OscillatorNode; gain: GainNode } | null = null
  private ambienceTimers: number[] = []
  private ambienceBed: { src: AudioBufferSourceNode; gain: GainNode } | null = null
  private scene: AmbienceScene = 'day'
  /** True while the camp is on screen — ambience never plays anywhere else. */
  private active = false
  private listeners = new Set<() => void>()
  private snapshot: { enabled: boolean; ambience: boolean }

  constructor() {
    this.snapshot = {
      enabled: typeof window === 'undefined' ? false : readPref(SOUND_KEY, true),
      ambience: typeof window === 'undefined' ? false : readPref(AMBIENCE_KEY, false),
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) this.stopAmbience()
        else if (this.active && this.snapshot.ambience && this.ctx) this.startAmbience()
      })
    }
  }

  // ── Preferences ──────────────────────────────────────────────────────

  get enabled() {
    return this.snapshot.enabled
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  getSnapshot = () => this.snapshot

  private emit() {
    this.listeners.forEach((fn) => fn())
  }

  setEnabled(on: boolean) {
    this.snapshot = { ...this.snapshot, enabled: on }
    writePref(SOUND_KEY, on)
    if (!on) this.chargeStop()
    else this.play('tap')
    this.emit()
  }

  setAmbience(on: boolean) {
    this.snapshot = { ...this.snapshot, ambience: on }
    writePref(AMBIENCE_KEY, on)
    if (on && this.active) this.startAmbience()
    else this.stopAmbience()
    this.emit()
  }

  setScene(scene: AmbienceScene) {
    if (scene === this.scene) return
    this.scene = scene
    if (this.snapshot.ambience && this.ambienceTimers.length) {
      this.stopAmbience()
      this.startAmbience()
    }
  }

  // ── Plumbing ─────────────────────────────────────────────────────────

  private audio(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return null
      try {
        this.ctx = new Ctor()
      } catch {
        return null
      }
      const comp = this.ctx.createDynamicsCompressor()
      comp.threshold.value = -16
      comp.ratio.value = 4
      this.master = this.ctx.createGain()
      this.master.gain.value = 0.55
      this.master.connect(comp)
      comp.connect(this.ctx.destination)
      const len = Math.floor(this.ctx.sampleRate * 1.5)
      this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
      const data = this.noiseBuffer.getChannelData(0)
      // A fixed pseudo-random sequence: the same "noise" every load.
      let seed = 1234567
      for (let i = 0; i < len; i++) {
        seed = (seed * 16807) % 2147483647
        data[i] = (seed / 2147483647) * 2 - 1
      }
      // The first gesture at camp also wakes the ambience, if it was left on.
      if (this.active && this.snapshot.ambience) window.setTimeout(() => this.startAmbience(), 0)
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume().catch(() => undefined)
    return this.ctx
  }

  private tone(freq: number, at: number, dur: number, o: ToneOpts = {}) {
    const ctx = this.ctx
    if (!ctx || !this.master) return
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = o.type ?? 'sine'
    const start = ctx.currentTime + at
    osc.frequency.setValueAtTime(o.slideFrom ?? freq, start)
    if (o.slideFrom) osc.frequency.exponentialRampToValueAtTime(freq, start + Math.min(0.05, dur * 0.4))
    if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(o.slideTo, start + dur)
    const peak = o.gain ?? 0.2
    const attack = o.attack ?? 0.006
    g.gain.setValueAtTime(0.0001, start)
    g.gain.exponentialRampToValueAtTime(peak, start + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur)
    let node: AudioNode = osc
    if (o.lowpass) {
      const lp = ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = o.lowpass
      osc.connect(lp)
      node = lp
    }
    node.connect(g)
    g.connect(this.master)
    osc.start(start)
    osc.stop(start + dur + 0.02)
  }

  private noise(at: number, dur: number, o: NoiseOpts = {}) {
    const ctx = this.ctx
    if (!ctx || !this.master || !this.noiseBuffer) return
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuffer
    const f = ctx.createBiquadFilter()
    f.type = o.filter ?? 'bandpass'
    const start = ctx.currentTime + at
    f.frequency.setValueAtTime(o.freq ?? 1500, start)
    if (o.freqTo) f.frequency.exponentialRampToValueAtTime(o.freqTo, start + dur)
    f.Q.value = o.q ?? 1
    const g = ctx.createGain()
    const peak = o.gain ?? 0.1
    g.gain.setValueAtTime(0.0001, start)
    g.gain.exponentialRampToValueAtTime(peak, start + Math.min(0.02, dur * 0.3))
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur)
    src.connect(f)
    f.connect(g)
    g.connect(this.master)
    src.start(start, Math.random() * 0.5)
    src.stop(start + dur + 0.02)
  }

  private arpeggio(notes: number[], gap: number, dur: number, o: ToneOpts = {}, at = 0) {
    notes.forEach((n, i) => this.tone(n, at + i * gap, dur, o))
  }

  // ── Effects ──────────────────────────────────────────────────────────

  /** `step` picks the note for a lantern pop — how many are lit today, so the run climbs. */
  play(name: CampSoundName, opts: { step?: number } = {}) {
    if (!this.snapshot.enabled || !this.audio()) return
    switch (name) {
      case 'tap':
        this.tone(520, 0, 0.08, { type: 'triangle', gain: 0.18, slideTo: 360 })
        this.noise(0, 0.03, { freq: 2600, q: 2, gain: 0.05 })
        break
      case 'nudge':
        this.tone(300, 0, 0.22, { type: 'sine', gain: 0.22, slideFrom: 620, slideTo: 260 })
        this.tone(420, 0.09, 0.14, { type: 'sine', gain: 0.1, slideTo: 330 })
        break
      case 'pop': {
        const f = PENTATONIC[Math.min(PENTATONIC.length - 1, Math.max(0, opts.step ?? 0))]
        this.tone(f, 0, 0.2, { type: 'sine', gain: 0.38, slideFrom: f * 0.55 })
        this.tone(f * 2, 0.04, 0.42, { type: 'triangle', gain: 0.09 })
        this.tone(f * 3, 0.07, 0.3, { type: 'sine', gain: 0.04 })
        this.noise(0, 0.06, { filter: 'highpass', freq: 5000, gain: 0.05 })
        break
      }
      case 'chime':
        this.tone(1046.5, 0, 0.32, { type: 'triangle', gain: 0.2 })
        this.tone(1318.51, 0.1, 0.55, { type: 'triangle', gain: 0.2 })
        this.tone(2637, 0.1, 0.4, { type: 'sine', gain: 0.03 })
        break
      case 'coin':
        this.tone(987.77, 0, 0.07, { type: 'square', gain: 0.06, lowpass: 5000 })
        this.tone(1318.51, 0.07, 0.3, { type: 'square', gain: 0.06, lowpass: 5000 })
        break
      case 'sparkle':
        this.arpeggio([2093, 2637, 3136, 4186, 3520], 0.045, 0.16, { type: 'triangle', gain: 0.05 })
        break
      case 'open':
        this.noise(0, 0.24, { freq: 420, freqTo: 2400, q: 0.9, gain: 0.08 })
        this.tone(660, 0.05, 0.16, { type: 'sine', gain: 0.06, slideFrom: 440 })
        break
      case 'close':
        this.noise(0, 0.2, { freq: 2200, freqTo: 480, q: 0.9, gain: 0.06 })
        break
      case 'page':
        this.noise(0, 0.22, { filter: 'bandpass', freq: 3200, freqTo: 1100, q: 0.7, gain: 0.09 })
        this.noise(0.12, 0.05, { filter: 'highpass', freq: 4000, gain: 0.04 })
        break
      case 'step-up':
        this.tone(760, 0, 0.05, { type: 'triangle', gain: 0.09 })
        break
      case 'step-down':
        this.tone(560, 0, 0.05, { type: 'triangle', gain: 0.08 })
        break
      case 'chest-shake':
        ;[0, 0.11, 0.2].forEach((t, i) => {
          this.tone(150 + i * 18, t, 0.09, { type: 'triangle', gain: 0.22, slideTo: 110 })
          this.noise(t, 0.05, { freq: 900, q: 1.4, gain: 0.07 })
        })
        break
      case 'chest-open':
        this.tone(200, 0, 0.32, { type: 'sawtooth', gain: 0.035, slideTo: 260, lowpass: 900 })
        this.tone(95, 0.18, 0.3, { type: 'sine', gain: 0.45, slideTo: 48 })
        this.noise(0.18, 0.12, { freq: 600, q: 0.8, gain: 0.12 })
        this.arpeggio([523.25, 659.25, 783.99, 1046.5], 0.085, 0.4, { type: 'triangle', gain: 0.16 }, 0.3)
        this.arpeggio([2093, 2637, 3136, 4186], 0.05, 0.2, { type: 'sine', gain: 0.04 }, 0.62)
        break
      case 'sticker':
        this.noise(0, 0.16, { filter: 'highpass', freq: 6500, freqTo: 1800, gain: 0.08 })
        this.tone(880, 0.12, 0.18, { type: 'sine', gain: 0.22, slideFrom: 520 })
        this.tone(1760, 0.15, 0.3, { type: 'triangle', gain: 0.05 })
        break
      case 'buy':
        this.play('coin')
        this.tone(1567.98, 0.2, 0.5, { type: 'triangle', gain: 0.12 })
        this.arpeggio([2093, 2637, 3136], 0.05, 0.18, { type: 'sine', gain: 0.04 }, 0.25)
        break
      case 'equip':
        this.tone(990, 0, 0.16, { type: 'sine', gain: 0.18, slideFrom: 620 })
        this.arpeggio([1975.5, 2637], 0.06, 0.18, { type: 'triangle', gain: 0.05 }, 0.08)
        break
      case 'day-done':
        this.arpeggio([523.25, 659.25, 783.99, 1046.5, 1318.51], 0.09, 0.34, { type: 'triangle', gain: 0.17 })
        ;[1046.5, 1318.51, 1567.98].forEach((n) => this.tone(n, 0.5, 1.1, { type: 'sine', gain: 0.07, attack: 0.04 }))
        this.arpeggio([2637, 3136, 4186, 5274], 0.06, 0.2, { type: 'sine', gain: 0.03 }, 0.55)
        break
      case 'week-kept':
        this.arpeggio([523.25, 783.99, 1046.5, 1318.51, 1567.98], 0.07, 0.5, { type: 'triangle', gain: 0.16 })
        this.tone(2093, 0.4, 0.9, { type: 'sine', gain: 0.05, attack: 0.03 })
        break
      case 'soft-no':
        this.tone(240, 0, 0.14, { type: 'sine', gain: 0.16, slideTo: 200 })
        break
      case 'wish':
        this.arpeggio([1567.98, 2093, 2637, 3136, 4186, 5274], 0.07, 0.5, { type: 'sine', gain: 0.05, attack: 0.02 })
        break
      case 'step':
        // A soft footfall on earth, then one warm note.
        this.noise(0, 0.09, { filter: 'lowpass', freq: 520, gain: 0.16 })
        this.tone(130, 0, 0.12, { type: 'sine', gain: 0.18, slideTo: 90 })
        this.tone(659.25, 0.1, 0.9, { type: 'sine', gain: 0.1, attack: 0.03 })
        this.tone(987.77, 0.16, 0.8, { type: 'sine', gain: 0.04, attack: 0.04 })
        break
      case 'bell':
        // A small temple-ish bell: a fundamental and inharmonic partials, long decay.
        ;[
          [523.25, 0.14],
          [1253, 0.05],
          [1790, 0.03],
          [2620, 0.015],
        ].forEach(([f, g]) => this.tone(f, 0, 2.6, { type: 'sine', gain: g, attack: 0.005 }))
        break
      case 'breath-in':
        this.tone(220, 0, 2.0, { type: 'sine', gain: 0.035, attack: 1.4, slideFrom: 196 })
        this.noise(0, 1.9, { filter: 'bandpass', freq: 900, freqTo: 1600, q: 0.6, gain: 0.015 })
        break
      case 'breath-top':
        this.tone(247, 0, 1.0, { type: 'sine', gain: 0.03, attack: 0.5 })
        break
      case 'breath-out':
        this.tone(196, 0, 6.0, { type: 'sine', gain: 0.035, attack: 0.6, slideTo: 147 })
        this.noise(0, 5.6, { filter: 'bandpass', freq: 1400, freqTo: 500, q: 0.5, gain: 0.014 })
        break
    }
  }

  /** A soft tone that follows one phase of a breath — rising in, falling out, quiet on a hold. */
  breathTone(move: 'in' | 'top' | 'hold' | 'out', secs: number) {
    if (!this.snapshot.enabled || !this.audio()) return
    if (move === 'in') {
      this.tone(220, 0, secs, { type: 'sine', gain: 0.035, attack: Math.min(1.4, secs * 0.6), slideFrom: 196 })
      this.noise(0, secs * 0.95, { filter: 'bandpass', freq: 900, freqTo: 1600, q: 0.6, gain: 0.014 })
    } else if (move === 'top') {
      this.tone(247, 0, secs, { type: 'sine', gain: 0.03, attack: secs * 0.5 })
    } else if (move === 'out') {
      this.tone(196, 0, secs, { type: 'sine', gain: 0.035, attack: 0.5, slideTo: 147 })
      this.noise(0, secs * 0.93, { filter: 'bandpass', freq: 1400, freqTo: 500, q: 0.5, gain: 0.013 })
    }
  }

  /** The hum while a lantern is held: it rises with the charge and stops on release. */
  chargeStart() {
    if (!this.snapshot.enabled || this.charge) return
    const ctx = this.audio()
    if (!ctx || !this.master) return
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = 'triangle'
    const t = ctx.currentTime
    osc.frequency.setValueAtTime(220, t)
    osc.frequency.exponentialRampToValueAtTime(880, t + HOLD_MS / 1000)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.07, t + 0.08)
    osc.connect(g)
    g.connect(this.master)
    osc.start(t)
    this.charge = { osc, gain: g }
  }

  chargeStop() {
    const c = this.charge
    const ctx = this.ctx
    if (!c || !ctx) return
    this.charge = null
    const t = ctx.currentTime
    c.gain.gain.cancelScheduledValues(t)
    c.gain.gain.setValueAtTime(Math.max(0.0001, c.gain.gain.value), t)
    c.gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.07)
    c.osc.stop(t + 0.09)
  }

  /** A character "says" a line: one pitched blip per letter, capped so it never drones. */
  voice(who: CampVoice, text: string) {
    if (!this.snapshot.enabled || !this.audio()) return
    const v = VOICES[who]
    const letters = text.toLowerCase().replace(/[^a-z]/g, '').slice(0, v.max)
    for (let i = 0; i < letters.length; i++) {
      const code = letters.charCodeAt(i) - 97
      const vowel = 'aeiou'.includes(letters[i])
      const f = v.base * (1 + ((code % 7) - 3) * v.spread) * (vowel ? 1.12 : 1)
      this.tone(f, i * v.speed, v.speed * (vowel ? 1.1 : 0.8), {
        type: v.wave,
        gain: v.wave === 'square' ? 0.035 : 0.08,
        lowpass: v.wave === 'square' ? 1800 : undefined,
      })
    }
  }

  // ── Soundscapes (the Quiet Path's Sounds) ─────────────────────────────
  // Content the user starts on purpose, so it plays whatever the effects setting is.
  // Each is filtered noise shaped over time — no recordings.

  private scape: { kind: string; nodes: AudioNode[]; sources: AudioScheduledSourceNode[]; out: GainNode; timers: number[] } | null = null
  private scapeListeners = new Set<() => void>()
  private scapeSnapshot: { kind: string | null; endsAt: number | null } = { kind: null, endsAt: null }
  private scapeEnd: number | null = null

  subscribeScape = (fn: () => void) => {
    this.scapeListeners.add(fn)
    return () => this.scapeListeners.delete(fn)
  }

  getScape = () => this.scapeSnapshot

  private emitScape(kind: string | null, endsAt: number | null) {
    this.scapeSnapshot = { kind, endsAt }
    this.scapeListeners.forEach((fn) => fn())
  }

  /** Starts a soundscape (replacing any other), optionally fading out after `minutes`. */
  playScape(kind: 'rain' | 'stream' | 'waves' | 'wind' | 'night' | 'fire', volume = 0.6, minutes: number | null = null) {
    const ctx = this.audio()
    if (!ctx || !this.master || !this.noiseBuffer) return
    this.stopScape(0.4)
    const out = ctx.createGain()
    out.gain.setValueAtTime(0.0001, ctx.currentTime)
    out.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume * 0.5), ctx.currentTime + 2.5)
    out.connect(this.master)
    const nodes: AudioNode[] = [out]
    const sources: AudioScheduledSourceNode[] = []
    const timers: number[] = []

    const noiseInto = (filter: BiquadFilterType, freq: number, q: number, gain: number) => {
      const src = ctx.createBufferSource()
      src.buffer = this.noiseBuffer
      src.loop = true
      src.loopStart = Math.random()
      const f = ctx.createBiquadFilter()
      f.type = filter
      f.frequency.value = freq
      f.Q.value = q
      const g = ctx.createGain()
      g.gain.value = gain
      src.connect(f)
      f.connect(g)
      g.connect(out)
      src.start()
      sources.push(src)
      nodes.push(f, g)
      return { f, g }
    }
    const lfo = (target: AudioParam, rate: number, depth: number) => {
      const o = ctx.createOscillator()
      o.frequency.value = rate
      const d = ctx.createGain()
      d.gain.value = depth
      o.connect(d)
      d.connect(target)
      o.start()
      sources.push(o)
      nodes.push(d)
    }
    const every = (min: number, max: number, fn: () => void) => {
      const loop = () => {
        fn()
        timers.push(window.setTimeout(loop, min + Math.random() * (max - min)))
      }
      timers.push(window.setTimeout(loop, min))
    }

    switch (kind) {
      case 'rain': {
        noiseInto('lowpass', 1800, 0.4, 0.55)
        noiseInto('highpass', 5000, 0.5, 0.12)
        every(40, 160, () => this.noiseTo(out, 0.015 + Math.random() * 0.02, 2500 + Math.random() * 4000, 0.05 + Math.random() * 0.08))
        break
      }
      case 'stream': {
        const a = noiseInto('bandpass', 900, 0.8, 0.6)
        const b = noiseInto('bandpass', 2400, 1.2, 0.25)
        lfo(a.f.frequency, 0.13, 260)
        lfo(b.f.frequency, 0.31, 600)
        lfo(a.g.gain, 0.21, 0.12)
        break
      }
      case 'waves': {
        const w = noiseInto('lowpass', 700, 0.5, 0.35)
        lfo(w.g.gain, 0.09, 0.32)
        lfo(w.f.frequency, 0.09, 420)
        noiseInto('highpass', 3000, 0.4, 0.04)
        break
      }
      case 'wind': {
        const w = noiseInto('bandpass', 420, 0.7, 0.55)
        lfo(w.f.frequency, 0.07, 220)
        lfo(w.g.gain, 0.05, 0.2)
        break
      }
      case 'night': {
        const w = noiseInto('bandpass', 380, 0.6, 0.18)
        lfo(w.g.gain, 0.05, 0.08)
        every(900, 1800, () => [0, 0.06, 0.12].forEach((t) => this.toneTo(out, 4300, t, 0.035, 0.05)))
        every(3000, 9000, () => [0, 0.09].forEach((t) => this.toneTo(out, 2900 + Math.random() * 400, t, 0.06, 0.02)))
        break
      }
      case 'fire': {
        noiseInto('lowpass', 380, 0.5, 0.7)
        every(70, 420, () => this.noiseTo(out, 0.02 + Math.random() * 0.03, 1600 + Math.random() * 2600, 0.12 + Math.random() * 0.18))
        break
      }
    }
    this.scape = { kind, nodes, sources, out, timers }
    this.scapeEnd = minutes ? Date.now() + minutes * 60_000 : null
    if (minutes) timers.push(window.setTimeout(() => this.stopScape(20), Math.max(0, minutes * 60_000 - 20_000)))
    this.emitScape(kind, this.scapeEnd)
  }

  setScapeVolume(volume: number) {
    const s = this.scape
    if (!s || !this.ctx) return
    s.out.gain.cancelScheduledValues(this.ctx.currentTime)
    s.out.gain.setTargetAtTime(Math.max(0.0002, volume * 0.5), this.ctx.currentTime, 0.2)
  }

  /** Fades the soundscape out over `fadeSecs`. */
  stopScape(fadeSecs = 1.5) {
    const s = this.scape
    const ctx = this.ctx
    this.scape = null
    this.scapeEnd = null
    if (s && ctx) {
      s.timers.forEach((t) => window.clearTimeout(t))
      const t = ctx.currentTime
      s.out.gain.cancelScheduledValues(t)
      s.out.gain.setValueAtTime(Math.max(0.0001, s.out.gain.value), t)
      s.out.gain.exponentialRampToValueAtTime(0.0001, t + fadeSecs)
      s.sources.forEach((src) => {
        try {
          src.stop(t + fadeSecs + 0.1)
        } catch {
          // Already stopped.
        }
      })
    }
    if (this.scapeSnapshot.kind) this.emitScape(null, null)
  }

  private noiseTo(out: AudioNode, dur: number, freq: number, gain: number) {
    const ctx = this.ctx
    if (!ctx || !this.noiseBuffer) return
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuffer
    const f = ctx.createBiquadFilter()
    f.type = 'bandpass'
    f.frequency.value = freq
    f.Q.value = 2
    const g = ctx.createGain()
    const t = ctx.currentTime
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(gain, t + 0.004)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    src.connect(f)
    f.connect(g)
    g.connect(out)
    src.start(t, Math.random())
    src.stop(t + dur + 0.02)
  }

  private toneTo(out: AudioNode, freq: number, at: number, dur: number, gain: number) {
    const ctx = this.ctx
    if (!ctx) return
    const o = ctx.createOscillator()
    o.frequency.value = freq
    const g = ctx.createGain()
    const t = ctx.currentTime + at
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(gain, t + 0.005)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g)
    g.connect(out)
    o.start(t)
    o.stop(t + dur + 0.02)
  }

  /** A meditation bell — for the start and end of a sit, whatever the effects setting. */
  bell(strikes = 1) {
    if (!this.audio()) return
    for (let k = 0; k < strikes; k++) {
      ;[
        [392, 0.16],
        [952, 0.05],
        [1360, 0.03],
        [1990, 0.015],
      ].forEach(([f, g]) => this.tone(f, k * 2.4, 4.5, { type: 'sine', gain: g, attack: 0.004 }))
    }
  }

  // ── Ambience ─────────────────────────────────────────────────────────

  private startAmbience() {
    if (!this.active) return
    const ctx = this.audio()
    if (!ctx || !this.master || !this.noiseBuffer || this.ambienceTimers.length) return
    // A low bed of fire rumble.
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuffer
    src.loop = true
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 380
    const g = ctx.createGain()
    g.gain.value = 0.0001
    g.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 1.2)
    src.connect(lp)
    lp.connect(g)
    g.connect(this.master)
    src.start()
    this.ambienceBed = { src, gain: g }

    const every = (min: number, max: number, fn: () => void) => {
      const loop = () => {
        fn()
        this.ambienceTimers.push(window.setTimeout(loop, min + Math.random() * (max - min)))
      }
      this.ambienceTimers.push(window.setTimeout(loop, min))
    }
    // Crackle.
    every(90, 520, () => this.noise(0, 0.02 + Math.random() * 0.03, { freq: 1600 + Math.random() * 2600, q: 3, gain: 0.02 + Math.random() * 0.03 }))
    if (this.scene === 'night') {
      every(1100, 1900, () => [0, 0.06, 0.12].forEach((t) => this.tone(4300, t, 0.035, { type: 'sine', gain: 0.012 })))
    } else {
      every(5000, 11000, () => {
        const base = 2300 + Math.random() * 700
        this.tone(base * 1.3, 0, 0.09, { type: 'sine', gain: 0.025, slideFrom: base })
        this.tone(base * 1.45, 0.13, 0.08, { type: 'sine', gain: 0.02, slideFrom: base * 1.1 })
      })
    }
  }

  private stopAmbience() {
    this.ambienceTimers.forEach((t) => window.clearTimeout(t))
    this.ambienceTimers = []
    const bed = this.ambienceBed
    if (bed && this.ctx) {
      const t = this.ctx.currentTime
      bed.gain.gain.cancelScheduledValues(t)
      bed.gain.gain.setValueAtTime(Math.max(0.0001, bed.gain.gain.value), t)
      bed.gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4)
      bed.src.stop(t + 0.45)
    }
    this.ambienceBed = null
  }

  /** Arriving at camp: pick the ambience back up if it was on. */
  enter() {
    this.active = true
    if (this.snapshot.ambience && this.ctx) this.startAmbience()
  }

  /** Leaving the camp: hush everything. */
  leave() {
    this.active = false
    this.chargeStop()
    this.stopAmbience()
    this.stopScape(0.6)
  }
}

export const campSound = new CampSoundEngine()

/** The two sound preferences, live. */
export function useCampSoundPrefs() {
  return useSyncExternalStore(campSound.subscribe, campSound.getSnapshot, campSound.getSnapshot)
}

/** The soundscape playing now (if any) and when its timer ends. */
export function useSoundscape() {
  return useSyncExternalStore(campSound.subscribeScape, campSound.getScape, campSound.getScape)
}
