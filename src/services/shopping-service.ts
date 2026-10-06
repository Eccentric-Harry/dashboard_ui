// Strictly-typed Shopping service — one-liners over instance.safeCall<T>().
import { instance } from './http/api-request';
import type { SafeResult } from '../types/api';
import type {
  ShoppingCheckout,
  ShoppingCheckoutPayload,
  ShoppingItem,
  ShoppingItemPayload,
  ShoppingSuggestion,
} from '../types/shopping';
import * as E from './endpoints/shopping-endpoints';

export interface ShoppingServiceInterface {
  /** The whole list, already in aisle order. */
  getItems(): Promise<SafeResult<ShoppingItem[]>>;
  addItem(payload: ShoppingItemPayload): Promise<SafeResult<ShoppingItem>>;
  /** Several at once (≤ 50); one result per payload, in order. Also restores a cleared basket. */
  addItems(items: ShoppingItemPayload[]): Promise<SafeResult<ShoppingItem[]>>;
  updateItem(id: string, payload: ShoppingItemPayload): Promise<SafeResult<ShoppingItem>>;
  setChecked(id: string, checked: boolean): Promise<SafeResult<ShoppingItem>>;
  deleteItem(id: string): Promise<SafeResult<unknown>>;
  /** Empties the basket; resolves with what was removed so it can be undone. */
  clearChecked(): Promise<SafeResult<ShoppingItem[]>>;
  /** "Done shopping": empties the basket; with an amount, logs one Groceries expense in Finance. */
  checkout(payload: ShoppingCheckoutPayload): Promise<SafeResult<ShoppingCheckout>>;
  /** "Buy again": remembered items not on the list. */
  getSuggestions(): Promise<SafeResult<ShoppingSuggestion[]>>;
  forgetSuggestion(name: string): Promise<SafeResult<unknown>>;
}

export const shoppingService: ShoppingServiceInterface = {
  getItems: () => instance.safeCall<ShoppingItem[]>(E.API_GET_SHOPPING_ITEMS),
  addItem: (payload) => instance.safeCall<ShoppingItem>(E.API_ADD_SHOPPING_ITEM, { body: payload }),
  addItems: (items) => instance.safeCall<ShoppingItem[]>(E.API_ADD_SHOPPING_ITEMS, { body: { items } }),
  updateItem: (id, payload) =>
    instance.safeCall<ShoppingItem>(E.API_UPDATE_SHOPPING_ITEM, { params: { id }, body: payload }),
  setChecked: (id, checked) =>
    instance.safeCall<ShoppingItem>(E.API_CHECK_SHOPPING_ITEM, { params: { id }, body: { checked } }),
  deleteItem: (id) => instance.safeCall(E.API_DELETE_SHOPPING_ITEM, { params: { id } }),
  clearChecked: () => instance.safeCall<ShoppingItem[]>(E.API_CLEAR_CHECKED_SHOPPING_ITEMS),
  checkout: (payload) => instance.safeCall<ShoppingCheckout>(E.API_CHECKOUT_SHOPPING, { body: payload }),
  getSuggestions: () => instance.safeCall<ShoppingSuggestion[]>(E.API_GET_SHOPPING_SUGGESTIONS),
  forgetSuggestion: (name) => instance.safeCall(E.API_FORGET_SHOPPING_SUGGESTION, { body: { name } }),
};
