import type { MouseEvent } from 'react'
import { BookHeart } from 'lucide-react'
import type { GoalProgressView } from '@/types/goals'
import { cn } from '@/lib/utils'
import type { PipState } from '../buddy-brain'
import type { CampVoice } from '../camp-sound'
import { addDays, isoWeek, weekdayLetter, weekdayShort } from '../goal-format'
import { goalColor } from '../goal-palette'
import type { PipStage } from '../pip-growth'
import type { JournalPage } from './journal-book'
import type { PipCornerTab } from './pip-corner'
import type { CampDecorSpot } from '@/types/goals'
import { TentDecor } from './camp-decor'
import { CampYard } from './camp-yard'
import { FenCart, Moss, Wren } from './camp-characters'
import { Pip } from './pip'

type WorldGroundProps = {
  loading: boolean
  today: string
  weekStart: string
  goals: GoalProgressView[]
  headline: string
  pip: PipState
  buddyName: string
  look: { wear: { hat?: string | null; neck?: string | null; face?: string | null }; stage: PipStage; decor: string[] }
  stickers: number
  /** Kept weeks waiting in the chest. */
  chestWeeks: number
  /** Quests done and waiting to be claimed. */
  questsReady: number
  /** Today's letter hasn't been read yet. */
  letterNew: boolean
  /** Who's talking right now (their mouth moves). */
  talking: CampVoice | null
  onOpenJournal: (page: JournalPage, origin: HTMLElement) => void
  onOpenChest: (origin: HTMLElement) => void
  onOpenLetter: (origin: HTMLElement) => void
  onOpenCorner: (tab: PipCornerTab, origin: HTMLElement) => void
  /** The meadow: where decorations stand, and whether they're being moved. */
  yard: {
    decorAt: Record<string, CampDecorSpot>
    arranging: boolean
    saving: boolean
    onDone: (spots: Record<string, CampDecorSpot>) => void
    onCancel: () => void
  }
}

const PEBBLES_SHOWN = 4

// Hand-placed meadow details, kept to the open middle of the ground.
const TUFTS = [
  [70, 70], [210, 46], [330, 96], [470, 58], [560, 112], [690, 74], [800, 52], [930, 92], [120, 150], [420, 160], [880, 170],
] as const
const FLOWERS = [
  [150, 92, 'berry'], [262, 70, 'lemon'], [388, 120, 'sky'], [520, 84, 'grape'], [640, 128, 'tangerine'], [740, 98, 'berry'],
  [860, 118, 'lemon'], [300, 148, 'mint'], [960, 66, 'sky'],
] as const
const PEBBLES = [
  [240, 118, 6], [610, 64, 5], [905, 140, 7], [95, 118, 4],
] as const

function daysLeft(today: string, weekStart: string): number {
  return 7 - Math.round((Date.parse(today) - Date.parse(weekStart)) / 86_400_000)
}

/**
 * The ground the camp stands on: a hill crest; the wooden signboard with the week's
 * finding and Wren perched on it with the day's letter; the trail of stepping stones (a
 * pebble per goal that counted) to the camp chest; the tent and fire with Pip (and Fen's
 * bunting or fairy lights on the tent); Fen's cart; Moss with the journal; and the meadow,
 * where every other decoration stands wherever you placed it (camp-yard.tsx). Every one of them is
 * something to tap — objects and characters in a place, not cards in a grid.
 */
