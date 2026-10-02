// The trail kit: what you pack along the Quiet Path, one page per chapter. Together the
// pages are a personal plan — the kind clinicians build with people (Mind's Wellness
// Action Plan, WRAP, and for the heavy-day page the Stanley-Brown safety plan): your early
// signs, what helps, your anchors, kind words, an evening routine, a plan for heavy days,
// what matters to you. Packed at the last stone of each chapter, editable any time from
// the notebook, and the heavy-day page is also in Anytime.
//
// Stored per goal (GoalKit on the server) as picks + the user's own words per field. The
// stories page asks for a *name* for a recurring thought, never its content — the same
// line /mind draws around intrusive thoughts (MIND_WELLNESS_PLAN.md).

import type { GoalKit, GoalKitPage } from '@/types/goals'
import { BREATHS } from './course'

export type KitKey = 'signs' | 'breath' | 'body' | 'stories' | 'anchors' | 'kind-words' | 'wind-down' | 'heavy-day' | 'matters'

export interface KitGroup {
  label: string
  chips: string[]
  /** At most this many from the group (1 makes it a single choice). */
  max?: number
}

export interface KitField {
  key: string
  label: string
  placeholder: string
  multiline?: boolean
  maxLength?: number
}

export interface KitPageDef {
  key: KitKey
  chapter: number
  title: string
  /** What the page is for, one line. */
  blurb: string
  groups: KitGroup[]
  fields: KitField[]
  /** Shows the helplines on the page (the heavy-day plan). */
  helplines?: boolean
}

