// Decorations from Fen's cart, drawn into the camp diorama (viewBox 0 0 300 150: Pip at
// x 4–108, the tent 112–204 with its pole top at (158, 66), the fire centred at x 248,
// the ground line at y 140). Each piece is its own <g>; the night sky makes the lamps
// and lights glow (camp-ui.css).

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

function FlowerBed() {
  const flowers = [
    [130, '#ff6f95'],
    [146, '#ffcb3d'],
    [176, '#a07cff'],
    [192, '#52b4ff'],
  ] as const
  return (
    <g className="cd cd-flowers">
      <ellipse cx="161" cy="143" rx="40" ry="4" fill="#58ac6b" opacity="0.5" />
      {flowers.map(([x, c], i) => (
        <g key={x} transform={`translate(${x} ${136 - (i % 2) * 3})`}>
          <g className="cd-nod" style={{ animationDelay: `${-i * 0.7}s` }}>
            <line x1="0" y1="0" x2="0" y2="7" stroke="#3f8a52" strokeWidth="1.6" />
            <circle cx="0" cy="-3" r="2.8" fill={c} />
            <circle cx="3" cy="0" r="2.8" fill={c} />
            <circle cx="-3" cy="0" r="2.8" fill={c} />
            <circle cx="0" cy="-0.6" r="1.8" fill="#fff6d6" />
          </g>
        </g>
      ))}
    </g>
  )
}

function MushroomLamps() {
  return (
    <g className="cd cd-mushrooms">
      {(
        [
          [116, 140, 1],
          [126, 141, 0.75],
        ] as const
      ).map(([x, y, s]) => (
        <g key={x} transform={`translate(${x} ${y}) scale(${s})`}>
          <circle className="cd-glow" cx="0" cy="-10" r="12" fill="#ffe08a" />
          <rect x="-2.6" y="-9" width="5.2" height="9" rx="2" fill="#fff3e0" />
          <path d="M-9 -8 C -9 -18, 9 -18, 9 -8 Z" fill="#ff6f95" />
          <circle cx="-3.5" cy="-12.5" r="1.6" fill="#ffffff" />
          <circle cx="3" cy="-11" r="1.2" fill="#ffffff" />
        </g>
      ))}
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

function Guitar() {
  return (
    <g className="cd cd-guitar" transform="translate(206 140) rotate(-16)">
      <rect x="-2" y="-46" width="4" height="26" rx="1.5" fill="#6e4a33" />
      <rect x="-3.4" y="-52" width="6.8" height="8" rx="2" fill="#4a3426" />
      <path d="M0 -22 C -9 -22, -10 -14, -7 -11 C -12 -8, -12 0, 0 0 C 12 0, 12 -8, 7 -11 C 10 -14, 9 -22, 0 -22 Z" fill="#ff9f5a" />
      <circle cx="0" cy="-11" r="3" fill="#6e4a33" />
      <path d="M-1 -46 V -4 M1 -46 V -4" stroke="#fff3e0" strokeWidth="0.5" />
    </g>
  )
}

function Telescope() {
  return (
    <g className="cd cd-telescope">
      <path d="M284 112 L 276 140 M284 112 L 293 140 M284 112 L 285 140" stroke="#6e4a33" strokeWidth="2.4" strokeLinecap="round" />
      <g transform="translate(284 110) rotate(-34)">
        <rect x="-16" y="-4.5" width="30" height="9" rx="3" fill="#52b4ff" />
        <rect x="12" y="-6" width="8" height="12" rx="2.5" fill="#2a8edd" />
        <rect x="-20" y="-3" width="5" height="6" rx="1.5" fill="#ffcb3d" />
      </g>
    </g>
  )
}

/** The decorations on show, back to front. */
function CampDecor({ ids }: { ids: string[] }) {
  const has = (id: string) => ids.includes(id)
  return (
    <>
      {has('bunting') && <Bunting />}
      {has('fairy-lights') && <FairyLights />}
      {has('telescope') && <Telescope />}
      {has('guitar') && <Guitar />}
      {has('flower-bed') && <FlowerBed />}
      {has('mushroom-lamps') && <MushroomLamps />}
    </>
  )
}

/** One decoration on its own, centred in a small square — for the shop's shelf. */
function DecorThumb({ id }: { id: string }) {
  const views: Record<string, string> = {
    bunting: '150 56 150 96',
    'fairy-lights': '106 70 104 76',
    telescope: '258 86 46 58',
    guitar: '186 82 40 62',
    'flower-bed': '118 120 86 30',
    'mushroom-lamps': '102 118 36 28',
  }
  return (
    <svg className="cd-thumb" viewBox={views[id] ?? '0 0 300 150'} aria-hidden="true">
      <CampDecor ids={[id]} />
    </svg>
  )
}

export { CampDecor, DecorThumb }
