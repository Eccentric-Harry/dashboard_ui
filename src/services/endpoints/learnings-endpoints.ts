// Declarative Learnings endpoint descriptors, ported 1:1 from lib/api.ts.
import type { ApiEndpoint } from '../api-config';

export const API_GET_LEARNINGS: ApiEndpoint = { url: '/learnings', method: 'get' };
export const API_GET_LEARNINGS_RANGE: ApiEndpoint = { url: '/learnings/range', method: 'get' };
export const API_GET_LEARNINGS_SUMMARY: ApiEndpoint = { url: '/dashboard/learnings-summary', method: 'get' };
export const API_ADD_LEARNING: ApiEndpoint = { url: '/learnings', method: 'post' };
export const API_UPDATE_LEARNING: ApiEndpoint<{ id: string }> = {
  url: ({ id }) => `/learnings/${id}`,
  method: 'put',
};
export const API_DELETE_LEARNING: ApiEndpoint<{ id: string }> = {
  url: ({ id }) => `/learnings/${id}`,
  method: 'delete',
};

// ── Pursuits ──
export const API_GET_PURSUITS: ApiEndpoint = { url: '/pursuits', method: 'get' };
export const API_CREATE_PURSUIT: ApiEndpoint = { url: '/pursuits', method: 'post' };
export const API_UPDATE_PURSUIT: ApiEndpoint<{ id: string }> = {
  url: ({ id }) => `/pursuits/${id}`,
  method: 'put',
};
export const API_DELETE_PURSUIT: ApiEndpoint<{ id: string }> = {
  url: ({ id }) => `/pursuits/${id}`,
  method: 'delete',
};
export const API_TOGGLE_PURSUIT_STEP: ApiEndpoint<{ id: string; stepId: string }> = {
  url: ({ id, stepId }) => `/pursuits/${id}/steps/${stepId}`,
  method: 'patch',
};
export const API_UPDATE_PURSUIT_STEP: ApiEndpoint<{ id: string; stepId: string }> = {
  url: ({ id, stepId }) => `/pursuits/${id}/steps/${stepId}`,
  method: 'put',
};
export const API_DELETE_PURSUIT_STEP: ApiEndpoint<{ id: string; stepId: string }> = {
  url: ({ id, stepId }) => `/pursuits/${id}/steps/${stepId}`,
  method: 'delete',
};
