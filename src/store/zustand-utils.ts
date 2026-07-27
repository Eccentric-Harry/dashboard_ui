// Standardized async-lifecycle plumbing shared by every store:
//   RemoteDataState  → uniform { loading, loaded, error, ... } per resource
//   requestAndSet    → PENDING → SUCCESS/ERROR transitions, zero boilerplate
//   createSelectors  → atomic `useStore.use.<slice>()` hooks (no re-render cascade)

import type { StoreApi, UseBoundStore } from 'zustand';
import type { SafeResult } from '../types/api';

export const statusEnum = {
  PENDING: 'PENDING',
  SUCCESS: 'SUCCESS',
  ERROR: 'ERROR',
} as const;
export type Status = (typeof statusEnum)[keyof typeof statusEnum];

export interface RemoteDataState {
  loading: boolean;
  loaded: boolean;
  hasErrors: boolean;
  updating: boolean;
  updated: boolean;
  status: Status | undefined;
  error: unknown;
}
export type RemoteDataStatus<T> = RemoteDataState & { data: T };

export const emptyRemoteState: RemoteDataState = {
  loading: false,
  loaded: false,
  hasErrors: false,
  updating: false,
  updated: false,
  status: undefined,
  error: undefined,
};

export const remoteStateWith = <T>(data: T): RemoteDataStatus<T> => ({
  ...emptyRemoteState,
  data,
});
export const emptyRemoteStateWithArray = <T>(): RemoteDataStatus<T[]> => remoteStateWith<T[]>([]);

/**
 * Drives the full async lifecycle for one store property. `fetchFunction` must
 * return a SafeResult (i.e. an `instance.safeCall<T>()`), so nothing ever throws
 * and every transition is uniform. Prior data is preserved on error.
 */
export const requestAndSet = async <S, K extends keyof S>(
  property: K,
  fetchFunction: () => Promise<SafeResult<unknown>>,
  set: (recipe: (state: S) => void) => void,
  options: { skip?: boolean; update?: boolean } = {},
): Promise<SafeResult<unknown> | undefined> => {
  if (options.skip) return undefined;

  set((state) => {
    const slot = state[property] as RemoteDataStatus<unknown>;
    slot.status = statusEnum.PENDING;
    slot.loading = true;
    slot.loaded = false;
    slot.updating = !!options.update;
    slot.updated = false;
    slot.error = undefined;
    slot.hasErrors = false;
  });

  const response = await fetchFunction();
  const hasError = !!response.error;

  set((state) => {
    const slot = state[property] as RemoteDataStatus<unknown>;
    if (!hasError) slot.data = response.data;
    slot.error = response.error;
    slot.hasErrors = hasError;
    slot.status = hasError ? statusEnum.ERROR : statusEnum.SUCCESS;
    slot.loading = false;
    slot.loaded = !hasError;
    slot.updating = false;
    slot.updated = !!options.update && !hasError;
  });

  return response;
};

// ── Atomic selector generator: prevents whole-store re-render cascades ──
type WithSelectors<S> = S extends { getState: () => infer T }
  ? S & { use: { [K in keyof T]: () => T[K] } }
  : never;

export const createSelectors = <S extends UseBoundStore<StoreApi<object>>>(_store: S) => {
  const store = _store as WithSelectors<S>;
  store.use = {} as WithSelectors<S>['use'];
  for (const k of Object.keys(store.getState())) {
    (store.use as Record<string, () => unknown>)[k] = () =>
      store((s) => s[k as keyof typeof s]);
  }
  return store;
};
