// What Pip can wear, drawn in Pip's own 120 × 130 space (head top at y≈27, eyes at y 72,
// belly around y 94). Each piece is a <g> placed inside Pip's rig, so it bobs, hops and
// cheers along with Pip. The camp is an illustration that keeps its colours in every
// theme, so the art carries its own fills.

const INK = '#2a2140'

function Hat({ id }: { id: string }) {
  switch (id) {
    case 'acorn-cap':
      return (
        <g className="pip-wear pip-wear--hat">
          <path d="M28 46 C 27 24, 93 24, 92 46 C 78 39, 42 39, 28 46 Z" fill="#b97a48" />
          <path d="M28 46 C 42 39, 78 39, 92 46 C 92 50, 28 50, 28 46 Z" fill="#8f5a33" />
          <path d="M40 33 l6 7 M52 29 l6 8 M64 29 l6 8 M76 32 l5 7" stroke="#8f5a33" strokeWidth="2.4" strokeLinecap="round" />
        </g>
      )
    case 'party-hat':
      return (
        <g className="pip-wear pip-wear--hat">
          <path d="M44 38 L67 -2 L80 36 Z" fill="#ff6f95" />
          <path d="M50 28 L70 23 M55 17 L72 13 M47 34 L76 29" stroke="#ffcb3d" strokeWidth="4" strokeLinecap="round" />
          <path d="M44 38 Q 62 44 80 36" fill="none" stroke="#de4772" strokeWidth="3" strokeLinecap="round" />
          <circle cx="67" cy="-3" r="6" fill="#52b4ff" />
          <circle cx="65" cy="-5" r="2" fill="#ffffff" opacity="0.7" />
        </g>
      )
    case 'beanie':
      return (
        <g className="pip-wear pip-wear--hat">
          <circle cx="60" cy="16" r="7.5" fill="#fff3e0" />
          <path d="M27 47 C 25 18, 95 18, 93 47 Z" fill="#2fc4be" />
          <path d="M40 27 C 41 34, 41 40, 40 46 M52 22 C 53 31, 53 39, 52 46 M68 22 C 67 31, 67 39, 68 46 M80 27 C 79 34, 79 40, 80 46" stroke="#179f99" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <rect x="24" y="41" width="72" height="12" rx="6" fill="#179f99" />
          <path d="M30 47 h60" stroke="#53d6d0" strokeWidth="2" strokeDasharray="3 4" strokeLinecap="round" />
        </g>
      )
    case 'straw-hat':
      return (
        <g className="pip-wear pip-wear--hat">
          <ellipse cx="60" cy="41" rx="50" ry="10" fill="#f3c96b" />
          <ellipse cx="60" cy="40" rx="50" ry="8" fill="#ffd98a" />
          <path d="M36 40 C 36 18, 84 18, 84 40 Z" fill="#f3c96b" />
          <path d="M36 37 C 50 41, 70 41, 84 37 L 84 31 C 70 35, 50 35, 36 31 Z" fill="#ff6f95" />
          <path d="M44 24 l4 4 M58 21 l4 4 M72 24 l4 4" stroke="#d9a644" strokeWidth="1.8" strokeLinecap="round" />
        </g>
      )
    case 'flower-crown':
      return (
        <g className="pip-wear pip-wear--hat">
          <path d="M30 40 C 44 30, 76 30, 90 40" fill="none" stroke="#3f9c63" strokeWidth="3.4" strokeLinecap="round" />
          {(
            [
              [33, 38, '#ff6f95'],
              [46, 32, '#ffcb3d'],
              [60, 30, '#a07cff'],
              [74, 32, '#52b4ff'],
              [87, 38, '#ff9f5a'],
            ] as const
          ).map(([x, y, c]) => (
            <g key={x} transform={`translate(${x} ${y})`}>
              <circle cx="0" cy="-3.6" r="3.4" fill={c} />
              <circle cx="3.6" cy="0" r="3.4" fill={c} />
              <circle cx="0" cy="3.6" r="3.4" fill={c} />
              <circle cx="-3.6" cy="0" r="3.4" fill={c} />
              <circle cx="0" cy="0" r="2.4" fill="#fff6d6" />
            </g>
          ))}
          <path d="M40 36 q-3 -6 3 -8 M80 36 q3 -6 -3 -8" fill="#58c98e" stroke="#3f9c63" strokeWidth="1.5" />
        </g>
      )
    case 'wizard-hat':
      return (
        <g className="pip-wear pip-wear--hat">
          <path d="M38 38 C 48 22, 58 4, 80 -16 C 76 4, 80 22, 86 38 Z" fill="#5b3cc0" />
          <ellipse cx="62" cy="39" rx="38" ry="8" fill="#41239e" />
          <path d="M44 34 C 56 37, 70 37, 82 33" fill="none" stroke="#ffcb3d" strokeWidth="3" strokeLinecap="round" />
          <path d="M62 14 l1.6 3.4 3.6 0.5 -2.6 2.5 0.6 3.6 -3.2 -1.7 -3.2 1.7 0.6 -3.6 -2.6 -2.5 3.6 -0.5 Z" fill="#ffcb3d" />
          <circle cx="72" cy="2" r="1.8" fill="#fff1c2" />
          <circle cx="54" cy="26" r="1.6" fill="#fff1c2" />
          <circle cx="80" cy="-16" r="3.4" fill="#ffcb3d" />
        </g>
      )
    case 'crown':
      return (
        <g className="pip-wear pip-wear--hat">
          <path d="M40 38 L38 16 L50 27 L60 10 L70 27 L82 16 L80 38 Z" fill="#ffcb3d" stroke="#dfa412" strokeWidth="2.4" strokeLinejoin="round" />
          <rect x="39" y="33" width="42" height="7" rx="3" fill="#dfa412" />
          <circle cx="60" cy="27" r="3.4" fill="#ff6f95" />
          <circle cx="48" cy="31" r="2.2" fill="#52b4ff" />
          <circle cx="72" cy="31" r="2.2" fill="#3fcb91" />
          <circle cx="38" cy="15" r="2.4" fill="#fff1c2" />
          <circle cx="60" cy="9" r="2.6" fill="#fff1c2" />
          <circle cx="82" cy="15" r="2.4" fill="#fff1c2" />
        </g>
      )
    default:
      return null
  }
}

