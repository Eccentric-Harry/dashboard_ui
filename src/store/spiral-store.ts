// Spiral Breaker store — open/close state for the global overlay.
//
// Lives outside the mind view on purpose: a spiral rarely starts while you happen to
// be looking at /mind. Keeping the state here lets the trigger sit in the side rail and
// the overlay mount once at the app root, so it is one tap away from any route.

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { createSelectors } from './zustand-utils';

interface SpiralState {
  open: boolean;
}

interface SpiralActions {
  actions: {
    open: () => void;
    close: () => void;
  };
}

type SpiralStore = SpiralState & SpiralActions;

const useSpiralStoreBase = create<SpiralStore>()(
  devtools(
    immer((set) => ({
      open: false,
      actions: {
        open: () =>
          set((s) => {
            s.open = true;
          }),
        close: () =>
          set((s) => {
            s.open = false;
          }),
      },
    })),
    { name: 'SpiralStore' },
  ),
);

export const useSpiralStore = createSelectors(useSpiralStoreBase);

/** Stable module-level handle — safe to call from anywhere without a dependency listing. */
export const spiralActions = useSpiralStoreBase.getState().actions;
