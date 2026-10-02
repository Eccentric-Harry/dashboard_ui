// The Quiet Path's course: nine chapters, six stones each — learn, practise, keep. Each
// chapter opens with a story told by the place's resident (course-stories.ts: what the
// skill is and the research behind it, a gentle question with no wrong answers), then
// four short guided practices, then a stone where you pack that chapter's page of your
// kit (kit.ts). A satchel with a pocket card sits after the third stone
// (pocket-cards.ts). Every practice has one intention and one well-established technique —
// mindfulness basics (MBSR), slow breathing (Balban et al. 2023), the body (PMR, body
// scan), ACT defusion for thoughts, grounding, self-compassion (Neff), sleep (Scullin et al.
// 2018, 4-7-8, autogenic phrases), worry and uncertainty (worry time, urge surfing), and
// steadiness (three good things, values, savouring). Written in plain, kind words.
//
// Guardrails (design/GOALS_BUDDY_PLAN.md): nothing here scores a feeling or asks for a
// mood; no session reframes or argues with a thought (defusion only — see
// MIND_WELLNESS_PLAN.md on intrusive thoughts); writing steps are private scratch pads
// and are never saved; the session about strong waves names real help.

import type { GoalPractice } from '@/types/goals'
import type { KitKey } from './kit'
import type { Speaker } from './residents'
import { KIT_SESSIONS, STORIES } from './course-stories'

export type BreathPatternKey = 'sigh' | 'box' | 'four-seven-eight' | 'even'

export interface BreathPhase {
  label: string
  /** Seconds. */
  secs: number
  /** Where the bubble goes: in (grow), top (grow a little more), hold (stay), out (shrink). */
  move: 'in' | 'top' | 'hold' | 'out'
}

export interface BreathPattern {
  key: BreathPatternKey
  name: string
  blurb: string
  phases: BreathPhase[]
}

export const BREATHS: BreathPattern[] = [
  {
    key: 'sigh',
    name: 'Long exhale',
    blurb: 'Two breaths in, one long breath out. Settles the body fastest.',
    phases: [
      { label: 'Breathe in through your nose', secs: 2, move: 'in' },
      { label: '…and a little more', secs: 1, move: 'top' },
      { label: 'Long, slow breath out', secs: 6, move: 'out' },
    ],
  },
  {
    key: 'box',
    name: 'Box',
    blurb: 'In, hold, out, hold — four each. Steadying before something hard.',
    phases: [
      { label: 'Breathe in', secs: 4, move: 'in' },
      { label: 'Hold', secs: 4, move: 'hold' },
      { label: 'Breathe out', secs: 4, move: 'out' },
      { label: 'Hold', secs: 4, move: 'hold' },
    ],
  },
  {
    key: 'four-seven-eight',
    name: '4 · 7 · 8',
    blurb: 'In for four, hold for seven, out for eight. Slow, for winding down.',
    phases: [
      { label: 'In through your nose', secs: 4, move: 'in' },
      { label: 'Hold', secs: 7, move: 'hold' },
      { label: 'Out through your mouth', secs: 8, move: 'out' },
    ],
  },
  {
    key: 'even',
    name: 'Slow and even',
    blurb: 'About five in, five out, no holds. Steady, any time of day.',
    phases: [
      { label: 'Breathe in', secs: 5.5, move: 'in' },
      { label: 'Breathe out', secs: 5.5, move: 'out' },
    ],
  },
]

export const breathPattern = (key: BreathPatternKey) => BREATHS.find((b) => b.key === key) ?? BREATHS[0]
export const cycleSecs = (p: BreathPattern) => p.phases.reduce((s, ph) => s + ph.secs, 0)

export type SessionStep =
  /** A line to read; moves on by itself after a while (or a tap). */
  | { kind: 'say'; text: string }
  /** A quiet stretch with a prompt and a timer ring. */
  | { kind: 'hold'; text: string; secs: number }
  /** A guided breathing pattern for a number of cycles. */
  | { kind: 'breathe'; pattern: BreathPatternKey; cycles: number; text?: string }
  /** Things to find or name — tap each as you go. */
  | { kind: 'count'; text: string; items: string[]; pick?: boolean }
  /** A private scratch pad. Never saved; it can be copied. */
  | { kind: 'write'; text: string; placeholder: string }
  /** Someone in the story speaks — a resident, Kiri or Pip. */
  | { kind: 'line'; who: Speaker; text: string }
  /** What the research says: a card with where it comes from. */
  | { kind: 'fact'; title: string; text: string; source: string }
  /** A gentle question. Every answer is a fine answer; each gets its own kind reply. */
  | { kind: 'choice'; who: Speaker; text: string; options: { label: string; reply: string }[] }
  /** Pack a page of the kit (kit.ts), right here in the session. */
  | { kind: 'kit'; page: KitKey }

export type SessionIcon =
  | 'sprout' | 'ear' | 'pause' | 'refresh' | 'wind' | 'square' | 'waves' | 'hash' | 'scan' | 'hand' | 'heart'
  | 'move' | 'leaf' | 'quote' | 'book' | 'cloud' | 'eye' | 'footprints' | 'palette' | 'heart-hand' | 'message'
  | 'sparkles' | 'moon' | 'list' | 'feather' | 'shuffle' | 'clock' | 'circle' | 'stairs' | 'sun' | 'compass'
  | 'coffee' | 'map' | 'story' | 'backpack'

