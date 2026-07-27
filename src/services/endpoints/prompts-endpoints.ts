// Declarative Prompts endpoint descriptors, ported 1:1 from lib/api.ts.
import type { ApiEndpoint } from '../api-config';

export const API_GET_PROMPTS: ApiEndpoint = { url: '/prompts', method: 'get' };
export const API_CREATE_PROMPT: ApiEndpoint = { url: '/prompts', method: 'post' };
export const API_UPDATE_PROMPT: ApiEndpoint<{ id: string }> = {
  url: ({ id }) => `/prompts/${id}`,
  method: 'put',
};
export const API_DELETE_PROMPT: ApiEndpoint<{ id: string }> = {
  url: ({ id }) => `/prompts/${id}`,
  method: 'delete',
};
