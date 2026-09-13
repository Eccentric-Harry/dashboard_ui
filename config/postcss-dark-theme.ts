// Dark theme, derived at build time.
//
// Route stylesheets hardcode thousands of colours tuned for a light sage canvas;
// a hand-written dark twin of each would rot the moment a card changes. This
// plugin applies the rules in design/DARK_MODE_PLAN.md mechanically instead: for
// every rule holding a colour it emits a sibling scoped to
// `:root[data-theme="dark"]` containing only the rewritten declarations.
//
// It never inverts. Each colour is remapped by *role* in OKLab:
//   ink    — off-white on an inverted lightness curve; translucent ink is made
//            more opaque, since opacity-dimmed text loses contrast faster on dark.
//   fill   — translucent glass becomes a faint white elevation overlay (nested
//            glass stacks lighter, Material-style); opaque white becomes the
//            surface/raised tier; ink-coloured fills invert to light pills;
//            pastel tints become low-alpha washes of their hue; scrims darken.
//   line   — translucent white hairlines.
//   shadow — dark shadows deepen; white inset highlights dim to a glint.
// Real hues keep their hue but are lifted and chroma-capped so they don't vibrate.
// Tailwind's theme palette (`--color-gray-200: oklch(…)`) feeds bg-, text- and
// border- utilities alike, so it can't be mapped by role; its scale is mirrored
// instead (see mapTailwind).
//
// Cascade: same :where() trick as postcss-solid-surface.ts. Register this plugin
// *before* solidSurface so the dark sibling lands after the solid one and wins
// when both attributes are set. Hand-tuned exceptions live in src/styles/theme-dark.css.
import type { AtRule, Declaration, PluginCreator, Rule } from 'postcss'
import { formatColor, parseColor, type Rgba } from './postcss-solid-surface'

type Role = 'fill' | 'line' | 'ink' | 'shadow'
type Kind = 'plain' | 'surface' | 'overlay' | 'scrim'
type Lch = { L: number; C: number; h: number }

const SCOPE = '[data-theme="dark"]'

const SURFACE: Rgba = [22, 24, 27, 1] // #16181b — cards
const RAISED: Rgba = [31, 33, 37, 1] // #1f2125 — opaque chips inside a card
const OVERLAY: Rgba = [37, 40, 45, 1] // #25282d — modals, popovers, menus
const NEUTRAL_CHROMA = 0.035

const COLOR_RE = /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b|rgba?\([^)]*\)|oklch\([^)]*\)/gi
const TAILWIND_VAR_RE = /^--color-(?:white|black|[a-z]+-\d{2,3})$/
const SCRIM_RE = /(?:^|[-_])(?:overlay|backdrop|scrim)$/
const OVERLAY_RE = /(?:^|[-_])(?:modal|popover|menu|dropdown|dialog|tooltip|toast|sheet|drawer|popup)$/
const SURFACE_RE = /(?:^|[-_])(?:card|panel|rail|sidebar|shell)$/

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const white = (a: number): Rgba => [255, 255, 255, a]
const inverse = (a: number): Rgba => [236, 238, 240, a]
const onInverse = (a: number): Rgba => [17, 19, 21, a]
const inkAlpha = (a: number) => (a >= 1 ? 1 : Math.min(1, a * 1.1 + 0.05))

const toLinear = (c: number) => {
  const v = c / 255
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}

const toByte = (v: number) => {
  const c = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055
  return clamp(c * 255, 0, 255)
}

function toLch([r, g, b]: Rgba): Lch {
  const [lr, lg, lb] = [toLinear(r), toLinear(g), toLinear(b)]
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb)
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb)
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb)
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  return { L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, C: Math.hypot(A, B), h: Math.atan2(B, A) }
}

function linearRgb({ L, C, h }: Lch): [number, number, number] {
  const A = C * Math.cos(h)
  const B = C * Math.sin(h)
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
}

// Out-of-gamut colours keep lightness and hue and give up chroma.
function fromLch(lch: Lch, a: number): Rgba {
  let C = lch.C
  let rgb = linearRgb(lch)
  while (C > 0.001 && rgb.some((v) => v < -0.0005 || v > 1.0005)) {
    C *= 0.9
    rgb = linearRgb({ ...lch, C })
  }
  return [toByte(rgb[0]), toByte(rgb[1]), toByte(rgb[2]), a]
}

