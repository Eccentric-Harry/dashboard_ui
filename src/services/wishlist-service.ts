// Strictly-typed Wishlist service — one-liners over instance.safeCall<T>().
import { instance } from './http/api-request';
import type { SafeResult } from '../types/api';
import type { LinkPreview, WishlistBuyPayload, WishlistItem, WishlistPayload } from '../types/wishlist';
import * as E from './endpoints/wishlist-endpoints';

/** Reading a product page can take a few seconds; the server gives up at 10s. */
const PREVIEW_TIMEOUT_MS = 15_000;
/** "Save up for it" also fetches the photo for the new goal. */
const SAVE_FOR_TIMEOUT_MS = 20_000;

export interface WishlistServiceInterface {
  getWishlist(): Promise<SafeResult<WishlistItem[]>>;
  /** Reads a link to prefill the form; stores nothing. */
  previewLink(url: string): Promise<SafeResult<LinkPreview>>;
  createWish(payload: WishlistPayload): Promise<SafeResult<WishlistItem>>;
  updateWish(id: string, payload: WishlistPayload): Promise<SafeResult<WishlistItem>>;
  /** Re-reads the product page for a fresh price. */
  refreshWish(id: string): Promise<SafeResult<WishlistItem>>;
  /** Logs the purchase in Finance (through the savings goal when there is one). */
  buyWish(id: string, payload: WishlistBuyPayload): Promise<SafeResult<WishlistItem>>;
  /** Creates a "Saving for" goal on /finance from the wish. */
  saveForWish(id: string): Promise<SafeResult<WishlistItem>>;
  letGoWish(id: string): Promise<SafeResult<WishlistItem>>;
  reopenWish(id: string): Promise<SafeResult<WishlistItem>>;
  deleteWish(id: string): Promise<SafeResult<unknown>>;
}

export const wishlistService: WishlistServiceInterface = {
  getWishlist: () => instance.safeCall<WishlistItem[]>(E.API_GET_WISHLIST),
  previewLink: (url) =>
    instance.safeCall<LinkPreview>(E.API_PREVIEW_WISH_LINK, { body: { url }, timeoutMs: PREVIEW_TIMEOUT_MS }),
  createWish: (payload) => instance.safeCall<WishlistItem>(E.API_CREATE_WISH, { body: payload }),
  updateWish: (id, payload) => instance.safeCall<WishlistItem>(E.API_UPDATE_WISH, { params: { id }, body: payload }),
  refreshWish: (id) =>
    instance.safeCall<WishlistItem>(E.API_REFRESH_WISH, { params: { id }, timeoutMs: PREVIEW_TIMEOUT_MS }),
  buyWish: (id, payload) => instance.safeCall<WishlistItem>(E.API_BUY_WISH, { params: { id }, body: payload }),
  saveForWish: (id) =>
    instance.safeCall<WishlistItem>(E.API_SAVE_FOR_WISH, { params: { id }, timeoutMs: SAVE_FOR_TIMEOUT_MS }),
  letGoWish: (id) => instance.safeCall<WishlistItem>(E.API_LET_GO_WISH, { params: { id } }),
  reopenWish: (id) => instance.safeCall<WishlistItem>(E.API_REOPEN_WISH, { params: { id } }),
  deleteWish: (id) => instance.safeCall(E.API_DELETE_WISH, { params: { id } }),
};
