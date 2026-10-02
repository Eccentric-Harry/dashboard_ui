// The Quiet Path's residents (residents.ts), drawn the way the camp draws its cast: solid
// candy shapes, a darker lip underneath, big glinting eyes — each with one silhouette you
// could pick out in the dark and one small motion that is their skill: Bo's throat puffs
// with a slow breath, Tova's head eases out of her shell, Ollie's leaf drifts, Bram's rake
// sways, Luma glows, Dot breathes in her sleep, Gus nods into the fog, Sora's ears twitch.
// Motion lives in quiet-path.css (`.qr-*`) and stops under reduced motion.

import { cn } from '@/lib/utils'
import { Pip } from '../../components/pip'
import type { PipStage } from '../../pip-growth'
import { Kiri } from './kiri'
import type { ResidentKey, Speaker } from './residents'

type ArtProps = { className?: string; talking?: boolean }

const INK = '#2a2140'
const BLUSH = '#ff8fa8'

function Eyes({ l, r, y, size = 2.6 }: { l: number; r: number; y: number; size?: number }) {
  return (
    <g className="qr-eyes">
      <circle cx={l} cy={y} r={size} fill={INK} />
      <circle cx={r} cy={y} r={size} fill={INK} />
      <circle cx={l + size * 0.4} cy={y - size * 0.45} r={size * 0.38} fill="#ffffff" />
      <circle cx={r + size * 0.4} cy={y - size * 0.45} r={size * 0.38} fill="#ffffff" />
    </g>
  )
}

const Blush = ({ l, r, y }: { l: number; r: number; y: number }) => (
  <>
    <ellipse cx={l} cy={y} rx="3.6" ry="2.2" fill={BLUSH} opacity="0.55" />
    <ellipse cx={r} cy={y} rx="3.6" ry="2.2" fill={BLUSH} opacity="0.55" />
  </>
)

function Frame({ who, className, talking, children }: ArtProps & { who: ResidentKey; children: React.ReactNode }) {
  return (
    <svg className={cn('qr', `qr-${who}`, talking && 'is-talking', className)} viewBox="0 0 80 80" overflow="visible" aria-hidden="true">
      <ellipse className="qr-shadow" cx="40" cy="76" rx="24" ry="3.4" />
      <g className="qr-rig">{children}</g>
    </svg>
  )
}

/** Bo, the frog of the birch wood — breathes out slowly, and that's mostly all. */
function Bo(props: ArtProps) {
  return (
    <Frame who="bo" {...props}>
      <ellipse cx="40" cy="72" rx="29" ry="5.5" fill="#6fbf6a" />
      <path d="M40 72 L 62 69 L 60 74 Z" fill="#c3e6b8" />
      <ellipse cx="19" cy="66" rx="9" ry="4.5" fill="#3a9a5c" />
      <ellipse cx="61" cy="66" rx="9" ry="4.5" fill="#3a9a5c" />
      <ellipse cx="40" cy="54" rx="24" ry="17" fill="#58c27a" />
      <path d="M17 57 C 21 70, 59 70, 63 57 C 55 64, 25 64, 17 57 Z" fill="#3a9a5c" opacity="0.5" />
      <ellipse className="qr-bo-throat" cx="40" cy="59" rx="11" ry="7" fill="#f3ffd6" />
      <circle cx="28" cy="38" r="9.5" fill="#58c27a" />
      <circle cx="52" cy="38" r="9.5" fill="#58c27a" />
      <g className="qr-eyes">
        <circle cx="28" cy="37" r="6.2" fill="#ffffff" />
        <circle cx="52" cy="37" r="6.2" fill="#ffffff" />
        <circle cx="29" cy="38" r="3.4" fill={INK} />
        <circle cx="53" cy="38" r="3.4" fill={INK} />
        <circle cx="30.2" cy="36.6" r="1.2" fill="#ffffff" />
        <circle cx="54.2" cy="36.6" r="1.2" fill="#ffffff" />
      </g>
      <path className="qr-mouth" d="M30 49 Q 40 55, 50 49" stroke="#2a6b43" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <Blush l={23} r={57} y={50} />
      <ellipse cx="30" cy="69" rx="6" ry="3" fill="#3a9a5c" />
      <ellipse cx="50" cy="69" rx="6" ry="3" fill="#3a9a5c" />
    </Frame>
  )
}

