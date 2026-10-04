// The camp's cast besides Pip — each one an SVG with its own shape language, the way
// Duolingo gives every character a silhouette you could pick out in the dark:
//   Wren — a round postal bird (all circles), brings the day's letter of quests.
//   Fen  — a fox with a wagon (all triangles), runs the shop.
//   Moss — an old tortoise (a low dome), keeps the journal and its season map.
// Motion lives in camp-ui.css (`.cc-*`); everything stops under reduced motion.

import { cn } from '@/lib/utils'

type CharacterProps = {
  className?: string
  /** Mid-sentence: beaks and mouths open and close. */
  talking?: boolean
}

/** Wren, the postal bird. `mail`: holding today's letter, hopping to be noticed. */
function Wren({ className, talking, mail }: CharacterProps & { mail?: boolean }) {
  return (
    <svg className={cn('cc cc-wren', talking && 'is-talking', mail && 'has-mail', className)} viewBox="0 0 80 80" aria-hidden="true">
      <ellipse className="cc-shadow" cx="40" cy="76" rx="16" ry="3" />
      <g className="cc-rig">
        <path d="M33 70 l-2 6 M37 70 l1 6 M45 70 l-1 6 M49 70 l2 6" stroke="#e0742c" strokeWidth="2.6" strokeLinecap="round" />
        {/* Tail */}
        <path d="M60 46 C 70 38, 76 30, 76 24 C 70 28, 64 34, 58 40 Z" fill="#2a8edd" />
        <path d="M60 50 C 72 46, 78 40, 79 34 C 72 38, 66 42, 58 46 Z" fill="#52b4ff" />
        {/* Body */}
        <circle cx="40" cy="46" r="26" fill="#52b4ff" />
        <path d="M18 54 C 22 68, 34 72, 40 72 C 50 72, 60 66, 62 54 C 54 62, 26 62, 18 54 Z" fill="#2a8edd" opacity="0.45" />
        <ellipse cx="38" cy="56" rx="15" ry="12" fill="#fff3e0" />
        {/* Wing */}
        <path className="cc-wren-wing" d="M50 44 C 62 46, 64 58, 56 64 C 50 62, 46 54, 50 44 Z" fill="#2a8edd" />
        {/* Postal cap */}
        <path d="M24 28 C 26 16, 54 14, 58 26 C 48 24, 34 24, 24 28 Z" fill="#ff6f95" />
        <rect x="23" y="26" width="36" height="5" rx="2.5" fill="#ffcb3d" />
        <path d="M58 28 C 64 28, 66 31, 64 33 L 56 31 Z" fill="#de4772" />
        {/* Face */}
        <g className="cc-eyes">
          <ellipse cx="31" cy="40" rx="3.4" ry="4.2" fill="#2a2140" />
          <ellipse cx="47" cy="40" rx="3.4" ry="4.2" fill="#2a2140" />
          <circle cx="32.2" cy="38.6" r="1.3" fill="#ffffff" />
          <circle cx="48.2" cy="38.6" r="1.3" fill="#ffffff" />
        </g>
        <ellipse cx="25" cy="48" rx="4" ry="2.6" fill="#ff8fa8" opacity="0.6" />
        <ellipse cx="53" cy="48" rx="4" ry="2.6" fill="#ff8fa8" opacity="0.6" />
        <g className="cc-beak">
          <path className="cc-beak-top" d="M34 46 L 39 44 L 44 46 L 39 50 Z" fill="#ff9f5a" />
          <path className="cc-beak-low" d="M35 48 L 39 50 L 43 48 L 39 53 Z" fill="#e0742c" />
        </g>
        {mail && (
          <g className="cc-letter">
            <rect x="26" y="49" width="26" height="17" rx="2.5" fill="#fffaf0" stroke="#e3cfb2" strokeWidth="1.5" />
            <path d="M26.5 50 L 39 59 L 51.5 50" fill="none" stroke="#e3cfb2" strokeWidth="1.5" />
            <circle cx="39" cy="59" r="3" fill="#ff6f95" />
          </g>
        )}
      </g>
    </svg>
  )
}

