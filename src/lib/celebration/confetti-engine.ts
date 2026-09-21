// Confetti engine — a small canvas particle system for celebration moments.
//
// Framework-free on purpose: the celebration layer (components/ui/celebration-layer.tsx)
// owns the one canvas and feeds it moments; features never talk to this module.
// Canvas rather than DOM pieces so a full-screen moment can carry several hundred
// particles with real paper physics — air drag, a terminal fall speed, side-to-side
// flutter, a 3D flip — at no layout cost, and the loop only runs while something is
// in the air.
//
// Coordinates are viewport pixels exactly as getBoundingClientRect reports them. Under
// `html { zoom }` that is the zoomed space, and so is the canvas's own rect, so origins
// line up without the engine ever knowing the zoom factor.

type Shape = 'strip' | 'dot' | 'ribbon' | 'streamer' | 'sparkle'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  w: number
  h: number
  shape: Shape
  color: string
  rotation: number
  spin: number
  flip: number
  flipSpeed: number
  wobble: number
  wobbleSpeed: number
  wobbleAmp: number
  drag: number
  gravity: number
  terminal: number
  age: number
  life: number
  delay: number
}

export interface BurstOptions {
  /** Viewport x/y the burst launches from. */
  x: number
  y: number
  colors: readonly string[]
  count?: number
  /** Launch direction in degrees; -90 is straight up. */
  angle?: number
  /** Width of the launch cone in degrees. */
  spread?: number
  /** Peak launch speed in px per 60fps frame — roughly how high the burst climbs. */
  power?: number
  /** Stagger the launch over this many ms, so a burst blooms rather than pops. */
  stagger?: number
}

export interface CannonOptions {
  colors: readonly string[]
  /** Particles per side. */
  count?: number
}

export interface ShowerOptions {
  colors: readonly string[]
  count?: number
  /** Release particles along the top edge over this many ms. */
  window?: number
}

const FRAME_MS = 1000 / 60
/** Hard ceiling so overlapping moments can never snowball into a slow frame. */
const MAX_PARTICLES = 900
/** A dropped frame (tab switch, GC) advances physics at most this far, never teleports. */
const MAX_STEP_MS = 48

const rand = (min: number, max: number) => min + Math.random() * (max - min)
const pick = <T,>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)]

function pickShape(): Shape {
  const roll = Math.random()
  if (roll < 0.4) return 'strip'
  if (roll < 0.6) return 'dot'
  if (roll < 0.72) return 'ribbon'
  if (roll < 0.86) return 'streamer'
  return 'sparkle'
}

function makeParticle(x: number, y: number, vx: number, vy: number, colors: readonly string[]): Particle {
  const shape = pickShape()
  let w: number
  let h: number
  switch (shape) {
    case 'strip':
      ;[w, h] = [rand(5, 7.5), rand(9, 13)]
      break
    case 'ribbon':
      ;[w, h] = [rand(2.6, 3.4), rand(13, 18)]
      break
    case 'streamer':
      // w is the curl's amplitude, h its length.
      ;[w, h] = [rand(2.2, 3.4), rand(20, 30)]
      break
    case 'sparkle':
      w = h = rand(8, 12)
      break
    default:
      w = h = rand(6, 8.5)
  }
  return {
    x,
    y,
    vx,
    vy,
    w,
    h,
    shape,
    color: pick(colors),
    rotation: rand(0, Math.PI * 2),
    spin: shape === 'sparkle' ? rand(-0.05, 0.05) : rand(-0.12, 0.12),
    flip: rand(0, Math.PI * 2),
    // Sparkles barely turn over — they twinkle instead.
    flipSpeed: shape === 'sparkle' ? rand(0.01, 0.025) : rand(0.06, 0.16),
    wobble: rand(0, Math.PI * 2),
    wobbleSpeed: rand(0.04, 0.09),
    wobbleAmp: rand(0.35, 1.1),
    // Heavy air drag is what makes it read as paper: fast launch, quick stall, slow fall.
    drag: rand(0.905, 0.93),
    gravity: rand(0.2, 0.28),
    terminal: rand(2.6, 3.8),
    age: 0,
    life: rand(2300, 3100),
    delay: 0,
  }
}

