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
  MindLane,
  MindNoticedPayload,
  MindPredictionPayload,
  MindVerdictPayload,
  MindSpiralPayload,
  MindWorryLedger,
  MindLoopRadarDay,
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

  /** One-tap "noticed, moving on". Payload is optional; any text is sealed server-side. */
  noticed(payload?: MindNoticedPayload): Promise<SafeResult<MindEntry>>;
  setLane(id: string, lane: MindLane): Promise<SafeResult<MindEntry>>;
  savePrediction(id: string, payload: MindPredictionPayload): Promise<SafeResult<MindEntry>>;
  saveVerdict(id: string, payload: MindVerdictPayload): Promise<SafeResult<MindEntry>>;
  getWorryLedger(): Promise<SafeResult<MindWorryLedger>>;
  /** Returns sealed text. Call only from behind an explicit confirm step. */
  getSealedEntries(): Promise<SafeResult<MindEntry[]>>;
  logSpiral(payload: MindSpiralPayload): Promise<SafeResult<MindEntry>>;
  getLoopRadar(days?: number): Promise<SafeResult<MindLoopRadarDay[]>>;
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

  noticed: (payload) => instance.safeCall<MindEntry>(E.API_MIND_NOTICED, { body: payload ?? {} }),
  setLane: (id, lane) => instance.safeCall<MindEntry>(E.API_SET_MIND_LANE, { params: { id }, body: { lane } }),
  savePrediction: (id, payload) =>
    instance.safeCall<MindEntry>(E.API_SAVE_MIND_PREDICTION, { params: { id }, body: payload }),
  saveVerdict: (id, payload) =>
    instance.safeCall<MindEntry>(E.API_SAVE_MIND_VERDICT, { params: { id }, body: payload }),
  getWorryLedger: () => instance.safeCall<MindWorryLedger>(E.API_GET_MIND_WORRY_LEDGER),
  getSealedEntries: () => instance.safeCall<MindEntry[]>(E.API_GET_MIND_SEALED),
  logSpiral: (payload) => instance.safeCall<MindEntry>(E.API_LOG_MIND_SPIRAL, { body: payload }),
  getLoopRadar: (days) => instance.safeCall<MindLoopRadarDay[]>(E.API_GET_MIND_LOOP_RADAR, { query: { days } }),
};
