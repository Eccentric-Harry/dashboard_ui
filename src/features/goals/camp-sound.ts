// The camp's sound. Effects are recorded samples in `public/sounds/camp/` (Google's Material
// sound resources and Kenney's CC0 packs, levelled and trimmed so each starts the instant it
// plays — sources and licences in that folder's CREDITS.md), fetched and decoded once on
// arrival. Short, soft and low: a tap is a 40 ms thock in four round-robin takes, a lantern
// pops on a pentatonic step that climbs as the day fills (Duolingo's combo idea), each
// character "talks" in pitched bloops (Animal Crossing's animalese idea). The bells, breath
// tones and soundscapes of the Quiet Path are still synthesized.
//
// Effects are on by default and muted with one tap (remembered per device); the ambience
// (fire crackle, crickets at night, birds by day) is a separate opt-in. Nothing plays until
// the first gesture — browsers only start an AudioContext from one, and every effect here
// answers a gesture anyway.
//
// Timing: a press plays its sound on pointer *down* — the instant a finger lands — not on
// click after release, and a gesture gets one sound, so the tap/open/page that would follow
// it a beat later is dropped (onPress, PRESS_ECHOES).

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
  | 'select'
  | 'stone'
  | 'start'
  | 'small'
  | 'confirm'
  | 'celebrate'

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

/** Role names → the sound each one plays. */
const ALIASES: Partial<Record<CampSoundName, CampSoundName>> = {
  select: 'pop',
  start: 'chime',
  small: 'chime',
  confirm: 'chime',
}

/** Sounds a press already covers when they follow it within a moment. */
const PRESS_ECHOES = new Set<CampSoundName>(['tap', 'open', 'close', 'page', 'step-up', 'step-down'])

/** The sample bank — one file each in `public/sounds/camp/`. */
const SAMPLES = [
  'tap-1', 'tap-2', 'tap-3', 'tap-4', 'open', 'close', 'page', 'pop', 'blip', 'chime', 'coin',
  'sparkle', 'stone', 'day-done', 'week-kept', 'celebrate', 'soft-no', 'nudge', 'knock-1', 'knock-2',
  'knock-3', 'creak', 'tada', 'flourish', 'sticker', 'equip', 'wish', 'footstep',
] as const
type Sample = (typeof SAMPLES)[number]

/** Four takes of the tap, played in turn so a run of presses never sounds machine-made. */
const TAPS: Sample[] = ['tap-1', 'tap-2', 'tap-3', 'tap-4']

// Semitones of a major pentatonic — any run of these sounds pleasant together.
const PENTATONIC = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21]

/** The pitch of the `blip` sample, which the voices transpose. */
const BLIP_HZ = 732

const semis = (n: number) => 2 ** (n / 12)