export type SessionKind = 'practice' | 'story' | 'kit'

export interface Session {
  id: string
  /** A guided practice (the default), a chapter's story, or its pack-your-kit stone. */
  kind?: SessionKind
  /** Who tells a story or helps pack the kit. */
  host?: Speaker
  /** The kit page a kit stone packs. */
  kit?: KitKey
  title: string
  /** About how long it takes — worked out from its steps (bottom of this file). */
  minutes: number
  practice: GoalPractice
  icon: SessionIcon
  /** One line: why this helps. */
  why: string
  steps: SessionStep[]
  /** What's said at the end — by Kiri, or by the story's host. */
  closing: string
}

export interface Chapter {
  n: number
  place: string
  theme: string
  /** The chapter's intention, one line. */
  intention: string
  /** What the chapter is and why it helps — the guide. */
  guide: string[]
  /** A candy key for the chapter's colour. */
  color: 'sky' | 'mint' | 'teal' | 'grape' | 'berry' | 'tangerine' | 'lemon'
  /** Kiri's postcard when the chapter is walked. */
  postcard: string
  /** Soundscape that suits it. */
  scape: SoundscapeKey
  sessions: Session[]
}

export type SoundscapeKey = 'rain' | 'stream' | 'waves' | 'wind' | 'night' | 'fire'

const say = (text: string): SessionStep => ({ kind: 'say', text })
const hold = (text: string, secs: number): SessionStep => ({ kind: 'hold', text, secs })
const breathe = (pattern: BreathPatternKey, cycles: number, text?: string): SessionStep => ({ kind: 'breathe', pattern, cycles, text })

