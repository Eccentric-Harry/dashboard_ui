// Solid-surface mode, derived at build time.
//
// The glass look has no colour tokens to swap — its sage tint lives in thousands
// of hardcoded values across every route stylesheet (the #dfe4df ground showing
// through translucent white, warm off-whites like rgba(250,252,247,.72), olive
// ink greys). Rather than hand-maintain a parallel override sheet that rots the
// moment a card is added, this plugin derives one: for every rule holding a
// tinted neutral or a translucent white it emits a sibling rule scoped to
// `:root[data-surface="solid"]` containing only the rewritten declarations.
//
// Cascade safety: the sibling sits directly after its source rule and its scope
// is wrapped in :where(), so it has the *same* specificity as the source. It
// beats exactly its own rule and still loses to everything the source lost to,
// so route-level overrides keep winning without being duplicated.
//
// Only low-chroma colours are touched; real hues (accents, category colours,
// status tints) pass through. Page canvas, blur and textures live in
// src/solid-surface.css.
import type { AtRule, Declaration, PluginCreator, Rule } from 'postcss'

export type Rgba = [number, number, number, number]
type Role = 'fill' | 'line' | 'ink'

const SCOPE = '[data-surface="solid"]'
const MAX_TINT_CHROMA = 18 // above this it's a real hue, not a tinted grey
const MIN_TINT_CHROMA = 4 // below this it's already neutral enough to leave alone
const NEAR_WHITE = 232
const HAIRLINE: Rgba = [17, 24, 39, 0.08]

const COLOR_RE = /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b|rgba?\([^)]*\)/gi
const SURFACE_CLASS_RE =
  /(?:^|[-_])(?:card|panel|modal|sheet|popover|menu|dropdown|dialog|drawer|toast|sidebar|rail)$/

function parseColor(token: string): Rgba | null {
  if (token.startsWith('#')) {
    let hex = token.slice(1)
    if (hex.length <= 4) hex = [...hex].map((c) => c + c).join('')
    const byte = (i: number) => parseInt(hex.slice(i, i + 2), 16)
    return [byte(0), byte(2), byte(4), hex.length === 8 ? byte(6) / 255 : 1]
  }
  const parts = token
    .slice(token.indexOf('(') + 1, -1)
    .split(/[\s,/]+/)
    .filter(Boolean)
  if (parts.length < 3 || parts.some((p) => !/^[\d.]+%?$/.test(p))) return null
  const num = (p: string, scale: number) =>
    p.endsWith('%') ? (parseFloat(p) / 100) * scale : parseFloat(p)
  return [num(parts[0], 255), num(parts[1], 255), num(parts[2], 255), parts[3] ? num(parts[3], 1) : 1]
}

function formatColor([r, g, b, a]: Rgba): string {
  if (a >= 1) return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${Math.round(a * 1000) / 1000})`
}

// Neutral grey at luminance y, with the faint cool cast of a typical web UI grey
// scale. Pure-white end stays pure white.
function neutral(y: number, a: number): Rgba {
  if (y >= 250) return [y, y, y, a]
  return [Math.max(0, y - 1), y, Math.min(255, y + 2), a]
}

function roleOf(prop: string): Role {
  if (prop.startsWith('--')) {
    if (/line|border|stroke|divider|hairline/.test(prop)) return 'line'
    if (/bg|card|surface|panel|fill|paper|ground|sheet|glass/.test(prop)) return 'fill'
    return 'ink'
  }
  if (prop.startsWith('background')) return 'fill'
  if (prop.startsWith('border') || prop.startsWith('outline')) return 'line'
  return 'ink'
}

// A surface is a top-level object (card, panel, modal…) rather than something
// nested inside one. Anything glass-blurred counts; otherwise judge by the class
// on the selector's subject.
function isSurface(rule: Rule): boolean {
  if (rule.some((n) => n.type === 'decl' && n.prop.endsWith('backdrop-filter'))) return true
  return rule.selectors.some((selector) => {
    const subject = selector.split(/[\s>+~]+/).pop() ?? ''
    return [...subject.matchAll(/\.([\w-]+)/g)].some(([, cls]) => SURFACE_CLASS_RE.test(cls))
  })
}

function rewrite(token: string, role: Role, surface: boolean): string | null {
  const color = parseColor(token)
  if (!color) return null
  const [r, g, b, a] = color
  const chroma = Math.max(r, g, b) - Math.min(r, g, b)
  if (chroma > MAX_TINT_CHROMA) return null

  let next: Rgba | null = null
  const nearWhite = Math.min(r, g, b) >= NEAR_WHITE
  if (role === 'fill' && nearWhite && a >= 0.2) {
    // Glass stacks nested fills *lighter* than their card; on an opaque white
    // card that reads as nothing, so solid inverts it to a recessed grey — the
    // usual web treatment for chips, tracks and rows.
    next = a >= 0.97 || surface ? [255, 255, 255, 1] : neutral(Math.round(250 - 9 * a), 1)
  } else if (role === 'line' && nearWhite && a >= 0.2 && a < 1) {
    next = HAIRLINE // a white rim vanishes on white; use a dark hairline instead
  } else if (chroma >= MIN_TINT_CHROMA) {
    next = neutral(Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b), a)
  }
  if (!next) return null
  const same = next.every((v, i) => Math.abs(v - color[i]) < (i === 3 ? 0.001 : 0.5))
  return same ? null : formatColor(next)
}

function scopeSelector(selector: string): string {
  if (/^\s*(?::root|html)\b/.test(selector)) {
    return selector.replace(/^(\s*(?::root|html))/, `$1:where(${SCOPE})`)
  }
  return `:where(:root${SCOPE}) ${selector}`
}

const solidSurface: PluginCreator<void> = () => ({
  postcssPlugin: 'solid-surface',
  Once(root) {
    root.walkRules((rule) => {
      if (/data-(?:surface|theme)/.test(rule.selector)) return
      const parent = rule.parent
      if (parent?.type === 'atrule' && /keyframes$/i.test((parent as AtRule).name)) return

      const surface = isSurface(rule)
      const changed: Declaration[] = []
      rule.each((node) => {
        if (node.type !== 'decl' || node.value.includes('url(')) return
        const role = roleOf(node.prop)
        let dirty = false
        const value = node.value.replace(COLOR_RE, (token) => {
          const out = rewrite(token, role, surface)
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
solidSurface.postcss = true

export { formatColor, parseColor, solidSurface }
