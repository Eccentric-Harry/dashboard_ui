// Strictly-typed Focus-session service — one-liners over instance.safeCall<T>().
import { instance } from './http/api-request';
import type { SafeResult } from '../types/api';
import type { FocusSession, FocusDaySummary } from '../lib/api';
import type { FocusLogPayload, FocusSuggestion } from '../types/focus';
import * as E from './endpoints/focus-endpoints';

export interface FocusServiceInterface {
  getCurrentSession(): Promise<SafeResult<FocusSession | null>>;
  startSession(activePursuit: string, durationMinutes: number): Promise<SafeResult<FocusSession>>;
  pauseSession(): Promise<SafeResult<FocusSession>>;
  resumeSession(): Promise<SafeResult<FocusSession>>;
  cancelSession(): Promise<SafeResult<unknown>>;
  completeSession(): Promise<SafeResult<FocusSession>>;
  getHistory(startDate: string, endDate: string): Promise<SafeResult<FocusDaySummary[]>>;
  logPastFocus(payload: FocusLogPayload): Promise<SafeResult<FocusSession>>;
  deleteSession(id: string): Promise<SafeResult<unknown>>;
  getCalendarSuggestions(startDate: string, endDate: string): Promise<SafeResult<FocusSuggestion[]>>;
  importFromCalendar(
    occurrenceIds: string[],
    startDate: string,
    endDate: string,
  ): Promise<SafeResult<FocusSession[]>>;
}

export const focusService: FocusServiceInterface = {
  getCurrentSession: () => instance.safeCall<FocusSession | null>(E.API_GET_CURRENT_SESSION),
  startSession: (activePursuit, durationMinutes) =>
    instance.safeCall<FocusSession>(E.API_START_SESSION, { body: { activePursuit, durationMinutes } }),
  pauseSession: () => instance.safeCall<FocusSession>(E.API_PAUSE_SESSION),
  resumeSession: () => instance.safeCall<FocusSession>(E.API_RESUME_SESSION),
  cancelSession: () => instance.safeCall(E.API_CANCEL_SESSION),
  completeSession: () => instance.safeCall<FocusSession>(E.API_COMPLETE_SESSION),
  getHistory: (startDate, endDate) =>
    instance.safeCall<FocusDaySummary[]>(E.API_GET_FOCUS_HISTORY, { query: { startDate, endDate } }),
  logPastFocus: (payload) => instance.safeCall<FocusSession>(E.API_LOG_PAST_FOCUS, { body: payload }),
  deleteSession: (id) => instance.safeCall(E.API_DELETE_FOCUS_SESSION, { params: { id } }),
  getCalendarSuggestions: (startDate, endDate) =>
    instance.safeCall<FocusSuggestion[]>(E.API_GET_FOCUS_CALENDAR_SUGGESTIONS, {
      query: { startDate, endDate },
    }),
  importFromCalendar: (occurrenceIds, startDate, endDate) =>
    instance.safeCall<FocusSession[]>(E.API_IMPORT_FOCUS_FROM_CALENDAR, {
      body: { occurrenceIds, startDate, endDate },
    }),
};
