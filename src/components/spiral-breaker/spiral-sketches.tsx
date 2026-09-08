import { cn } from '../../lib/utils'

/**
 * Line sketches for the Spiral Breaker, one per beat.
 *
 * The overlay is one constant-height surface across four steps of very different copy
 * lengths, which used to leave a large blank gap between the text and the action. These
 * fill that gap with something that carries the same message as the words: a spiral
 * unwinding into a flat line, a fork with one real branch, ripples spreading from a
 * point of attention, a path that loops out and comes back.
 *
 * All decorative — aria-hidden, no text, nothing that needs reading.
 */

const UNWIND_PATH =
  'M 107.0 60.0 L 107.4 60.4 L 107.8 60.9 L 108.0 61.5 L 108.1 62.1 L 108.1 62.8 L 107.9 63.5 L 107.5 64.3 L 106.9 65.0 L 106.2 65.6 L 105.3 66.2 L 104.2 66.6 L 103.1 67.0 L 101.8 67.2 L 100.4 67.2 L 99.0 67.0 L 97.5 66.7 L 96.1 66.2 L 94.8 65.4 L 93.5 64.5 L 92.4 63.4 L 91.5 62.1 L 90.8 60.7 L 90.4 59.1 L 90.2 57.5 L 90.3 55.8 L 90.8 54.1 L 91.5 52.4 L 92.6 50.8 L 94.0 49.3 L 95.7 47.9 L 97.7 46.7 L 99.9 45.8 L 102.3 45.1 L 104.9 44.6 L 107.6 44.5 L 110.3 44.7 L 113.1 45.3 L 115.8 46.1 L 118.3 47.3 L 120.7 48.9 L 122.8 50.7 L 124.7 52.8 L 126.1 55.1 L 127.2 57.6 L 127.9 60.3 L 128.0 63.1 L 127.7 65.9 L 126.9 68.8 L 125.5 71.5 L 123.7 74.1 L 121.4 76.5 L 118.7 78.7 L 115.6 80.5 L 112.1 82.0 L 108.4 83.1 L 104.4 83.7 L 100.3 83.9 L 96.1 83.6 L 92.0 82.9 L 88.0 81.6 L 84.2 79.8 L 80.7 77.6 L 77.5 75.0 L 74.8 72.0 L 72.6 68.7 L 71.0 65.1 L 70.0 61.2 L 69.6 57.3 L 70.0 53.3 L 71.0 49.3 L 72.8 45.5 L 75.2 41.8 L 78.2 38.4 L 81.9 35.4 L 86.0 32.8 L 90.7 30.6 L 95.7 29.0 L 101.0 28.0 L 106.1 28.1 L 111.2 28.6 L 116.3 29.3 L 121.4 30.3 L 126.6 31.6 L 131.7 33.1 L 136.8 34.8 L 141.9 36.7 L 147.0 38.7 L 152.1 40.8 L 157.2 43.0 L 162.3 45.2 L 167.4 47.3 L 172.5 49.4 L 177.6 51.4 L 182.7 53.3 L 187.8 55.0 L 192.9 56.5 L 198.0 57.7 L 203.1 58.7 L 208.2 59.4 L 213.3 59.9 L 218.4 60.0 L 223.5 60.0 L 228.6 60.0 L 233.7 60.0 L 238.8 60.0 L 243.9 60.0 L 249.0 60.0 L 254.1 60.0 L 259.2 60.0 L 264.3 60.0 L 269.4 60.0 L 274.5 60.0 L 279.6 60.0 L 284.7 60.0 L 289.8 60.0 L 294.9 60.0 L 300.0 60.0'

/** A spiral that runs out of turns and leaves as a straight, quiet line. */
function UnwindSketch() {
  return (
    <>
      <path className="sk-stroke sk-draw" pathLength={1} d={UNWIND_PATH} />
      <circle className="sk-dot" cx="107" cy="60" r="3" />
      <path className="sk-stroke sk-faint sk-draw sk-delay-2" pathLength={1} d="M 206 80 L 300 80" />
      <path className="sk-stroke sk-fainter sk-draw sk-delay-3" pathLength={1} d="M 240 98 L 300 98" />
    </>
  )
}