/** Fen and the wagon: a striped awning, a counter, wheels, and Fen leaning on it. */
function FenCart({ className, talking, open }: CharacterProps & { open?: boolean }) {
  return (
    <svg className={cn('cc cc-fen', talking && 'is-talking', open && 'is-open', className)} viewBox="0 0 150 132" aria-hidden="true">
      <ellipse className="cc-shadow" cx="75" cy="127" rx="62" ry="5" />
      {/* Awning posts */}
      <rect x="14" y="26" width="5" height="70" rx="2.5" fill="#9c6536" />
      <rect x="131" y="26" width="5" height="70" rx="2.5" fill="#9c6536" />
      {/* Fen, behind the counter */}
      <g className="cc-rig cc-fen-rig">
        <path d="M58 96 C 58 74, 92 74, 92 96 Z" fill="#ff8a3d" />
        <path d="M66 96 C 66 84, 84 84, 84 96 Z" fill="#fff3e0" />
        <path d="M68 80 L 75 88 L 82 80 Z" fill="#3fcb91" />
        <g className="cc-fen-head">
          <path d="M55 40 L 60 18 L 72 34 Z" fill="#ff8a3d" />
          <path d="M95 40 L 90 18 L 78 34 Z" fill="#ff8a3d" />
          <path d="M59 34 L 61 24 L 67 32 Z" fill="#fff3e0" />
          <path d="M91 34 L 89 24 L 83 32 Z" fill="#fff3e0" />
          <path d="M52 50 C 52 32, 98 32, 98 50 C 98 64, 88 74, 75 76 C 62 74, 52 64, 52 50 Z" fill="#ff9f5a" />
          <path d="M56 56 C 62 54, 70 60, 75 70 C 80 60, 88 54, 94 56 C 92 66, 84 75, 75 76 C 66 75, 58 66, 56 56 Z" fill="#fff3e0" />
          <g className="cc-eyes">
            <path d="M62 50 q4 -4 8 0" fill="none" stroke="#2a2140" strokeWidth="3" strokeLinecap="round" />
            <path d="M80 50 q4 -4 8 0" fill="none" stroke="#2a2140" strokeWidth="3" strokeLinecap="round" />
          </g>
          <ellipse cx="75" cy="62" rx="4.2" ry="3.2" fill="#2a2140" />
          <path className="cc-fen-mouth" d="M70 67 Q 75 71 80 67" fill="none" stroke="#2a2140" strokeWidth="2.4" strokeLinecap="round" />
          <ellipse cx="60" cy="60" rx="4" ry="2.6" fill="#ff8fa8" opacity="0.55" />
          <ellipse cx="90" cy="60" rx="4" ry="2.6" fill="#ff8fa8" opacity="0.55" />
        </g>
        {/* Paws on the counter */}
        <ellipse cx="62" cy="96" rx="6" ry="4" fill="#ff8a3d" />
        <ellipse cx="88" cy="96" rx="6" ry="4" fill="#ff8a3d" />
      </g>
      {/* Awning */}
      <path d="M8 30 L 142 30 L 136 14 L 14 14 Z" fill="#fffaf0" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <path key={i} d={`M${14 + i * 20.3} 14 L ${14 + i * 20.3 + 10.15} 14 L ${8 + i * 22.3 + 11.15} 30 L ${8 + i * 22.3} 30 Z`} fill="#ff6f95" />
      ))}
      <path className="cc-awning-edge" d="M8 30 q 11 10 22 0 q 11 10 22 0 q 11 10 22 0 q 11 10 22 0 q 11 10 22 0 q 11 10 22 0" fill="#ff6f95" />
      {/* Counter and wagon */}
      <rect x="10" y="94" width="130" height="12" rx="4" fill="#c98e57" />
      <rect x="16" y="104" width="118" height="12" rx="3" fill="#9c6536" />
      <path d="M22 98 h106" stroke="#e2b07c" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      {/* Goods on the counter */}
      <g className="cc-goods">
        <path d="M24 94 C 24 84, 42 84, 42 94 Z" fill="#2fc4be" />
        <circle cx="33" cy="83" r="3.4" fill="#fff3e0" />
        <path d="M108 94 L 117 74 L 126 94 Z" fill="#a07cff" />
        <circle cx="117" cy="73" r="2.6" fill="#ffcb3d" />
      </g>
      {/* Wheels */}
      <g className="cc-wheel">
        <circle cx="34" cy="116" r="12" fill="#6e4a33" />
        <circle cx="34" cy="116" r="8.4" fill="#c98e57" />
        <path d="M34 107.6 V124.4 M25.6 116 H42.4 M28.1 110.1 L39.9 121.9 M39.9 110.1 L28.1 121.9" stroke="#6e4a33" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="34" cy="116" r="3" fill="#6e4a33" />
        <circle cx="30.8" cy="111.4" r="1.3" fill="#e2b07c" opacity="0.8" />
      </g>
      <g className="cc-wheel">
        <circle cx="116" cy="116" r="12" fill="#6e4a33" />
        <circle cx="116" cy="116" r="8.4" fill="#c98e57" />
        <path d="M116 107.6 V124.4 M107.6 116 H124.4 M110.1 110.1 L121.9 121.9 M121.9 110.1 L110.1 121.9" stroke="#6e4a33" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="116" cy="116" r="3" fill="#6e4a33" />
        <circle cx="112.8" cy="111.4" r="1.3" fill="#e2b07c" opacity="0.8" />
      </g>
      {/* The sign */}
      <g className="cc-fen-sign">
        <line x1="75" y1="2" x2="75" y2="14" stroke="#9c6536" strokeWidth="2" />
        <rect x="56" y="0" width="38" height="13" rx="4" fill="#c98e57" />
        <text x="75" y="10" textAnchor="middle" fontSize="8.5" fontWeight="800" fill="#fff4e3" fontFamily="'Sour Gummy', Nunito, sans-serif">
          FEN’S
        </text>
      </g>
    </svg>
  )
}

