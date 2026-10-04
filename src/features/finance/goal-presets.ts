// Built-in showcases: goals whose photos ship with the app (public/goals/<slug>/), so the
// workspace shows them without any server fetch. Today just the iPhone 18 Pro — Apple's
// own shots, bundled 2026-10-04: the product page's studio shots (black) for the dark
// theme, the Apple Store's cut-outs (white) for the light one.
//
// Photos the user fetched themselves always win; reasons always come from the server
// (they're the user's words, saved per goal). The built-in set is read-only — pasting a
// link in the Photos modal replaces it with fetched photos the user can curate.

import type { GoalPhoto, GoalShowcase, SavingsGoal } from '@/types/finance'

type Preset = {
  match: RegExp
  showcase: Omit<GoalShowcase, 'reasons' | 'fetchedAt'>
  /** The same story on white, for the light theme. */
  photosLight: GoalPhoto[]
}

const photo = (dir: string, file: string, width: number, height: number, tone: GoalPhoto['tone'] = 'DARK'): GoalPhoto => ({
  url: `/goals/${dir}/${file}`,
  width,
  height,
  tone,
})
const light = (dir: string, file: string): GoalPhoto => photo(dir, file, 1684, 1000, 'LIGHT')

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
        photo('iphone-18-pro', 'glacier.jpg', 1440, 760),
        photo('iphone-18-pro', 'silver.jpg', 1440, 760),
        photo('iphone-18-pro', 'black.jpg', 1440, 760),
        photo('iphone-18-pro', 'dynamic-island.jpg', 1440, 760),
      ],
    },
    photosLight: [
      light('iphone-18-pro', 'light-burgundy.jpg'),
      light('iphone-18-pro', 'light-finishes.jpg'),
      light('iphone-18-pro', 'light-camera.jpg'),
      light('iphone-18-pro', 'light-glacier.jpg'),
      light('iphone-18-pro', 'light-silver.jpg'),
      light('iphone-18-pro', 'light-black.jpg'),
    ],
  },
]

/**
 * The goal with its built-in photos and highlights filled in where the server has none.
 * Returns the same object when no preset applies, so `result !== goal` means built-in.
 */
export function withPresetShowcase(goal: SavingsGoal, dark: boolean): SavingsGoal {
  const own = goal.showcase
  if (own && own.photos.length > 0) return goal
  const preset = PRESETS.find((p) => p.match.test(goal.name))
  if (!preset) return goal
  return {
    ...goal,
    showcase: {
      ...preset.showcase,
      photos: dark ? preset.showcase.photos : preset.photosLight,
      highlights: own?.highlights.length ? own.highlights : preset.showcase.highlights,
      reasons: own?.reasons ?? [],
      fetchedAt: own?.fetchedAt ?? null,
    },
  }
}
