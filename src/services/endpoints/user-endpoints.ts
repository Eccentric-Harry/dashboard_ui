// Declarative User/profile endpoint descriptors, ported 1:1 from lib/api.ts.
import type { ApiEndpoint } from '../api-config';

export const API_GET_USER_PROFILE: ApiEndpoint = { url: '/users/profile', method: 'get' };
export const API_UPDATE_USER_PROFILE: ApiEndpoint = { url: '/users/profile', method: 'put' };
