// Learnings store. The dashboard consumes the date-keyed `summary` slice; child
// cards (log, category, study queue) still fetch via lib/api until they migrate.

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import {
  requestAndSet,
  createSelectors,
  remoteStateWith,
  type RemoteDataStatus,
} from './zustand-utils';
import { learningsService } from '../services/learnings-service';
import type { LearningsSummary } from '../types/learnings';

interface LearningsState {
  summary: RemoteDataStatus<LearningsSummary | null>;
}

interface LearningsActions {
  actions: {
    loadSummary: (date?: string) => Promise<void>;
  };
}

type LearningsStore = LearningsState & LearningsActions;

const initialState: LearningsState = {
  summary: remoteStateWith<LearningsSummary | null>(null),
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
      },
    })),
    { name: 'LearningsStore' },
  ),
);

export const useLearningsStore = createSelectors(useLearningsStoreBase);
