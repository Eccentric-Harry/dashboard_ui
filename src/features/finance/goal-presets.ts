// Built-in showcases: goals whose photos ship with the app (public/goals/<slug>/), so the
// workspace shows them without any server fetch. Today just the iPhone 18 Pro — Apple's
// own shots from apple.com/in/iphone-18-pro, bundled 2026-10-04.
//
// Photos the user fetched themselves always win; reasons always come from the server
// (they're the user's words, saved per goal). The built-in set is read-only — pasting a
// link in the Photos modal replaces it with fetched photos the user can curate.

import type { GoalPhoto, GoalShowcase, SavingsGoal } from '@/types/finance'

type Preset = { match: RegExp; showcase: Omit<GoalShowcase, 'reasons' | 'fetchedAt'> }

const photo = (dir: string, file: string, width: number, height: number): GoalPhoto => ({
  url: `/goals/${dir}/${file}`,
  width,
  height,
  tone: 'DARK',
})

const PRESETS: Preset[] = [
  {
    // One Apple page covers the Pro and the Pro Max.
    match: /\biphone\s*18\s*pro\b/i,
    showcase: {
      sourceUrl: 'https://www.apple.com/in/iphone-18-pro/',
      sourceName: 'apple.com',
      title: 'iPhone 18 Pro and iPhone 18 Pro Max',
      highlights: [
        'Total AI powerhouse',
        '48MP Main camera with variable aperture',
        'Big leap in battery life',
        'Next-generation vapour chamber',
        'A20 Pro chip',
      ],
      photos: [
        photo('iphone-18-pro', 'burgundy.jpg', 1440, 760),
        photo('iphone-18-pro', 'pro.jpg', 1200, 630),
        photo('iphone-18-pro', 'finishes.jpg', 1260, 612),
        photo('iphone-18-pro', 'camera.jpg', 1260, 612),
        photo('iphone-18-pro', 'night-shot.jpg', 1440, 760),
        photo('iphone-18-pro', 'glacier.jpg', 1440, 760),
        photo('iphone-18-pro', 'silver.jpg', 1440, 760),
        photo('iphone-18-pro', 'black.jpg', 1440, 760),
        photo('iphone-18-pro', 'dynamic-island.jpg', 1440, 760),
      ],
    },
  },
]

/**
 * The goal with its built-in photos and highlights filled in where the server has none.
 * Returns the same object when no preset applies, so `result !== goal` means built-in.
 */
export function withPresetShowcase(goal: SavingsGoal): SavingsGoal {
  const own = goal.showcase
  if (own && own.photos.length > 0) return goal
  const preset = PRESETS.find((p) => p.match.test(goal.name))
  if (!preset) return goal
  return {
    ...goal,
    showcase: {
      ...preset.showcase,
      highlights: own?.highlights.length ? own.highlights : preset.showcase.highlights,
      reasons: own?.reasons ?? [],
      fetchedAt: own?.fetchedAt ?? null,
    },
  }
}