function WorldGround({
  loading,
  today,
  weekStart,
  goals,
  headline,
  pip,
  buddyName,
  look,
  stickers,
  chestWeeks,
  questsReady,
  letterNew,
  talking,
  onOpenJournal,
  onOpenChest,
  onOpenLetter,
  onOpenCorner,
  yard,
}: WorldGroundProps) {
  const lit = goals.filter((g) => g.today.hit).length
  const ratio = goals.length ? lit / goals.length : 0
  const flame = 0.55 + 0.45 * ratio
  const kept = goals.filter((g) => g.week.kept).length
  const left = daysLeft(today, weekStart)
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const hasLoot = chestWeeks > 0
  const at = (fn: (el: HTMLElement) => void) => (e: MouseEvent<HTMLElement>) => fn(e.currentTarget)

  return (
    <section className="world-ground" aria-label="Camp">
      <svg className="ground-crest" viewBox="0 0 1000 160" preserveAspectRatio="none" aria-hidden="true">
        <path className="ground-far" d="M0 86 C 90 40, 200 58, 320 50 C 440 42, 540 78, 680 66 C 800 56, 900 70, 1000 48 L1000 160 L0 160 Z" />
        <g className="ground-trees">
          <path d="M120 70 l14 -38 l14 38 Z" />
          <path d="M150 74 l10 -27 l10 27 Z" />
          <path d="M840 64 l15 -40 l15 40 Z" />
          <path d="M874 68 l11 -30 l11 30 Z" />
        </g>
        <path className="ground-near" d="M0 128 C 180 96, 360 108, 520 112 C 700 116, 860 100, 1000 106 L1000 160 L0 160 Z" />
      </svg>

      {/* Meadow details — flowers, tufts, pebbles — so the open ground reads as a place. */}
      <svg className="ground-deco" viewBox="0 0 1000 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        {TUFTS.map(([x, y], i) => (
          <path key={`t${i}`} className="deco-tuft" d={`M${x} ${y} q3 -12 6 0 q3 -9 6 0 q3 -13 6 0`} />
        ))}
        {FLOWERS.map(([x, y, c], i) => (
          <g key={`f${i}`} transform={`translate(${x} ${y})`} data-color={c}>
            <g className="deco-flower" style={{ animationDelay: `${-i * 0.9}s` }}>
              <line x1="0" y1="0" x2="0" y2="12" />
              <circle cx="0" cy="-4" r="3.4" />
              <circle cx="4" cy="0" r="3.4" />
              <circle cx="0" cy="4" r="3.4" />
              <circle cx="-4" cy="0" r="3.4" />
              <circle className="deco-flower-eye" cx="0" cy="0" r="2.4" />
            </g>
          </g>
        ))}
        {PEBBLES.map(([x, y, r], i) => (
          <ellipse key={`p${i}`} className="deco-pebble" cx={x} cy={y} rx={r} ry={r * 0.62} />
        ))}
      </svg>

      <CampYard decor={look.decor} decorAt={yard.decorAt} arranging={yard.arranging} saving={yard.saving} onDone={yard.onDone} onCancel={yard.onCancel} />

      <div className="ground-stage" inert={yard.arranging}>
        <div className="ground-trail-side">
          <button type="button" className="market-cart" onClick={at((el) => onOpenCorner('shop', el))} aria-label="Fen's cart — spend sparks on things for your buddy and the camp">
            <FenCart talking={talking === 'fen'} />
          </button>
          <div className="signboard" aria-live="polite">
            <span className="signboard-post" aria-hidden="true" />
            <div className="signboard-plank">
              <p className="signboard-kicker">
                Week {isoWeek(weekStart)} · {left >= 7 ? 'a full week ahead' : left === 1 ? 'last day' : `${left} days left`}
              </p>
              <p className="signboard-title">{loading ? 'Waking the camp…' : headline}</p>
            </div>
            {!loading && goals.length > 0 && (
              <button
                type="button"
                className={cn('wren-perch', (letterNew || questsReady > 0) && 'has-mail')}
                onClick={at(onOpenLetter)}
                aria-label={questsReady > 0 ? `Wren's letter — ${questsReady} quest${questsReady === 1 ? '' : 's'} ready to claim` : "Wren's letter — today's quests"}
              >
                <Wren mail={letterNew || questsReady > 0} talking={talking === 'wren'} />
                {questsReady > 0 && <span className="wren-badge">{questsReady}</span>}
              </button>
            )}
          </div>

          <div className="trail">
            <svg className="trail-path" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
              <path d="M0 30 C 12 18, 22 34, 34 24 S 56 14, 66 26 S 86 30, 100 18" vectorEffect="non-scaling-stroke" />
            </svg>
            <ol className="trail-stones" aria-label="This week">
              {days.map((d, i) => {
                const hits = goals.filter((g) => g.week.days[i]?.hit)
                const isToday = d === today
                const future = d > today
                return (
                  <li
                    key={d}
                    className={cn('stone', isToday && 'is-today', future && 'is-future', hits.length > 0 && 'has-hits')}
                    style={{ ['--i' as string]: i }}
                    aria-label={`${weekdayShort(d)}: ${future ? 'still ahead' : `${hits.length} of ${goals.length} goals`}`}
                  >
                    {isToday && <span className="stone-flag">Today</span>}
                    <span className="stone-face">
                      <span className="stone-pebbles">
                        {hits.slice(0, PEBBLES_SHOWN).map((g) => (
                          <i key={g.goal.id} data-color={goalColor(g.goal)} />
                        ))}
                        {hits.length > PEBBLES_SHOWN && <em>+{hits.length - PEBBLES_SHOWN}</em>}
                      </span>
                    </span>
                    <span className="stone-day">{weekdayLetter(d)}</span>
                  </li>
                )
              })}
              <li className="stone stone--chest">
                <button
                  type="button"
                  className={cn('chest', hasLoot && 'has-loot')}
                  onClick={at((el) => (hasLoot ? onOpenChest(el) : onOpenJournal('stickers', el)))}
                  aria-label={
                    hasLoot
                      ? `The camp chest — ${chestWeeks} kept week${chestWeeks === 1 ? '' : 's'} inside. Open it.`
                      : `The camp chest — empty for now; ${kept} of ${goals.length} kept this week. Keep a week to fill it.`
                  }
                >
                  <svg viewBox="0 0 54 46" aria-hidden="true">
                    <g className="chest-lid">
                      <path d="M5 20 L5 14 C 5 4, 49 4, 49 14 L49 20 Z" />
                      <rect className="chest-band" x="11" y="6" width="5" height="14" />
                      <rect className="chest-band" x="38" y="6" width="5" height="14" />
                    </g>
                    <rect className="chest-base" x="5" y="20" width="44" height="22" rx="4" />
                    <rect className="chest-band" x="11" y="20" width="5" height="22" />
                    <rect className="chest-band" x="38" y="20" width="5" height="22" />
                    <rect className="chest-lock" x="23" y="18" width="8" height="9" rx="2.5" />
                  </svg>
                  {hasLoot && <span className="chest-badge">!</span>}
                </button>
                <span className="stone-day">
                  {kept}/{goals.length}
                </span>
              </li>
            </ol>
          </div>
        </div>

        <div className="ground-camp">
          <p className="pip-bubble" aria-live="polite">
            <span className="sr-only">{buddyName} says: </span>
            {pip.line}
          </p>
          <div className="camp-diorama-wrap">
            <svg className="camp-diorama" viewBox="0 0 300 150" aria-hidden="true">
              <defs>
                <radialGradient id="camp-glow">
                  <stop offset="0%" style={{ stopColor: 'var(--fire-glow)', stopOpacity: 0.85 }} />
                  <stop offset="100%" style={{ stopColor: 'var(--fire-glow)', stopOpacity: 0 }} />
                </radialGradient>
              </defs>
              <g className="camp-tent" transform="translate(112 140)">
                <path className="camp-tent-cloth" d="M0 0 L46 -62 L92 0 Z" />
                <path className="camp-tent-flap" d="M46 -62 L34 0 L58 0 Z" />
                <path className="camp-tent-stripe" d="M23 -31 L69 -31" />
                <line className="camp-tent-pole" x1="46" y1="-62" x2="46" y2="-74" />
                <path className="camp-tent-flag" d="M46 -74 L58 -70 L46 -66 Z" />
              </g>
              <g className="camp-fire" transform="translate(248 140)">
                <circle className="camp-fire-glow" cx="0" cy="-16" r={32 + 26 * ratio} fill="url(#camp-glow)" />
                <g className="camp-flame" style={{ transform: `scale(${flame})` }}>
                  <path className="camp-flame-outer" d="M0 -44 C 15 -29, 17 -13, 11 -2 C 7 4, -7 4, -11 -2 C -17 -13, -13 -29, 0 -44 Z" />
                  <path className="camp-flame-inner" d="M0 -26 C 8 -17, 9 -8, 4 -2 C 2 1, -2 1, -4 -2 C -9 -8, -7 -17, 0 -26 Z" />
                </g>
                <g className="camp-embers">
                  <circle cx="-4" cy="-30" r="1.6" />
                  <circle cx="5" cy="-36" r="1.2" />
                  <circle cx="1" cy="-42" r="1.4" />
                </g>
                <rect className="camp-log" x="-19" y="-4" width="38" height="8" rx="4" transform="rotate(14)" />
                <rect className="camp-log" x="-19" y="-4" width="38" height="8" rx="4" transform="rotate(-14)" />
              </g>
              <TentDecor ids={look.decor} />
              <Pip mood={pip.mood} size={104} x={4} y={140 - 110} className="camp-pip" wear={look.wear} stage={look.stage} name={buddyName} />
            </svg>
            <button
              type="button"
              className="pip-hit"
              onClick={at((el) => onOpenCorner('wardrobe', el))}
              aria-label={`${buddyName} — open ${buddyName}'s wardrobe`}
            />
          </div>
        </div>

        <div className="ground-market">
          <button
            type="button"
            className="market-journal"
            onClick={at((el) => onOpenJournal('weeks', el))}
            aria-label={`The camp journal with Moss — weeks kept, ${stickers} stickers and the season map`}
          >
            <Moss talking={talking === 'moss'} className="market-moss" />
            <span className="journal-book" aria-hidden="true">
              <BookHeart size={20} strokeWidth={2.3} />
            </span>
            <span className="journal-label">Journal</span>
            {stickers > 0 && <span className="journal-badge">{stickers}</span>}
          </button>
        </div>
      </div>
    </section>
  )
}

export { WorldGround }