const VOICES: Record<CampVoice, { base: number; speed: number; spread: number; max: number }> = {
  pip: { base: 520, speed: 0.052, spread: 0.07, max: 16 },
  wren: { base: 980, speed: 0.036, spread: 0.1, max: 20 },
  fen: { base: 330, speed: 0.06, spread: 0.06, max: 15 },
  moss: { base: 165, speed: 0.1, spread: 0.04, max: 10 },
  // The Quiet Path: Kiri, and a voice for each resident (worlds/quiet-path/residents.ts).
  kiri: { base: 196, speed: 0.11, spread: 0.035, max: 9 },
  bo: { base: 240, speed: 0.075, spread: 0.05, max: 11 },
  tova: { base: 150, speed: 0.12, spread: 0.03, max: 8 },
  ollie: { base: 560, speed: 0.045, spread: 0.08, max: 16 },
  bram: { base: 262, speed: 0.065, spread: 0.05, max: 12 },
  luma: { base: 1180, speed: 0.034, spread: 0.09, max: 18 },
  dot: { base: 720, speed: 0.09, spread: 0.04, max: 9 },
  gus: { base: 300, speed: 0.06, spread: 0.05, max: 13 },
  sora: { base: 880, speed: 0.05, spread: 0.07, max: 15 },
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

interface SampleOpts {
  gain?: number
  rate?: number
  /** Cut the sample short after this many seconds (a voice's blip). */
  dur?: number
}

class CampSoundEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private noiseBuffer: AudioBuffer | null = null
  private buffers = new Map<Sample, AudioBuffer>()
  private loading = false
  private tapTurn = 0
  private charge: AudioBufferSourceNode[] | null = null
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
    else {
      this.load()
      this.play('tap')
    }
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
        // 'interactive' asks the browser for its smallest output buffer.
        this.ctx = new Ctor({ latencyHint: 'interactive' })
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

  /**
   * Fetches and decodes the sample bank once. It decodes on an offline context, which needs
   * no gesture, so the bank is ready before the first press; a sound asked for before its
   * file arrives stays silent rather than playing late.
   */
  private load() {
    if (this.loading || typeof window === 'undefined') return
    const Offline =
      window.OfflineAudioContext ?? (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext
    if (!Offline) return
    this.loading = true
    const decoder = new Offline(1, 1, 44100)
    SAMPLES.forEach(async (name) => {
      try {
        const res = await fetch(`/sounds/camp/${name}.wav`)
        if (res.ok) this.buffers.set(name, await decoder.decodeAudioData(await res.arrayBuffer()))
      } catch {
        // Offline or blocked: that one effect stays silent.
      }
    })
  }

  private sample(name: Sample, at = 0, o: SampleOpts = {}): AudioBufferSourceNode | null {
    const ctx = this.ctx
    const buffer = this.buffers.get(name)
    if (!ctx || !this.master || !buffer) return null
    const src = ctx.createBufferSource()
    src.buffer = buffer
    src.playbackRate.value = o.rate ?? 1
    const g = ctx.createGain()
    const start = ctx.currentTime + at
    const peak = o.gain ?? 1
    g.gain.setValueAtTime(peak, start)
    src.connect(g)
    g.connect(this.master)
    src.start(start)
    if (o.dur) {
      g.gain.setValueAtTime(peak, start + o.dur * 0.6)
      g.gain.linearRampToValueAtTime(0, start + o.dur)
      src.stop(start + o.dur + 0.01)
    }
    return src
  }

  /** The next take of the tap, nudged a few cents either way. */
  private tap(at = 0, rate = 1, gain = 1) {
    const take = TAPS[this.tapTurn++ % TAPS.length]
    return this.sample(take, at, { rate: rate * (1 + (Math.random() - 0.5) * 0.04), gain })
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

  // ── Effects ──────────────────────────────────────────────────────────

  /** `step` picks the note for a lantern pop — how many are lit today, so the run climbs. */
  play(name: CampSoundName, opts: { step?: number } = {}, fromPress = false) {
    if (!this.snapshot.enabled || !this.audio()) return
    // The press already answered with its own sound; the same gesture's click/open/page a
    // beat later would only sound like a late echo of it.
    if (!fromPress && PRESS_ECHOES.has(name) && performance.now() - this.lastPress < 400) return
    const role = ALIASES[name] ?? name
    switch (role) {
      case 'tap':
        this.tap()
        break
      case 'step-up':
        this.tap(0, semis(4))
        break
      case 'step-down':
        this.tap(0, semis(-3))
        break
      case 'pop': {
        // The bloop climbs the pentatonic from a little below its own pitch.
        const at = PENTATONIC[Math.min(7, Math.max(0, opts.step ?? 0))]
        this.sample('pop', 0, { rate: semis(at - 3) })
        break
      }
      case 'chest-shake':
        this.sample('knock-1', 0)
        this.sample('knock-2', 0.11, { rate: semis(1) })
        this.sample('knock-3', 0.2, { rate: semis(2) })
        break
      case 'chest-open':
        this.sample('creak')
        this.sample('tada', 0.22)
        break
      case 'buy':
        this.sample('coin')
        this.sample('flourish', 0.08)
        break
      case 'coin':
        this.sample('coin', 0, { rate: 1 + (Math.random() - 0.5) * 0.06 })
        break
      case 'step':
        // A soft footfall, then one warm note.
        this.sample('footstep')
        this.sample('chime', 0.1, { gain: 0.4 })
        break
      case 'nudge':
      case 'chime':
      case 'sparkle':
      case 'stone':
      case 'open':
      case 'close':
      case 'page':
      case 'sticker':
      case 'equip':
      case 'day-done':
      case 'week-kept':
      case 'celebrate':
      case 'soft-no':
      case 'wish':
        this.sample(role)
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

  /**
   * While a lantern is held it winds up like a ratchet: soft ticks that come closer together
   * and climb as the charge fills. Releasing early cancels the ticks still to come.
   */
  chargeStart() {
    if (!this.snapshot.enabled || this.charge) return
    if (!this.audio()) return
    const ticks: AudioBufferSourceNode[] = []
    const total = HOLD_MS / 1000
    for (let t = 0; t < total; ) {
      const p = t / total
      const tick = this.tap(t, semis(-2 + p * 12), 0.55 + 0.45 * p)
      if (tick) ticks.push(tick)
      t += 0.13 - 0.08 * p
    }
    this.charge = ticks
  }

  chargeStop() {
    const ticks = this.charge
    const ctx = this.ctx
    if (!ticks || !ctx) return
    this.charge = null
    ticks.forEach((tick) => {
      try {
        tick.stop(ctx.currentTime)
      } catch {
        // Already played out.
      }
    })
  }

  /** A character "says" a line: one pitched bloop per letter, capped so it never drones. */
  voice(who: CampVoice, text: string) {
    if (!this.snapshot.enabled || !this.audio()) return
    const v = VOICES[who]
    const letters = text.toLowerCase().replace(/[^a-z]/g, '').slice(0, v.max)
    for (let i = 0; i < letters.length; i++) {
      const code = letters.charCodeAt(i) - 97
      const vowel = 'aeiou'.includes(letters[i])
      const f = v.base * (1 + ((code % 7) - 3) * v.spread) * (vowel ? 1.12 : 1)
      this.sample('blip', i * v.speed, {
        rate: Math.min(2.2, Math.max(0.45, f / BLIP_HZ)),
        gain: 0.5,
        dur: v.speed * (vowel ? 1.1 : 0.8),
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
    if (this.snapshot.enabled) this.load()
    if (this.snapshot.ambience && this.ctx) this.startAmbience()
    if (typeof document !== 'undefined') {
      document.addEventListener('pointerdown', this.onPress, { capture: true })
      document.addEventListener('keydown', this.onKeyPress, { capture: true })
    }
  }

  /** Creates (or resumes) the audio context without playing anything. */
  warm = () => {
    if (this.snapshot.enabled) this.audio()
  }

  private lastPress = -Infinity

  /** Whether a press (pointer down, or Enter/Space on a control) happened in the last `ms`. */
  pressedWithin(ms: number) {
    return performance.now() - this.lastPress < ms
  }

  /**
   * The one sound a press makes, chosen at the press: the control's own `data-sound` (and
   * `data-sound-step`) when it has one; otherwise a primary button in the lighthouse says
   * "confirm" and anything else taps. `data-sound="none"` is silent; `data-quiet-press` (a
   * hold, which hums instead) opts out.
   */
  private soundFor(hit: Element): { name: CampSoundName | 'none'; step: number } {
    const tagged = hit.closest('[data-sound]')
    if (tagged) return { name: tagged.getAttribute('data-sound') as CampSoundName | 'none', step: Number(tagged.getAttribute('data-sound-step') ?? 0) }
    if (hit.closest('.lh-world') && hit.matches('.lh-btn--primary, .lh-btn--candy')) return { name: 'confirm', step: 0 }
    return { name: 'tap', step: 0 }
  }

  private pressOn(target: EventTarget | null) {
    if (!this.snapshot.enabled) return
    const t = target as Element | null
    if (!t || typeof t.closest !== 'function' || !t.closest('.camp-world, .cs-root, .gl-modal-backdrop')) return
    const hit = t.closest('button, a[href], [role="button"], [role="radio"], [role="tab"], label, input[type="checkbox"]')
    if (!hit || hit.closest('[data-quiet-press], .lantern, .lh-hold') || (hit as HTMLButtonElement).disabled) {
      this.warm()
      return
    }
    this.lastPress = performance.now()
    const { name, step } = this.soundFor(hit)
    if (name !== 'none') this.play(name, { step }, true)
  }

  /** Real-time feedback: the sound starts the instant a finger lands, not on release. */
  private onPress = (e: PointerEvent) => {
    if (e.button === 0) this.pressOn(e.target)
  }

  private onKeyPress = (e: KeyboardEvent) => {
    if (e.repeat || (e.key !== 'Enter' && e.key !== ' ')) return
    const el = e.target as HTMLElement | null
    if (!el || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable) return
    this.pressOn(el)
  }

  /** Leaving the camp: hush everything. */
  leave() {
    this.active = false
    if (typeof document !== 'undefined') {
      document.removeEventListener('pointerdown', this.onPress, { capture: true })
      document.removeEventListener('keydown', this.onKeyPress, { capture: true })
    }
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
