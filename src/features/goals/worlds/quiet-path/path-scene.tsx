import { Backpack, BookOpen, Check, Lock, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Pip } from '../../components/pip'
import type { PipMood } from '../../buddy-brain'
import type { PipStage } from '../../pip-growth'
import { dayLabel } from '../../goal-format'
import type { Chapter } from './course'
import { CHAPTER_COLORS, type PathRead } from './path-data'
import { BIOME_OF, DECOR, type Biome } from './path-biomes'
import { Decor, Landmark, SatchelArt } from './path-decor'
import { seeded, type PathLayout, type PathNode } from './path-layout'
import { Kiri } from './kiri'
import { SessionIcon } from './session-icon'
import { RESIDENTS, type ResidentKey } from './residents'
import { ResidentArt } from './resident-art'

export type NodeState = 'done' | 'next' | 'soon' | 'locked'
export type SatchelState = 'closed' | 'ready' | 'open'

type PathSceneProps = {
  layout: PathLayout
  read: PathRead
  /** The stone just walked, which lands with a little bounce. */
  fresh: string | null
  /** Chapters whose satchel has been opened on this device. */
  opened: number[]
  /** The resident who's talking, and what they're saying. */
  talking: { who: ResidentKey; line: string } | null
  pip: { mood: PipMood; stage: PipStage; name: string; wear?: { hat?: string | null; neck?: string | null; face?: string | null } }
  kiriLine: string
  kiriTalking: boolean
  /** Wide enough for Kiri's bubble beside her; on a phone the world shows it by the dock. */
  bubble: boolean
  onNode: (node: PathNode, state: NodeState, el: HTMLElement) => void
  onGuide: (chapter: Chapter, el: HTMLElement) => void
  onKiri: () => void
  onSatchel: (chapter: Chapter, state: SatchelState, el: HTMLElement) => void
  onResident: (who: ResidentKey) => void
}

const GROUND: Record<Biome, string> = {
  meadow: '#c8e8b2',
  birch: '#c3e6b8',
  fern: '#b4dfc0',
  river: '#b8e3d6',
  stone: '#d9e4c6',
  lake: '#bfe4e2',
  cedar: '#aed6bd',
  cloud: '#e2eeec',
  summit: '#f1f6f6',
}

