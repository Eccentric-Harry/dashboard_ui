// Declarative User/profile endpoint descriptors.
import type { ApiEndpoint } from '../api-config';

export const API_GET_USER_PROFILE: ApiEndpoint = { url: '/users/profile', method: 'get' };
export const API_UPDATE_USER_PROFILE: ApiEndpoint = { url: '/users/profile', method: 'put' };
export const API_UPDATE_LEARNER_PROFILE: ApiEndpoint = { url: '/users/profile/learner', method: 'put' };
