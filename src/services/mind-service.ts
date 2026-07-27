// Strictly-typed Mind service — one-liners over instance.safeCall<T>().
import { instance } from './http/api-request';
import type { SafeResult } from '../types/api';
import type {
  MindEntry,
  MindSummary,
  MindEntryPayload,
  MindStatusPayload,
  MindEntryType,
  MindEntryStatus,
  DailyLog,
} from '../types/mind';
import * as E from './endpoints/mind-endpoints';

export interface MindServiceInterface {
  getEntries(type?: MindEntryType, status?: MindEntryStatus): Promise<SafeResult<MindEntry[]>>;
  getSummary(date?: string): Promise<SafeResult<MindSummary>>;
  createEntry(payload: MindEntryPayload): Promise<SafeResult<MindEntry>>;
  updateEntry(id: string, payload: MindEntryPayload): Promise<SafeResult<MindEntry>>;
  updateStatus(id: string, payload: MindStatusPayload): Promise<SafeResult<MindEntry>>;
  convertEntry(id: string): Promise<SafeResult<MindEntry>>;
  deleteEntry(id: string): Promise<SafeResult<unknown>>;
  saveMood(date: string, moodScore: number): Promise<SafeResult<unknown>>;
  getDailyLogRange(startDate: string, endDate: string): Promise<SafeResult<DailyLog[]>>;
}

export const mindService: MindServiceInterface = {
  getEntries: (type, status) =>
    instance.safeCall<MindEntry[]>(E.API_GET_MIND_ENTRIES, { query: { type, status } }),
  getSummary: (date) => instance.safeCall<MindSummary>(E.API_GET_MIND_SUMMARY, { query: { date } }),
  createEntry: (payload) => instance.safeCall<MindEntry>(E.API_CREATE_MIND_ENTRY, { body: payload }),
  updateEntry: (id, payload) => instance.safeCall<MindEntry>(E.API_UPDATE_MIND_ENTRY, { params: { id }, body: payload }),
  updateStatus: (id, payload) => instance.safeCall<MindEntry>(E.API_UPDATE_MIND_STATUS, { params: { id }, body: payload }),
  convertEntry: (id) => instance.safeCall<MindEntry>(E.API_CONVERT_MIND_ENTRY, { params: { id } }),
  deleteEntry: (id) => instance.safeCall(E.API_DELETE_MIND_ENTRY, { params: { id } }),
  saveMood: (date, moodScore) => instance.safeCall(E.API_SAVE_MIND_MOOD, { query: { date }, body: { moodScore } }),
  getDailyLogRange: (startDate, endDate) =>
    instance.safeCall<DailyLog[]>(E.API_GET_DAILY_LOG_RANGE, { query: { startDate, endDate } }),
};