/** One question, two branches: a real thing to do, or a thought that goes nowhere. */
function ForkSketch() {
  return (
    <>
      <path
        className="sk-stroke sk-draw"
        pathLength={1}
        d="M 20 60 L 100 60 C 132 60 134 24 166 24 L 238 24"
      />
      <path
        className="sk-stroke sk-dashed sk-fade sk-delay-2"
        d="M 100 60 C 132 60 134 98 166 98 L 224 98"
      />
      <circle className="sk-dot" cx="20" cy="60" r="3" />
      <rect className="sk-stroke sk-fill sk-delay-3" x="250" y="10" width="46" height="28" rx="9" />
      <path className="sk-stroke sk-cap sk-delay-4" d="M 262 24 L 269 31 L 285 15" />
      <circle className="sk-dot sk-faint sk-delay-3" cx="238" cy="98" r="2.8" />
      <circle className="sk-dot sk-fainter sk-delay-4" cx="256" cy="98" r="2.2" />
      <circle className="sk-dot sk-fainter sk-delay-4" cx="272" cy="98" r="1.5" />
    </>
  )
}

/** Attention landing on the room: ripples out from one point, five things to find. */
function RippleSketch() {
  return (
    <>
      <path className="sk-stroke sk-faint sk-draw" pathLength={1} d="M 16 104 L 304 104" />
      {/* Half-arcs, so the ripples spread across the room rather than through the floor. */}
      <g className="sk-ripples">
        <path className="sk-stroke" d="M 130 104 A 30 30 0 0 1 190 104" />
        <path className="sk-stroke sk-faint" d="M 106 104 A 54 54 0 0 1 214 104" />
        <path className="sk-stroke sk-fainter" d="M 80 104 A 80 80 0 0 1 240 104" />
      </g>
      <circle className="sk-dot" cx="160" cy="104" r="3.4" />
      {/* Five things in the room, found in the order the prompt asks for them. */}
      <path className="sk-stroke sk-draw sk-delay-2" pathLength={1} d="M 24 104 L 24 76" />
      <path className="sk-stroke sk-draw sk-delay-2" pathLength={1} d="M 52 104 L 52 58" />
      <path className="sk-stroke sk-draw sk-delay-3" pathLength={1} d="M 80 104 L 80 46" />
      <path className="sk-stroke sk-draw sk-delay-3" pathLength={1} d="M 272 104 L 272 54" />
      <path className="sk-stroke sk-draw sk-delay-4" pathLength={1} d="M 300 104 L 300 70" />
      <circle className="sk-dot sk-faint sk-delay-2" cx="24" cy="74" r="2.8" />
      <circle className="sk-dot sk-faint sk-delay-2" cx="52" cy="56" r="2.8" />
      <circle className="sk-dot sk-faint sk-delay-3" cx="80" cy="44" r="2.8" />
      <circle className="sk-dot sk-faint sk-delay-3" cx="272" cy="52" r="2.8" />
      <circle className="sk-dot sk-faint sk-delay-4" cx="300" cy="68" r="2.8" />
    </>
  )
}

/** The way out is a loop, not a new destination — the line comes back to where it left. */
function ReturnSketch() {
  return (
    <>
      <path
        className="sk-stroke sk-draw"
        pathLength={1}
        d="M 104 98 C 128 34 200 16 250 44 C 296 70 280 108 222 106 C 168 104 132 72 106 64 L 84 62"
      />
      <path className="sk-stroke sk-cap sk-delay-4" d="M 94 54 L 84 62 L 94 70" />
      <circle className="sk-dot" cx="104" cy="98" r="3" />
      {/* The thing you were doing, still sitting there. */}
      <rect className="sk-stroke sk-fill sk-delay-3" x="14" y="44" width="58" height="16" rx="8" />
      <rect className="sk-stroke sk-faint sk-delay-4" x="14" y="68" width="44" height="13" rx="6.5" />
    </>
  )
}

const SKETCHES = {
  unwind: UnwindSketch,
  fork: ForkSketch,
  ripple: RippleSketch,
  return: ReturnSketch,
}

type SketchName = keyof typeof SKETCHES

function SpiralSketch({ name, className }: { name: SketchName; className?: string }) {
  const Shapes = SKETCHES[name]
  return (
    <div className={cn('spiral-sketch', className)} aria-hidden="true">
      <svg viewBox="0 0 320 120" preserveAspectRatio="xMidYMid meet" focusable="false">
        <Shapes />
      </svg>
    </div>
  )
}

export { SpiralSketch }
export type { SketchName }
