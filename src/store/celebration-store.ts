// Celebration store — the one way any route or component marks a moment worth
// celebrating. `celebrationActions.celebrate({...})` from anywhere; the layer mounted
// once in App.tsx (components/ui/celebration-layer.tsx) plays it.
//
// The rules every caller inherits (design/GAMIFICATION_MASTER_PROMPT.md):
//   · never interrupts — no modal, no focus steal, pointer-events stay off;
//   · haptics yes, sound no;
//   · reduced motion drops every particle; a labelled moment still shows its caption
//     (opacity only) and is announced to screen readers, so nobody loses the news;
//   · `once` gives a goal one full moment per scope; later calls get a quieter echo
//     by default (a caller that wants the fanfare every time passes repeat: 'full').
//
// A full moment is full-screen: a burst from the anchor, cannons from both bottom
// corners and a shower from the top. An echo is a small burst from the anchor alone.
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
export type CelebrationIcon = 'check' | 'droplet' | 'sparkles' | 'trophy' | 'flame';
export type CaptionPlacement = 'above' | 'below';

export interface CelebrateOptions {
  /** The achievement's element: the burst launches from it and the caption sits beside
   *  it. Without one (or when it is off screen) the moment is screen-wide only and the
   *  caption sits at the top. */
  anchor?: Element | null;
  palette?: CelebrationPaletteName | readonly string[];
  /** Short caption, e.g. "Water goal met". Full moments only; also announced to screen readers. */
  label?: string;
  /** Secondary caption text, e.g. "3.2L". */
  detail?: string;
  icon?: CelebrationIcon;
  /** Caption side relative to the anchor; flips automatically when there is no room. */
  placement?: CaptionPlacement;
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
  caption: { label: string; detail?: string; icon: CelebrationIcon; placement: CaptionPlacement } | null;
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
          const caption =
            intensity === 'full' && options.label
              ? {
                  label: options.label,
                  detail: options.detail,
                  icon: options.icon ?? 'check',
                  placement: options.placement ?? 'above',
                }
              : null;
          // Under reduced motion an unlabelled moment has nothing left to show.
          if (reducedMotion && !caption) return intensity;

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
            caption,
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
