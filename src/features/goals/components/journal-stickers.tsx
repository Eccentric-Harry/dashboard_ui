import type { GoalProgressView } from '@/types/goals'
import { goalColor } from '../goal-palette'
import { StickerArt } from './sticker-art'

/**
 * Sticker tiers by lifetime kept weeks — the one number that only ever grows, so a sticker
 * once earned never comes off. Mirrors CampRules.STICKER_TIERS (the chest pays the bonus).
 */
const TIERS = [
  { weeks: 1, name: 'First week' },
  { weeks: 4, name: 'A month strong' },
  { weeks: 12, name: 'A whole season' },
  { weeks: 26, name: 'Half a year' },
  { weeks: 52, name: 'A full year' },
] as const

/** A fixed, gentle tilt per sticker, so the album looks stuck in by hand. */
const tiltOf = (seed: string) => {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return ((Math.abs(h) % 13) - 6) * 1.2
}

type JournalStickersProps = {
  goals: GoalProgressView[]
  /** Stickers still waiting in the chest — shown as "in the chest", not yet stuck in. */
  inChest: Set<string>
}

/**
 * The sticker album. Earned stickers are die-cut and stuck in at a slight angle with a
 * handwritten caption; each goal's next one waits as a pale silhouette with how many
 * weeks it needs. Stickers still in the camp chest show up once it's opened.
 */
function JournalStickers({ goals, inChest }: JournalStickersProps) {
  const earned = goals.flatMap((g) =>
    TIERS.filter((t) => g.weeksKept >= t.weeks && !inChest.has(`${g.goal.id}:${t.weeks}`)).map((t) => ({ view: g, tier: t })),
  )
  const waiting = goals.reduce((n, g) => n + TIERS.filter((t) => inChest.has(`${g.goal.id}:${t.weeks}`)).length, 0)
  const next = goals.flatMap((g) => {
    const t = TIERS.find((tier) => g.weeksKept < tier.weeks)
    return t ? [{ view: g, tier: t, left: t.weeks - g.weeksKept }] : []
  })

  return (
    <section className="js" aria-labelledby="js-title">
      <header className="bk-page-head">
        <div>
          <h2 id="js-title" className="bk-title">
            Sticker album
          </h2>
          <p className="bk-hand">Peel and keep — once they’re in, they stay in.</p>
        </div>
        <span className="bk-total">
          <strong>{earned.length}</strong>
          <small>{earned.length === 1 ? 'sticker' : 'stickers'}</small>
        </span>
      </header>

      {waiting > 0 && (
        <p className="js-waiting">
          {waiting === 1 ? 'A sticker is' : `${waiting} stickers are`} waiting in the camp chest — open it at the end of the trail.
        </p>
      )}

      {earned.length === 0 && waiting === 0 && <p className="bk-empty">Keep any goal for one week and the first sticker lands here.</p>}

      <ul className="js-grid">
        {earned.map(({ view, tier }) => {
          const key = `${view.goal.id}-${tier.weeks}`
          return (
            <li key={key} className="js-sticker" data-color={goalColor(view.goal)} style={{ ['--tilt' as string]: `${tiltOf(key)}deg` }}>
              <StickerArt weeks={tier.weeks} icon={view.goal.icon} size={74} />
              <span className="js-caption">
                <strong>{view.goal.title}</strong>
                <small>{tier.name}</small>
              </span>
            </li>
          )
        })}
        {next.map(({ view, tier, left }) => (
          <li key={`${view.goal.id}-next`} className="js-sticker is-locked" data-color={goalColor(view.goal)}>
            <StickerArt weeks={tier.weeks} icon={view.goal.icon} size={74} locked />
            <span className="js-caption">
              <strong>{view.goal.title}</strong>
              <small>
                {left} more {left === 1 ? 'week' : 'weeks'}
              </small>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export { JournalStickers }
