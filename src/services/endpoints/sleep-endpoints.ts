// Declarative Sleep endpoint descriptors, ported 1:1 from lib/api.ts.
// Two parallel subsystems: /sleep (SleepEntry) and /health/sleep (SleepLog).
import type { ApiEndpoint } from '../api-config';

export const API_GET_SLEEP_ENTRIES: ApiEndpoint = { url: '/sleep', method: 'get' };
export const API_LOG_SLEEP_ENTRY: ApiEndpoint = { url: '/sleep', method: 'post' };
export const API_UPDATE_SLEEP_ENTRY: ApiEndpoint<{ id: string }> = {
  url: ({ id }) => `/sleep/${id}`,
  method: 'put',
};
export const API_DELETE_SLEEP_ENTRY: ApiEndpoint<{ id: string }> = {
  url: ({ id }) => `/sleep/${id}`,
  method: 'delete',
};

export const API_ADD_SLEEP_LOG: ApiEndpoint = { url: '/health/sleep', method: 'post' };
export const API_GET_SLEEP_LOGS: ApiEndpoint = { url: '/health/sleep', method: 'get' };