function mapFill(c: Lch, a: number, kind: Kind): Rgba {
  const neutral = c.C < NEUTRAL_CHROMA
  if (kind === 'scrim' && neutral) return [0, 0, 0, clamp(a * 3 + 0.1, 0.4, 0.72)]
  if (neutral) {
    if (c.L >= 0.86) {
      if (kind === 'overlay' && a >= 0.2) return OVERLAY
      if (a >= 0.97) return kind === 'surface' ? SURFACE : RAISED
      return white(a >= 0.12 ? 0.02 + 0.045 * a : a * 0.6)
    }
    if (c.L < 0.55) return a >= 0.6 ? inverse(a) : white(clamp(a * 1.25, 0.03, 0.5))
    return fromLch({ L: 0.16 + (1 - c.L) * 0.45, C: c.C * 0.5, h: c.h }, a)
  }
  if (c.L >= 0.8) {
    if (c.C < 0.09) {
      return fromLch({ L: 0.72, C: Math.min(c.C * 2.4, 0.12), h: c.h }, clamp(0.16 * a, 0.04, 0.2))
    }
    return fromLch({ L: Math.min(c.L, 0.86), C: c.C * 0.92, h: c.h }, a)
  }
  if (a < 0.5) return fromLch({ L: Math.max(c.L, 0.68), C: Math.min(c.C, 0.14), h: c.h }, Math.min(1, a * 1.4))
  return fromLch({ L: clamp(c.L, 0.66, 0.82), C: Math.min(c.C, 0.13), h: c.h }, a)
}

function mapLine(c: Lch, a: number): Rgba {
  if (c.C < NEUTRAL_CHROMA) {
    if (c.L >= 0.86) return white(a >= 1 ? 0.08 : 0.06)
    if (c.L < 0.55) return a >= 0.5 ? inverse(a * 0.9) : white(clamp(a * 1.2 + 0.01, 0.05, 0.4))
    return fromLch({ L: clamp(1.06 - 0.62 * c.L, 0.35, 0.7), C: c.C * 0.5, h: c.h }, a)
  }
  return fromLch({ L: Math.max(c.L, 0.72), C: Math.min(c.C, 0.13), h: c.h }, a < 0.5 ? Math.min(1, a * 1.3) : a)
}

function mapInk(c: Lch, a: number): Rgba {
  if (c.C < NEUTRAL_CHROMA) {
    if (c.L >= 0.86) return onInverse(a) // text that sat on an ink pill, which is now light
    return fromLch({ L: clamp(1.06 - 0.62 * c.L, 0.6, 0.95), C: c.C * 0.5, h: c.h }, inkAlpha(a))
  }
  const L = c.L < 0.78 ? clamp(0.78 + (c.L - 0.5) * 0.12, 0.74, 0.84) : c.L
  return fromLch({ L, C: Math.min(c.C, 0.14), h: c.h }, inkAlpha(a))
}

function mapShadow(c: Lch, a: number): Rgba {
  if (c.C < NEUTRAL_CHROMA) {
    return c.L >= 0.86 ? white(Math.min(0.08, a * 0.12)) : [0, 0, 0, clamp(a * 4 + 0.1, 0.2, 0.6)]
  }
  return fromLch({ L: Math.max(c.L, 0.7), C: Math.min(c.C, 0.14), h: c.h }, a * 0.8)
}

function roleOf(prop: string): Role {
  if (prop.startsWith('--')) {
    if (/shadow|glow/.test(prop)) return 'shadow'
    if (/line|border|stroke|divider|hairline/.test(prop)) return 'line'
    if (/deep|ink|text|fg/.test(prop)) return 'ink'
    if (/bg|card|surface|panel|fill|paper|ground|sheet|glass|soft|canvas|track|cream|sky|apricot|wash/.test(prop)) {
      return 'fill'
    }
    return 'ink'
  }
  if (/^(?:box-shadow|text-shadow|filter|-webkit-filter)$/.test(prop)) return 'shadow'
  if (prop.startsWith('background') || prop === 'fill') return 'fill'
  if (prop.startsWith('border') || prop.startsWith('outline') || prop === 'stroke') return 'line'
  return 'ink'
}

function subjectClasses(selector: string): string[] {
  const subject = selector.split(/[\s>+~]+/).pop() ?? ''
  return [...subject.matchAll(/\.([\w-]+)/g)].map(([, cls]) => cls)
}

