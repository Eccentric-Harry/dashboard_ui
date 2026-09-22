// Celebration store — the one way any route or component marks a moment worth
// celebrating. `celebrationActions.celebrate({...})` from anywhere; the layer mounted
// once in App.tsx (components/ui/celebration-layer.tsx) plays it.
//
// The rules every caller inherits (design/GAMIFICATION_MASTER_PROMPT.md):
//   · never interrupts — no modal, no focus steal, pointer-events stay off;
//   · haptics yes, sound no;
//   · reduced motion drops every particle; a labelled moment is still announced to
//     screen readers, so nobody loses the news;
//   · `once` gives a goal one full moment per scope; later calls get a quieter echo
//     by default (a caller that wants the fanfare every time passes repeat: 'full').
//
// A full moment is one burst from the anchor (a light shower from the top without
// one). There is deliberately no popup or card — the confetti is the whole moment. An echo is a small burst from the anchor alone.
//
// State holds plain data only: the anchor element is measured at call time and never
// stored, so the devtools snapshot stays serialisable.

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { createSelectors } from './zustand-utils';
import { hasCelebrated, markCelebrated } from '../lib/celebration/ledger';
import { resolvePalette, type CelebrationPaletteName } from '../lib/celebration/palettes';

export type CelebrationIntensity = 'full' | 'echo';
/** What a repeat gets once a goal has had its full moment in the current scope. */
export type CelebrationRepeat = 'echo' | 'full' | 'skip';
export type CelebrationOutcome = CelebrationIntensity | 'skipped';

export interface CelebrateOptions {
  /** The achievement's element: the opening burst (and a glow) launch from it. Without
   *  one, or when it is off screen, the moment is screen-wide only. */
  anchor?: Element | null;
  palette?: CelebrationPaletteName | readonly string[];
  /** What was achieved, e.g. "Water goal met". Never shown — announced to screen
   *  readers (full moments only), so the confetti isn't the only signal. */
  label?: string;
  /** Appended to the announcement, e.g. "3.0L of 3.0L". */
  detail?: string;
  intensity?: CelebrationIntensity;
  /** One full moment per (key, scope) — `key` is shared by every surface celebrating the
   *  same goal, so a goal met on Home is only echoed on Nutrition. */
  once?: { key: string; scope: string; repeat?: CelebrationRepeat };
}

export interface CelebrationRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface CelebrationMoment {
  id: number;
  intensity: CelebrationIntensity;
  /** Anchor box in viewport px (getBoundingClientRect space); null → shower from the top. */
  anchor: CelebrationRect | null;
  colors: string[];
  accent: string;
  /** Screen-reader announcement; null for echoes and unlabelled moments. */
  announce: string | null;
  /** performance.now() time to play at — moments arriving together are spaced into a rhythm. */
  startAt: number;
  reducedMotion: boolean;
}

interface CelebrationState {
  moments: CelebrationMoment[];
}

interface CelebrationActions {
  actions: {
    celebrate: (options?: CelebrateOptions) => CelebrationOutcome;
    dismiss: (id: number) => void;
  };
}

type CelebrationStore = CelebrationState & CelebrationActions;

/** Moments that land together (two goals met on arrival) play this far apart — two
 *  distinct beats rather than one merged storm. */
const SEQUENCE_GAP_MS = 650;

let nextId = 1;
let lastStartAt = 0;

export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The anchor's box, or null when there is nothing on screen to launch from. */
function measureAnchor(anchor: Element | null | undefined): CelebrationRect | null {
  if (!anchor) return null;
  const r = anchor.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return null;
  const onScreen = r.bottom > 0 && r.right > 0 && r.top < window.innerHeight && r.left < window.innerWidth;
  return onScreen ? { left: r.left, top: r.top, width: r.width, height: r.height } : null;
}

const useCelebrationStoreBase = create<CelebrationStore>()(
  devtools(
    immer((set) => ({
      moments: [],
      actions: {
        celebrate: (options = {}) => {
          let intensity: CelebrationIntensity = options.intensity ?? 'full';
          if (options.once) {
            const { key, scope, repeat = 'echo' } = options.once;
            if (hasCelebrated(key, scope)) {
              if (repeat === 'skip') return 'skipped';
              if (repeat === 'echo') intensity = 'echo';
            } else {
              markCelebrated(key, scope);
            }
          }

          const reducedMotion = prefersReducedMotion();
          const announce =
            intensity === 'full' && options.label
              ? options.detail
                ? `${options.label}, ${options.detail}`
                : options.label
              : null;
          // Under reduced motion only the announcement is left to deliver.
          if (reducedMotion && !announce) return intensity;

          const { colors, accent } = resolvePalette(
            options.palette ?? 'confetti',
            options.anchor ?? document.documentElement,
          );
          const now = performance.now();
          const startAt = Math.max(now, lastStartAt + SEQUENCE_GAP_MS);
          lastStartAt = startAt;

          const moment: CelebrationMoment = {
            id: nextId++,
            intensity,
            anchor: measureAnchor(options.anchor),
            colors,
            accent,
            announce,
            startAt,
            reducedMotion,
          };
          set((s) => {
            s.moments.push(moment);
          });
          return intensity;
        },
        dismiss: (id) =>
          set((s) => {
            s.moments = s.moments.filter((m) => m.id !== id);
          }),
      },
    })),
    { name: 'CelebrationStore' },
  ),
);

export const useCelebrationStore = createSelectors(useCelebrationStoreBase);

/** Stable module-level handle — safe to call from anywhere without a dependency listing. */
export const celebrationActions = useCelebrationStoreBase.getState().actions;
