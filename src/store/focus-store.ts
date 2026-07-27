// Focus store — replaces FocusContext. Session/ticking state is global (there is
// only ever one active focus session), so it lives here as plain Zustand state
// rather than per-component state. The 200ms tick previously lived in a
// useEffect; it's now driven from actions via a module-level interval handle,
// so it keeps running regardless of which component is mounted.

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { createSelectors } from './zustand-utils';
import type { FocusSession } from '../lib/api';
import { focusService } from '../services/focus-service';

interface FocusState {
  session: FocusSession | null;
  remainingSeconds: number;
  isFetching: boolean;
  isFocusMode: boolean;
}

interface FocusActions {
  actions: {
    setFocusMode: (open: boolean) => void;
    start: (pursuit: string, duration: number) => Promise<void>;
    pause: () => Promise<void>;
    resume: () => Promise<void>;
    cancel: () => Promise<void>;
    refresh: () => Promise<void>;
  };
}

type FocusStore = FocusState & FocusActions;

function calcRemaining(session: FocusSession): number {
  if (session.status === 'RUNNING' && session.endTime) {
    return Math.max(0, new Date(session.endTime).getTime() - Date.now());
  }
  if (session.status === 'PAUSED' && session.remainingSecondsOnPause != null) {
    return session.remainingSecondsOnPause * 1000;
  }
  return 0;
}

let tickInterval: ReturnType<typeof setInterval> | undefined;

const useFocusStoreBase = create<FocusStore>()(
  devtools(
    immer((set) => {
      const stopTicking = () => {
        if (tickInterval) {
          clearInterval(tickInterval);
          tickInterval = undefined;
        }
      };

      const completeAndSync = () => {
        stopTicking();
        void focusService.completeSession().then((res) => {
          if (res.error) return;
          set((s) => {
            if (s.session) {
              s.session.status = 'COMPLETED';
              s.session.endTime = undefined;
            }
          });
        });
      };

      // Starts/stops the 200ms tick for a RUNNING session, or sets a static
      // remaining value for PAUSED/otherwise. Call after every state change
      // that can affect session.status/endTime.
      const manageTicking = (session: FocusSession | null) => {
        stopTicking();
        if (!session) {
          set((s) => { s.remainingSeconds = 0; });
          return;
        }
        if (session.status === 'RUNNING' && session.endTime) {
          const initial = calcRemaining(session);
          set((s) => { s.remainingSeconds = initial; });
          if (initial <= 0) {
            completeAndSync();
            return;
          }
          const end = new Date(session.endTime).getTime();
          tickInterval = setInterval(() => {
            const remaining = Math.max(0, end - Date.now());
            set((s) => { s.remainingSeconds = remaining; });
            if (remaining <= 0) completeAndSync();
          }, 200);
          return;
        }
        if (session.status === 'PAUSED') {
          set((s) => { s.remainingSeconds = calcRemaining(session); });
          return;
        }
        set((s) => { s.remainingSeconds = 0; });
      };

      return {
        session: null,
        remainingSeconds: 0,
        isFetching: true,
        isFocusMode: false,
        actions: {
          setFocusMode: (open) => set((s) => { s.isFocusMode = open; }),
          refresh: async () => {
            set((s) => { s.isFetching = true; });
            const res = await focusService.getCurrentSession();
            if (!res.error) {
              set((s) => { s.session = res.data ?? null; });
              manageTicking(res.data ?? null);
            } else {
              set((s) => { s.session = null; });
              manageTicking(null);
            }
            set((s) => { s.isFetching = false; });
          },
          start: async (pursuit, duration) => {
            const res = await focusService.startSession(pursuit, duration);
            if (res.error || !res.data) return;
            set((s) => {
              s.session = res.data ?? null;
              s.remainingSeconds = duration * 60 * 1000;
            });
            manageTicking(res.data);
          },
          pause: async () => {
            const res = await focusService.pauseSession();
            if (res.error || !res.data) return;
            set((s) => { s.session = res.data ?? null; });
            manageTicking(res.data);
          },
          resume: async () => {
            const res = await focusService.resumeSession();
            if (res.error || !res.data) return;
            set((s) => { s.session = res.data ?? null; });
            manageTicking(res.data);
          },
          cancel: async () => {
            await focusService.cancelSession();
            set((s) => {
              s.session = null;
              s.remainingSeconds = 0;
            });
            stopTicking();
          },
        },
      };
    }),
    { name: 'FocusStore' },
  ),
);

export const useFocusStore = createSelectors(useFocusStoreBase);

/** Stable module-level handle — safe to call without listing as a dependency. */
export const focusActions = useFocusStoreBase.getState().actions;
