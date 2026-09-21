// Confetti engine — a small canvas particle system for celebration moments.
//
// Framework-free on purpose: the celebration layer (components/ui/celebration-layer.tsx)
// owns the one canvas and feeds it moments; features never talk to this module.
// Canvas rather than DOM pieces so a burst can carry ~80 particles with real paper
// physics — air drag, a terminal fall speed, side-to-side flutter, a 3D flip — at no
// layout cost, and the loop only runs while something is in the air.
//
// Coordinates are viewport pixels exactly as getBoundingClientRect reports them. Under
// `html { zoom }` that is the zoomed space, and so is the canvas's own rect, so origins
// line up without the engine ever knowing the zoom factor.

type Shape = 'strip' | 'dot' | 'ribbon'

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

export interface ShowerOptions {
  colors: readonly string[]
  count?: number
  /** Release particles along the top edge over this many ms. */
  window?: number
}

const FRAME_MS = 1000 / 60
/** Hard ceiling so overlapping moments can never snowball into a slow frame. */
const MAX_PARTICLES = 420
/** A dropped frame (tab switch, GC) advances physics at most this far, never teleports. */
const MAX_STEP_MS = 48

const rand = (min: number, max: number) => min + Math.random() * (max - min)
const pick = <T,>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)]

function makeParticle(x: number, y: number, vx: number, vy: number, colors: readonly string[]): Particle {
  const roll = Math.random()
  const shape: Shape = roll < 0.55 ? 'strip' : roll < 0.85 ? 'dot' : 'ribbon'
  const dotSize = rand(6, 8.5)
  const [w, h] =
    shape === 'strip' ? [rand(5, 7), rand(9, 12.5)] : shape === 'ribbon' ? [rand(2.6, 3.4), rand(13, 17)] : [dotSize, dotSize]
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
    spin: rand(-0.12, 0.12),
    flip: rand(0, Math.PI * 2),
    flipSpeed: rand(0.06, 0.16),
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
      const speed = power * rand(0.42, 1)
      const p = makeParticle(ox, oy, Math.cos(a) * speed, Math.sin(a) * speed, colors)
      p.delay = Math.random() * stagger
      this.add(p)
    }
    this.start()
  }

  /** Confetti drifting down from the top edge — for moments with no single element to point at. */
  shower({ colors, count = 48, window: releaseMs = 280 }: ShowerOptions) {
    this.fit()
    for (let i = 0; i < count; i++) {
      const p = makeParticle(
        this.width * rand(0.06, 0.94),
        rand(-28, -10),
        rand(-1.2, 1.2),
        rand(1, 3.5),
        colors,
      )
      // Falling the full height needs more speed and time than a burst's arc.
      p.terminal = rand(4.4, 6.2)
      p.life = rand(2600, 3300)
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
      const fade = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3
      // The flip: squash along the local y axis. The back face reads a touch dimmer,
      // which is what sells the paper turning over.
      const sy = Math.cos(p.flip)
      const cos = Math.cos(p.rotation)
      const sin = Math.sin(p.rotation)
      ctx.setTransform(dpr * cos, dpr * sin, -dpr * sin * sy, dpr * cos * sy, dpr * p.x, dpr * p.y)
      ctx.globalAlpha = Math.max(0, fade) * (sy < 0 ? 0.78 : 1)
      ctx.fillStyle = p.color
      if (p.shape === 'dot') {
        ctx.beginPath()
        ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2)
        ctx.fill()
      } else {
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
      }
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
