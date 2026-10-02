// The Quiet Path's cast: one resident per place, the way Duolingo puts a character beside
// every unit. Each one lives in their chapter, stands beside the path there, tells that
// chapter's story (course-stories.ts) and helps you pack its page of the kit. Kiri, the
// heron who keeps the path, hosts the trailhead herself; Pip walks with you throughout.
//
// Their lines follow Kiri's rules (path-data.ts): about their place and its skill, never
// about how you feel, never a should. src/__tests__/quiet-path.test.ts sweeps them.

export type ResidentKey = 'bo' | 'tova' | 'ollie' | 'bram' | 'luma' | 'dot' | 'gus' | 'sora'

/** Anyone who can speak in a story: a resident, Kiri, or Pip. */
export type Speaker = ResidentKey | 'kiri' | 'pip'

export interface Resident {
  key: ResidentKey
  name: string
  /** What they are, for labels: "a frog". */
  kind: string
  chapter: number
  /** What they say when tapped on the path. */
  lines: string[]
}

export const RESIDENTS: Resident[] = [
  {
    key: 'bo',
    name: 'Bo',
    kind: 'a frog',
    chapter: 2,
    lines: [
      'Ribbit. That’s frog for “breathe out slowly”.',
      'In a little, out a long while. That’s my whole secret.',
      'Every ripple settles if you leave it be.',
    ],
  },
  {
    key: 'tova',
    name: 'Tova',
    kind: 'a tortoise',
    chapter: 3,
    lines: ['Slow is a speed too.', 'I check in with my shell every morning. For you, maybe your shoulders.', 'Take your time — the hollow isn’t going anywhere.'],
  },
  {
    key: 'ollie',
    name: 'Ollie',
    kind: 'an otter',
    chapter: 4,
    lines: ['Look — a leaf. And there it goes.', 'Floating is easier than swimming against it.', 'Some thoughts are just passing through.'],
  },
  {
    key: 'bram',
    name: 'Bram',
    kind: 'a badger',
    chapter: 5,
    lines: ['Feet down. Feel the ground push back.', 'Every stone here was placed one at a time.', 'Storms come and go. The garden stays.'],
  },
  {
    key: 'luma',
    name: 'Luma',
    kind: 'a firefly',
    chapter: 6,
    lines: ['Every lantern on the lake started as one small light.', 'Talk to yourself the way you’d talk to a friend.', 'A little glow goes a long way in the dark.'],
  },
  {
    key: 'dot',
    name: 'Dot',
    kind: 'a dormouse',
    chapter: 7,
    lines: ['*yawn* Same wake-up time every day. That’s the big one.', 'Rest isn’t something you earn. It’s something you need.', 'Shh… the cedars are sleeping.'],
  },
  {
    key: 'gus',
    name: 'Gus',
    kind: 'a mountain goat',
    chapter: 8,
    lines: ['I can’t see the top either. Just the next step.', 'Practical worry? Make a plan. A what-if? Let it float.', 'Fog always lifts. It never asks permission.'],
  },
  {
    key: 'sora',
    name: 'Sora',
    kind: 'a snow hare',
    chapter: 9,
    lines: ['Look how far the path comes up.', 'Small and often beats big and rare.', 'Connect, move, notice, learn, give. Pick one for today.'],
  },
]

export const residentOf = (chapter: number) => RESIDENTS.find((r) => r.chapter === chapter) ?? null

export const speakerName = (who: Speaker) => (who === 'kiri' ? 'Kiri' : who === 'pip' ? 'Pip' : (RESIDENTS.find((r) => r.key === who)?.name ?? ''))
