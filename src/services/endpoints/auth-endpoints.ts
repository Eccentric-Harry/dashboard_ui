// Declarative Auth endpoint descriptors, ported 1:1 from lib/api.ts.
import type { ApiEndpoint } from '../api-config';

export const API_VERIFY_PASSCODE: ApiEndpoint = { url: '/auth/verify', method: 'post' };
export const API_LOGIN: ApiEndpoint = { url: '/auth/login', method: 'post' };
export const API_SIGNUP: ApiEndpoint = { url: '/auth/signup', method: 'post' };
