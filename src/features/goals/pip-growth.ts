// Pip grows with the camp: a sprout, then a third leaf, a bud and finally a flower, from
// the lifetime weeks every goal has kept. That number only ever grows, so Pip never
// shrinks back — and growth can't be bought with sparks.

export type PipStage = 'sprout' | 'sapling' | 'bud' | 'bloom'

const STAGES: { stage: PipStage; from: number; name: string }[] = [
  { stage: 'sprout', from: 0, name: 'Sprout' },
  { stage: 'sapling', from: 4, name: 'Sapling' },
  { stage: 'bud', from: 12, name: 'Budding' },
  { stage: 'bloom', from: 26, name: 'In bloom' },
]

export function pipGrowth(weeksKept: number): { stage: PipStage; name: string; next: { name: string; at: number } | null } {
  let i = 0
  while (i + 1 < STAGES.length && weeksKept >= STAGES[i + 1].from) i++
  const next = STAGES[i + 1]
  return { stage: STAGES[i].stage, name: STAGES[i].name, next: next ? { name: next.name, at: next.from } : null }
}
