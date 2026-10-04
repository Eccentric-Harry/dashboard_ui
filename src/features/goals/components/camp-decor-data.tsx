// What Fen's decorations are and where they stand by default: which ones hang on the tent,
// the meadow pieces' art (each drawn around its own base at (0, 0)) and their default spots.
// The components that draw them live in camp-decor.tsx and camp-yard.tsx.

import type { ReactNode } from 'react'
import type { CampDecorSpot } from '@/types/goals'

/** Decorations that hang on the tent rather than standing in the meadow. */
export const TENT_DECOR = ['bunting', 'fairy-lights'] as const
export const isTentDecor = (id: string) => (TENT_DECOR as readonly string[]).includes(id)

// ── The meadow pieces, each around its own base at (0, 0) ──

type YardArt = { box: [number, number, number, number]; art: ReactNode }

const FLOWER = (x: number, y: number, c: string, i: number) => (
  <g key={`${x}${y}`} transform={`translate(${x} ${y})`}>
    <g className="cd-nod" style={{ animationDelay: `${-i * 0.7}s` }}>
      <line x1="0" y1="0" x2="0" y2="7" stroke="#3f8a52" strokeWidth="1.6" />
      <circle cx="0" cy="-3" r="2.8" fill={c} />
      <circle cx="3" cy="0" r="2.8" fill={c} />
      <circle cx="-3" cy="0" r="2.8" fill={c} />
      <circle cx="0" cy="-0.6" r="1.8" fill="#fff6d6" />
    </g>
  </g>
)

