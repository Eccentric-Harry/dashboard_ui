// The sky's furniture — stars, the sun or moon, drifting clouds. Pure decoration; the
// phase class on the world root decides what shows and where the orb sits.

const STARS = [
  [60, 34, 1.6], [130, 90, 1.1], [210, 24, 1.4], [290, 62, 1], [370, 20, 1.7], [450, 82, 1.2],
  [520, 30, 1], [600, 96, 1.3], [680, 22, 1.5], [760, 70, 1], [840, 28, 1.2], [930, 58, 1.6],
  [100, 150, 1], [330, 140, 1.3], [570, 160, 1], [800, 130, 1.4], [960, 170, 1.1],
] as const

function SkyDeco() {
  return (
    <svg className="sky-deco" viewBox="0 0 1000 300" preserveAspectRatio="xMidYMin slice" aria-hidden="true">
      <defs>
        <mask id="camp-crescent">
          <circle r="28" fill="#ffffff" />
          <circle cx="13" cy="-8" r="23" fill="#000000" />
        </mask>
      </defs>
      <g className="sky-stars">
        {STARS.map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} style={{ animationDelay: `${(i % 5) * 0.6}s` }} />
        ))}
      </g>
      <g className="sky-orb">
        <circle className="sky-orb-halo" r="58" />
        <circle className="sky-orb-core sky-sun" r="28" />
        <circle className="sky-orb-core sky-moon" r="28" mask="url(#camp-crescent)" />
      </g>
      <g className="sky-cloud" transform="translate(180 78)">
        <ellipse cx="0" cy="0" rx="40" ry="14" />
        <ellipse cx="-18" cy="-9" rx="19" ry="14" />
        <ellipse cx="14" cy="-14" rx="24" ry="18" />
      </g>
      <g className="sky-cloud sky-cloud--slow" transform="translate(860 52)">
        <ellipse cx="0" cy="0" rx="32" ry="11" />
        <ellipse cx="-14" cy="-8" rx="15" ry="11" />
        <ellipse cx="11" cy="-11" rx="19" ry="14" />
      </g>
      <g className="sky-cloud sky-cloud--far" transform="translate(560 120)">
        <ellipse cx="0" cy="0" rx="26" ry="8" />
        <ellipse cx="9" cy="-7" rx="14" ry="10" />
      </g>
    </svg>
  )
}

export { SkyDeco }
