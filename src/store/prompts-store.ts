// Prompts store — single read slice consumed by prompts-view. Mutations stay in
// the view (lib/api) and call loadPrompts() to re-sync.

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import {
  requestAndSet,
  createSelectors,
  emptyRemoteStateWithArray,
  type RemoteDataStatus,
} from './zustand-utils';
import { promptsService } from '../services/prompts-service';
import type { Prompt } from '../types/prompts';

interface PromptsState {
  prompts: RemoteDataStatus<Prompt[]>;
}

interface PromptsActions {
  actions: {
    loadPrompts: () => Promise<import('../types/api').SafeResult<unknown> | undefined>;
  };
}

type PromptsStore = PromptsState & PromptsActions;

const initialState: PromptsState = {
  prompts: emptyRemoteStateWithArray<Prompt>(),
};

const usePromptsStoreBase = create<PromptsStore>()(
  devtools(
    immer((set) => ({
      ...initialState,
      actions: {
        loadPrompts: () =>
          requestAndSet<PromptsStore, 'prompts'>('prompts', promptsService.getPrompts, set),
      },
    })),
    { name: 'PromptsStore' },
  ),
);

export const usePromptsStore = createSelectors(usePromptsStoreBase);