/** Tova, the tortoise of Fern hollow — slow, and so she notices. */
function Tova(props: ArtProps) {
  return (
    <Frame who="tova" {...props}>
      <rect x="20" y="60" width="9" height="13" rx="4" fill="#a8925c" />
      <rect x="52" y="60" width="9" height="13" rx="4" fill="#a8925c" />
      <g className="qr-tova-head">
        <path d="M24 58 C 16 56, 12 52, 12 46" stroke="#cdb97c" strokeWidth="8" strokeLinecap="round" fill="none" />
        <circle cx="12" cy="42" r="9.5" fill="#cdb97c" />
        <circle cx="8.6" cy="40" r="2.2" fill={INK} />
        <circle cx="9.4" cy="39.2" r="0.8" fill="#ffffff" />
        <path className="qr-mouth" d="M4 45.5 Q 7 48, 10.5 46.5" stroke="#7a6a3c" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <ellipse cx="14" cy="46" rx="2.8" ry="1.8" fill={BLUSH} opacity="0.55" />
      </g>
      <path d="M66 60 L 74 63 L 66 64 Z" fill="#a8925c" />
      <path d="M17 62 C 15 34, 67 34, 67 62 Z" fill="#7cc278" />
      <path d="M13 61 H 71 C 71 67, 13 67, 13 61 Z" fill="#5a9f57" />
      <circle cx="31" cy="51" r="6.2" fill="#9fd892" />
      <circle cx="49" cy="49" r="6.2" fill="#9fd892" />
      <circle cx="40" cy="57.5" r="4.6" fill="#9fd892" />
      <circle cx="40" cy="42" r="4.4" fill="#9fd892" />
      <path d="M44 38 C 46 31, 52 29, 56 31 C 54 35, 49 38, 44 38 Z" fill="#3fcb91" />
      <path d="M44 38 C 48 35, 51 33, 55 31.4" stroke="#23a56f" strokeWidth="1" fill="none" />
    </Frame>
  )
}

/** Ollie, the otter of Willow river — floats, and watches leaves (and thoughts) drift by. */
function Ollie(props: ArtProps) {
  return (
    <Frame who="ollie" {...props}>
      <path d="M50 66 C 64 68, 71 60, 73 49 C 66 56, 60 60, 50 60 Z" fill="#8a5e3c" />
      <ellipse cx="33" cy="72" rx="6.5" ry="3.2" fill="#7a5235" />
      <ellipse cx="47" cy="72" rx="6.5" ry="3.2" fill="#7a5235" />
      <ellipse cx="40" cy="55" rx="15.5" ry="18" fill="#a8754f" />
      <ellipse cx="40" cy="58" rx="10" ry="13" fill="#f1dcc0" />
      <circle cx="28" cy="19" r="4.6" fill="#8a5e3c" />
      <circle cx="52" cy="19" r="4.6" fill="#8a5e3c" />
      <circle cx="40" cy="30" r="14" fill="#a8754f" />
      <ellipse cx="40" cy="35.5" rx="9" ry="6.5" fill="#f1dcc0" />
      <ellipse cx="40" cy="32" rx="3" ry="2.1" fill={INK} />
      <path className="qr-mouth" d="M37 36.5 Q 40 39.5 43 36.5" stroke="#6b4a30" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <Eyes l={34} r={46} y={27} />
      <path d="M33 35 L 23 33 M33 37.5 L 23 38.5 M47 35 L 57 33 M47 37.5 L 57 38.5" stroke="#6b4a30" strokeWidth="1" strokeLinecap="round" />
      <Blush l={29} r={51} y={33} />
      <g className="qr-ollie-leaf">
        <path d="M38 46 C 45 41, 54 43, 57 47 C 50 52, 43 51, 38 46 Z" fill="#5fbf6f" />
        <path d="M39 46 C 45 46, 51 46, 56 47" stroke="#3a9a5c" strokeWidth="1" fill="none" />
      </g>
      <ellipse cx="37" cy="48.5" rx="4.2" ry="3" fill="#8a5e3c" />
      <ellipse cx="45" cy="49" rx="4.2" ry="3" fill="#8a5e3c" />
    </Frame>
  )
}

