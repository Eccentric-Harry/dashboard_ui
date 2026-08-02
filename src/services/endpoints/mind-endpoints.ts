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