export const COURSE: Chapter[] = [
  {
    n: 1,
    place: 'The trailhead',
    theme: 'Arriving',
    intention: 'Landing where you are, a few minutes at a time.',
    guide: [
      'Most of the mind’s noise is about somewhere else — the past, the future, what someone thinks. Arriving is the skill of coming back to here.',
      'The practices here are short on purpose. The aim isn’t a quiet mind; it’s noticing where attention went and gently bringing it back. That return is the whole practice.',
    ],
    color: 'sky',
    postcard: 'You’ve learned to arrive. Everything else on the path is built on that.',
    scape: 'wind',
    sessions: [
      {
        id: 'arrive',
        title: 'Arrive',
        minutes: 0,
        practice: 'still',
        icon: 'sprout',
        why: 'A breath and a few sensations are enough to land in the present.',
        steps: [
          say('Find a way to sit that feels steady. You don’t need to be calm to do this — just here.'),
          say('Let your eyes rest on one spot, or close them.'),
          breathe('sigh', 3, 'Three slow breaths, longer on the way out.'),
          say('Notice where your body touches the chair, the floor, the ground.'),
          hold('Stay with that contact for a little while.', 30),
          say('Notice one sound near you, and one far away.'),
          hold('Just listen.', 20),
          say('That’s arriving. You can come back to it any time — it only takes a breath.'),
        ],
        closing: 'You arrived. That’s the whole first step.',
      },
      {
        id: 'three-sounds',
        title: 'Three sounds',
        minutes: 0,
        practice: 'still',
        icon: 'ear',
        why: 'Sound is always in the present, and it never asks anything of you.',
        steps: [
          say('Today attention rests on sound. It’s always there, and it never needs a reply.'),
          breathe('even', 3),
          say('Find the loudest sound around you. Just notice it — no need to name it.'),
          hold('Listening…', 30),
          say('Now a quieter one, further away.'),
          hold('Listening…', 30),
          say('And the quietest sound you can find.'),
          hold('Listening…', 30),
          say('When the mind wanders off, that’s normal. Noticing, and coming back to a sound — that’s the practice.'),
        ],
        closing: 'Sound is a door back to now. It’s always open.',
      },
      {
        id: 'kind-pause',
        title: 'The kind pause',
        minutes: 0,
        practice: 'still',
        icon: 'pause',
        why: 'A ten-second reset you can use in the middle of anything.',
        steps: [
          say('A tool for busy moments: S-T-O-P. Stop. Take a breath. Observe. Proceed.'),
          say('Stop. Let whatever you were doing go still for a moment.'),
          breathe('sigh', 2, 'Take a breath — a long one out.'),
          say('Observe. What’s here right now, in your body and your thoughts? Nothing to fix.'),
          hold('Just look, kindly.', 30),
          say('Proceed. What’s one small, kind next thing to do?'),
          { kind: 'write', text: 'If you like, jot the next small thing.', placeholder: 'e.g. a glass of water' },
        ],
        closing: 'You can take a kind pause in the middle of anything. Ten seconds counts.',
      },
      {
        id: 'coming-back',
        title: 'Coming back',
        minutes: 0,
        practice: 'still',
        icon: 'refresh',
        why: 'Every time you notice you drifted and come back, attention gets a little stronger.',
        steps: [
          say('Minds wander. That’s simply what minds do — it’s part of the practice, not a slip from it.'),
          say('Rest your attention on the breath — at the nose, or in the belly. Wherever it’s easiest.'),
          hold('Each time you notice you’ve drifted, gently come back. That moment of coming back is the exercise.', 45),
          say('Maybe you drifted many times. Each return was a rep — like lifting a small weight.'),
          hold('Again: breath. Drift. Return.', 45),
          say('Be as gentle with the drifting as you’d be with a puppy learning to sit.'),
        ],
        closing: 'Every return is the practice. You did a lot of them.',
      },
    ],
  },
  {
    n: 2,
    place: 'The birch wood',
    theme: 'Breath',
    intention: 'Breathing is the quickest way to tell your body it’s safe.',
    guide: [
      'Slow breathing — especially a long out-breath — nudges the body’s calming system. In a Stanford study, five minutes a day of a long-exhale breath eased anxiety and lifted mood more than meditation did.',
      'You’ll learn four patterns. Afterwards they all live in Anytime → Breathe, so you can reach for whichever fits the moment.',
    ],
    color: 'mint',
    postcard: 'Four ways to breathe, and they’re yours now. Any time, anywhere.',
    scape: 'wind',
    sessions: [
      {
        id: 'long-exhale',
        title: 'The long exhale',
        minutes: 0,
        practice: 'breathe',
        icon: 'wind',
        why: 'An out-breath longer than the in-breath is a gentle brake for a racing body.',
        steps: [
          say('When the out-breath is longer than the in-breath, the body’s calming system gets a gentle nudge.'),
          say('Breathe in through your nose, then sip in a little more. Then let it all out slowly through your mouth.'),
          breathe('sigh', 12),
          say('Let the breath go back to normal. Notice how you are — whatever it is, it’s fine.'),
        ],
        closing: 'That’s the long exhale. It’s the quickest calm there is.',
      },
      {
        id: 'box-breath',
        title: 'Box breathing',
        minutes: 0,
        practice: 'breathe',
        icon: 'square',
        why: 'An even rhythm to hold onto when things feel unsteady.',
        steps: [
          say('Four sides of a box: in for four, hold for four, out for four, hold for four.'),
          breathe('box', 7),
          say('If holding feels uncomfortable, make the holds shorter. Your breath, your rules.'),
          breathe('box', 4),
        ],
        closing: 'Box breathing is steadying — handy before something hard.',
      },
      {
        id: 'slow-even',
        title: 'Slow and even',
        minutes: 0,
        practice: 'breathe',
        icon: 'waves',
        why: 'About six breaths a minute settles the heart into a steady rhythm.',
        steps: [
          say('Now just slow and even: in for about five, out for about five. No holds.'),
          breathe('even', 20),
          say('Let the breath find its own pace again.'),
        ],
        closing: 'Slow, even breathing works anywhere — on a bus, in a queue, in bed.',
      },
      {
        id: 'counting-breaths',
        title: 'Counting breaths',
        minutes: 0,
        practice: 'breathe',
        icon: 'hash',
        why: 'Giving a busy mind one small job is sometimes all it needs.',
        steps: [
          say('Count each out-breath, from one to ten. Then start again at one.'),
          say('If the count slips away — it will — just start again at one. That’s part of it too.'),
          hold('One… two… three…', 150),
          say('How far did you get? It doesn’t matter at all.'),
        ],
        closing: 'A small job for the mind, and a rest for everything else.',
      },
    ],
  },
  {
    n: 3,
    place: 'Fern hollow',
    theme: 'The body',
    intention: 'Feelings live in the body. Noticing them there makes them easier to carry.',
    guide: [
      'Stress shows up as tight shoulders, a clenched jaw, a knot in the stomach — often before we notice the thought behind it.',
      'These sessions practise noticing the body kindly, letting go of tension on purpose, and making room for a feeling instead of fighting it.',
    ],
    color: 'teal',
    postcard: 'You’ve been listening to your body. It’s been waiting to be heard.',
    scape: 'stream',
    sessions: [
      {
        id: 'body-scan',
        title: 'A short body scan',
        minutes: 0,
        practice: 'still',
        icon: 'scan',
        why: 'Moving attention through the body is a reliable way to settle.',
        steps: [
          say('We’ll move attention slowly through the body, like a soft light. Nothing to change.'),
          hold('Feet. Toes, soles, heels. Warm, cool, tingling, or nothing much — all fine.', 30),
          hold('Legs. Notice their weight.', 25),
          hold('Belly and chest, rising and falling.', 30),
          hold('Hands and arms.', 25),
          hold('Shoulders — they carry a lot. Let them drop, if they want to.', 30),
          hold('Face. Jaw, eyes, forehead. Soften what can soften.', 30),
          say('Now the whole body at once, breathing.'),
          hold('Just this.', 20),
        ],
        closing: 'You listened to your whole body. It noticed.',
      },
      {
        id: 'tense-release',
        title: 'Tense and let go',
        minutes: 0,
        practice: 'still',
        icon: 'hand',
        why: 'Tensing on purpose, then releasing, teaches the body what relaxed feels like.',
        steps: [
          say('We’ll tense a few muscles gently, then let go. Skip anything that hurts — just rest there instead.'),
          hold('Make two fists. Squeeze — about half your strength.', 7),
          hold('And let go. Notice the difference.', 12),
          hold('Lift your shoulders up toward your ears. Hold.', 7),
          hold('Drop them. Let them stay down.', 12),
          hold('Scrunch your face — eyes, nose, mouth. Hold.', 7),
          hold('Release. Let the face go soft.', 12),
          hold('Press your feet into the floor. Hold.', 7),
          hold('Release.', 12),
          breathe('sigh', 3),
        ],
        closing: 'Relaxing is a skill, and you just practised it.',
      },
      {
        id: 'where-it-lives',
        title: 'Where it lives',
        minutes: 0,
        practice: 'still',
        icon: 'heart',
        why: 'Making room for a feeling is often what lets it move.',
        steps: [
          say('Think of something mildly stressful — small, not the biggest thing.'),
          hold('Where do you feel it in your body? Chest, throat, stomach, shoulders?', 20),
          say('Breathe toward that place, as if making a little room around it.'),
          hold('You don’t have to make it go away. Let it be there, with space around it.', 40),
          say('Rest a hand there, if that feels kind.'),
          hold('Breathing.', 20),
          say('Now let the thought go, and come back to the breath.'),
        ],
        closing: 'You made room for a feeling instead of fighting it. That’s brave.',
      },
      {
        id: 'gentle-stretch',
        title: 'Gentle stretch',
        minutes: 0,
        practice: 'walk',
        icon: 'move',
        why: 'A little movement shifts a stuck mood faster than thinking about it.',
        steps: [
          say('A few slow movements. Go gently, and skip anything that doesn’t feel good.'),
          hold('Roll your shoulders back, slowly, five times.', 20),
          hold('Tip one ear toward its shoulder. Breathe. Then the other side.', 20),
          hold('Reach both arms up, long. Then let them float down.', 20),
          hold('Turn gently to look over one shoulder, then the other.', 20),
          hold('Shake out your hands, like flicking off water.', 15),
          breathe('sigh', 2),
        ],
        closing: 'Moving even a little tells the body the alarm can switch off.',
      },
    ],
  },
  {
    n: 4,
    place: 'Willow river',
    theme: 'Thoughts that pass',
    intention: 'You are not your thoughts. You can watch them go by.',
    guide: [
      'Minds make thoughts all day — some kind, some cruel, some strange. Having a thought doesn’t mean it’s true, or that it says anything about you.',
      'These sessions use defusion, from Acceptance and Commitment Therapy: stepping back and seeing a thought as a thought, rather than arguing with it or obeying it. Nothing here asks you to change what you think — only how close you stand to it.',
    ],
    color: 'grape',
    postcard: 'Thoughts float by now, more often than they sweep you away. That’s the river at work.',
    scape: 'stream',
    sessions: [
      {
        id: 'leaves-on-a-stream',
        title: 'Leaves on a stream',
        minutes: 0,
        practice: 'still',
        icon: 'leaf',
        why: 'Watching thoughts float away teaches you that you can let them pass.',
        steps: [
          say('Picture yourself beside a gentle stream. Leaves float past on the water.'),
          say('Whenever a thought comes — any thought — place it on a leaf, and let it float away.'),
          say('Pleasant, unpleasant, or neutral: every thought gets a leaf. You don’t have to push them along.'),
          hold('Thought… leaf… watch it drift.', 80),
          say('If you get swept up in one, that’s okay. Notice, step back onto the bank, and keep going.'),
          hold('Thought… leaf… drift.', 80),
        ],
        closing: 'Thoughts come and go like leaves. You’re the one watching from the bank.',
      },
      {
        id: 'having-the-thought',
        title: '“I’m having the thought…”',
        minutes: 0,
        practice: 'still',
        icon: 'quote',
        why: 'A few words put a little space between you and a sticky thought.',
        steps: [
          say('A small trick of words that puts space between you and a thought.'),
          { kind: 'write', text: 'Write a thought that’s been bothering you — just the words. This stays on your screen; it isn’t saved.', placeholder: 'e.g. I’m going to mess this up' },
          say('Now say it to yourself again, starting with: “I’m having the thought that…”'),
          hold('Say it slowly.', 15),
          say('Once more: “I notice I’m having the thought that…”'),
          hold('Say it slowly.', 15),
          say('Notice any difference. The thought is still there — and you’re a little further from it.'),
        ],
        closing: 'A thought is a thought — not an instruction, and not a fact about you.',
      },
      {
        id: 'name-the-story',
        title: 'Name the story',
        minutes: 0,
        practice: 'still',
        icon: 'book',
        why: 'Naming a familiar story helps you notice it, and noticing is the first bit of freedom.',
        steps: [
          say('Minds replay the same few stories: the “not good enough” story, the “what if” story, the “everyone’s upset with me” story.'),
          say('When a familiar one shows up, you can simply name it: “Ah — that story again.”'),
          hold('Which story visits most? Give it a light, even silly, title.', 25),
          { kind: 'write', text: 'Its title, if you like. Not saved.', placeholder: 'e.g. The Disaster Movie' },
          say('Next time it plays, you can say: “Oh, the Disaster Movie.” You don’t have to sit through the whole thing.'),
        ],
        closing: 'You know the story now. You don’t have to believe every rerun.',
      },
      {
        id: 'sky-and-weather',
        title: 'The sky and the weather',
        minutes: 0,
        practice: 'still',
        icon: 'cloud',
        why: 'Seeing feelings as weather is a reminder that they always pass.',
        steps: [
          say('Imagine your mind is the sky. Thoughts and feelings are weather — clouds, rain, bright spells.'),
          hold('Watch whatever weather is here today drift across.', 45),
          say('Even storms move on. The sky is never harmed by the weather.'),
          hold('Just watching.', 45),
          say('You are the sky.'),
        ],
        closing: 'Weather changes. The sky stays.',
      },
    ],
  },
  {
    n: 5,
    place: 'The stone garden',
    theme: 'Grounding',
    intention: 'When everything is loud, the senses can bring you back to now.',
    guide: [
      'When the mind races or spirals, the body can be the anchor. Your senses only ever report on the present moment — that’s why grounding works.',
      'Keep these for loud days. “5, 4, 3, 2, 1” also lives in Anytime → Quick help.',
    ],
    color: 'tangerine',
    postcard: 'You can find the ground now, even when it’s noisy. Keep these stones close.',
    scape: 'wind',
    sessions: [
      {
        id: 'five-senses',
        title: '5, 4, 3, 2, 1',
        minutes: 0,
        practice: 'still',
        icon: 'eye',
        why: 'Naming what your senses notice pulls attention out of a spiral and into now.',
        steps: [
          say('A grounding exercise for when your mind is racing. Go slowly — there’s no rush.'),
          { kind: 'count', text: 'Name 5 things you can see.', items: ['1', '2', '3', '4', '5'] },
          { kind: 'count', text: '4 things you can feel — your clothes, the chair, the air.', items: ['1', '2', '3', '4'] },
          { kind: 'count', text: '3 things you can hear.', items: ['1', '2', '3'] },
          { kind: 'count', text: '2 things you can smell — or two smells you like.', items: ['1', '2'] },
          { kind: 'count', text: '1 thing you can taste — or one kind thing you can say to yourself.', items: ['1'] },
          breathe('sigh', 2),
        ],
        closing: 'Your senses are always in the present. That’s why they bring you back.',
      },
      {
        id: 'feet-on-the-ground',
        title: 'Feet on the ground',
        minutes: 0,
        practice: 'still',
        icon: 'footprints',
        why: 'Feeling the ground hold you up is steadying in a very literal way.',
        steps: [
          say('Press your feet into the floor. Feel the ground pushing back.'),
          hold('Notice the weight. The floor is holding you up.', 20),
          hold('Wiggle your toes. Notice temperature, texture.', 20),
          say('Say to yourself: “Right now, I’m here. My feet are on the ground.”'),
          breathe('even', 3),
        ],
        closing: 'The ground is always there to come back to.',
      },
      {
        id: 'something-in-hand',
        title: 'Something in your hand',
        minutes: 0,
        practice: 'still',
        icon: 'hand',
        why: 'Full attention on one small object is a little holiday for the mind.',
        steps: [
          say('Pick up any small thing near you — a pen, a cup, a leaf.'),
          hold('Look at it as if you’d never seen one before. Colours, edges, marks.', 20),
          hold('Feel its weight, its temperature, its texture.', 20),
          hold('Turn it slowly. Find something you hadn’t noticed.', 20),
        ],
        closing: 'One small thing, fully noticed. That’s the present, in your hand.',
      },
      {
        id: 'find-the-colours',
        title: 'Find the colours',
        minutes: 0,
        practice: 'still',
        icon: 'palette',
        why: 'A gentle search gives a racing mind somewhere to rest its eyes.',
        steps: [
          say('Look around slowly for something of each colour.'),
          { kind: 'count', text: 'Tap each colour as you find it.', items: ['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Purple'] },
          say('Now find something round, and something with a straight edge.'),
          hold('Looking…', 15),
        ],
        closing: 'You looked around and found the world still here. It usually is.',
      },
    ],
  },
  {
    n: 6,
    place: 'Lantern lake',
    theme: 'Kindness',
    intention: 'Being kind to yourself isn’t letting yourself off — it’s what helps you keep going.',
    guide: [
      'Many of us are much harder on ourselves than we’d ever be on a friend. Research on self-compassion (Kristin Neff) finds it predicts sticking with things better than self-criticism does — shame makes us hide; kindness helps us try again.',
      'Self-compassion has three parts: noticing that something is hard, remembering you’re not the only one, and offering yourself some kindness. These sessions practise each.',
    ],
    color: 'berry',
    postcard: 'You’ve lit a lantern of kindness, for yourself. Let it stay lit.',
    scape: 'waves',
    sessions: [
      {
        id: 'hand-on-heart',
        title: 'A hand on your heart',
        minutes: 0,
        practice: 'still',
        icon: 'heart',
        why: 'Soothing touch calms the body, even when it’s your own hand.',
        steps: [
          say('Place a hand on your chest, or both hands — wherever feels comforting.'),
          hold('Feel the warmth of your hand. The gentle pressure.', 20),
          breathe('even', 4, 'Breathe slowly under your hand.'),
          say('Soothing touch calms the body, even when it’s your own.'),
          hold('Stay a little longer.', 20),
        ],
        closing: 'You can offer yourself this any time. No one else needs to know.',
      },
      {
        id: 'compassion-break',
        title: 'The self-compassion break',
        minutes: 0,
        practice: 'still',
        icon: 'heart-hand',
        why: 'Three short phrases that meet a hard moment with kindness instead of criticism.',
        steps: [
          say('Think of something that’s hard right now — a small or medium thing.'),
          say('Say to yourself: “This is a moment of struggle.” Or simply: “This is hard.”'),
          hold('Let it be true.', 15),
          say('Then: “Struggle is part of being human. Other people feel this too.”'),
          hold('You’re not the only one.', 15),
          say('Then, with a hand on your heart: “May I be kind to myself.”'),
          hold('Let the words land.', 20),
          say('Or find words that fit you: “May I be patient.” “May I forgive myself.” “May I give myself what I need.”'),
          hold('Your words.', 20),
        ],
        closing: 'This is hard. I’m not alone. May I be kind. Three lines, carried anywhere.',
      },
      {
        id: 'tell-a-friend',
        title: 'What would you tell a friend?',
        minutes: 0,
        practice: 'write',
        icon: 'message',
        why: 'You already know how to be kind — this turns it inward.',
        steps: [
          say('Think of something you’ve been hard on yourself about.'),
          say('Now imagine a good friend came to you with the very same thing.'),
          { kind: 'write', text: 'What would you say to them? This isn’t saved.', placeholder: 'You’re doing more than you think…' },
          say('Read it back slowly — this time, to yourself.'),
          hold('Let it be meant for you.', 20),
        ],
        closing: 'The kindness was already in you. You just pointed it the other way.',
      },
      {
        id: 'kind-wishes',
        title: 'Kind wishes',
        minutes: 0,
        practice: 'gratitude',
        icon: 'sparkles',
        why: 'Quiet good wishes soften the edges of the day, and of you.',
        steps: [
          say('Some quiet wishes. First for someone easy to love — a friend, a pet, a child.'),
          hold('Picture them. “May you be safe. May you be well. May you be at ease.”', 25),
          say('Now for yourself, just as you are right now.'),
          hold('“May I be safe. May I be well. May I be at ease.”', 25),
          say('And widening out — everyone in your town, your country, the world.'),
          hold('“May we all be safe. May we all be well.”', 20),
        ],
        closing: 'Kind wishes cost nothing and go a long way — including toward you.',
      },
    ],
  },
  {
    n: 7,
    place: 'Cedar steps',
    theme: 'Rest',
    intention: 'Rest isn’t a reward for finishing. It’s part of the work.',
    guide: [
      'A tired mind worries more, and a worried mind sleeps less. These sessions help break that loop at night.',
      'One is borrowed from a sleep-lab study: people who wrote a specific to-do list before bed fell asleep faster than people who wrote about what they’d done. The others slow the body down. All four also work as a daytime rest.',
    ],
    color: 'lemon',
    postcard: 'You’ve learned to put the day down. The cedars have been doing it for centuries.',
    scape: 'night',
    sessions: [
      {
        id: 'four-seven-eight',
        title: '4 · 7 · 8 for winding down',
        minutes: 0,
        practice: 'breathe',
        icon: 'moon',
        why: 'A long, slow out-breath is a lullaby for the nervous system.',
        steps: [
          say('In through your nose for four, hold for seven, out through your mouth for eight. Slow on purpose.'),
          breathe('four-seven-eight', 4),
          say('Pause, and breathe normally for a moment.'),
          hold('Easy breaths.', 15),
          breathe('four-seven-eight', 4),
        ],
        closing: 'Slow breath, slow body. Rest can follow.',
      },
      {
        id: 'put-the-day-down',
        title: 'Put the day down',
        minutes: 0,
        practice: 'write',
        icon: 'list',
        why: 'Writing tomorrow’s list lets the mind stop holding it.',
        steps: [
          say('At night a busy mind keeps tomorrow’s list running. Let’s write it down so it doesn’t have to.'),
          { kind: 'write', text: 'What’s on tomorrow’s list? Be specific — that helps. Not saved; copy it somewhere if you like.', placeholder: 'email Asha about the trip, buy milk…' },
          say('In a sleep-lab study, people who wrote a specific to-do list fell asleep faster.'),
          say('The list is written down now. Your mind can put it down.'),
          breathe('sigh', 3),
        ],
        closing: 'Tomorrow’s things will be there tomorrow. Tonight can be for rest.',
      },
      {
        id: 'heavy-and-warm',
        title: 'Heavy and warm',
        minutes: 0,
        practice: 'still',
        icon: 'feather',
        why: 'Simple repeated phrases let the body settle on its own.',
        steps: [
          say('Settle into lying or sitting. We’ll repeat a few quiet phrases.'),
          hold('“My arms are heavy… my arms are heavy and warm.”', 25),
          hold('“My legs are heavy… my legs are heavy and warm.”', 25),
          hold('“My breath is calm and easy.”', 25),
          hold('“My heart is steady and calm.”', 25),
          hold('“I am quiet. I can rest.”', 25),
        ],
        closing: 'You don’t have to fall asleep. Resting like this already does good.',
      },
      {
        id: 'sleepy-shuffle',
        title: 'The sleepy shuffle',
        minutes: 0,
        practice: 'still',
        icon: 'shuffle',
        why: 'Gentle, random pictures give a spinning mind something soft to do.',
        steps: [
          say('If thoughts spin at night, give your mind a gentle, random job.'),
          say('Pick a calm word, like “garden”. For each letter, picture things that start with it.'),
          hold('G… a gate, a goose, grapes. Picture each one for a moment.', 40),
          hold('A… an apple, an anchor, an armchair.', 40),
          hold('R… a river, a robin, a rug. Keep going at your own pace.', 40),
          say('If you drift off, that’s the idea.'),
        ],
        closing: 'Random, gentle pictures — the mind’s way of saying goodnight.',
      },
    ],
  },
  {
    n: 8,
    place: 'Cloud pass',
    theme: 'Worry and uncertainty',
    intention: 'Not knowing is uncomfortable — and survivable. You can make room for it.',
    guide: [
      'Worry tries to solve the future by thinking about it harder. It rarely works, and it’s exhausting.',
      'These sessions give worry a time and a place, separate what’s in your hands from what isn’t, shrink big things to a next step, and practise riding strong feelings until they pass.',
    ],
    color: 'sky',
    postcard: 'Up in the clouds, and still steady. You don’t have to see far ahead to keep walking.',
    scape: 'rain',
    sessions: [
      {
        id: 'worry-time',
        title: 'A time for worry',
        minutes: 0,
        practice: 'write',
        icon: 'clock',
        why: 'Worries that can wait their turn stop taking over the whole day.',
        steps: [
          say('Worries love to show up all day. A trick from therapy for worry: give them an appointment.'),
          say('Pick fifteen minutes later today — not close to bedtime. That’s worry time.'),
          { kind: 'write', text: 'When will your worry time be? Not saved.', placeholder: '6:30 pm, on the balcony' },
          say('When a worry turns up before then, tell it: “Not now — at 6:30.” Jot it down if it helps.'),
          say('At worry time, look at the list. Some will have shrunk. Some may need one small action.'),
        ],
        closing: 'Worries don’t have to be ignored or obeyed. They can wait their turn.',
      },
      {
        id: 'in-my-hands',
        title: 'What’s in my hands',
        minutes: 0,
        practice: 'write',
        icon: 'circle',
        why: 'Putting energy where it can land is a relief.',
        steps: [
          say('Think of a worry. Some parts of it are in your hands, and some aren’t.'),
          { kind: 'write', text: 'Which part is in your hands? Not saved.', placeholder: 'I can ask, prepare, rest…' },
          say('And the parts that aren’t — can you let them sit outside the circle, just for now?'),
          breathe('sigh', 3),
        ],
        closing: 'Your hands are full enough with what’s actually yours.',
      },
      {
        id: 'next-small-step',
        title: 'The next small step',
        minutes: 0,
        practice: 'write',
        icon: 'stairs',
        why: 'When something feels too big, the next two minutes of it are usually doable.',
        steps: [
          say('When something feels too big, shrink it to the very next step.'),
          say('Not the whole thing. Just the next two minutes of it.'),
          { kind: 'write', text: 'What’s the smallest next step? Not saved.', placeholder: 'open the document, write one line' },
          say('Small steps count exactly the same as big ones — they’re just easier to take.'),
        ],
        closing: 'One small step is still a step. You know that better than anyone now.',
      },
      {
        id: 'riding-the-wave',
        title: 'Riding the wave',
        minutes: 0,
        practice: 'still',
        icon: 'waves',
        why: 'Strong feelings and urges rise, peak and pass — usually faster than it feels.',
        steps: [
          say('Strong feelings and urges come like waves. They rise, they peak, and they pass.'),
          say('Notice what’s here now, and where you feel it in your body.'),
          hold('Breathe, and imagine riding it like a surfer — not fighting it, not obeying it.', 30),
          hold('Notice it shifting: stronger, weaker, changing shape.', 30),
          breathe('sigh', 4),
          say('Waves always pass. If one ever feels too big to ride alone, reach out — the Spiral Breaker is in the top bar, and Tele-MANAS is on 14416, any time.'),
        ],
        closing: 'You rode a wave. You can ride the next one too.',
      },
    ],
  },
  {
    n: 9,
    place: 'The quiet summit',
    theme: 'Steadiness',
    intention: 'Putting it together: a small, steady practice that’s yours.',
    guide: [
      'The last stretch is about what to keep: noticing good things, savouring the moments that are already okay, reaching out to someone, and knowing your own practice.',
      'After the summit the path doesn’t end — you can walk it again, replay any session, and the Anytime tools stay open.',
    ],
    color: 'mint',
    postcard: 'You reached the quiet summit. Look how far the path has come — and it keeps going, whenever you are.',
    scape: 'wind',
    sessions: [
      {
        id: 'three-good-things',
        title: 'Three good things',
        minutes: 0,
        practice: 'gratitude',
        icon: 'sun',
        why: 'Noticing good things trains attention to find more of them.',
        steps: [
          say('Think back over the last day or two.'),
          { kind: 'count', text: 'Find three good things — small is perfect. A warm drink. A kind message.', items: ['1', '2', '3'] },
          say('For one of them, ask: why did it happen? What part did you play?'),
          hold('Let it sink in.', 20),
        ],
        closing: 'Good things were there all along. You went and found them.',
      },
      {
        id: 'reach-out',
        title: 'Reach out',
        minutes: 0,
        practice: 'talk',
        icon: 'message',
        why: 'Feeling connected is one of the steadiest supports there is — and small contact counts.',
        steps: [
          say('Think of someone you’d like to hear from — or someone who’d like to hear from you.'),
          hold('Picture them for a moment. Where are they, what are they up to?', 20),
          say('A small message is plenty: a photo, a “thinking of you”, a question about their day.'),
          { kind: 'write', text: 'If you like, draft it here first. Not saved.', placeholder: 'Saw this and thought of you' },
          say('Send it now, or later today — whenever it feels right. Short is fine.'),
        ],
        closing: 'A small reach goes a long way — for both of you.',
      },
      {
        id: 'savour',
        title: 'Savour',
        minutes: 0,
        practice: 'gratitude',
        icon: 'coffee',
        why: 'Good moments pass quickly; savouring lets them leave a mark.',
        steps: [
          say('Think of a recent pleasant moment — or notice one happening right now.'),
          hold('Stay with it a little longer than usual. What did you see, hear, feel?', 30),
          say('Let it soak in, like sun on your face.'),
          hold('Soaking it in.', 20),
        ],
        closing: 'You let a good moment stay a little longer. It’s yours to keep.',
      },
      {
        id: 'your-own-practice',
        title: 'Your own practice',
        minutes: 0,
        practice: 'still',
        icon: 'map',
        why: 'Knowing what works for you is the most useful thing the path can leave you with.',
        steps: [
          say('You’ve walked the whole path. Think back: which sessions helped most?'),
          say('Your notebook keeps what you lean on. On a hard day, it’s a map of what works for you.'),
          say('From here, any session can be replayed, and the Anytime tools are always open.'),
          breathe('sigh', 3),
        ],
        closing: 'The path goes on — at your pace, in your way.',
      },
    ],
  },
]