function Neck({ id }: { id: string }) {
  switch (id) {
    case 'bow-tie':
      return (
        <g className="pip-wear pip-wear--neck">
          <path d="M60 104 L44 96 C 41 100, 41 108, 44 112 Z" fill="#ff6f95" />
          <path d="M60 104 L76 96 C 79 100, 79 108, 76 112 Z" fill="#ff6f95" />
          <path d="M47 100 l5 3 M47 108 l5 -3 M73 100 l-5 3 M73 108 l-5 -3" stroke="#de4772" strokeWidth="1.6" strokeLinecap="round" />
          <rect x="55" y="99" width="10" height="10" rx="3.5" fill="#de4772" />
        </g>
      )
    case 'bandana':
      return (
        <g className="pip-wear pip-wear--neck">
          <path d="M26 98 C 42 106, 78 106, 94 98 L 60 124 Z" fill="#52b4ff" />
          <path d="M26 98 C 42 106, 78 106, 94 98 L 94 103 C 78 111, 42 111, 26 103 Z" fill="#2a8edd" />
          <circle cx="48" cy="109" r="2" fill="#ffffff" />
          <circle cx="60" cy="116" r="2" fill="#ffffff" />
          <circle cx="70" cy="108" r="2" fill="#ffffff" />
          <circle cx="58" cy="106" r="1.6" fill="#ffffff" />
        </g>
      )
    case 'scarf':
      return (
        <g className="pip-wear pip-wear--neck">
          <path d="M80 104 L 84 126 L 95 123 L 89 102 Z" fill="#e0742c" />
          <path d="M84 116 l9 -2 M85 121 l9 -2" stroke="#ffd34d" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M22 97 C 40 107, 80 107, 98 97 L 99 107 C 80 117, 40 117, 21 107 Z" fill="#ff9f5a" />
          <path d="M34 103 v8 M48 106 v8 M62 107 v8 M76 106 v8 M90 102 v8" stroke="#ffd34d" strokeWidth="3" strokeLinecap="round" />
        </g>
      )
    default:
      return null
  }
}

function Face({ id }: { id: string }) {
  switch (id) {
    case 'round-glasses':
      return (
        <g className="pip-wear pip-wear--face">
          <circle cx="45" cy="72" r="11.5" fill="rgba(255,255,255,0.22)" stroke={INK} strokeWidth="2.8" />
          <circle cx="75" cy="72" r="11.5" fill="rgba(255,255,255,0.22)" stroke={INK} strokeWidth="2.8" />
          <path d="M56.5 71 Q 60 67 63.5 71" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
          <path d="M33.5 70 L 24 66 M86.5 70 L 96 66" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
          <path d="M39 66 q3 -3 7 -3" stroke="#ffffff" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.8" />
        </g>
      )
    case 'star-shades':
      return (
        <g className="pip-wear pip-wear--face">
          {[45, 75].map((x) => (
            <path
              key={x}
              transform={`translate(${x} 72)`}
              d="M0 -13 L3.8 -4.4 13 -4 6 2.4 8.2 11.6 0 6.6 -8.2 11.6 -6 2.4 -13 -4 -3.8 -4.4 Z"
              fill="#a07cff"
              stroke="#41239e"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
          ))}
          <path d="M56 70 Q 60 67 64 70" fill="none" stroke="#41239e" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M40 66 l3 -3 M70 66 l3 -3" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" opacity="0.85" />
        </g>
      )
    default:
      return null
  }
}

/** Everything Pip has on, in draw order: neck under the face, hat on top. */
function PipWear({ hat, neck, face }: { hat?: string | null; neck?: string | null; face?: string | null }) {
  return (
    <>
      {neck && <Neck id={neck} />}
      {face && <Face id={face} />}
      {hat && <Hat id={hat} />}
    </>
  )
}

export { PipWear }