export class ConfettiEngine {
  private readonly canvas: HTMLCanvasElement
  private readonly ctx: CanvasRenderingContext2D | null
  private particles: Particle[] = []
  private raf = 0
  private lastFrame = 0
  private width = 0
  private height = 0
  private left = 0
  private top = 0
  private dpr = 1

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.fit()
  }

  /** Viewport size in the engine's px — callers scale particle counts to it. */
  get area(): number {
    return this.width * this.height
  }

  /** Re-measure the canvas. Cheap when nothing changed; call on resize and before each moment. */
  fit() {
    const rect = this.canvas.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.left = rect.left
    this.top = rect.top
    if (rect.width === this.width && rect.height === this.height && dpr === this.dpr) return
    this.width = rect.width
    this.height = rect.height
    this.dpr = dpr
    this.canvas.width = Math.max(1, Math.round(rect.width * dpr))
    this.canvas.height = Math.max(1, Math.round(rect.height * dpr))
  }

  /** A cone of confetti launched from one point — the achievement's own element. */
  burst({ x, y, colors, count = 64, angle = -90, spread = 100, power = 15, stagger = 70 }: BurstOptions) {
    this.fit()
    const ox = x - this.left
    const oy = y - this.top
    for (let i = 0; i < count; i++) {
      const a = ((angle + (Math.random() - 0.5) * spread) * Math.PI) / 180
      const p = makeParticle(ox, oy, Math.cos(a) * power * rand(0.42, 1), Math.sin(a) * power * rand(0.42, 1), colors)
      p.delay = Math.random() * stagger
      this.add(p)
    }
    this.start()
  }

  /** Two party cannons firing up and inward from the bottom corners, reaching about
   *  two-thirds of the way up the screen whatever its height. */
  cannons({ colors, count = 90 }: CannonOptions) {
    this.fit()
    // Rise ≈ speed / (1 − drag); drag ≈ 0.92 → speed ≈ 0.08 × the climb wanted.
    const power = Math.max(18, this.height * 0.052)
    for (const side of [-1, 1] as const) {
      const ox = side < 0 ? -6 : this.width + 6
      const oy = this.height + 8
      const aim = side < 0 ? -62 : -118
      for (let i = 0; i < count; i++) {
        const a = ((aim + (Math.random() - 0.5) * 36) * Math.PI) / 180
        const speed = power * rand(0.55, 1.05)
        const p = makeParticle(ox, oy, Math.cos(a) * speed, Math.sin(a) * speed, colors)
        p.terminal = rand(3.2, 4.6)
        p.life = rand(3000, 3900)
        p.delay = Math.random() * 120
        this.add(p)
      }
    }
    this.start()
  }

  /** Confetti drifting down across the full width from the top edge. */
  shower({ colors, count = 48, window: releaseMs = 280 }: ShowerOptions) {
    this.fit()
    for (let i = 0; i < count; i++) {
      const p = makeParticle(this.width * rand(0.02, 0.98), rand(-40, -10), rand(-1.2, 1.2), rand(1, 3.5), colors)
      // Falling the full height needs more speed, and a life long enough to get there
      // before the fade — which then happens low on the screen, not mid-air.
      p.terminal = rand(4.4, 6.2)
      p.life = (this.height / (p.terminal * 60)) * 1000 * rand(1.05, 1.3) + 500
      p.delay = Math.random() * releaseMs
      this.add(p)
    }
    this.start()
  }

  clear() {
    this.particles = []
    this.stop()
  }

  destroy() {
    this.clear()
  }

  private add(p: Particle) {
    if (this.particles.length >= MAX_PARTICLES) return
    this.particles.push(p)
  }

  private start() {
    if (this.raf || !this.ctx) return
    this.lastFrame = 0
    this.raf = requestAnimationFrame(this.frame)
  }

  private stop() {
    if (this.raf) cancelAnimationFrame(this.raf)
    this.raf = 0
    this.ctx?.setTransform(1, 0, 0, 1, 0, 0)
    this.ctx?.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }

  private draw(ctx: CanvasRenderingContext2D, p: Particle) {
    switch (p.shape) {
      case 'dot':
        ctx.beginPath()
        ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2)
        ctx.fill()
        return
      case 'sparkle': {
        // Four-point star with pinched waists.
        const r = p.w / 2
        const k = r * 0.2
        ctx.beginPath()
        ctx.moveTo(0, -r)
        ctx.quadraticCurveTo(k, -k, r, 0)
        ctx.quadraticCurveTo(k, k, 0, r)
        ctx.quadraticCurveTo(-k, k, -r, 0)
        ctx.quadraticCurveTo(-k, -k, 0, -r)
        ctx.fill()
        return
      }
      case 'streamer': {
        // A curled paper ribbon whose curl keeps rolling as it falls.
        ctx.beginPath()
        for (let i = 0; i <= 8; i++) {
          const t = i / 8
          const px = Math.sin(t * Math.PI * 2.2 + p.wobble * 2.4) * p.w
          const py = -p.h / 2 + t * p.h
          if (i === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.strokeStyle = p.color
        ctx.lineWidth = 2.4
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.stroke()
        return
      }
      default:
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
    }
  }

  private frame = (now: number) => {
    const ctx = this.ctx
    if (!ctx) return
    const dt = this.lastFrame ? Math.min(now - this.lastFrame, MAX_STEP_MS) : FRAME_MS
    this.lastFrame = now
    const k = dt / FRAME_MS
    const dpr = this.dpr

    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    let alive = 0
    for (const p of this.particles) {
      if (p.delay > 0) {
        p.delay -= dt
        this.particles[alive++] = p
        continue
      }
      p.age += dt
      if (p.age >= p.life || p.y > this.height + 40) continue

      const drag = Math.pow(p.drag, k)
      p.vx *= drag
      p.vy = Math.min(p.vy * drag + p.gravity * k, p.terminal)
      p.wobble += p.wobbleSpeed * k
      p.x += (p.vx + Math.cos(p.wobble) * p.wobbleAmp) * k
      p.y += p.vy * k
      p.rotation += p.spin * k
      p.flip += p.flipSpeed * k

      // Full strength for most of the life, then a soft fade — never a pop-out.
      const t = p.age / p.life
      let alpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3
      if (p.shape === 'sparkle') alpha *= 0.62 + 0.38 * Math.sin(p.age * 0.014 + p.wobble)
      // The flip: squash along the local y axis. The back face reads a touch dimmer,
      // which is what sells the paper turning over.
      const sy = Math.cos(p.flip)
      const cos = Math.cos(p.rotation)
      const sin = Math.sin(p.rotation)
      ctx.setTransform(dpr * cos, dpr * sin, -dpr * sin * sy, dpr * cos * sy, dpr * p.x, dpr * p.y)
      ctx.globalAlpha = Math.max(0, alpha) * (sy < 0 ? 0.78 : 1)
      ctx.fillStyle = p.color
      this.draw(ctx, p)
      this.particles[alive++] = p
    }
    this.particles.length = alive
    ctx.globalAlpha = 1

    if (alive === 0) {
      this.raf = 0
      this.stop()
      return
    }
    this.raf = requestAnimationFrame(this.frame)
  }
}
