// The camp's sky follows the real clock — the Animal Crossing touch.

export type SkyPhase = 'dawn' | 'day' | 'golden' | 'night'

const PHASES: readonly SkyPhase[] = ['dawn', 'day', 'golden', 'night']

export const GREETING: Record<SkyPhase, string> = {
  dawn: 'Good morning',
  day: 'Good day',
  golden: 'Good evening',
  night: 'Good night',
}

export function skyPhase(now: Date): SkyPhase {
  // Dev-only: `?sky=dawn|day|golden|night` pins the sky so every phase can be reviewed.
  if (import.meta.env.DEV) {
    const pinned = new URLSearchParams(window.location.search).get('sky') as SkyPhase | null
    if (pinned && PHASES.includes(pinned)) return pinned
  }
  const h = now.getHours() + now.getMinutes() / 60
  if (h >= 5 && h < 8) return 'dawn'
  if (h >= 8 && h < 17) return 'day'
  if (h >= 17 && h < 19.5) return 'golden'
  return 'night'
}
