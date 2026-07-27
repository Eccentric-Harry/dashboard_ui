// Strictly-typed Sleep service — one-liners over instance.safeCall<T>().
import { instance } from './http/api-request';
import type { SafeResult } from '../types/api';
import type { SleepEntry, SleepEntryPayload, SleepLog } from '../types/sleep';
import * as E from './endpoints/sleep-endpoints';

interface AddSleepLogRequest {
  date: string;
  bedTime: string;
  wakeTime: string;
  durationMinutes: number;
  notes?: string;
}

export interface SleepServiceInterface {
  getEntries(startDate: string, endDate: string): Promise<SafeResult<SleepEntry[]>>;
  logEntry(payload: SleepEntryPayload): Promise<SafeResult<SleepEntry>>;
  updateEntry(id: string, payload: SleepEntryPayload): Promise<SafeResult<SleepEntry>>;
  deleteEntry(id: string): Promise<SafeResult<null>>;
  addSleepLog(dto: AddSleepLogRequest): Promise<SafeResult<SleepLog>>;
  getSleepLogs(days?: number): Promise<SafeResult<SleepLog[]>>;
}

export const sleepService: SleepServiceInterface = {
  getEntries: (startDate, endDate) =>
    instance.safeCall<SleepEntry[]>(E.API_GET_SLEEP_ENTRIES, { query: { startDate, endDate } }),
  logEntry: (payload) => instance.safeCall<SleepEntry>(E.API_LOG_SLEEP_ENTRY, { body: payload }),
  updateEntry: (id, payload) =>
    instance.safeCall<SleepEntry>(E.API_UPDATE_SLEEP_ENTRY, { params: { id }, body: payload }),
  deleteEntry: (id) => instance.safeCall<null>(E.API_DELETE_SLEEP_ENTRY, { params: { id } }),
  addSleepLog: (dto) => instance.safeCall<SleepLog>(E.API_ADD_SLEEP_LOG, { body: dto }),
  getSleepLogs: (days) => instance.safeCall<SleepLog[]>(E.API_GET_SLEEP_LOGS, { query: { days } }),
};