/** Moss, the old tortoise, with the camp journal leaning on the shell. */
function Moss({ className, talking }: CharacterProps) {
  return (
    <svg className={cn('cc cc-moss', talking && 'is-talking', className)} viewBox="0 0 120 76" aria-hidden="true">
      <ellipse className="cc-shadow" cx="62" cy="72" rx="46" ry="4" />
      <g className="cc-rig">
        {/* Feet */}
        <ellipse cx="38" cy="66" rx="8" ry="6" fill="#9fcf7a" />
        <ellipse cx="86" cy="66" rx="8" ry="6" fill="#9fcf7a" />
        {/* Head and neck */}
        <g className="cc-moss-head">
          <path d="M30 56 C 24 50, 20 44, 20 40 C 26 42, 32 48, 38 54 Z" fill="#9fcf7a" />
          <ellipse cx="18" cy="36" rx="15" ry="13" fill="#b3dd8f" />
          <ellipse cx="13" cy="41" rx="6" ry="3.6" fill="#9fcf7a" opacity="0.7" />
          <g className="cc-eyes">
            <path d="M9 33 q3.4 3 6.8 0" fill="none" stroke="#2a2140" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M20 33 q3.4 3 6.8 0" fill="none" stroke="#2a2140" strokeWidth="2.4" strokeLinecap="round" />
          </g>
          <circle cx="12.4" cy="33.6" r="5.6" fill="rgba(255,255,255,0.25)" stroke="#6e4a33" strokeWidth="1.6" />
          <circle cx="23.6" cy="33.6" r="5.6" fill="rgba(255,255,255,0.25)" stroke="#6e4a33" strokeWidth="1.6" />
          <path d="M18 33 h0.1" stroke="#6e4a33" strokeWidth="1.6" />
          <path className="cc-moss-mouth" d="M12 42 Q 17 45 22 42" fill="none" stroke="#2a2140" strokeWidth="2" strokeLinecap="round" />
          <ellipse cx="8" cy="40" rx="3" ry="2" fill="#ff8fa8" opacity="0.5" />
        </g>
        {/* Shell */}
        <path d="M30 62 C 30 28, 96 22, 104 58 C 104 64, 30 68, 30 62 Z" fill="#58ac6b" />
        <path d="M30 62 C 54 66, 84 66, 104 58 L 104 62 C 84 70, 54 70, 30 66 Z" fill="#3f8a52" />
        <path d="M50 38 l10 -6 l12 2 l4 12 l-10 8 l-12 -2 Z" fill="#7fcf8f" opacity="0.55" />
        <path d="M80 34 l10 4 l4 12 l-8 6 M38 50 l10 -2 l6 10" fill="none" stroke="#3f8a52" strokeWidth="2" strokeLinejoin="round" />
        {/* A little moss garden on top */}
        <path d="M58 30 C 62 26, 72 25, 78 29" fill="none" stroke="#9fcf7a" strokeWidth="5" strokeLinecap="round" />
        <path d="M70 26 C 70 20, 74 16, 76 14" fill="none" stroke="#2f9c63" strokeWidth="2" strokeLinecap="round" />
        <path d="M75 15 C 79 10, 85 11, 85 14 C 82 17, 78 17, 75 15 Z" fill="#58c98e" />
        <circle cx="62" cy="26" r="2.6" fill="#ffcb3d" />
      </g>
    </svg>
  )
}

export { FenCart, Moss, Wren }
