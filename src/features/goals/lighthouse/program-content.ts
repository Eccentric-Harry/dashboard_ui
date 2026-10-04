// The Lighthouse's words and plans — every track's copy, the four phases, the Couch to 5K
// schedule, the lifting plans, speaking prompts, the meeting ladder, protein foods, the
// questionnaires. Content only; the rules live in program-engine.ts. Research and sources:
// design/LIGHTHOUSE_90_PLAN.md. Keys are stored on the server, so they're forever.

import type { LucideIcon } from 'lucide-react'
import { Bean, BookOpen, CloudSun, Dumbbell, Footprints, HeartHandshake, Mic, Smartphone } from 'lucide-react'
import type { GoalColor } from '@/types/goals'
import type { LiftPlace, ProgramTrackKey } from '@/types/program'

// ── Phases ──────────────────────────────────────────────────────────────

export type PhaseKey = 'audit' | 'foundation' | 'push' | 'lockin'

export interface PhaseInfo {
  key: PhaseKey
  name: string
  /** First and last day, inclusive (of 90). */
  from: number
  to: number
  /** One line for the day ribbon. */
  line: string
}

export const PHASES: PhaseInfo[] = [
  { key: 'audit', name: 'Audit', from: 1, to: 7, line: 'Change nothing. Just watch and write it down.' },
  { key: 'foundation', name: 'Foundation', from: 8, to: 35, line: 'Lift, eat your protein, keep one promise a day.' },
  { key: 'push', name: 'Push', from: 36, to: 70, line: 'Speaking and learning join. A little more each week.' },
  { key: 'lockin', name: 'Lock in', from: 71, to: 90, line: 'Hold everything you built. No new targets.' },
]

/** Each phase wears one colour from the camp's candy palette. */
export const PHASE_COLOR: Record<PhaseKey, GoalColor> = { audit: 'sky', foundation: 'mint', push: 'tangerine', lockin: 'grape' }

// ── Tracks ──────────────────────────────────────────────────────────────

export type TrackKind = 'weekly' | 'daily-amount' | 'checkin' | 'cap' | 'text'

export interface TrackSource {
  label: string
  url: string
}

export interface TrackMeta {
  key: ProgramTrackKey
  name: string
  icon: LucideIcon
  /** Candy colour from the camp's palette; mood wears its own dusk, never a judgement. */
  color: GoalColor | 'dusk'
  kind: TrackKind
  /** The day (of 90) it switches on. */
  opensDay: number
  /** The full version — `{target}` / `{floor}` are filled in. */
  full: string
  /** The bad-day version. Logging it counts as done. */
  min: string
  unit?: string
  /** Why this track, in one plain line. */
  why: string
  source?: TrackSource
  /** An example if-then plan, for the audit-week planning. */
  planExample: string
}

