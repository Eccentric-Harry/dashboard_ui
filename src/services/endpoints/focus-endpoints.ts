// Declarative Focus-session endpoint descriptors, ported 1:1 from lib/api.ts.
import type { ApiEndpoint } from '../api-config';

export const API_GET_CURRENT_SESSION: ApiEndpoint = { url: '/focus/current', method: 'get' };
export const API_START_SESSION: ApiEndpoint = { url: '/focus/start', method: 'post' };
export const API_PAUSE_SESSION: ApiEndpoint = { url: '/focus/pause', method: 'post' };
export const API_RESUME_SESSION: ApiEndpoint = { url: '/focus/resume', method: 'post' };
export const API_CANCEL_SESSION: ApiEndpoint = { url: '/focus/cancel', method: 'post' };
export const API_COMPLETE_SESSION: ApiEndpoint = { url: '/focus/complete', method: 'post' };
export const API_GET_FOCUS_HISTORY: ApiEndpoint = { url: '/focus/history', method: 'get' };

// Retroactive + calendar-derived capture, for focus work done away from the timer.
export const API_LOG_PAST_FOCUS: ApiEndpoint = { url: '/focus/log', method: 'post' };
export const API_DELETE_FOCUS_SESSION: ApiEndpoint<{ id: string }> = {
  url: ({ id }) => `/focus/sessions/${id}`,
  method: 'delete',
};
export const API_GET_FOCUS_CALENDAR_SUGGESTIONS: ApiEndpoint = {
  url: '/focus/calendar-suggestions',
  method: 'get',
};
export const API_IMPORT_FOCUS_FROM_CALENDAR: ApiEndpoint = { url: '/focus/import', method: 'post' };
