// Declarative Web Push endpoint descriptors, ported 1:1 from lib/api.ts.
import type { ApiEndpoint } from '../api-config';

export const API_GET_VAPID_KEY: ApiEndpoint = { url: '/push/public-key', method: 'get' };
export const API_SUBSCRIBE_DEVICE: ApiEndpoint = { url: '/push/subscribe', method: 'post' };
export const API_UNSUBSCRIBE_DEVICE: ApiEndpoint = { url: '/push/unsubscribe', method: 'post' };