/** Bram, the badger of the stone garden — rakes the lines, keeps his footing. */
function Bram(props: ArtProps) {
  return (
    <Frame who="bram" {...props}>
      <g className="qr-bram-rake">
        <path d="M62 75 L 67 24" stroke="#9c6536" strokeWidth="3" strokeLinecap="round" />
        <rect x="59" y="20" width="16" height="4.5" rx="2.2" fill="#7a4d28" />
        <path d="M61 24 v4 M65 24 v4 M69 24 v4 M73 24 v4" stroke="#7a4d28" strokeWidth="1.8" strokeLinecap="round" />
      </g>
      <ellipse cx="32" cy="72" rx="7" ry="3.4" fill="#3d3d47" />
      <ellipse cx="48" cy="72" rx="7" ry="3.4" fill="#3d3d47" />
      <ellipse cx="40" cy="56" rx="18.5" ry="16.5" fill="#8f939e" />
      <ellipse cx="40" cy="60" rx="11" ry="10" fill="#c7cad2" />
      <path d="M54 54 L 64 48" stroke="#6f7380" strokeWidth="6.5" strokeLinecap="round" />
      <circle cx="26" cy="22" r="4.4" fill="#33343c" />
      <circle cx="50" cy="22" r="4.4" fill="#33343c" />
      <ellipse cx="38" cy="33" rx="15" ry="13.5" fill="#f4f4f6" />
      <ellipse cx="31" cy="30" rx="4.4" ry="10.5" transform="rotate(-14 31 30)" fill="#33343c" />
      <ellipse cx="45" cy="30" rx="4.4" ry="10.5" transform="rotate(14 45 30)" fill="#33343c" />
      <g className="qr-eyes">
        <circle cx="31.6" cy="31" r="2.5" fill="#ffffff" />
        <circle cx="44.4" cy="31" r="2.5" fill="#ffffff" />
        <circle cx="31.9" cy="31.3" r="1.5" fill={INK} />
        <circle cx="44.7" cy="31.3" r="1.5" fill={INK} />
      </g>
      <ellipse cx="38" cy="41.5" rx="3.4" ry="2.3" fill={INK} />
      <path className="qr-mouth" d="M35 44 Q 38 46.5 41 44" stroke="#5a5c66" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <Blush l={27} r={49} y={40} />
    </Frame>
  )
}

/** Luma, the firefly of Lantern lake — a small light that goes a long way. */
function Luma(props: ArtProps) {
  return (
    <Frame who="luma" {...props}>
      <circle className="qr-luma-glow" cx="40" cy="55" r="23" fill="#fff3a6" />
      <g transform="rotate(-28 25 38)">
        <ellipse className="qr-luma-wing" cx="25" cy="38" rx="12" ry="7" fill="#e6f4ff" stroke="#bcd9f0" strokeWidth="1.2" opacity="0.92" />
      </g>
      <g transform="rotate(28 55 38)">
        <ellipse className="qr-luma-wing" cx="55" cy="38" rx="12" ry="7" fill="#e6f4ff" stroke="#bcd9f0" strokeWidth="1.2" opacity="0.92" />
      </g>
      <ellipse cx="40" cy="56" rx="12.5" ry="13.5" fill="#ffe066" />
      <path d="M28.5 52 C 34 55, 46 55, 51.5 52 L 51 57 C 46 60, 34 60, 29 57 Z" fill="#f5b82e" />
      <ellipse cx="40" cy="43" rx="10" ry="7" fill="#4a4f86" />
      <path d="M33 47 l-5 7 M47 47 l5 7" stroke="#3b3f6b" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M35 21 C 32 14, 28 12, 24 12 M45 21 C 48 14, 52 12, 56 12" stroke="#3b3f6b" strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="24" cy="12" r="2.8" fill="#ffe066" />
      <circle cx="56" cy="12" r="2.8" fill="#ffe066" />
      <circle cx="40" cy="30" r="11.5" fill="#5b61a3" />
      <g className="qr-eyes">
        <circle cx="35" cy="29.5" r="4.4" fill="#ffffff" />
        <circle cx="45" cy="29.5" r="4.4" fill="#ffffff" />
        <circle cx="35.6" cy="30" r="2.5" fill={INK} />
        <circle cx="45.6" cy="30" r="2.5" fill={INK} />
        <circle cx="36.4" cy="29" r="0.9" fill="#ffffff" />
        <circle cx="46.4" cy="29" r="0.9" fill="#ffffff" />
      </g>
      <path className="qr-mouth" d="M36.5 35.5 Q 40 38.5 43.5 35.5" stroke="#fff3c4" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <Blush l={31} r={49} y={35} />
    </Frame>
  )
}