// Each chapter: its story first, its four practices, then the stone that packs its kit page.
for (const chapter of COURSE) {
  const story = STORIES[chapter.n]
  const kit = KIT_SESSIONS[chapter.n]
  chapter.sessions = [...(story ? [story] : []), ...chapter.sessions.filter((s) => (s.kind ?? 'practice') === 'practice'), ...(kit ? [kit] : [])]
}

/** The satchel sits after this many stones of each chapter (its story and two practices). */
export const SATCHEL_AFTER = 3

export const SESSIONS: Session[] = COURSE.flatMap((c) => c.sessions)
export const sessionById = (id?: string | null) => SESSIONS.find((s) => s.id === id)
export const chapterOf = (sessionId: string) => COURSE.find((c) => c.sessions.some((s) => s.id === sessionId)) ?? COURSE[0]

/** Sessions you can reach for any time from Anytime → Quick help, wherever you are on the path. */
export const QUICK_HELP = ['five-senses', 'riding-the-wave', 'put-the-day-down', 'compassion-break'] as const

/** Seconds a "say" line stays before moving on by itself. */
export const sayDuration = (text: string) => Math.max(4.5, Math.min(11, 3 + text.length / 16))

/** A session's length in seconds, by its steps. */
export function sessionSecs(s: Session): number {
  return s.steps.reduce((sum, step) => {
    switch (step.kind) {
      case 'say':
        return sum + sayDuration(step.text)
      case 'hold':
        return sum + step.secs
      case 'breathe':
        return sum + cycleSecs(breathPattern(step.pattern)) * step.cycles
      case 'count':
        return sum + 8 + step.items.length * 6
      case 'write':
        return sum + 45
      case 'line':
        return sum + sayDuration(step.text)
      case 'fact':
        return sum + factDuration(step)
      case 'choice':
        return sum + 12 + step.text.length / 20
      case 'kit':
        return sum + 90
    }
  }, 0)
}

/** Seconds to read a research card. */
export const factDuration = (step: { title: string; text: string }) => Math.max(10, Math.min(20, 5 + (step.title.length + step.text.length) / 16))

// The shortest sessions open with a few settling breaths and close with a moment of rest,
// so none is over before it has begun. Then each one's length comes from its steps, so
// what the path says is what it takes.
for (const session of SESSIONS) {
  if ((session.kind ?? 'practice') === 'practice' && sessionSecs(session) < 100) {
    if (session.steps[0]?.kind !== 'breathe') session.steps.unshift(breathe('sigh', 3, 'First, three slow breaths to settle.'))
    session.steps.push(hold('Rest here a moment before you go.', 20))
  }
  session.minutes = Math.max(1, Math.round(sessionSecs(session) / 60))
}
