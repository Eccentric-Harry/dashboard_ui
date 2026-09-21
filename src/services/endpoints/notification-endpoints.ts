// Declarative notification-centre endpoint descriptors.
import type { ApiEndpoint } from '../api-config';

/**
 * Notification ids are composite (user, source, occurrence date, kind) and travel as a path
 * segment, so they are encoded here. The backend keeps them inside the unreserved character
 * set, but records created before that fix contain a raw '|' — which Tomcat rejects with a
 * 400 before the request reaches a controller. Encoding keeps those old records usable.
 */
const idPath = (id: string) => encodeURIComponent(id);

export const API_LIST_NOTIFICATIONS: ApiEndpoint = { url: '/notifications', method: 'get' };
export const API_NOTIFICATION_DIAGNOSTICS: ApiEndpoint = { url: '/notifications/diagnostics', method: 'get' };
export const API_ACK_NOTIFICATION: ApiEndpoint<{ id: string }> = {
  url: ({ id }) => `/notifications/${idPath(id)}/ack`,
  method: 'post',
};
export const API_READ_NOTIFICATION: ApiEndpoint<{ id: string }> = {
  url: ({ id }) => `/notifications/${idPath(id)}/read`,
  method: 'post',
};
export const API_READ_ALL_NOTIFICATIONS: ApiEndpoint = { url: '/notifications/read-all', method: 'post' };
export const API_DISMISS_NOTIFICATION: ApiEndpoint<{ id: string }> = {
  url: ({ id }) => `/notifications/${idPath(id)}/dismiss`,
  method: 'post',
};
export const API_DISMISS_ALL_NOTIFICATIONS: ApiEndpoint = { url: '/notifications/dismiss-all', method: 'post' };
