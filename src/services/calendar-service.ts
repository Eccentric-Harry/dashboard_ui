// Strictly-typed Calendar + Google-sync service — one-liners over safeCall<T>().
import { instance } from './http/api-request';
import type { SafeResult } from '../types/api';
import type { CalendarItem, CalendarItemPayload, GoogleSyncStatus } from '../types/calendar';
import * as E from './endpoints/calendar-endpoints';

type GoogleActionResult = { status: string };
type GooglePushResult = { status: string; totalPushed: number; byAccount: Record<string, number> };

export interface CalendarServiceInterface {
  getItemsForRange(startDate: string, endDate: string): Promise<SafeResult<CalendarItem[]>>;
  createItem(payload: CalendarItemPayload): Promise<SafeResult<CalendarItem>>;
  updateItem(id: string, payload: CalendarItemPayload): Promise<SafeResult<CalendarItem>>;
  toggleItem(id: string, date?: string): Promise<SafeResult<CalendarItem>>;
  toggleCancelItem(id: string, date?: string): Promise<SafeResult<CalendarItem>>;
  deleteItem(id: string, date?: string): Promise<SafeResult<unknown>>;
  getGoogleStatus(): Promise<SafeResult<GoogleSyncStatus>>;
  getGoogleAuthUrl(): Promise<SafeResult<{ url: string }>>;
  disconnectGoogle(email?: string): Promise<SafeResult<GoogleActionResult>>;
  syncGoogle(email?: string): Promise<SafeResult<GoogleActionResult>>;
  pushLocalToGoogle(email?: string): Promise<SafeResult<GooglePushResult>>;
}

export const calendarService: CalendarServiceInterface = {
  getItemsForRange: (startDate, endDate) =>
    instance.safeCall<CalendarItem[]>(E.API_GET_CALENDAR_RANGE, { query: { startDate, endDate } }),
  createItem: (payload) => instance.safeCall<CalendarItem>(E.API_CREATE_CALENDAR_ITEM, { body: payload }),
  updateItem: (id, payload) =>
    instance.safeCall<CalendarItem>(E.API_UPDATE_CALENDAR_ITEM, { params: { id }, body: payload }),
  toggleItem: (id, date) =>
    instance.safeCall<CalendarItem>(E.API_TOGGLE_CALENDAR_ITEM, { params: { id }, query: { date } }),
  toggleCancelItem: (id, date) =>
    instance.safeCall<CalendarItem>(E.API_TOGGLE_CANCEL_CALENDAR_ITEM, { params: { id }, query: { date } }),
  deleteItem: (id, date) => instance.safeCall(E.API_DELETE_CALENDAR_ITEM, { params: { id }, query: { date } }),
  getGoogleStatus: () => instance.safeCall<GoogleSyncStatus>(E.API_GET_GOOGLE_STATUS),
  getGoogleAuthUrl: () => instance.safeCall<{ url: string }>(E.API_GET_GOOGLE_AUTH_URL),
  disconnectGoogle: (email) => instance.safeCall<GoogleActionResult>(E.API_DISCONNECT_GOOGLE, { query: { email } }),
  syncGoogle: (email) => instance.safeCall<GoogleActionResult>(E.API_SYNC_GOOGLE, { query: { email } }),
  pushLocalToGoogle: (email) => instance.safeCall<GooglePushResult>(E.API_PUSH_LOCAL_GOOGLE, { query: { email } }),
};