export const TRACKS: TrackMeta[] = [
  {
    key: 'run',
    name: 'Run',
    icon: Footprints,
    color: 'tangerine',
    kind: 'weekly',
    opensDay: 15,
    full: 'Run-walk 20–40 minutes — the coach has today’s intervals',
    min: 'A 10-minute jog or brisk walk',
    unit: 'runs',
    why: 'Exercise is one of the strongest levers on mood there is — medium effects on depression and anxiety symptoms, healthy adults included.',
    source: { label: 'Singh et al. 2023, BJSM', url: 'https://bjsm.bmj.com/content/57/18/1203' },
    planExample: 'If it’s 7:00 on Monday, Wednesday or Friday, then shoes on and out the door before I check my phone.',
  },
  {
    key: 'lift',
    name: 'Lift',
    icon: Dumbbell,
    color: 'grape',
    kind: 'weekly',
    opensDay: 8,
    full: 'Full body: squat, push, pull, hinge — the plan has your sets',
    min: '2 sets each of push-ups and squats at home',
    unit: 'sessions',
    why: 'Three full-body sessions a week is how beginners get strong fastest — and people feel better about their bodies from training before the mirror shows any change.',
    source: { label: 'Campbell & Hausenblas 2009', url: 'https://archive.news.ufl.edu/articles/2009/10/uf-study-exercise-improves-body-image-for-fit-and-unfit-alike.html' },
    planExample: 'If it’s Tuesday, Thursday or Saturday after work, then I go straight to the gym before going home.',
  },
  {
    key: 'protein',
    name: 'Protein',
    icon: Bean,
    color: 'mint',
    kind: 'daily-amount',
    opensDay: 1,
    full: 'Reach {target} g today',
    min: 'Reach the floor, {floor} g',
    unit: 'g',
    why: 'Muscle gain from training levels off around 1.6 g of protein per kg a day — on a vegetarian plate that takes a plan, not luck. Read straight from Nutrition.',
    source: { label: 'Morton et al. 2018', url: 'https://pubmed.ncbi.nlm.nih.gov/28698222/' },
    planExample: 'If I sit down for lunch, then there’s paneer, dal, curd or soya on the plate.',
  },
  {
    key: 'mood',
    name: 'Mood',
    icon: CloudSun,
    color: 'dusk',
    kind: 'checkin',
    opensDay: 1,
    full: 'Evening check-in: a score and a word',
    min: 'The score only',
    why: 'Not a target — weather. Seeing it beside your training shows you what actually lifts it.',
    planExample: 'If I’m brushing my teeth at night, then I open the lighthouse and log the day’s weather.',
  },
  {
    key: 'learn',
    name: 'Learn',
    icon: BookOpen,
    color: 'lemon',
    kind: 'weekly',
    opensDay: 36,
    full: 'One focused 25-minute block on a pursuit step',
    min: '10 minutes, then one line of what you learned',
    unit: 'days',
    why: 'Steady skill growth, five days a week — a 25-minute focus session on Learnings counts by itself.',
    planExample: 'If I’ve finished dinner on a weekday, then I open my pursuit and start a 25-minute focus.',
  },
  {
    key: 'english',
    name: 'Speak',
    icon: Mic,
    color: 'teal',
    kind: 'daily-amount',
    opensDay: 36,
    full: '10 min shadowing + 5 min speaking freely',
    min: '5 minutes reading aloud',
    unit: 'min',
    why: 'Shadowing improved fluency and pronunciation and lowered speaking anxiety in several small studies. What counts is minutes spoken out loud, not minutes listened.',
    source: { label: 'Shadowing study, ELTIN 2023', url: 'https://e-journal.stkipsiliwangi.ac.id/index.php/eltin/article/view/7350' },
    planExample: 'If I’m on my commute or walk, then I shadow the same 2-minute clip under my breath.',
  },
  {
    key: 'screen',
    name: 'Screen',
    icon: Smartphone,
    color: 'sky',
    kind: 'cap',
    opensDay: 1,
    full: 'Recreational phone time under the cap',
    min: 'Lower than yesterday',
    unit: 'min',
    why: 'Students who cut phone time to two hours a day for three weeks improved on well-being, stress, sleep and low mood. The benefit comes from what replaces the scrolling.',
    source: { label: 'Pieh et al. 2025, BMC Medicine', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11846175/' },
    planExample: 'If I get into bed, then the phone charges in the other room.',
  },
  {
    key: 'regard',
    name: 'Kept promise',
    icon: HeartHandshake,
    color: 'berry',
    kind: 'text',
    opensDay: 8,
    full: 'One promise you kept today + one kind sentence to yourself',
    min: 'The kept promise only',
    why: 'Confidence is built from evidence: doing what you said you would is the strongest source of self-belief there is. Self-compassion practice cuts self-criticism.',
    source: { label: 'Ferrari et al. 2019', url: 'https://contextualscience.org/publications/ferrari_hunt_harrysunker_abbott_beath_einstein_2019' },
    planExample: 'If I log my mood at night, then I write down one promise I kept.',
  },
]

export const trackMeta = (key: ProgramTrackKey): TrackMeta => TRACKS.find((t) => t.key === key) ?? TRACKS[0]

/** Fills `{target}` / `{floor}` in a track's copy. */
export function fillCopy(text: string, target?: number | null, floor?: number | null): string {
  return text.replace('{target}', target != null ? String(Math.round(target)) : '—').replace('{floor}', floor != null ? String(Math.round(floor)) : '—')
}

// ── Mood ────────────────────────────────────────────────────────────────

/** 1–5, dusk to sun. No red, no "bad" — a heavy day is weather, not a verdict. */
export const MOOD_SCALE = [
  { score: 1, word: 'Heavy', color: '#8e9bd6' },
  { score: 2, word: 'Low', color: '#aab3e3' },
  { score: 3, word: 'Okay', color: '#e6d9bf' },
  { score: 4, word: 'Good', color: '#9fdcbc' },
  { score: 5, word: 'Bright', color: '#ffd36e' },
] as const

export const MOOD_TAGS = ['calm', 'tired', 'anxious', 'proud', 'flat', 'focused', 'restless', 'grateful', 'lonely', 'stressed', 'energised', 'okay']

// ── Running: NHS Couch to 5K ────────────────────────────────────────────

export type IntervalKind = 'warm' | 'run' | 'walk' | 'cool'

export interface Interval {
  kind: IntervalKind
  sec: number
}

export interface RunSession {
  /** c25k-<week>-<run> */
  key: string
  week: number
  run: number
  /** The middle part in words, as the NHS plan says it. */
  summary: string
  intervals: Interval[]
}

const WARM: Interval = { kind: 'warm', sec: 300 }
const COOL: Interval = { kind: 'cool', sec: 300 }
const r = (sec: number): Interval => ({ kind: 'run', sec })
const w = (sec: number): Interval => ({ kind: 'walk', sec })
const repeat = (n: number, parts: Interval[]) => Array.from({ length: n }, () => parts).flat()

const WEEK_PLANS: { summary: string; middle: Interval[] }[][] = [
  [{ summary: '1 min run, 90 s walk × 8', middle: repeat(8, [r(60), w(90)]) }],
  [{ summary: '90 s run, 2 min walk × 6', middle: repeat(6, [r(90), w(120)]) }],
  [{ summary: '90 s run, 90 s walk, 3 min run, 3 min walk × 2', middle: repeat(2, [r(90), w(90), r(180), w(180)]) }],
  [{ summary: '3 · 5 · 3 · 5 min runs with walks between', middle: [r(180), w(90), r(300), w(150), r(180), w(90), r(300)] }],
  [
    { summary: '5 min run, 3 min walk × 3 (ends running)', middle: [r(300), w(180), r(300), w(180), r(300)] },
    { summary: '8 min run, 5 min walk, 8 min run', middle: [r(480), w(300), r(480)] },
    { summary: '20 minutes running — no walking', middle: [r(1200)] },
  ],
  [
    { summary: '5 · 8 · 5 min runs with 3 min walks', middle: [r(300), w(180), r(480), w(180), r(300)] },
    { summary: '10 min run, 3 min walk, 10 min run', middle: [r(600), w(180), r(600)] },
    { summary: '25 minutes running', middle: [r(1500)] },
  ],
  [{ summary: '25 minutes running', middle: [r(1500)] }],
  [{ summary: '28 minutes running', middle: [r(1680)] }],
  [{ summary: '30 minutes running — a 5K', middle: [r(1800)] }],
]

/** All 27 runs, in order. A week with one plan repeats it three times. */
export const C25K: RunSession[] = WEEK_PLANS.flatMap((plans, wi) =>
  [0, 1, 2].map((ri) => {
    const plan = plans[Math.min(ri, plans.length - 1)]
    return {
      key: `c25k-${wi + 1}-${ri + 1}`,
      week: wi + 1,
      run: ri + 1,
      summary: plan.summary,
      intervals: [WARM, ...plan.middle, COOL],
    }
  }),
)

export const sessionMinutes = (s: RunSession) => Math.round(s.intervals.reduce((n, i) => n + i.sec, 0) / 60)

// ── Lifting: two full-body days, alternated ─────────────────────────────

export interface Exercise {
  name: string
  /** What to aim for. */
  scheme: string
  /** Reps (or seconds) at which it's time to add load or move to the harder version. */
  top: number
  /** What "add load" means for this one. */
  next: string
  /** Seconds, not reps (planks). */
  timed?: boolean
  cue: string
}

export interface LiftDay {
  key: 'lift-a' | 'lift-b'
  name: string
  exercises: Exercise[]
}

export const LIFT_PLANS: Record<LiftPlace, LiftDay[]> = {
  gym: [
    {
      key: 'lift-a',
      name: 'Day A',
      exercises: [
        { name: 'Goblet squat', scheme: '3 × 8–12', top: 12, next: '+2 kg dumbbell', cue: 'Chest up, sit between your heels, knees follow toes.' },
        { name: 'Dumbbell bench press', scheme: '3 × 8–12', top: 12, next: '+2 kg each hand', cue: 'Shoulder blades pinched, lower to the chest slowly.' },
        { name: 'Lat pulldown', scheme: '3 × 8–12', top: 12, next: '+1 plate', cue: 'Pull elbows to your back pockets, no swinging.' },
        { name: 'Romanian deadlift', scheme: '3 × 8–12', top: 12, next: '+2 kg each hand', cue: 'Soft knees, push hips back, flat back, feel the hamstrings.' },
        { name: 'Plank', scheme: '3 × 30–45 s', top: 45, next: '+10 s', timed: true, cue: 'Squeeze glutes, ribs down, breathe.' },
      ],
    },
    {
      key: 'lift-b',
      name: 'Day B',
      exercises: [
        { name: 'Leg press', scheme: '3 × 10–15', top: 15, next: '+5 kg', cue: 'Feet shoulder-width, lower until hips want to tuck, press through heels.' },
        { name: 'Dumbbell shoulder press', scheme: '3 × 8–12', top: 12, next: '+1–2 kg each hand', cue: 'Seated, core braced, press up and slightly in.' },
        { name: 'Seated cable row', scheme: '3 × 8–12', top: 12, next: '+1 plate', cue: 'Tall chest, pull to your belly button, pause.' },
        { name: 'Hip thrust', scheme: '3 × 10–12', top: 12, next: '+5 kg', cue: 'Chin tucked, drive through heels, squeeze at the top.' },
        { name: 'Dead bug', scheme: '3 × 8 each side', top: 10, next: 'slower, longer reach', cue: 'Low back pressed to the floor the whole time.' },
      ],
    },
  ],
  home: [
    {
      key: 'lift-a',
      name: 'Day A',
      exercises: [
        { name: 'Squat', scheme: '3 × 10–20', top: 20, next: 'hold a loaded backpack', cue: 'Sit back and down, heels flat, chest proud.' },
        { name: 'Push-up', scheme: '3 × 5–15', top: 15, next: 'lower the hands (bench → floor → feet raised)', cue: 'Body in one line; hands on a bench if the floor is too hard yet.' },
        { name: 'Table row', scheme: '3 × 6–12', top: 12, next: 'walk your feet further forward', cue: 'Under a sturdy table, pull your chest to the edge.' },
        { name: 'Single-leg hip bridge', scheme: '3 × 8–12 each', top: 12, next: 'pause 2 s at the top', cue: 'Drive through the heel, hips level.' },
        { name: 'Plank', scheme: '3 × 30–45 s', top: 45, next: '+10 s', timed: true, cue: 'Squeeze glutes, ribs down, breathe.' },
      ],
    },
    {
      key: 'lift-b',
      name: 'Day B',
      exercises: [
        { name: 'Split squat', scheme: '3 × 8–12 each', top: 12, next: 'backpack, or back foot on a chair', cue: 'Long stance, back knee drops straight down.' },
        { name: 'Pike push-up', scheme: '3 × 5–10', top: 10, next: 'feet on a step', cue: 'Hips high, head travels between the hands.' },
        { name: 'Backpack row', scheme: '3 × 10–15', top: 15, next: 'more books in the bag', cue: 'Hinge forward, flat back, pull the bag to your hip.' },
        { name: 'Glute bridge', scheme: '3 × 12–20', top: 20, next: 'backpack on the hips', cue: 'Ribs down, squeeze at the top for a second.' },
        { name: 'Side plank', scheme: '2 × 20–40 s each', top: 40, next: '+10 s', timed: true, cue: 'Hips high, body in one line.' },
      ],
    },
  ],
}

export const LIFT_SAFETY = 'First two weeks: light weights, learn the movement, stop each set with 2–3 reps still in the tank. Sharp pain means stop — soreness the next day is normal.'

export const BUNDLE_TIP = 'Temptation bundling: keep one podcast or playlist you love for training only. Gym-only audiobooks got people there 51% more often.'

// ── Speaking (English) ──────────────────────────────────────────────────

/** Today's free-speaking prompt, team-meeting flavoured. Rotated by program day. */
export const SPEAK_PROMPTS = [
  'Give yesterday’s standup update as if your lead just asked: what you did, what’s next, one blocker.',
  'Explain a bug you fixed recently to someone who isn’t technical.',
  'Describe your project’s architecture in two minutes, top to bottom.',
  'Disagree politely with a design choice: “I see the reasoning, and I’d push back on one thing…”',
  'Summarise the last meeting you were in for someone who missed it.',
  'Pitch one small improvement to how your team works.',
  'Explain a trade-off you made this week — what you gave up, and why.',
  'Ask a clarifying question about a requirement, then restate it in your own words.',
  'Walk through how you’d debug a slow API endpoint.',
  'Introduce yourself to a new teammate: your role, what you work on, one thing outside work.',
  'Explain something you learned this week and why it matters.',
  'Give feedback on a pull request: one thing that’s good, one change, one question.',
  'A deadline might slip. Say so calmly, with the new plan.',
  'Tell the story of the hardest problem you’ve solved.',
  'Explain what Life OS is to a friend who has never seen it.',
  'Volunteer for a task out loud: “I can take that — here’s how I’d start.”',
  'Explain a mistake you made at work and what you changed after it.',
  'Give a 60-second demo of a feature you built.',
  'Answer “any questions?” at the end of a meeting with a real one.',
  'Describe what good code review looks like.',
  'Explain the difference between two tools you use, to a junior developer.',
  'Talk through your plan for these 90 days.',
  'Describe someone you admire, and why.',
  'Interrupt politely — “Sorry to jump in, can I add one thing?” — then add it.',
  'Explain an estimate: why it’s three days, not one.',
  'Argue for working from the office, then argue against it.',
  'Describe your city to someone who has never been there.',
  'Talk about a book, film or show that changed how you think.',
  'Explain a concept from your favourite technology to a beginner.',
  'Describe your ideal weekend in detail.',
]

/** PREP — a shape for answering in a meeting without rambling. */
export const PREP = [
  { letter: 'P', word: 'Point', line: 'Say your main point in one sentence.' },
  { letter: 'R', word: 'Reason', line: 'Why you think so.' },
  { letter: 'E', word: 'Example', line: 'One concrete example.' },
  { letter: 'P', word: 'Point', line: 'Say it again, shorter.' },
]

export const SHADOW_HOW = [
  'Pick a 1–3 minute clip of someone you’d like to sound like: a tech talk, a podcast host, an explainer video.',
  'Listen once, just listening.',
  'Play it again and speak along half a second behind — copy the rhythm, the stress and the pauses, not just the words.',
  'Keep the same clip all week. It getting easier is the point.',
]

/** Graded exposure for team meetings — one rung a week, in order, repeat any rung. */
export const MEETING_LADDER = [
  'Say one sentence in standup beyond your status.',
  'Ask one question in a meeting.',
  'Agree out loud and add a reason: “+1, because…”',
  'Share an opinion before anyone asks for it.',
  'Summarise a discussion: “So what we’re saying is…”',
  'Disagree politely, with a reason.',
  'Walk the team through something you built.',
  'Run one part of a meeting yourself.',
]

// ── Protein, vegetarian ─────────────────────────────────────────────────

/** Approximate grams per serving. A reference card the user opens — never a nudge. */
export const PROTEIN_FOODS = [
  { food: 'Soya chunks', serving: '50 g dry', grams: 26 },
  { food: 'Whey protein', serving: '1 scoop', grams: 24 },
  { food: 'Hung curd / Greek yogurt', serving: '200 g', grams: 20 },
  { food: 'Paneer', serving: '100 g', grams: 18 },
  { food: 'Chana or rajma', serving: '1 cup cooked', grams: 14 },
  { food: 'Besan chilla', serving: '2 medium', grams: 12 },
  { food: 'Tofu', serving: '100 g', grams: 11 },
  { food: 'Milk', serving: '300 ml glass', grams: 10 },
  { food: 'Dal', serving: '1 katori', grams: 8 },
  { food: 'Sprouts', serving: '1 cup', grams: 8 },
  { food: 'Curd', serving: '1 cup', grams: 8 },
  { food: 'Peanuts', serving: '30 g', grams: 7 },
]

// ── Self-regard ─────────────────────────────────────────────────────────

export const KIND_PROMPTS = [
  'What would you say to a friend who had your day?',
  'Something you handled better than you would have a year ago:',
  'Something you’re allowed to not be good at yet:',
  'A hard moment today, said kindly:',
  'What did you do today that took a little courage?',
  'If 23-year-old you could see today, what would they thank you for?',
]

export const PROMISE_EXAMPLES = [
  'Did the run-walk even though I didn’t feel like it.',
  'Said one thing in standup I’d normally keep to myself.',
  'Phone went in the other room at 10:30.',
  'Ate the protein I planned.',
]

// ── Cheap dopamine: riding the wave ────────────────────────────────────

export const URGE_MOVES = [
  'Twenty squats or push-ups, right now',
  'Leave the room — step outside for two minutes',
  'Cold water on your face',
  'Text someone, about anything',
  'Phone in another room, face down',
]

export const URGE_STEPS = [
  'Notice it and name it: “this is an urge.”',
  'Find where it sits in your body — chest, hands, stomach.',
  'Breathe with it. It builds, peaks and passes, usually within 20–30 minutes.',
  'You don’t have to fight it or obey it. Ride it.',
]

// ── Questionnaires ──────────────────────────────────────────────────────

/** Rosenberg Self-Esteem Scale (Rosenberg, 1965). Answers are agreement, 0 SD – 3 SA. */
export const ROSENBERG_ITEMS = [
  'On the whole, I am satisfied with myself.',
  'At times I think I am no good at all.',
  'I feel that I have a number of good qualities.',
  'I am able to do things as well as most other people.',
  'I feel I do not have much to be proud of.',
  'I certainly feel useless at times.',
  'I feel that I’m a person of worth, at least on an equal plane with others.',
  'I wish I could have more respect for myself.',
  'All in all, I am inclined to feel that I am a failure.',
  'I take a positive attitude toward myself.',
]

export const ROSENBERG_CHOICES = ['Strongly disagree', 'Disagree', 'Agree', 'Strongly agree']

/** WHO-5 Well-Being Index (WHO, 1998). "Over the last two weeks…" Answers 0 at no time – 5 all of the time. */
export const WHO5_ITEMS = [
  'I have felt cheerful and in good spirits.',
  'I have felt calm and relaxed.',
  'I have felt active and vigorous.',
  'I woke up feeling fresh and rested.',
  'My daily life has been filled with things that interest me.',
]

export const WHO5_CHOICES = ['At no time', 'Some of the time', 'Less than half the time', 'More than half the time', 'Most of the time', 'All of the time']

/** The self-trust question of the weekly review — the brief's definition of confidence. */
export const SELF_TRUST_QUESTION = 'I trust myself to do what I say I will.'
