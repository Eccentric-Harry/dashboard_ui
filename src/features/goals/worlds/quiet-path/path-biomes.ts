// Which scenery each chapter of the Quiet Path walks through, and what grows there.

export type Biome = 'meadow' | 'birch' | 'fern' | 'river' | 'stone' | 'lake' | 'cedar' | 'cloud' | 'summit'

/** Each chapter's scenery. */
export const BIOME_OF: Record<number, Biome> = { 1: 'meadow', 2: 'birch', 3: 'fern', 4: 'river', 5: 'stone', 6: 'lake', 7: 'cedar', 8: 'cloud', 9: 'summit' }

export const DECOR: Record<Biome, readonly string[]> = {
  meadow: ['flower', 'tuft', 'flower', 'bush', 'butterfly'],
  birch: ['birch', 'tuft', 'birch', 'flower', 'butterfly'],
  fern: ['fern', 'mushroom', 'fern', 'tuft', 'butterfly'],
  river: ['willow', 'reeds', 'tuft', 'reeds', 'dragonfly', 'fish'],
  stone: ['cairn', 'boulder', 'tuft', 'flower', 'butterfly'],
  lake: ['reeds', 'tuft', 'reeds', 'bush', 'dragonfly'],
  cedar: ['cedar', 'cedar', 'tuft', 'mushroom', 'bird'],
  cloud: ['mist', 'alpine', 'tuft', 'mist', 'bird'],
  summit: ['rock', 'snow', 'alpine', 'rock', 'bird'],
}
