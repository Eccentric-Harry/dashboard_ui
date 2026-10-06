// Grocery store. Holds the raw list and "Buy again"; the route groups it by category in a memo. Optimistic UI
// (add / check / edit / remove) goes through `applyItems`; the network mutations run through
// shoppingService in the route's hook, which then reconciles with the server's answer.

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import {
  requestAndSet,
  createSelectors,
  emptyRemoteStateWithArray,
  type RemoteDataStatus,
} from './zustand-utils';
import { shoppingService } from '../services/shopping-service';
import type { ShoppingItem, ShoppingSuggestion } from '../types/shopping';

interface ShoppingState {
  items: RemoteDataStatus<ShoppingItem[]>;
  /** "Buy again" — remembered items not on the list. */
  suggestions: RemoteDataStatus<ShoppingSuggestion[]>;
}

interface ShoppingActions {
  actions: {
    /** Initial / explicit load with the loading flag. */
    loadItems: () => Promise<void>;
    /** Silent re-sync (no skeleton). Keeps prior data on error. */
    reloadItems: () => Promise<void>;
    /** Optimistic in-place update of the list. */
    applyItems: (updater: (prev: ShoppingItem[]) => ShoppingItem[]) => void;
    /** Re-read "Buy again" (silently after the first load). */
    loadSuggestions: () => Promise<void>;
    applySuggestions: (updater: (prev: ShoppingSuggestion[]) => ShoppingSuggestion[]) => void;
  };
}

type ShoppingStore = ShoppingState & ShoppingActions;

const initialState: ShoppingState = {
  items: emptyRemoteStateWithArray<ShoppingItem>(),
  suggestions: emptyRemoteStateWithArray<ShoppingSuggestion>(),
};

const useShoppingStoreBase = create<ShoppingStore>()(
  devtools(
    immer((set) => ({
      ...initialState,
      actions: {
        loadItems: async () => {
          await requestAndSet<ShoppingStore, 'items'>('items', shoppingService.getItems, set);
        },
        reloadItems: async () => {
          const res = await shoppingService.getItems();
          if (!res.error) {
            set((state) => {
              state.items.data = res.data ?? [];
              state.items.loaded = true;
            });
          }
        },
        applyItems: (updater) =>
          set((state) => {
            state.items.data = updater(state.items.data);
          }),
        loadSuggestions: async () => {
          const res = await shoppingService.getSuggestions();
          if (res.error) return;
          set((state) => {
            state.suggestions.data = res.data ?? [];
            state.suggestions.loaded = true;
          });
        },
        applySuggestions: (updater) =>
          set((state) => {
            state.suggestions.data = updater(state.suggestions.data);
          }),
      },
    })),
    { name: 'ShoppingStore' },
  ),
);

export const useShoppingStore = createSelectors(useShoppingStoreBase);