/** Dot, the dormouse of the cedar steps — very good at sleeping. */
function Dot(props: ArtProps) {
  return (
    <Frame who="dot" {...props}>
      <path d="M55 66 C 70 67, 73 52, 63 49 C 58 48, 57 55, 62 56" stroke="#d9a46f" strokeWidth="6" strokeLinecap="round" fill="none" />
      <ellipse cx="32" cy="72" rx="6" ry="3" fill="#f2c6cf" />
      <ellipse cx="48" cy="72" rx="6" ry="3" fill="#f2c6cf" />
      <ellipse className="qr-dot-body" cx="40" cy="58" rx="18" ry="15" fill="#e8b98a" />
      <ellipse cx="40" cy="62" rx="11" ry="9" fill="#fbe7cf" />
      <circle cx="25" cy="31" r="9" fill="#e8b98a" />
      <circle cx="25" cy="31" r="5.5" fill="#f7b5c3" />
      <circle cx="55" cy="31" r="9" fill="#e8b98a" />
      <circle cx="55" cy="31" r="5.5" fill="#f7b5c3" />
      <circle cx="40" cy="41" r="14" fill="#e8b98a" />
      <path d="M32 41 Q 35 44 38 41 M42 41 Q 45 44 48 41" stroke={INK} strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <circle cx="40" cy="45.5" r="1.9" fill="#e0607c" />
      <path className="qr-mouth" d="M38 48 Q 40 49.5 42 48" stroke="#a8724a" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      <path d="M34 46 L 26 45 M34 47.5 L 26 49 M46 46 L 54 45 M46 47.5 L 54 49" stroke="#b8865a" strokeWidth="0.9" strokeLinecap="round" />
      <Blush l={30} r={50} y={46} />
      <path d="M27 33 C 30 18, 48 14, 56 23 C 60 29, 64 34, 66 41 C 60 37, 52 33, 27 33 Z" fill="#a07cff" />
      <path d="M26.5 33.5 C 34 29, 48 28, 56 32" stroke="#fffaf0" strokeWidth="4" fill="none" strokeLinecap="round" />
      <circle cx="66" cy="42" r="4.2" fill="#fffaf0" />
      <text className="qr-dot-z" x="64" y="18" fontSize="11" fontWeight="900" fill="#7a55e0">
        z
      </text>
    </Frame>
  )
}

/** Gus, the mountain goat of Cloud pass — can't see the top, watches the next step. */
function Gus(props: ArtProps) {
  return (
    <Frame who="gus" {...props}>
      {[27, 35, 49, 57].map((x) => (
        <g key={x}>
          <rect x={x} y="54" width="5.5" height="17" rx="2.2" fill="#ddd6c8" />
          <rect x={x - 0.4} y="69" width="6.3" height="4.5" rx="1.6" fill="#6b5a48" />
        </g>
      ))}
      <path d="M64 44 C 70 41, 72 37, 70 34 C 68 38, 65 40, 62 41 Z" fill="#e2dccf" />
      <ellipse cx="45" cy="49" rx="22" ry="13.5" fill="#f6f2ea" />
      <path d="M25 52 C 32 62, 58 62, 66 52 C 58 57, 32 57, 25 52 Z" fill="#e2dccf" />
      <g className="qr-gus-head">
        <path d="M31 46 C 27 40, 24 36, 22 32" stroke="#f6f2ea" strokeWidth="11" strokeLinecap="round" fill="none" />
        <path d="M24 44 C 28 49, 34 49, 37 45 L 38 49 C 33 54, 26 53, 22 48 Z" fill="#ff6f95" />
        <path d="M30 50 L 33 60 L 28 59 Z" fill="#de4772" />
        <path d="M21 23 C 22 12, 33 9, 38 15 C 32 13, 27 16, 25 24 Z" fill="#b08a5a" />
        <ellipse cx="28" cy="27" rx="5.4" ry="2.5" transform="rotate(22 28 27)" fill="#e2dccf" />
        <ellipse cx="19" cy="30" rx="9.5" ry="8.5" fill="#f6f2ea" />
        <ellipse cx="12.5" cy="34" rx="5.6" ry="4.4" fill="#ece5d8" />
        <circle cx="10.6" cy="33" r="1" fill="#8a7a66" />
        <circle cx="17.2" cy="27.6" r="2.3" fill={INK} />
        <circle cx="17.9" cy="26.9" r="0.8" fill="#ffffff" />
        <path d="M11 38 C 11 45, 14 47, 16.5 45 C 15.5 42, 15 40, 15 38 Z" fill="#e2dccf" />
        <path className="qr-mouth" d="M10 37 Q 12.5 38.6 15 37.4" stroke="#8a7a66" strokeWidth="1.3" fill="none" strokeLinecap="round" />
        <ellipse cx="21.5" cy="34" rx="2.8" ry="1.7" fill={BLUSH} opacity="0.55" />
      </g>
    </Frame>
  )
}

