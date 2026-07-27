// Declarative Focus-session endpoint descriptors, ported 1:1 from lib/api.ts.
import type { ApiEndpoint } from '../api-config';

export const API_GET_CURRENT_SESSION: ApiEndpoint = { url: '/focus/current', method: 'get' };
export const API_START_SESSION: ApiEndpoint = { url: '/focus/start', method: 'post' };
export const API_PAUSE_SESSION: ApiEndpoint = { url: '/focus/pause', method: 'post' };
export const API_RESUME_SESSION: ApiEndpoint = { url: '/focus/resume', method: 'post' };
export const API_CANCEL_SESSION: ApiEndpoint = { url: '/focus/cancel', method: 'post' };
export const API_COMPLETE_SESSION: ApiEndpoint = { url: '/focus/complete', method: 'post' };
export const API_GET_FOCUS_HISTORY: ApiEndpoint = { url: '/focus/history', method: 'get' };
