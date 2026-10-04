// A goal's showcase photos minus any that failed to load this session. Photos are
// hotlinked from the product's page, so one can vanish when the page changes; it just
// drops out of the stage, the filmstrip and the viewer instead of showing a broken frame.

import { useCallback, useMemo, useState } from 'react'
import type { GoalPhoto } from '@/types/finance'

export function useLivePhotos(photos: GoalPhoto[]) {
  const [broken, setBroken] = useState<ReadonlySet<string>>(() => new Set())
  const live = useMemo(() => photos.filter((p) => !broken.has(p.url)), [photos, broken])
  const markBroken = useCallback((url: string) => setBroken((prev) => new Set(prev).add(url)), [])
  return { live, markBroken }
}