export const YARD_ART: Record<string, YardArt> = {
  'flower-bed': {
    box: [-44, -16, 88, 22],
    art: (
      <g className="cd cd-flowers">
        <ellipse cx="0" cy="0" rx="40" ry="4.5" fill="#58ac6b" opacity="0.5" />
        {FLOWER(-31, -7, '#ff6f95', 0)}
        {FLOWER(-15, -10, '#ffcb3d', 1)}
        {FLOWER(15, -7, '#a07cff', 2)}
        {FLOWER(31, -10, '#52b4ff', 3)}
        {FLOWER(0, -6, '#ff9f5a', 4)}
      </g>
    ),
  },
  'mushroom-lamps': {
    box: [-20, -28, 40, 31],
    art: (
      <g className="cd cd-mushrooms">
        {(
          [
            [-6, 0, 1],
            [7, 1, 0.75],
          ] as const
        ).map(([x, y, sc]) => (
          <g key={x} transform={`translate(${x} ${y}) scale(${sc})`}>
            <circle className="cd-glow" cx="0" cy="-10" r="12" fill="#ffe08a" />
            <rect x="-2.6" y="-9" width="5.2" height="9" rx="2" fill="#fff3e0" />
            <path d="M-9 -8 C -9 -18, 9 -18, 9 -8 Z" fill="#ff6f95" />
            <circle cx="-3.5" cy="-12.5" r="1.6" fill="#ffffff" />
            <circle cx="3" cy="-11" r="1.2" fill="#ffffff" />
          </g>
        ))}
      </g>
    ),
  },
  guitar: {
    box: [-18, -58, 34, 61],
    art: (
      <g className="cd cd-guitar" transform="rotate(-16)">
        <rect x="-2" y="-46" width="4" height="26" rx="1.5" fill="#6e4a33" />
        <rect x="-3.4" y="-52" width="6.8" height="8" rx="2" fill="#4a3426" />
        <path d="M0 -22 C -9 -22, -10 -14, -7 -11 C -12 -8, -12 0, 0 0 C 12 0, 12 -8, 7 -11 C 10 -14, 9 -22, 0 -22 Z" fill="#ff9f5a" />
        <circle cx="0" cy="-11" r="3" fill="#6e4a33" />
        <path d="M-1 -46 V -4 M1 -46 V -4" stroke="#fff3e0" strokeWidth="0.5" />
      </g>
    ),
  },
  telescope: {
    box: [-24, -58, 50, 61],
    art: (
      <g className="cd cd-telescope">
        <path d="M0 -28 L -8 0 M0 -28 L 9 0 M0 -28 L 1 0" stroke="#6e4a33" strokeWidth="2.4" strokeLinecap="round" />
        <g transform="translate(0 -30) rotate(-34)">
          <rect x="-16" y="-4.5" width="30" height="9" rx="3" fill="#52b4ff" />
          <rect x="12" y="-6" width="8" height="12" rx="2.5" fill="#2a8edd" />
          <rect x="-20" y="-3" width="5" height="6" rx="1.5" fill="#ffcb3d" />
        </g>
      </g>
    ),
  },
  'lamp-post': {
    box: [-16, -66, 32, 69],
    art: (
      <g className="cd cd-lamp-post">
        <circle className="cd-glow" cx="0" cy="-50" r="16" fill="#ffe08a" />
        <rect x="-5" y="-2" width="10" height="3" rx="1.5" fill="#4a3426" />
        <rect x="-1.6" y="-44" width="3.2" height="43" rx="1.4" fill="#4a3426" />
        <rect className="cd-lamp-glass" x="-5.5" y="-57" width="11" height="13" rx="3" fill="#fff3c4" stroke="#4a3426" strokeWidth="1.6" />
        <path d="M-7.5 -57 L0 -63 L7.5 -57 Z" fill="#4a3426" />
        <circle cx="0" cy="-64" r="1.6" fill="#4a3426" />
      </g>
    ),
  },
  pumpkins: {
    box: [-26, -26, 52, 29],
    art: (
      <g className="cd cd-pumpkins">
        <ellipse cx="0" cy="0" rx="24" ry="3" fill="#000" opacity="0.08" />
        <g transform="translate(-9 0)">
          <ellipse cx="0" cy="-10" rx="13" ry="10.5" fill="#ff9f5a" />
          <path d="M-5 -19 C -8 -12, -8 -6, -5 -1 M5 -19 C 8 -12, 8 -6, 5 -1" stroke="#e0742c" strokeWidth="1.6" fill="none" />
          <path d="M0 -20 C 0 -24, 2 -26, 4 -26" stroke="#3f8a52" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        </g>
        <g transform="translate(12 0) scale(0.7)">
          <ellipse cx="0" cy="-10" rx="13" ry="10.5" fill="#ffcb3d" />
          <path d="M-5 -19 C -8 -12, -8 -6, -5 -1 M5 -19 C 8 -12, 8 -6, 5 -1" stroke="#dfa412" strokeWidth="1.8" fill="none" />
          <path d="M0 -20 C 0 -24, 2 -26, 4 -26" stroke="#3f8a52" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        </g>
      </g>
    ),
  },
  pinwheel: {
    box: [-16, -52, 32, 55],
    art: (
      <g className="cd cd-pinwheel">
        <rect x="-1.2" y="-34" width="2.4" height="34" rx="1" fill="#9c6536" />
        <g transform="translate(0 -36)">
          <g className="cd-spin">
            <path d="M0 0 L0 -13 C 7 -13, 9 -6, 0 0 Z" fill="#ff6f95" />
            <path d="M0 0 L13 0 C 13 7, 6 9, 0 0 Z" fill="#ffcb3d" />
            <path d="M0 0 L0 13 C -7 13, -9 6, 0 0 Z" fill="#52b4ff" />
            <path d="M0 0 L-13 0 C -13 -7, -6 -9, 0 0 Z" fill="#3fcb91" />
          </g>
          <circle r="2" fill="#fff3e0" />
        </g>
      </g>
    ),
  },
  birdhouse: {
    box: [-16, -62, 32, 65],
    art: (
      <g className="cd cd-birdhouse">
        <rect x="-2" y="-34" width="4" height="34" rx="1.5" fill="#9c6536" />
        <rect x="-11" y="-50" width="22" height="18" rx="2" fill="#52b4ff" />
        <path d="M-14 -49 L0 -61 L14 -49 Z" fill="#ff6f95" />
        <circle cx="0" cy="-42" r="3.6" fill="#2a2140" />
        <rect x="-4" y="-35.5" width="8" height="1.8" rx="0.9" fill="#9c6536" />
        {/* A small resident on the roof. */}
        <g transform="translate(7 -58)">
          <ellipse cx="0" cy="0" rx="4.4" ry="3.4" fill="#ffcb3d" />
          <circle cx="3" cy="-2.4" r="2.4" fill="#ffcb3d" />
          <circle cx="3.8" cy="-2.8" r="0.6" fill="#2a2140" />
          <path d="M5.2 -2.2 l2 0.6 l-2 0.6 Z" fill="#ff9f5a" />
        </g>
      </g>
    ),
  },
  pond: {
    box: [-46, -14, 92, 22],
    art: (
      <g className="cd cd-pond">
        <ellipse cx="0" cy="0" rx="44" ry="10" fill="#a6957f" opacity="0.45" />
        <ellipse className="cd-water" cx="0" cy="-0.5" rx="40" ry="8.4" fill="#74cdf2" />
        <path className="cd-ripple" d="M-24 -2 q6 -2 12 0 M8 2 q5 -1.6 10 0" stroke="#ffffff" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.7" />
        <path d="M-14 1 a6 3 0 1 1 0.1 0 Z M-12 1 l4 -2" fill="#3fcb91" />
        <path d="M18 -3 a5 2.6 0 1 1 0.1 0 Z" fill="#3fcb91" />
        <circle cx="18" cy="-5" r="2" fill="#ff8fb0" />
        <g transform="translate(-14 -2)">
          <ellipse cx="0" cy="0" rx="4.2" ry="3" fill="#58c26a" />
          <circle cx="-2" cy="-2.6" r="1.6" fill="#58c26a" />
          <circle cx="2" cy="-2.6" r="1.6" fill="#58c26a" />
          <circle cx="-2" cy="-2.8" r="0.6" fill="#2a2140" />
          <circle cx="2" cy="-2.8" r="0.6" fill="#2a2140" />
        </g>
        {/* Reeds at the far edge. */}
        <path d="M34 -4 q1 -12 3 -16 M37 -4 q0 -9 -2 -13" stroke="#3f8a52" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <ellipse cx="37" cy="-19" rx="1.6" ry="3.4" fill="#9c6536" />
      </g>
    ),
  },
  'cherry-tree': {
    box: [-36, -92, 72, 95],
    art: (
      <g className="cd cd-tree">
        <ellipse cx="0" cy="0" rx="26" ry="3.4" fill="#000" opacity="0.08" />
        <path d="M-4 0 C -3 -18, -6 -30, -2 -44 L 3 -44 C 5 -30, 3 -16, 5 0 Z" fill="#8a5a3c" />
        <path d="M-1 -34 C -10 -40, -14 -46, -16 -52 M2 -38 C 10 -44, 14 -50, 16 -56" stroke="#8a5a3c" strokeWidth="3" fill="none" strokeLinecap="round" />
        <g className="cd-canopy">
          <circle cx="-16" cy="-58" r="16" fill="#ffb3cb" />
          <circle cx="14" cy="-62" r="17" fill="#ffb3cb" />
          <circle cx="-2" cy="-74" r="17" fill="#ffc8d8" />
          <circle cx="-22" cy="-70" r="11" fill="#ffc8d8" />
          <circle cx="22" cy="-76" r="10" fill="#ffc8d8" />
          <circle cx="0" cy="-56" r="13" fill="#ff9fbd" />
          {[[-10, -66], [8, -70], [-20, -56], [18, -58], [2, -80], [-4, -60]].map(([x, y]) => (
            <circle key={`${x}${y}`} cx={x} cy={y} r="1.6" fill="#ffffff" opacity="0.85" />
          ))}
        </g>
        <circle className="cd-petal" cx="20" cy="-30" r="1.8" fill="#ffc8d8" />
        <circle className="cd-petal cd-petal--b" cx="-18" cy="-24" r="1.5" fill="#ffc8d8" />
      </g>
    ),
  },
  picnic: {
    box: [-38, -22, 76, 26],
    art: (
      <g className="cd cd-picnic">
        <path d="M-34 0 L -22 -14 L 34 -14 L 24 0 Z" fill="#ffffff" />
        <path d="M-30 -5 L 30 -5 M-26 -10 L 32 -10 M-20 0 L -10 -14 M-6 0 L 4 -14 M8 0 L 18 -14" stroke="#ff8fa6" strokeWidth="3" />
        <path d="M-34 0 L -22 -14 L 34 -14 L 24 0 Z" fill="none" stroke="#de4772" strokeWidth="1" opacity="0.5" />
        <g transform="translate(6 -9)">
          <path d="M-9 0 L 9 0 L 7 -9 L -7 -9 Z" fill="#c98e57" />
          <path d="M-7 -9 C -7 -17, 7 -17, 7 -9" fill="none" stroke="#9c6536" strokeWidth="1.8" />
          <path d="M-8 -4 H8" stroke="#9c6536" strokeWidth="1" />
          <circle cx="-3" cy="-10" r="2.6" fill="#3fcb91" />
          <circle cx="2" cy="-10.5" r="2.4" fill="#ffcb3d" />
        </g>
        <circle cx="-16" cy="-7" r="3.4" fill="#ff9f5a" />
        <path d="M-16 -10.4 l1 -2" stroke="#3f8a52" strokeWidth="1.2" />
      </g>
    ),
  },
  signpost: {
    box: [-26, -60, 52, 63],
    art: (
      <g className="cd cd-signpost">
        <rect x="-2" y="-52" width="4" height="52" rx="1.5" fill="#9c6536" />
        <path d="M-2 -50 H 20 L 25 -45 L 20 -40 H -2 Z" fill="#c98e57" />
        <path d="M2 -38 H -20 L -25 -33 L -20 -28 H 2 Z" fill="#e2b07c" />
        <path d="M-2 -26 H 16 L 20 -22 L 16 -18 H -2 Z" fill="#c98e57" />
        <path d="M4 -45 h12 M-6 -33 h-11 M3 -22 h9" stroke="#6b5440" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
      </g>
    ),
  },
}

/** Where each piece goes if you haven't moved it: open meadow, clear of the camp's things. */
export const DEFAULT_SPOTS: Record<string, CampDecorSpot> = {
  birdhouse: { x: 0.13, y: 0.14 },
  'flower-bed': { x: 0.27, y: 0.12 },
  pond: { x: 0.41, y: 0.17 },
  pinwheel: { x: 0.53, y: 0.09 },
  telescope: { x: 0.92, y: 0.16 },
  'cherry-tree': { x: 0.05, y: 0.34 },
  'lamp-post': { x: 0.19, y: 0.38 },
  picnic: { x: 0.31, y: 0.34 },
  pumpkins: { x: 0.61, y: 0.13 },
  guitar: { x: 0.71, y: 0.2 },
  signpost: { x: 0.85, y: 0.36 },
  'mushroom-lamps': { x: 0.95, y: 0.44 },
}

