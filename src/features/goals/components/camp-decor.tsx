// Decorations from Fen's cart. Two kinds:
// - On the tent (bunting, fairy lights): drawn into the camp diorama (viewBox 0 0 300 150,
//   the tent 112–204 with its pole top at (158, 66), the ground line at y 140).
// - In the meadow (everything else): freestanding things you can put anywhere. Each is drawn
//   in its own space with (0, 0) at the middle of its base, so it can stand at any spot;
//   camp-yard.tsx places them. The night sky makes the lamps and lights glow (camp-ui.css).

import { YARD_ART, isTentDecor } from './camp-decor-data'

function Bunting() {
  const flags = [0.12, 0.27, 0.42, 0.57, 0.72, 0.87]
  const colors = ['#ff6f95', '#ffcb3d', '#52b4ff', '#3fcb91', '#a07cff', '#ff9f5a']
  // Quadratic from the pole top to a stake on the right.
  const p0 = { x: 158, y: 66 }
  const p1 = { x: 228, y: 96 }
  const p2 = { x: 296, y: 78 }
  const at = (t: number) => ({
    x: (1 - t) ** 2 * p0.x + 2 * (1 - t) * t * p1.x + t ** 2 * p2.x,
    y: (1 - t) ** 2 * p0.y + 2 * (1 - t) * t * p1.y + t ** 2 * p2.y,
  })
  return (
    <g className="cd cd-bunting">
      <line x1="296" y1="78" x2="296" y2="140" stroke="#9c6536" strokeWidth="2.6" strokeLinecap="round" />
      <path d={`M${p0.x} ${p0.y} Q ${p1.x} ${p1.y} ${p2.x} ${p2.y}`} fill="none" stroke="#6b5440" strokeWidth="1.4" />
      {flags.map((t, i) => {
        const { x, y } = at(t)
        return <path key={t} className="cd-flag" d={`M${x - 5} ${y} L ${x + 5} ${y} L ${x} ${y + 11} Z`} fill={colors[i]} style={{ animationDelay: `${-i * 0.3}s` }} />
      })}
    </g>
  )
}

function FairyLights() {
  const bulbs = Array.from({ length: 11 }, (_, i) => {
    const t = i / 10
    // Up the left edge of the tent, then down the right.
    const x = t <= 0.5 ? 116 + (t / 0.5) * 42 : 158 + ((t - 0.5) / 0.5) * 42
    const y = t <= 0.5 ? 136 - (t / 0.5) * 56 : 80 + ((t - 0.5) / 0.5) * 56
    return { x, y }
  })
  const colors = ['#ffcb3d', '#ff6f95', '#52b4ff', '#3fcb91']
  return (
    <g className="cd cd-lights">
      <path d="M116 136 L 158 80 L 200 136" fill="none" stroke="#6b5440" strokeWidth="1" opacity="0.7" />
      {bulbs.map(({ x, y }, i) => (
        <circle key={i} className="cd-bulb" cx={x} cy={y + 2} r="2.4" fill={colors[i % colors.length]} style={{ animationDelay: `${(i % 4) * 0.35}s` }} />
      ))}
    </g>
  )
}

/** The tent's decorations, inside the diorama. */
function TentDecor({ ids }: { ids: string[] }) {
  return (
    <>
      {ids.includes('bunting') && <Bunting />}
      {ids.includes('fairy-lights') && <FairyLights />}
    </>
  )
}

/** One meadow piece as its own little picture. */
function YardItem({ id, className }: { id: string; className?: string }) {
  const piece = YARD_ART[id]
  if (!piece) return null
  const [x, y, w, h] = piece.box
  return (
    <svg className={className} viewBox={`${x} ${y} ${w} ${h}`} overflow="visible" aria-hidden="true">
      {piece.art}
    </svg>
  )
}

/** One decoration on its own, centred in a small square — for the shop's shelf. */
function DecorThumb({ id }: { id: string }) {
  if (isTentDecor(id)) {
    const views: Record<string, string> = { bunting: '150 56 150 96', 'fairy-lights': '106 70 104 76' }
    return (
      <svg className="cd-thumb" viewBox={views[id]} aria-hidden="true">
        <TentDecor ids={[id]} />
      </svg>
    )
  }
  return <YardItem id={id} className="cd-thumb" />
}

export { DecorThumb, TentDecor, YardItem }
