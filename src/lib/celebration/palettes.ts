// Celebration palettes. Each is led by one hue family, the way the routes themselves
// are: a rainbow of party brights reads as pasted-on over the desaturated pastel
// ground, while "the metric's own colour, raining" reads as the achievement itself.
// A neutral and two of the route's own pastels ride along at low weight so a
// full-screen moment still feels festive. Dark sets are lifted a step and never use
// ink flecks, which vanish on graphite.
//
// Colours are hex, or `var(--token, fallback)` for callers who want a route token —
// those resolve against the anchor element, so a route's dark re-pointing applies.

export type CelebrationPaletteName = 'confetti' | 'lime' | 'water' | 'finance'

interface PaletteSpec {
  light: readonly string[]
  dark: readonly string[]
  /** The achievement card's ring and the glow — a deeper step than the confetti, so a
   *  stroke still reads on a white card. */
  accent: { light: string; dark: string }
}

// Repeats are weights: the leading hue should dominate the burst.
const PALETTES: Record<CelebrationPaletteName, PaletteSpec> = {
  // Home's multi-tone mix, led by the app accent.
  confetti: {
    light: ['#eaff28', '#a9b0e8', '#f3cf8e', '#9cc4a9', '#f0a8ae', '#8fb8da'],
    dark: ['#dcf05a', '#b3b9f0', '#f3d49b', '#a8d4b6', '#f2b3b9', '#9cc6e8'],
    // Home's periwinkle signature — the app lime is invisible as a stroke on white.
    accent: { light: '#7f89d6', dark: '#a5b4f0' },
  },
  // Nutrition's signature — lime with ink, the same pairing as its dark gauge badge;
  // sky and apricot are the route's other macro tones.
  lime: {
    light: ['#cfe965', '#cfe965', '#cfe965', '#b5d94c', '#b5d94c', '#8aa832', '#e4f2a4', '#f3eedc', '#171b15', '#aecde9', '#f3cf8e'],
    dark: ['#8fd4a8', '#8fd4a8', '#8fd4a8', '#73be91', '#c1e7cf', '#c1e7cf', '#cfe965', '#eceef0', '#9cc2e4', '#e4b077'],
    accent: { light: '#8aa832', dark: '#8fd4a8' },
  },
  // Hydration — the glass cells' blues, with Nutrition's aqua and lime as accents.
  water: {
    light: ['#9fc3e4', '#9fc3e4', '#9fc3e4', '#7ba3c8', '#6f9ac2', '#c4dbef', '#5d87ad', '#e2edf8', '#7dcdb9', '#cfe965'],
    dark: ['#8dbbe3', '#8dbbe3', '#8dbbe3', '#5b8dbd', '#92bfe6', '#c3dcf2', '#eceef0', '#7dcdb9', '#8fd4a8'],
    accent: { light: '#6f9ac2', dark: '#8dbbe3' },
  },
  // Finance's sage / clay / sand range.
  finance: {
    light: ['#4b7a63', '#9cc4a9', '#f3cf8e', '#a9b0e8', '#d98b6a', '#8fb8da'],
    dark: ['#8fd4a8', '#a8d4b6', '#f3d49b', '#b3b9f0', '#e4a283', '#9cc6e8'],
    accent: { light: '#4b7a63', dark: '#8fd4a8' },
  },
}

const VAR_RE = /^var\(\s*(--[\w-]+)\s*(?:,\s*(.+))?\)$/

function resolveColor(color: string, context: Element): string {
  const match = VAR_RE.exec(color.trim())
  if (!match) return color
  const value = getComputedStyle(context).getPropertyValue(match[1]).trim()
  return value || match[2]?.trim() || 'transparent'
}

export const isDarkTheme = (): boolean => document.documentElement.getAttribute('data-theme') === 'dark'

/** Concrete colours for one moment, resolved for the theme that is showing right now. */
export function resolvePalette(
  palette: CelebrationPaletteName | readonly string[],
  context: Element,
): { colors: string[]; accent: string } {
  if (typeof palette === 'string') {
    const spec = PALETTES[palette]
    const dark = isDarkTheme()
    return { colors: [...(dark ? spec.dark : spec.light)], accent: dark ? spec.accent.dark : spec.accent.light }
  }
  const colors = palette.map((color) => resolveColor(color, context))
  return { colors, accent: colors[0] ?? PALETTES.confetti.accent.light }
}
