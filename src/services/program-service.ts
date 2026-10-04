// Strictly-typed Program service — one-liners over instance.safeCall<T>(). The Lighthouse
// reads everything with getState and derives its views client-side; each write returns the
// one thing it changed, which the store swaps in.
import { instance } from './http/api-request';
import type { SafeResult } from '../types/api';
import type {
  Program,
  ProgramAssessment,
  ProgramAssessmentPayload,
  ProgramLetterKey,
  ProgramLog,
  ProgramLogPayload,
  ProgramMedia,
  ProgramMediaPayload,
  ProgramReviewPayload,
  ProgramReviewResult,
  ProgramSettingsPayload,
  ProgramStartPayload,
  ProgramState,
} from '../types/program';
import * as E from './endpoints/program-endpoints';

export interface ProgramServiceInterface {
  getState(today: string): Promise<SafeResult<ProgramState>>;
  start(payload: ProgramStartPayload): Promise<SafeResult<Program>>;
  updateSettings(id: string, payload: ProgramSettingsPayload): Promise<SafeResult<Program>>;
  remove(id: string): Promise<SafeResult<null>>;
  writeLetter(id: string, key: ProgramLetterKey, text: string): Promise<SafeResult<Program>>;
  addLog(id: string, payload: ProgramLogPayload): Promise<SafeResult<ProgramLog>>;
  updateLog(id: string, logId: string, payload: ProgramLogPayload): Promise<SafeResult<ProgramLog>>;
  deleteLog(id: string, logId: string): Promise<SafeResult<null>>;
  saveReview(id: string, weekStart: string, payload: ProgramReviewPayload): Promise<SafeResult<ProgramReviewResult>>;
  addAssessment(id: string, payload: ProgramAssessmentPayload): Promise<SafeResult<ProgramAssessment>>;
  deleteAssessment(id: string, assessmentId: string): Promise<SafeResult<null>>;
  addMedia(id: string, payload: ProgramMediaPayload): Promise<SafeResult<ProgramMedia>>;
  getMedia(id: string, mediaId: string): Promise<SafeResult<ProgramMedia>>;
  deleteMedia(id: string, mediaId: string): Promise<SafeResult<null>>;
}

export const programService: ProgramServiceInterface = {
  getState: (today) => instance.safeCall<ProgramState>(E.API_GET_PROGRAM, { query: { today } }),
  start: (payload) => instance.safeCall<Program>(E.API_START_PROGRAM, { body: payload }),
  updateSettings: (id, payload) => instance.safeCall<Program>(E.API_UPDATE_PROGRAM, { params: { id }, body: payload }),
  remove: (id) => instance.safeCall<null>(E.API_DELETE_PROGRAM, { params: { id } }),
  writeLetter: (id, key, text) => instance.safeCall<Program>(E.API_WRITE_PROGRAM_LETTER, { params: { id, key }, body: { text } }),
  addLog: (id, payload) => instance.safeCall<ProgramLog>(E.API_ADD_PROGRAM_LOG, { params: { id }, body: payload }),
  updateLog: (id, logId, payload) =>
    instance.safeCall<ProgramLog>(E.API_UPDATE_PROGRAM_LOG, { params: { id, logId }, body: payload }),
  deleteLog: (id, logId) => instance.safeCall<null>(E.API_DELETE_PROGRAM_LOG, { params: { id, logId } }),
  saveReview: (id, weekStart, payload) =>
    instance.safeCall<ProgramReviewResult>(E.API_SAVE_PROGRAM_REVIEW, { params: { id, weekStart }, body: payload }),
  addAssessment: (id, payload) => instance.safeCall<ProgramAssessment>(E.API_ADD_PROGRAM_ASSESSMENT, { params: { id }, body: payload }),
  deleteAssessment: (id, assessmentId) =>
    instance.safeCall<null>(E.API_DELETE_PROGRAM_ASSESSMENT, { params: { id, assessmentId } }),
  // A recording or photo upload can take a while on a phone connection.
  addMedia: (id, payload) => instance.safeCall<ProgramMedia>(E.API_ADD_PROGRAM_MEDIA, { params: { id }, body: payload, timeoutMs: 60_000 }),
  getMedia: (id, mediaId) => instance.safeCall<ProgramMedia>(E.API_GET_PROGRAM_MEDIA, { params: { id, mediaId }, timeoutMs: 30_000 }),
  deleteMedia: (id, mediaId) => instance.safeCall<null>(E.API_DELETE_PROGRAM_MEDIA, { params: { id, mediaId } }),
};
