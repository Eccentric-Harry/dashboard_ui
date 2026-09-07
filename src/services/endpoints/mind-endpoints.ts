// Declarative Mind endpoint descriptors, ported 1:1 from lib/api.ts.
import type { ApiEndpoint } from '../api-config';

export const API_GET_MIND_ENTRIES: ApiEndpoint = { url: '/mind/entries', method: 'get' };
export const API_GET_MIND_SUMMARY: ApiEndpoint = { url: '/mind/summary', method: 'get' };
export const API_CREATE_MIND_ENTRY: ApiEndpoint = { url: '/mind/entries', method: 'post' };
export const API_UPDATE_MIND_ENTRY: ApiEndpoint<{ id: string }> = {
  url: ({ id }) => `/mind/entries/${id}`,
  method: 'put',
};
export const API_UPDATE_MIND_STATUS: ApiEndpoint<{ id: string }> = {
  url: ({ id }) => `/mind/entries/${id}/status`,
  method: 'patch',
};
export const API_CONVERT_MIND_ENTRY: ApiEndpoint<{ id: string }> = {
  url: ({ id }) => `/mind/entries/${id}/convert`,
  method: 'post',
};
export const API_DELETE_MIND_ENTRY: ApiEndpoint<{ id: string }> = {
  url: ({ id }) => `/mind/entries/${id}`,
  method: 'delete',
};
export const API_SAVE_MIND_MOOD: ApiEndpoint = { url: '/mind/mood', method: 'put' };
export const API_GET_DAILY_LOG_RANGE: ApiEndpoint = { url: '/daily-log/range', method: 'get' };

// --- Triage lanes, worry ledger, sealed archive, spiral breaker, loop radar ---

export const API_MIND_NOTICED: ApiEndpoint = { url: '/mind/noticed', method: 'post' };
export const API_SET_MIND_LANE: ApiEndpoint<{ id: string }> = {
  url: ({ id }) => `/mind/entries/${id}/lane`,
  method: 'patch',
};
export const API_SAVE_MIND_PREDICTION: ApiEndpoint<{ id: string }> = {
  url: ({ id }) => `/mind/entries/${id}/prediction`,
  method: 'put',
};
export const API_SAVE_MIND_VERDICT: ApiEndpoint<{ id: string }> = {
  url: ({ id }) => `/mind/entries/${id}/verdict`,
  method: 'put',
};
export const API_GET_MIND_WORRY_LEDGER: ApiEndpoint = { url: '/mind/worry-ledger', method: 'get' };
/** The only route that returns sealed text. Keep it behind a deliberate confirm step. */
export const API_GET_MIND_SEALED: ApiEndpoint = { url: '/mind/sealed', method: 'get' };
export const API_LOG_MIND_SPIRAL: ApiEndpoint = { url: '/mind/spiral', method: 'post' };
export const API_GET_MIND_LOOP_RADAR: ApiEndpoint = { url: '/mind/loop-radar', method: 'get' };
