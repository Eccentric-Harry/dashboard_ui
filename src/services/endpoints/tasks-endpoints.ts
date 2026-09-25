// Declarative Tasks endpoint descriptors.
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

// ── Google Tasks sync ──
export const API_GOOGLE_TASKS_STATUS: ApiEndpoint = { url: '/google-tasks/status', method: 'get' };
export const API_GOOGLE_TASKS_ENABLE: ApiEndpoint = { url: '/google-tasks/enable', method: 'post' };
export const API_GOOGLE_TASKS_DISABLE: ApiEndpoint = { url: '/google-tasks/disable', method: 'post' };
export const API_GOOGLE_TASKS_SYNC: ApiEndpoint = { url: '/google-tasks/sync', method: 'post' };
export const API_GOOGLE_TASKS_REFRESH: ApiEndpoint = { url: '/google-tasks/refresh', method: 'post' };