function kindOf(rule: Rule, prop: string): Kind {
  if (prop.startsWith('--')) return /card|surface|panel|paper|sheet/.test(prop) ? 'surface' : 'plain'
  const classes = rule.selectors.flatMap(subjectClasses)
  if (classes.some((c) => SCRIM_RE.test(c))) return 'scrim'
  if (classes.some((c) => OVERLAY_RE.test(c))) return 'overlay'
  if (classes.some((c) => SURFACE_RE.test(c))) return 'surface'
  return rule.some((n) => n.type === 'decl' && n.prop.endsWith('backdrop-filter')) ? 'surface' : 'plain'
}

function parseToken(token: string): Rgba | null {
  if (!/^oklch/i.test(token)) return parseColor(token)
  const [channels, alpha] = token.slice(token.indexOf('(') + 1, -1).split('/')
  const [l, c, h] = channels.trim().split(/\s+/)
  if (!l || !c || !h) return null
  const num = (v: string, pctScale: number) => (v === 'none' ? 0 : v.endsWith('%') ? (parseFloat(v) / 100) * pctScale : parseFloat(v))
  const L = num(l, 1)
  const C = num(c, 0.4)
  const H = num(h, 1)
  const a = alpha ? num(alpha.trim(), 1) : 1
  if ([L, C, H, a].some(Number.isNaN)) return null
  return fromLch({ L, C, h: (H * Math.PI) / 180 }, a)
}

// Mirrors the palette the way dark scales step: the light tints Tailwind uses for
// backgrounds and borders (50–300) become progressively lighter greys above the
// card surface, and the dark shades used for text become light. Saturated mid
// shades used as accents (red-500, emerald-600) are lifted to stay readable.
function mapTailwind(prop: string, c: Lch, a: number): Rgba {
  if (prop === '--color-white') return [SURFACE[0], SURFACE[1], SURFACE[2], a]
  if (prop === '--color-black') return inverse(a)
  if (c.C >= 0.08 && c.L < 0.85) {
    return fromLch({ L: clamp(Math.max(1.23 - c.L, 0.72), 0.2, 0.92), C: Math.min(c.C, 0.14), h: c.h }, a)
  }
  const L = clamp(1.23 - c.L, 0.205, 0.95)
  return fromLch({ L, C: L < 0.45 ? Math.min(c.C * 1.6, 0.05) : Math.min(c.C, 0.14), h: c.h }, a)
}

function rewriteTailwind(token: string, prop: string): string | null {
  const color = parseToken(token)
  return color ? formatColor(mapTailwind(prop, toLch(color), color[3])) : null
}

function rewrite(token: string, role: Role, kind: Kind): string | null {
  const color = parseToken(token)
  if (!color || color[3] <= 0.001) return null
  const lch = toLch(color)
  const a = color[3]
  const next =
    role === 'fill' ? mapFill(lch, a, kind) : role === 'line' ? mapLine(lch, a) : role === 'shadow' ? mapShadow(lch, a) : mapInk(lch, a)
  const same = next.every((v, i) => Math.abs(v - color[i]) < (i === 3 ? 0.001 : 0.5))
  return same ? null : formatColor(next)
}

function scopeSelector(selector: string): string {
  if (/^\s*(?::root|html)\b/.test(selector)) {
    return selector.replace(/^(\s*(?::root|html))/, `$1:where(${SCOPE})`)
  }
  return `:where(:root${SCOPE}) ${selector}`
}

// Every stylesheet is processed: all routes share one CSS bundle, so a rule left
// out here can override another file's dark sibling on any route.
const darkTheme: PluginCreator<void> = () => ({
  postcssPlugin: 'dark-theme',
  Once(root) {
    root.walkRules((rule) => {
      if (/data-(?:theme|surface)/.test(rule.selector)) return
      const parent = rule.parent
      if (parent?.type === 'atrule' && /keyframes$/i.test((parent as AtRule).name)) return

      const changed: Declaration[] = []
      rule.each((node) => {
        if (node.type !== 'decl' || node.value.includes('url(')) return
        const tailwind = TAILWIND_VAR_RE.test(node.prop)
        const role = roleOf(node.prop)
        const kind = kindOf(rule, node.prop)
        let dirty = false
        const value = node.value.replace(COLOR_RE, (token) => {
          const out = tailwind ? rewriteTailwind(token, node.prop) : rewrite(token, role, kind)
          if (out) dirty = true
          return out ?? token
        })
        if (dirty) changed.push(node.clone({ value }))
      })
      if (!changed.length) return

      const sibling = rule.clone()
      sibling.removeAll()
      sibling.selectors = rule.selectors.map(scopeSelector)
      sibling.append(changed)
      rule.after(sibling)
    })
  },
})
darkTheme.postcss = true

export { darkTheme }
