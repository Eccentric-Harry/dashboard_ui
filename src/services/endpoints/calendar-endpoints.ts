// Declarative Calendar + Google-sync endpoint descriptors, ported from lib/api.ts.
import type { ApiEndpoint } from '../api-config';

export const API_GET_CALENDAR_RANGE: ApiEndpoint = { url: '/calendar/items/range', method: 'get' };
export const API_CREATE_CALENDAR_ITEM: ApiEndpoint = { url: '/calendar/items', method: 'post' };
export const API_UPDATE_CALENDAR_ITEM: ApiEndpoint<{ id: string }> = {
  url: ({ id }) => `/calendar/items/${id}`,
  method: 'put',
};
export const API_TOGGLE_CALENDAR_ITEM: ApiEndpoint<{ id: string }> = {
  url: ({ id }) => `/calendar/items/${id}/toggle`,
  method: 'patch',
};
export const API_TOGGLE_CANCEL_CALENDAR_ITEM: ApiEndpoint<{ id: string }> = {
  url: ({ id }) => `/calendar/items/${id}/toggle-cancel`,
  method: 'patch',
};
export const API_DELETE_CALENDAR_ITEM: ApiEndpoint<{ id: string }> = {
  url: ({ id }) => `/calendar/items/${id}`,
  method: 'delete',
};

export const API_GET_GOOGLE_STATUS: ApiEndpoint = { url: '/google-calendar/auth/status', method: 'get' };
export const API_GET_GOOGLE_AUTH_URL: ApiEndpoint = { url: '/google-calendar/auth/url', method: 'get' };
export const API_DISCONNECT_GOOGLE: ApiEndpoint = { url: '/google-calendar/auth/disconnect', method: 'post' };
export const API_SYNC_GOOGLE: ApiEndpoint = { url: '/google-calendar/sync', method: 'post' };
export const API_PUSH_LOCAL_GOOGLE: ApiEndpoint = { url: '/google-calendar/push-local', method: 'post' };
