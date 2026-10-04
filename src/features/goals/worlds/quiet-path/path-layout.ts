// Where everything sits on the Quiet Path, in CSS pixels (one SVG unit is one pixel), so the
// scene, the HTML stones and banners on top of it, and the camera all agree. The path
// climbs from the bottom: each chapter is a banner, then its six stones zig-zagging up
// the way Duolingo's lessons do — its story, two practices, the satchel, two more
// practices, and the bigger kit stone that closes the chapter.

import { COURSE, SATCHEL_AFTER, type Chapter, type Session } from './course'

export const NODE_GAP = 142
/** The satchel is smaller than a stone, so it needs less room. */
const SATCHEL_GAP = 118
/** The kit stone is bigger, so it gets a little more. */
const KIT_GAP = 156
export const BANNER_H = 176
/** Below this width Kiri's line moves out of the scene to a strip above the dock. */
export const NARROW = 560
// Room under the first banner for the dock — and, when narrow, Kiri's strip above it.
const bottomFor = (width: number) => (width < NARROW ? 240 : 150)
export const TOP = 220

export interface PathNode {
  kind: 'node'
  session: Session
  chapter: Chapter
  /** Index along this walk of the course, 0-based. */
  index: number
  x: number
  y: number
}

export interface PathSatchel {
  kind: 'satchel'
  chapter: Chapter
  x: number
  y: number
  /** Which way the path swings here (-1 left … 1 right), so a resident can stand on the open side. */
  swing: number
}

export interface PathBanner {
  kind: 'banner'
  chapter: Chapter
  y: number
}

export interface PathLayout {
  width: number
  height: number
  amp: number
  nodes: PathNode[]
  satchels: PathSatchel[]
  banners: PathBanner[]
  /** Each chapter's vertical span, bottom to top, for the scenery bands. */
  spans: { chapter: Chapter; top: number; bottom: number }[]
}

// Duolingo's zig-zag: centre, out, further, out, centre, the other way…
const SWING = [0, 0.55, 0.95, 0.55, 0, -0.55, -0.95, -0.55]

export function layoutPath(width: number): PathLayout {
  const amp = Math.max(52, Math.min(width * 0.16, 130))
  const cx = width / 2
  const nodes: PathNode[] = []
  const satchels: PathSatchel[] = []
  const banners: PathBanner[] = []
  const spans: PathLayout['spans'] = []
  // Distances are measured up from the bottom, then flipped once the height is known.
  let d = bottomFor(width)
  let index = 0
  let slot = 0
  type Raw = { kind: 'node' | 'banner' | 'satchel'; d: number; chapter: Chapter; session?: Session; index?: number; slot?: number }
  const raw: Raw[] = []
  for (const chapter of COURSE) {
    const bottom = d - 40
    raw.push({ kind: 'banner', d: d + BANNER_H / 2 - 28, chapter })
    d += BANNER_H
    chapter.sessions.forEach((session, k) => {
      if (k === SATCHEL_AFTER) {
        d += SATCHEL_GAP - NODE_GAP
        raw.push({ kind: 'satchel', d, chapter, slot: slot++ })
        d += SATCHEL_GAP
      }
      if (session.kind === 'kit') d += KIT_GAP - NODE_GAP
      raw.push({ kind: 'node', d, chapter, session, index: index++, slot: slot++ })
      d += session.kind === 'kit' ? KIT_GAP : NODE_GAP
    })
    spans.push({ chapter, bottom, top: d - 40 })
  }
  const height = d + TOP
  for (const r of raw) {
    const y = height - r.d
    const swing = SWING[(r.slot ?? 0) % SWING.length]
    if (r.kind === 'banner') banners.push({ kind: 'banner', chapter: r.chapter, y })
    else if (r.kind === 'satchel') satchels.push({ kind: 'satchel', chapter: r.chapter, x: cx + amp * swing, y, swing })
    else nodes.push({ kind: 'node', chapter: r.chapter, session: r.session as Session, index: r.index as number, x: cx + amp * swing, y })
  }
  return {
    width,
    height,
    amp,
    nodes,
    satchels,
    banners,
    spans: spans.map((s) => ({ chapter: s.chapter, top: height - s.top, bottom: height - s.bottom })),
  }
}

/** A stable 0–1 "random" for decoration placement — the same path every time. */
export const seeded = (i: number, k: number) => {
  const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453
  return x - Math.floor(x)
}
