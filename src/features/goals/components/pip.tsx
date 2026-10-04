import type { PipMood } from '../buddy-brain'
import type { PipStage } from '../pip-growth'
import { cn } from '@/lib/utils'
import { PipWear } from './pip-wear'
import './pip.css'

type PipProps = {
  mood: PipMood
  size?: number
  className?: string
  /** Position when Pip is nested inside another SVG (the camp diorama). */
  x?: number
  y?: number
  /** What Pip has on, from Fen's cart. */
  wear?: { hat?: string | null; neck?: string | null; face?: string | null }
  /** How far Pip has grown (pip-growth.ts) — only ever forward. */
  stage?: PipStage
  /** What the buddy is called, for the label. */
  name?: string
}

/**
 * Pip, the camp's sprout spirit. One SVG; the mood only switches which eyes and mouth
 * show and which motion plays (pip.css), so a mood change never remounts anything.
 * Pip has no sad, sick or hurt face at all — a quiet day is "cozy" (sleepy, content).
 */
function Pip({ mood, size = 96, className, x, y, wear, stage = 'sprout', name = 'Pip' }: PipProps) {
  return (
    <svg
      className={cn('pip', className)}
      data-mood={mood}
      data-stage={stage}
      x={x}
      y={y}
      width={size}
      height={size * (130 / 120)}
      viewBox="0 0 120 130"
      role="img"
      aria-label={`${name}, looking ${MOOD_WORDS[mood]}`}
      overflow="visible"
    >
      <ellipse className="pip-shadow" cx="60" cy="124" rx="30" ry="5" />
      <g className="pip-rig">
        <g className="pip-sprout">
          <path className="pip-stem" d="M60 30 C 60 24, 61 19, 63 14" />
          <path className="pip-leaf" d="M62 16 C 52 6, 40 10, 40 16 C 46 22, 56 21, 62 16 Z" />
          <path className="pip-leaf pip-leaf--r" d="M63 15 C 70 3, 84 4, 86 10 C 81 18, 70 19, 63 15 Z" />
          {stage !== 'sprout' && <path className="pip-leaf pip-leaf--third" d="M61 23 C 55 18, 47 21, 47 25 C 51 29, 57 28, 61 23 Z" />}
          {stage === 'bud' && (
            <g className="pip-bud">
              <path d="M58.5 13 C 58 6, 62 1, 64 0 C 67 2, 69 7, 67.5 13 Z" fill="#ff8fb0" />
              <path d="M58 13 C 60 9, 66 9, 68 13 C 66 15, 60 15, 58 13 Z" fill="#3f9c63" />
            </g>
          )}
          {stage === 'bloom' && (
            <g className="pip-bloom" transform="translate(63.5 7)">
              {[0, 72, 144, 216, 288].map((a) => (
                <ellipse key={a} cx="0" cy="-6.4" rx="4.6" ry="6.2" fill="#ff8fb0" transform={`rotate(${a})`} />
              ))}
              <circle cx="0" cy="0" r="4.2" fill="#ffcb3d" />
              <circle cx="-1.2" cy="-1.2" r="1.4" fill="#fff1c2" />
            </g>
          )}
        </g>
        <g className="pip-arm pip-arm--l">
          <rect x="10" y="72" width="18" height="11" rx="5.5" />
        </g>
        <g className="pip-arm pip-arm--r">
          <rect x="92" y="72" width="18" height="11" rx="5.5" />
        </g>
        <ellipse className="pip-foot" cx="45" cy="117" rx="10" ry="5.5" />
        <ellipse className="pip-foot" cx="75" cy="117" rx="10" ry="5.5" />
        <path
          className="pip-body"
          d="M60 27 C 88 27, 103 49, 103 77 C 103 104, 85 119, 60 119 C 35 119, 17 104, 17 77 C 17 49, 32 27, 60 27 Z"
        />
        <path className="pip-shade" d="M24 92 C 30 110, 46 119, 60 119 C 76 119, 92 110, 97 93 C 88 106, 75 111, 60 111 C 45 111, 32 106, 24 92 Z" />
        <ellipse className="pip-belly" cx="60" cy="94" rx="24" ry="16" />
        <ellipse className="pip-gloss" cx="40" cy="48" rx="9" ry="5" transform="rotate(-28 40 48)" />
        <ellipse className="pip-cheek" cx="35" cy="85" rx="7.5" ry="4.5" />
        <ellipse className="pip-cheek" cx="85" cy="85" rx="7.5" ry="4.5" />

        <g className="pip-eyes pip-eyes--open">
          <ellipse cx="45" cy="72" rx="6.2" ry="8" />
          <ellipse cx="75" cy="72" rx="6.2" ry="8" />
          <circle className="pip-glint" cx="47.4" cy="68.6" r="2.3" />
          <circle className="pip-glint" cx="77.4" cy="68.6" r="2.3" />
        </g>
        <g className="pip-eyes pip-eyes--happy">
          <path d="M38 75 Q 45 65 52 75" />
          <path d="M68 75 Q 75 65 82 75" />
        </g>
        <g className="pip-eyes pip-eyes--sleepy">
          <path d="M38 72 Q 45 78 52 72" />
          <path d="M68 72 Q 75 78 82 72" />
        </g>

        <path className="pip-mouth pip-mouth--smile" d="M53 87 Q 60 94 67 87" />
        <path className="pip-mouth pip-mouth--open" d="M52 86 Q 60 86 68 86 Q 66 97 60 97 Q 54 97 52 86 Z" />
        <ellipse className="pip-mouth pip-mouth--o" cx="60" cy="89" rx="4" ry="4.6" />

        <PipWear hat={wear?.hat} neck={wear?.neck} face={wear?.face} />
      </g>

      <g className="pip-fx pip-fx--stars" aria-hidden="true">
        <path d="M14 30 l2.4 5.6 5.6 2.4 -5.6 2.4 -2.4 5.6 -2.4 -5.6 -5.6 -2.4 5.6 -2.4 Z" />
        <path d="M104 20 l1.8 4.2 4.2 1.8 -4.2 1.8 -1.8 4.2 -1.8 -4.2 -4.2 -1.8 4.2 -1.8 Z" />
        <path d="M110 58 l1.4 3.2 3.2 1.4 -3.2 1.4 -1.4 3.2 -1.4 -3.2 -3.2 -1.4 3.2 -1.4 Z" />
      </g>
      <g className="pip-fx pip-fx--z" aria-hidden="true">
        <text x="92" y="34">z</text>
        <text x="102" y="20">z</text>
      </g>
    </svg>
  )
}

const MOOD_WORDS: Record<PipMood, string> = {
  welcome: 'happy to see you',
  waking: 'freshly awake',
  content: 'content',
  eager: 'eager',
  celebrating: 'over the moon',
  proud: 'proud',
  cozy: 'cosy and sleepy',
}

export { Pip }
