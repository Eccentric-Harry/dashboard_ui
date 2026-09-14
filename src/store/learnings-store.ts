// Learnings store. `summary` is date-keyed (the route's selected day); `learnings`
// and `pursuits` are the full lists shared by the journal, category breakdown and
// study queue, so each is fetched once rather than once per card.

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import {
  requestAndSet,
  createSelectors,
  emptyRemoteStateWithArray,
  remoteStateWith,
  type RemoteDataStatus,
} from './zustand-utils';
import { learningsService } from '../services/learnings-service';
import type { LearningLog, LearningPursuit, LearningsSummary } from '../types/learnings';

interface LearningsState {
  summary: RemoteDataStatus<LearningsSummary | null>;
  learnings: RemoteDataStatus<LearningLog[]>;
  pursuits: RemoteDataStatus<LearningPursuit[]>;
}

interface LearningsActions {
  actions: {
    loadSummary: (date?: string) => Promise<void>;
    loadLearnings: () => Promise<void>;
    loadPursuits: () => Promise<void>;
    /** Optimistic in-place edit of the pursuit list; re-sync with loadPursuits on failure. */
    applyPursuits: (updater: (prev: LearningPursuit[]) => LearningPursuit[]) => void;
  };
}

type LearningsStore = LearningsState & LearningsActions;

const initialState: LearningsState = {
  summary: remoteStateWith<LearningsSummary | null>(null),
  learnings: emptyRemoteStateWithArray<LearningLog>(),
  pursuits: emptyRemoteStateWithArray<LearningPursuit>(),
};

const useLearningsStoreBase = create<LearningsStore>()(
  devtools(
    immer((set) => ({
      ...initialState,
      actions: {
        loadSummary: async (date) => {
          await requestAndSet<LearningsStore, 'summary'>(
            'summary',
            () => learningsService.getSummary(date),
            set,
          );
        },
        loadLearnings: async () => {
          await requestAndSet<LearningsStore, 'learnings'>('learnings', () => learningsService.getLearnings(), set);
        },
        loadPursuits: async () => {
          await requestAndSet<LearningsStore, 'pursuits'>('pursuits', learningsService.getPursuits, set);
        },
        applyPursuits: (updater) =>
          set((state) => {
            state.pursuits.data = updater(state.pursuits.data);
          }),
      },
    })),
    { name: 'LearningsStore' },
  ),
);

export const useLearningsStore = createSelectors(useLearningsStoreBase);

/** Stable module-level handle — safe to call without listing as a dependency. */
export const learningsActions = useLearningsStoreBase.getState().actions;
