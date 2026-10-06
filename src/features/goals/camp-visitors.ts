// The camp's visitors — woodland folk who hear about the camp as its kept weeks add up.
// Each one arrives at a number of lifetime kept weeks (CampView.grownWeeks, which never
// shrinks — archiving a goal can't send anyone home), and from then on they take turns
// dropping by: one visitor a day, chosen by the date, so a reload never swaps them.
//
// A visitor's first day is theirs: whoever arrived most recently and hasn't been greeted
// yet comes first. Visitors only ever say kind things, and never about what wasn't done.

export type VisitorId = 'bun' | 'bristle' | 'puddle' | 'fawn' | 'ember' | 'nimbus' | 'comet'

export interface Visitor {
  id: VisitorId
  name: string
  /** What they are, for the guestbook. */
  kind: string
  /** Lifetime kept weeks before they first come by. */
  arrives: number
  /** Where they spend a visit: on the grass, or (Comet) up in the sky. */
  place: 'meadow' | 'sky'
  /** A line about them, for the guestbook. */
  about: string
  /** What they say when you say hello. */
  lines: readonly string[]
}

export const VISITORS: readonly Visitor[] = [
  {
    id: 'bun',
    name: 'Bun',
    kind: 'a meadow rabbit',
    arrives: 0,
    place: 'meadow',
    about: 'The first to find any camp. Brings gossip and leaves with carrots.',
    lines: [
      'I heard there was a camp with lanterns! I had to see.',
      'Your fire is the warmest in the whole meadow. I checked them all.',
      'I brought a dandelion. It’s for the camp. Okay, it’s for me.',
    ],
  },
  {
    id: 'bristle',
    name: 'Bristle',
    kind: 'a hedgehog',
    arrives: 2,
    place: 'meadow',
    about: 'Arrives at two kept weeks. Prickly outside, entirely soft about everything else.',
    lines: [
      'Two weeks kept, they said. I had to come and shake your hand. Carefully.',
      'Slow and steady. I’m a big believer. Mostly in the slow part.',
      'Don’t mind me. I’ll just curl up by the fire for a bit.',
    ],
  },
  {
    id: 'puddle',
    name: 'Puddle',
    kind: 'a duckling',
    arrives: 4,
    place: 'meadow',
    about: 'Arrives at four kept weeks. Follows whoever looks like they know where they’re going.',
    lines: [
      'I followed the lantern light all the way here! Peep.',
      'Four weeks! That’s more than all my toes. I have six toes.',
      'Is it okay if I just… sit here and watch the lanterns? They’re so nice.',
    ],
  },
  {
    id: 'fawn',
    name: 'Fawn',
    kind: 'a young deer',
    arrives: 8,
    place: 'meadow',
    about: 'Arrives at eight kept weeks. Shy at first; then visits all the time.',
    lines: [
      'I usually stay in the trees. Your camp felt safe enough to come closer.',
      'Eight weeks of lanterns. You can see them from the far hill, you know.',
      'I like how quiet it is here, even when it’s busy.',
    ],
  },
  {
    id: 'ember',
    name: 'Ember',
    kind: 'a red panda',
    arrives: 13,
    place: 'meadow',
    about: 'Arrives after a whole season of kept weeks. Collects warm spots and good stories.',
    lines: [
      'A whole season! I came all the way down the mountain for this fire.',
      'I keep a list of the cosiest camps. You’re on it. Near the top.',
      'Save me a seat by the fire, would you? The good one.',
    ],
  },
  {
    id: 'nimbus',
    name: 'Nimbus',
    kind: 'a cloud sheep',
    arrives: 20,
    place: 'meadow',
    about: 'Arrives at twenty kept weeks. Nobody is sure whether Nimbus is a sheep or a cloud.',
    lines: [
      'I drifted over. I tend to drift. It’s a cloud thing. Or a sheep thing.',
      'Twenty weeks of lanterns. From up there, your camp looks like a little star.',
      'Baa. Or — whoosh. I go back and forth.',
    ],
  },
  {
    id: 'comet',
    name: 'Comet',
    kind: 'a sky whale',
    arrives: 52,
    place: 'sky',
    about: 'Arrives after a full year of kept weeks. Swims through the stars; sings very, very low.',
    lines: [
      'A whole year of lanterns. I heard them from the other side of the sky.',
      'I only come down for camps that keep shining. Yours does.',
      'Hmmmmmm. (That’s whale for “well done”.)',
    ],
  },
]

export const visitorById = (id: string) => VISITORS.find((v) => v.id === id)

/** Everyone who has found the camp by now — only ever grows with grownWeeks. */
export const arrivedVisitors = (grownWeeks: number) => VISITORS.filter((v) => grownWeeks >= v.arrives)

/** Who's on the way next, if anyone. */
export const nextVisitor = (grownWeeks: number) => VISITORS.find((v) => grownWeeks < v.arrives) ?? null

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

/**
 * Today's visitor: a newcomer nobody has greeted yet comes first (the most recent
 * arrival); otherwise the date picks one of everyone who has arrived. `pinned` is who
 * already came by earlier today — they stay all day, so greeting a newcomer never sends
 * them off and brings the next one in on a reload.
 */
export function visitorOn(today: string, grownWeeks: number, greeted: ReadonlySet<string>, pinned?: string | null): Visitor | null {
  const here = arrivedVisitors(grownWeeks)
  if (here.length === 0) return null
  const stayed = pinned ? here.find((v) => v.id === pinned) : undefined
  if (stayed) return stayed
  const newcomer = [...here].reverse().find((v) => !greeted.has(v.id))
  if (newcomer) return newcomer
  return here[hash(today) % here.length]
}

/** What they say today, by the date — the same all day. */
export const visitorLine = (v: Visitor, today: string, nth = 0) => v.lines[(hash(`${today}:${v.id}`) + nth) % v.lines.length]

// ── Who's been greeted, and who came today (this device only — conveniences that decide
// who gets a first-day hello; losing them just means someone says hello again) ──

const GREETED_KEY = 'camp.visitors.greeted'
const TODAY_KEY = 'camp.visitors.today'

/** Who visited on `day`, if this device saw them. */
export function readPinned(day: string): string | null {
  try {
    const [d, id] = (window.localStorage.getItem(TODAY_KEY) ?? '').split(':')
    return d === day && id ? id : null
  } catch {
    return null
  }
}

export function savePinned(day: string, id: string) {
  try {
    window.localStorage.setItem(TODAY_KEY, `${day}:${id}`)
  } catch {
    // Without storage today's visitor is re-picked on the next visit.
  }
}

export function readGreeted(): Set<string> {
  try {
    return new Set(JSON.parse(window.localStorage.getItem(GREETED_KEY) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}

export function saveGreeted(ids: ReadonlySet<string>) {
  try {
    window.localStorage.setItem(GREETED_KEY, JSON.stringify([...ids]))
  } catch {
    // Without storage a newcomer just stays "new" a little longer.
  }
}
