// Declarative Tasks endpoint descriptors, ported 1:1 from lib/api.ts.
import type { ApiEndpoint } from '../api-config';

export const API_GET_TASKS: ApiEndpoint = { url: '/learnings/tasks', method: 'get' };
export const API_GET_TASKS_RANGE: ApiEndpoint = { url: '/learnings/tasks/range', method: 'get' };
export const API_ADD_TASK: ApiEndpoint = { url: '/learnings/tasks', method: 'post' };
export const API_UPDATE_TASK: ApiEndpoint<{ id: string }> = {
  url: ({ id }) => `/learnings/tasks/${id}`,
  method: 'put',
};
export const API_TOGGLE_TASK: ApiEndpoint<{ id: string }> = {
  url: ({ id }) => `/learnings/tasks/${id}/toggle`,
  method: 'patch',
};
export const API_DELETE_TASK: ApiEndpoint<{ id: string }> = {
  url: ({ id }) => `/learnings/tasks/${id}`,
  method: 'delete',
};