/** Catmull-Rom through the points, as cubic Béziers. */
function smooth(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return ''
  let d = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    d += ` C${(p1.x + (p2.x - p0.x) / 6).toFixed(1)} ${(p1.y + (p2.y - p0.y) / 6).toFixed(1)}, ${(p2.x - (p3.x - p1.x) / 6).toFixed(1)} ${(p2.y - (p3.y - p1.y) / 6).toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
  }
  return d
}

/**
 * The Quiet Path, drawn the way Duolingo draws a course: chapters as banners, each with its
 * six stones zig-zagging up the mountain — a story (a book), four practices, and the
 * bigger kit stone (a backpack) that closes the chapter — walked ones in the chapter's
 * colour, today's raised and ringed, the rest waiting. A satchel sits on the path after
 * the third stone, and the place's resident stands in the open space beside it. Underneath,
 * a soft mountainside in bands with scenery and small critters kept to the edges and a
 * landmark per chapter. Pip stands by today's stone; Kiri a little way back.
 */
function PathScene({ layout, read, fresh, opened, talking, pip, kiriLine, kiriTalking, bubble, onNode, onGuide, onKiri, onSatchel, onResident }: PathSceneProps) {
  const { width, height, nodes, satchels, banners, spans, amp } = layout
  const cx = width / 2
  const stateOf = (n: PathNode): NodeState =>
    read.doneNow.has(n.session.id) ? 'done' : n.session.id === read.next.id ? (read.walkedToday ? 'soon' : 'next') : 'locked'
  const current = nodes.find((n) => n.session.id === read.next.id) ?? nodes[0]
  const currentChapter = current.chapter.n
  const big = Math.max(1, Math.min(1.5, width / 680))

  // Pip by today's stone, on the open side; Kiri a stone back, on the other.
  const side = current.x >= cx ? -1 : 1
  const pipAt = { x: current.x + side * (amp * 0.45 + 74), y: current.y + 6 }
  const back = nodes[Math.max(0, current.index - 1)]
  const kiriAt =
    current.index === 0
      ? { x: Math.min(width - 60, cx + Math.min(260, width * 0.32)), y: current.y + 40 }
      : { x: Math.max(56, Math.min(width - 56, back.x - side * (amp * 0.45 + 84))), y: back.y + 34 }

  // Each resident stands in the open space the path leaves beside their satchel — moved
  // across, or up a little, if Pip or Kiri is already standing there.
  const clear = (p: { x: number; y: number }) => Math.hypot(p.x - pipAt.x, p.y - pipAt.y) > 100 && Math.hypot(p.x - kiriAt.x, p.y - kiriAt.y) > 100
  const residents = satchels.flatMap((sat) => {
    const r = RESIDENTS.find((x) => x.chapter === sat.chapter.n)
    if (!r) return []
    const away = Math.abs(sat.swing) > 0.2 ? -Math.sign(sat.swing) : sat.chapter.n % 2 ? 1 : -1
    const reach = Math.abs(sat.swing) > 0.2 ? amp * 0.9 : amp * 0.9 + 44
    const edge = (x: number) => Math.max(40, Math.min(width - 40, x))
    const options = [
      { x: edge(cx + away * reach), y: sat.y + 8 },
      { x: edge(cx - away * (amp * 0.9 + 44)), y: sat.y + 8 },
      { x: edge(cx + away * reach), y: sat.y - 62 },
    ]
    const at = options.find(clear) ?? options[0]
    return [{ r, at, far: sat.chapter.n > currentChapter + 1, here: sat.chapter.n <= currentChapter }]
  })
  const talker = talking ? residents.find((x) => x.r.key === talking.who) : null
  const rBubbleW = Math.min(230, width - 32)

  // Kiri's bubble opens away from the stones, toward whichever edge has room.
  const bubbleRight = kiriAt.x >= cx
  const bubbleMax = Math.max(170, Math.min(260, bubbleRight ? width - kiriAt.x - 46 : kiriAt.x - 46))

  // Scenery stays at the edges, clear of the stones.
  const sideL = Math.max(0, cx - amp - 90)
  const sideR = Math.max(0, width - (cx + amp + 90))
  const decor = spans.flatMap((s) => {
    const biome = BIOME_OF[s.chapter.n]
    const count = Math.round((s.bottom - s.top) / 70)
    return Array.from({ length: count }, (_, k) => {
      const left = k % 2 === 0
      const span = left ? sideL : sideR
      if (span < 30) return null
      const seed = s.chapter.n * 50 + k
      const x = left ? 12 + seeded(seed, 1) * (span - 12) : width - 12 - seeded(seed, 1) * (span - 12)
      const y = s.top + seeded(seed, 2) * (s.bottom - s.top)
      const kind = DECOR[biome][Math.floor(seeded(seed, 3) * DECOR[biome].length)]
      return { key: `${s.chapter.n}-${k}`, x, y, kind, i: seed }
    }).filter((d): d is NonNullable<typeof d> => d != null)
  })

  // Soft blends between chapter bands.
  const stops = spans
    .slice()
    .reverse()
    .flatMap((s) => [
      { offset: Math.max(0, (s.top + 50) / height), color: GROUND[BIOME_OF[s.chapter.n]] },
      { offset: Math.min(1, (s.bottom - 50) / height), color: GROUND[BIOME_OF[s.chapter.n]] },
    ])
  const trail = smooth([{ x: cx, y: height - 40 }, ...nodes.map((n) => ({ x: n.x, y: n.y }))])
  const mistTop = spans.find((s) => s.chapter.n === currentChapter + 1)?.top ?? 0
  const riverSpan = spans.find((s) => s.chapter.n === 4)
  const lakeSpan = spans.find((s) => s.chapter.n === 6)
  const riverY = riverSpan ? (riverSpan.top + riverSpan.bottom) / 2 : 0

  return (
    <>
      <svg className="qp-scene" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
        <defs>
          <linearGradient id="qp-ground" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={GROUND.summit} />
            {stops.map((s, i) => (
              <stop key={i} offset={s.offset} stopColor={s.color} />
            ))}
            <stop offset="1" stopColor={GROUND.meadow} />
          </linearGradient>
          <linearGradient id="qp-mist" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.92" />
            <stop offset="0.85" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>

        <g className="qp-land">
          <rect x="0" y="0" width={width} height={height} fill="url(#qp-ground)" />
          {riverSpan && (
            <path
              className="qp-river"
              d={`M0 ${riverY + 30} C ${width * 0.3} ${riverY - 20}, ${width * 0.65} ${riverY + 60}, ${width} ${riverY + 10}`}
            />
          )}
          {lakeSpan && Math.max(sideL, sideR) > 90 && (
            <ellipse
              className="qp-lake"
              cx={sideR >= sideL ? width - sideR / 2 : sideL / 2}
              cy={(lakeSpan.top + lakeSpan.bottom) / 2}
              rx={Math.min(190, Math.max(sideL, sideR) * 0.42)}
              ry="56"
            />
          )}
          {decor.map((d) => (
            <g key={d.key} transform={`translate(${d.x.toFixed(1)} ${d.y.toFixed(1)})`}>
              <Decor kind={d.kind} i={d.i} big={big} />
            </g>
          ))}
          {spans.map((s) => {
            const last = nodes.filter((n) => n.chapter.n === s.chapter.n).at(-1)
            if (!last || Math.max(sideL, sideR) < 110) return null
            const onLeft = sideL >= sideR
            const x = onLeft ? sideL * 0.55 : width - sideR * 0.55
            return (
              <g key={s.chapter.n} transform={`translate(${x.toFixed(1)} ${(last.y + 30).toFixed(1)}) scale(${big})`}>
                <Landmark chapter={s.chapter.n} reached={read.chaptersDone.some((c) => c.chapter.n === s.chapter.n && c.loop === read.loop)} />
              </g>
            )
          })}
          <path className="qp-trail" d={trail} />
          <path className="qp-trail-dots" d={trail} />
        </g>

        <rect className="qp-night-veil" x="0" y="0" width={width} height={height} />
        {mistTop > 0 && <rect className="qp-mist" x="0" y="0" width={width} height={mistTop} fill="url(#qp-mist)" />}
      </svg>

      {banners.map((b) => {
        const c = CHAPTER_COLORS[b.chapter.color]
        const done = read.chaptersDone.some((d) => d.chapter.n === b.chapter.n && d.loop === read.loop)
        const locked = b.chapter.n > currentChapter
        return (
          <section
            key={b.chapter.n}
            className={cn('qp-banner', done && 'is-done', locked && 'is-locked')}
            style={{ top: b.y, ['--ch' as string]: c.fill, ['--ch-lip' as string]: c.lip, ['--ch-soft' as string]: c.soft }}
            aria-label={`Chapter ${b.chapter.n}: ${b.chapter.theme}`}
          >
            <div className="qp-banner-text">
              <p className="qp-banner-kicker">
                Chapter {b.chapter.n} · {b.chapter.place}
                {done && (
                  <span className="qp-banner-done">
                    <Check size={11} strokeWidth={3.4} /> walked
                  </span>
                )}
              </p>
              <h3>{b.chapter.theme}</h3>
              <p className="qp-banner-line">{b.chapter.intention}</p>
            </div>
            <button type="button" className="qp-banner-guide" onClick={(e) => onGuide(b.chapter, e.currentTarget)} aria-label={`Guide to chapter ${b.chapter.n}`}>
              <BookOpen size={18} strokeWidth={2.6} />
              <span>Guide</span>
            </button>
          </section>
        )
      })}

      {satchels.map((sat) => {
        const found = read.satchels.includes(sat.chapter.n)
        const state: SatchelState = !found ? 'closed' : opened.includes(sat.chapter.n) ? 'open' : 'ready'
        return (
          <button
            key={`satchel-${sat.chapter.n}`}
            type="button"
            className={cn('qp-satchel', `is-${state}`)}
            style={{ left: sat.x, top: sat.y }}
            onClick={(e) => onSatchel(sat.chapter, state, e.currentTarget)}
            aria-label={
              state === 'closed'
                ? `A satchel — it opens once the first three stones of ${sat.chapter.place} are walked`
                : state === 'ready'
                  ? `A satchel from ${sat.chapter.place} — open it`
                  : `The pocket card from ${sat.chapter.place}`
            }
          >
            <SatchelArt state={state} />
          </button>
        )
      })}

      {residents.map(({ r, at, far, here }) => (
        <button
          key={r.key}
          type="button"
          className={cn('qp-resident', far && 'is-far', here && 'is-here', talking?.who === r.key && 'is-talking')}
          style={{ left: at.x, top: at.y }}
          onClick={() => onResident(r.key)}
          aria-label={`${r.name}, ${r.kind} who lives in ${r.chapter === currentChapter ? 'this place' : `chapter ${r.chapter}`}`}
        >
          <ResidentArt who={r.key} talking={talking?.who === r.key} />
          <span className="qp-resident-name">{r.name}</span>
        </button>
      ))}
      {talker && talking && (
        <p
          className="qp-rbubble"
          style={{ left: Math.max(16 + rBubbleW / 2, Math.min(width - 16 - rBubbleW / 2, talker.at.x)), top: talker.at.y - 78, maxWidth: rBubbleW }}
          aria-live="polite"
        >
          <span className="qp-bubble-name">{talker.r.name}</span>
          {talking.line}
        </p>
      )}

      {nodes.map((n) => {
        const state = stateOf(n)
        const c = CHAPTER_COLORS[n.chapter.color]
        const walkedOn = read.doneNow.get(n.session.id)
        const kind = n.session.kind ?? 'practice'
        const tipKind = kind === 'story' ? 'Story · ' : kind === 'kit' ? 'Pack · ' : ''
        return (
          <div
            key={n.session.id}
            className={cn('qp-node-wrap', `is-${state}`, `is-${kind}`, fresh === n.session.id && 'is-fresh')}
            style={{ left: n.x, top: n.y }}
          >
            {(state === 'next' || state === 'soon') && (
              <span className="qp-node-tip" aria-hidden="true">
                {state === 'next' ? `Today · ${tipKind}${n.session.minutes} min` : 'Opens tomorrow'}
              </span>
            )}
            <button
              type="button"
              className="qp-node"
              style={{ ['--ch' as string]: c.fill, ['--ch-lip' as string]: c.lip, ['--ch-soft' as string]: c.soft }}
              onClick={(e) => onNode(n, state, e.currentTarget)}
              aria-label={`${kind === 'story' ? 'Story: ' : ''}${n.session.title}, ${n.session.minutes} minutes — ${
                state === 'done' ? `walked${walkedOn ? ` ${dayLabel(walkedOn)}` : ''}` : state === 'next' ? 'today’s session' : state === 'soon' ? 'opens tomorrow' : 'not yet'
              }`}
            >
              {state === 'soon' ? (
                <Moon size={26} strokeWidth={2.4} />
              ) : kind === 'kit' ? (
                <Backpack size={state === 'locked' ? 28 : 34} strokeWidth={2.4} />
              ) : (
                <SessionIcon icon={n.session.icon} size={state === 'locked' ? 26 : 30} />
              )}
              {state === 'done' && (
                <span className="qp-node-check" aria-hidden="true">
                  <Check size={12} strokeWidth={3.6} />
                </span>
              )}
              {state === 'locked' && (
                <span className="qp-node-lock" aria-hidden="true">
                  <Lock size={10} strokeWidth={3} />
                </span>
              )}
            </button>
            <span className="qp-node-label">{n.session.title}</span>
          </div>
        )
      })}

      <div className="qp-pip" style={{ left: pipAt.x, top: pipAt.y }} aria-hidden="true">
        <svg viewBox="0 0 90 100" width="76" height="84" overflow="visible">
          <path d="M70 92 L 78 30" stroke="#9c6536" strokeWidth="3.4" strokeLinecap="round" />
          <Pip mood={pip.mood} size={78} x={0} y={8} stage={pip.stage} wear={pip.wear} name={pip.name} />
        </svg>
      </div>

      <button type="button" className={cn('qp-kiri', kiriTalking && 'is-talking')} style={{ left: kiriAt.x, top: kiriAt.y }} onClick={onKiri} aria-label={`Kiri says: ${kiriLine}`}>
        <Kiri talking={kiriTalking} className="qp-kiri-art" />
      </button>
      {bubble && (
        <p
          className={cn('qp-bubble', bubbleRight ? 'is-right' : 'is-left')}
          style={{ left: bubbleRight ? kiriAt.x + 34 : kiriAt.x - 34, top: kiriAt.y - 70, maxWidth: bubbleMax }}
          aria-live="polite"
        >
          <span className="qp-bubble-name">Kiri</span>
          {kiriLine}
        </p>
      )}
    </>
  )
}

export { PathScene }
