// Declarative notification-centre endpoint descriptors.
import type { ApiEndpoint } from '../api-config';

export const API_LIST_NOTIFICATIONS: ApiEndpoint = { url: '/notifications', method: 'get' };
export const API_ACK_NOTIFICATION: ApiEndpoint<{ id: string }> = {
  url: ({ id }) => `/notifications/${id}/ack`,
  method: 'post',
};
export const API_READ_NOTIFICATION: ApiEndpoint<{ id: string }> = {
  url: ({ id }) => `/notifications/${id}/read`,
  method: 'post',
};
export const API_READ_ALL_NOTIFICATIONS: ApiEndpoint = { url: '/notifications/read-all', method: 'post' };
export const API_DISMISS_NOTIFICATION: ApiEndpoint<{ id: string }> = {
  url: ({ id }) => `/notifications/${id}/dismiss`,
  method: 'post',
};
export const API_DISMISS_ALL_NOTIFICATIONS: ApiEndpoint = { url: '/notifications/dismiss-all', method: 'post' };