/** Sora, the snow hare of the quiet summit — small things, done often. */
function Sora(props: ArtProps) {
  const edge = '#c9d6e3'
  return (
    <Frame who="sora" {...props}>
      <ellipse cx="31" cy="72" rx="7" ry="3.4" fill="#e9eff6" stroke={edge} strokeWidth="1" />
      <ellipse cx="49" cy="72" rx="7" ry="3.4" fill="#e9eff6" stroke={edge} strokeWidth="1" />
      <circle cx="56" cy="64" r="5" fill="#ffffff" stroke={edge} strokeWidth="1" />
      <ellipse cx="40" cy="58" rx="17" ry="16" fill="#fbfdff" stroke={edge} strokeWidth="1.2" />
      <path d="M25 62 C 30 73, 50 73, 55 62 C 48 67, 32 67, 25 62 Z" fill="#dfe8f1" />
      <g className="qr-sora-ears">
        <ellipse cx="33" cy="15" rx="5" ry="13" transform="rotate(-8 33 15)" fill="#fbfdff" stroke={edge} strokeWidth="1.2" />
        <ellipse cx="33" cy="16" rx="2.4" ry="9" transform="rotate(-8 33 16)" fill="#ffc6d3" />
        <ellipse cx="47" cy="15" rx="5" ry="13" transform="rotate(8 47 15)" fill="#fbfdff" stroke={edge} strokeWidth="1.2" />
        <ellipse cx="47" cy="16" rx="2.4" ry="9" transform="rotate(8 47 16)" fill="#ffc6d3" />
      </g>
      <circle cx="40" cy="36" r="13" fill="#fbfdff" stroke={edge} strokeWidth="1.2" />
      <Eyes l={35} r={45} y={35} />
      <path d="M38.4 39.6 L 41.6 39.6 L 40 41.6 Z" fill="#ff8fa8" />
      <path className="qr-mouth" d="M38 42.6 Q 40 44.4 42 42.6" stroke="#9aaabb" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      <Blush l={31} r={49} y={40} />
      <path d="M27 46 C 34 51, 46 51, 53 46 L 53 50.5 C 46 55.5, 34 55.5, 27 50.5 Z" fill="#52b4ff" />
      <path d="M47 51 L 51.5 61 L 45.5 60 Z" fill="#2a8edd" />
    </Frame>
  )
}

const ART: Record<ResidentKey, (p: ArtProps) => React.JSX.Element> = { bo: Bo, tova: Tova, ollie: Ollie, bram: Bram, luma: Luma, dot: Dot, gus: Gus, sora: Sora }

function ResidentArt({ who, className, talking }: ArtProps & { who: ResidentKey }) {
  const Art = ART[who]
  return <Art className={className} talking={talking} />
}

type PortraitProps = {
  who: Speaker
  className?: string
  talking?: boolean
  pip?: { stage: PipStage; name: string; wear?: { hat?: string | null; neck?: string | null; face?: string | null } }
}

/** Anyone who speaks in a story, drawn at a portrait's size. */
function Portrait({ who, className, talking, pip }: PortraitProps) {
  if (who === 'kiri') return <Kiri className={cn('qr-portrait-kiri', className)} talking={talking} />
  if (who === 'pip') {
    return (
      <svg className={cn('qr-portrait-pip', className)} viewBox="0 0 120 130" overflow="visible" aria-hidden="true">
        <Pip mood={talking ? 'eager' : 'content'} size={120} x={0} y={0} stage={pip?.stage} wear={pip?.wear} name={pip?.name} />
      </svg>
    )
  }
  return <ResidentArt who={who} className={className} talking={talking} />
}

export { Portrait, ResidentArt }