export const KIT_PAGES: KitPageDef[] = [
  {
    key: 'signs',
    chapter: 1,
    title: 'My early signs',
    blurb: 'How you can tell stress is building — so you can reach for a tool sooner.',
    groups: [
      {
        label: 'I tend to notice…',
        chips: [
          'Tight shoulders',
          'A clenched jaw',
          'Racing thoughts',
          'Snapping at people',
          'Trouble settling to sleep',
          'Skipping meals',
          'Scrolling more',
          'Wanting to hide away',
          'A fast heartbeat',
          'Replaying conversations',
        ],
      },
    ],
    fields: [{ key: 'own', label: 'In my own words', placeholder: 'e.g. I go quiet and stop replying' }],
  },
  {
    key: 'breath',
    chapter: 2,
    title: 'My breath',
    blurb: 'The breathing pattern that suits you, and when you’ll reach for it.',
    groups: [
      { label: 'The breath that fits me', chips: BREATHS.map((b) => b.name), max: 1 },
      { label: 'I’ll use it…', chips: ['Before something hard', 'In bed', 'On the way somewhere', 'When a feeling comes on fast', 'Between tasks'] },
    ],
    fields: [],
  },
  {
    key: 'body',
    chapter: 3,
    title: 'Where I hold it',
    blurb: 'Where stress settles in you, and what helps it loosen.',
    groups: [
      { label: 'It settles in my…', chips: ['Shoulders', 'Neck', 'Jaw', 'Stomach', 'Chest', 'Head', 'Hands'] },
      { label: 'What helps it loosen', chips: ['A slow stretch', 'A short walk', 'A warm shower', 'Tense and let go', 'Shaking it out', 'A long exhale', 'A cup of tea'] },
    ],
    fields: [{ key: 'own', label: 'Something of my own', placeholder: 'e.g. lying on the floor for a minute' }],
  },
  {
    key: 'stories',
    chapter: 4,
    title: 'Names for my stories',
    blurb: 'A name for the story your mind tells most — just the name, never the details — and a line for unhooking.',
    groups: [
      { label: 'My mind’s favourite stories', chips: ['The what-if story', 'The not-enough story', 'The replay story', 'The it’s-all-going-wrong story', 'The rush story'] },
      { label: 'My unhooking line', chips: ['I’m noticing the thought that…', 'Thanks, mind.', 'Ah — that story again.', 'Here’s a thought, passing by.'], max: 2 },
    ],
    fields: [{ key: 'name', label: 'A name of my own', placeholder: 'e.g. the “too much” story', maxLength: 40 }],
  },
  {
    key: 'anchors',
    chapter: 5,
    title: 'My anchors',
    blurb: 'The quickest ways back to the ground when a feeling blows in.',
    groups: [
      {
        label: 'Anchors I can reach',
        chips: [
          'Feet on the floor',
          'Cold water on my hands',
          'Naming five things I see',
          'Something in my pocket',
          'A smell I like',
          'A song I know well',
          'The sky out of a window',
          'Holding a warm mug',
        ],
      },
    ],
    fields: [{ key: 'place', label: 'A place that steadies me', placeholder: 'e.g. the balcony in the evening' }],
  },
  {
    key: 'kind-words',
    chapter: 6,
    title: 'Words for a hard moment',
    blurb: 'What you’d say to a friend in your spot — kept here for you.',
    groups: [
      {
        label: 'Lines that help',
        chips: ['This is hard, and I’m doing my best.', 'Lots of people feel this way.', 'I can take one small step.', 'May I be kind to myself.', 'It’s okay to rest.', 'This will pass.'],
      },
    ],
    fields: [{ key: 'own', label: 'In my own words', placeholder: 'what a good friend would say to me', multiline: true }],
  },
  {
    key: 'wind-down',
    chapter: 7,
    title: 'My wind-down',
    blurb: 'A few small steps for the evening — the same ones, most nights, so your body learns them.',
    groups: [
      {
        label: 'My evening',
        chips: [
          'Same wake-up time',
          'Phone away before bed',
          'Lights down low',
          'Put the day down on paper',
          '4 · 7 · 8 breathing',
          'A warm shower',
          'A paper book',
          'Up if I’m awake a long while',
        ],
        max: 5,
      },
    ],
    fields: [{ key: 'own', label: 'Something of my own', placeholder: 'e.g. chamomile tea on the balcony' }],
  },
  {
    key: 'heavy-day',
    chapter: 8,
    title: 'My heavy-day plan',
    blurb: 'Made now, while things are calmer — so on a heavy day the thinking is already done.',
    groups: [
      {
        label: 'Signs it’s getting a lot',
        chips: ['Thoughts won’t slow down', 'Wanting to shut everyone out', 'Not sleeping', 'Everything feels too much', 'Feeling numb', 'Urges to hurt myself'],
      },
      {
        label: 'Things I can do on my own',
        chips: ['A long-exhale breath', 'Drop anchor', 'Cold water on my face', 'A walk outside', 'Music that helps', 'The Spiral Breaker', 'Write it down', 'A warm shower'],
      },
    ],
    fields: [
      { key: 'distract', label: 'People or places that take my mind off it', placeholder: 'e.g. a café, my cousin, the park' },
      { key: 'people', label: 'People I can tell', placeholder: 'names and numbers', multiline: true },
      { key: 'safer', label: 'Making things safer for a while', placeholder: 'e.g. asking someone to keep hold of something' },
    ],
    helplines: true,
  },
  {
    key: 'matters',
    chapter: 9,
    title: 'What matters to me',
    blurb: 'The kind of person you want to be — and one small step toward it this week.',
    groups: [
      { label: 'I care about being…', chips: ['Kind', 'Brave', 'Curious', 'Honest', 'Patient', 'Playful', 'Caring', 'Calm', 'Creative', 'Healthy', 'Connected', 'Fair'], max: 4 },
    ],
    fields: [{ key: 'step', label: 'One small step this week', placeholder: 'e.g. call my sister on Sunday' }],
  },
]

export const kitPage = (key: KitKey) => KIT_PAGES.find((p) => p.key === key) ?? KIT_PAGES[0]

export const EMPTY_PAGE: GoalKitPage = { picks: [], fields: {} }

/** Anything on the page at all. */
export const hasContent = (page?: GoalKitPage | null) => !!page && (page.picks.length > 0 || Object.values(page.fields).some((v) => v.trim()))

/** How many of the kit's pages have something on them. */
export const packedCount = (kit?: GoalKit | null) => KIT_PAGES.filter((p) => hasContent(kit?.[p.key])).length

/** The picks on a page that belong to one of its groups, in the order picked. */
export const picksIn = (page: GoalKitPage | undefined, group: KitGroup) => (page?.picks ?? []).filter((p) => group.chips.includes(p))
