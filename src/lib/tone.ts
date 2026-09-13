import type { CSSProperties } from 'react'

type Tone = {
  /** The chip's hue. Dark mode derives the wash, ink and border from it. */
  hue: string
  bg?: string
  ink?: string
  border?: string
}

/**
 * Colours for inline-styled chips (pastel background + coloured ink). Light mode
 * renders the given literals unchanged through the var() fallbacks; in dark,
 * theme-dark.css defines --chip-surface / --chip-ink / --chip-line from
 * --chip-hue, so the same element re-tints itself for a graphite surface.
 */
export function toneStyle({ hue, bg, ink, border }: Tone): CSSProperties {
  return {
    '--chip-hue': hue,
    ...(bg !== undefined && { background: `var(--chip-surface, ${bg})` }),
    ...(ink !== undefined && { color: `var(--chip-ink, ${ink})` }),
    ...(border !== undefined && { border: `1px solid var(--chip-line, ${border})` }),
  } as CSSProperties
}
