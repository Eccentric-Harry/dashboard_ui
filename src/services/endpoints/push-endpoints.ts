// Declarative Web Push endpoint descriptors.
import type { ApiEndpoint } from '../api-config';

export const API_GET_VAPID_KEY: ApiEndpoint = { url: '/push/public-key', method: 'get' };
export const API_SUBSCRIBE_DEVICE: ApiEndpoint = { url: '/push/subscribe', method: 'post' };
export const API_UNSUBSCRIBE_DEVICE: ApiEndpoint = { url: '/push/unsubscribe', method: 'post' };
export const API_PUSH_STATUS: ApiEndpoint = { url: '/push/status', method: 'get' };
export const API_TEST_PUSH: ApiEndpoint = { url: '/push/test', method: 'post' };
