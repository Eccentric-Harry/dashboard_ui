// Wishlist store. Holds the raw wishes; the route splits open / closed and does the card maths
// (lib/wishlist.ts) in render. Mutations run through wishlistService in the route's hook, which
// swaps the server's answer in with `applyWish`.

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import {
  requestAndSet,
  createSelectors,
  emptyRemoteStateWithArray,
  type RemoteDataStatus,
} from './zustand-utils';
import { wishlistService } from '../services/wishlist-service';
import type { WishlistItem } from '../types/wishlist';

interface WishlistState {
  wishes: RemoteDataStatus<WishlistItem[]>;
}

interface WishlistActions {
  actions: {
    loadWishes: () => Promise<void>;
    /** Silent re-sync (no skeleton). Keeps prior data on error. */
    reloadWishes: () => Promise<void>;
    /** Insert or replace one wish by id (the server's answer to a mutation). */
    applyWish: (wish: WishlistItem) => void;
    removeWish: (id: string) => void;
  };
}

type WishlistStore = WishlistState & WishlistActions;

const useWishlistStoreBase = create<WishlistStore>()(
  devtools(
    immer((set) => ({
      wishes: emptyRemoteStateWithArray<WishlistItem>(),
      actions: {
        loadWishes: async () => {
          await requestAndSet<WishlistStore, 'wishes'>('wishes', wishlistService.getWishlist, set);
        },
        reloadWishes: async () => {
          const res = await wishlistService.getWishlist();
          if (res.error) return;
          set((state) => {
            state.wishes.data = res.data ?? [];
            state.wishes.loaded = true;
          });
        },
        applyWish: (wish) =>
          set((state) => {
            const index = state.wishes.data.findIndex((w) => w.id === wish.id);
            if (index >= 0) state.wishes.data[index] = wish;
            else state.wishes.data.unshift(wish);
          }),
        removeWish: (id) =>
          set((state) => {
            state.wishes.data = state.wishes.data.filter((w) => w.id !== id);
          }),
      },
    })),
    { name: 'WishlistStore' },
  ),
);

export const useWishlistStore = createSelectors(useWishlistStoreBase);

/** Stable module-level handle — safe to call without listing as a dependency. */
export const wishlistActions = useWishlistStoreBase.getState().actions;
