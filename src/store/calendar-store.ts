// Calendar store. `loadItems` keeps the monotonic seq guard (rapid date changes
// must not leave stale data) and returns the SafeResult so the view can toast on
// error. Optimistic edits use `applyItems`; `upcoming` is a plain slice the view
// computes and sets. Mutations stay in the component (lib/api) for now.

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import {
  requestAndSet,
  createSelectors,
  emptyRemoteStateWithArray,
  remoteStateWith,
  statusEnum,
  type RemoteDataStatus,
} from './zustand-utils';
import { calendarService } from '../services/calendar-service';
import type { SafeResult } from '../types/api';
import type { CalendarItem, GoogleSyncStatus } from '../types/calendar';

interface CalendarState {
  items: RemoteDataStatus<CalendarItem[]>;
  upcoming: CalendarItem[];
  googleStatus: RemoteDataStatus<GoogleSyncStatus | null>;
}

interface CalendarActions {
  actions: {
    loadItems: (start: string, end: string) => Promise<SafeResult<CalendarItem[]>>;
    applyItems: (updater: (prev: CalendarItem[]) => CalendarItem[]) => void;
    setUpcoming: (items: CalendarItem[]) => void;
    loadGoogleStatus: () => Promise<void>;
  };
}

type CalendarStore = CalendarState & CalendarActions;

const initialState: CalendarState = {
  items: emptyRemoteStateWithArray<CalendarItem>(),
  upcoming: [],
  googleStatus: remoteStateWith<GoogleSyncStatus | null>(null),
};

let itemsSeq = 0;

const useCalendarStoreBase = create<CalendarStore>()(
  devtools(
    immer((set) => ({
      ...initialState,
      actions: {
        loadItems: async (start, end) => {
          const seq = ++itemsSeq;
          set((s) => {
            s.items.loading = true;
            s.items.status = statusEnum.PENDING;
            s.items.error = undefined;
            s.items.hasErrors = false;
          });
          const res = await calendarService.getItemsForRange(start, end);
          if (seq !== itemsSeq) return res; // stale response, ignore
          set((s) => {
            if (!res.error) s.items.data = res.data ?? [];
            s.items.loading = false;
            s.items.loaded = !res.error;
            s.items.hasErrors = !!res.error;
            s.items.error = res.error;
            s.items.status = res.error ? statusEnum.ERROR : statusEnum.SUCCESS;
          });
          return res;
        },
        applyItems: (updater) =>
          set((s) => {
            s.items.data = updater(s.items.data);
          }),
        setUpcoming: (items) =>
          set((s) => {
            s.upcoming = items;
          }),
        loadGoogleStatus: async () => {
          await requestAndSet<CalendarStore, 'googleStatus'>(
            'googleStatus',
            calendarService.getGoogleStatus,
            set,
          );
        },
      },
    })),
    { name: 'CalendarStore' },
  ),
);

export const useCalendarStore = createSelectors(useCalendarStoreBase);
