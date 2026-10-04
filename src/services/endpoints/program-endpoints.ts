// Declarative Program endpoint descriptors (ProgramController, /api/v1/program).
import type { ApiEndpoint } from '../api-config';

export const API_GET_PROGRAM: ApiEndpoint = { url: '/program', method: 'get' };
export const API_START_PROGRAM: ApiEndpoint = { url: '/program', method: 'post' };
export const API_UPDATE_PROGRAM: ApiEndpoint<{ id: string }> = { url: ({ id }) => `/program/${id}`, method: 'put' };
export const API_DELETE_PROGRAM: ApiEndpoint<{ id: string }> = { url: ({ id }) => `/program/${id}`, method: 'delete' };
export const API_WRITE_PROGRAM_LETTER: ApiEndpoint<{ id: string; key: string }> = {
  url: ({ id, key }) => `/program/${id}/letters/${key}`,
  method: 'put',
};
export const API_ADD_PROGRAM_LOG: ApiEndpoint<{ id: string }> = { url: ({ id }) => `/program/${id}/logs`, method: 'post' };
export const API_UPDATE_PROGRAM_LOG: ApiEndpoint<{ id: string; logId: string }> = {
  url: ({ id, logId }) => `/program/${id}/logs/${logId}`,
  method: 'put',
};
export const API_DELETE_PROGRAM_LOG: ApiEndpoint<{ id: string; logId: string }> = {
  url: ({ id, logId }) => `/program/${id}/logs/${logId}`,
  method: 'delete',
};
export const API_SAVE_PROGRAM_REVIEW: ApiEndpoint<{ id: string; weekStart: string }> = {
  url: ({ id, weekStart }) => `/program/${id}/reviews/${weekStart}`,
  method: 'put',
};
export const API_ADD_PROGRAM_ASSESSMENT: ApiEndpoint<{ id: string }> = { url: ({ id }) => `/program/${id}/assessments`, method: 'post' };
export const API_DELETE_PROGRAM_ASSESSMENT: ApiEndpoint<{ id: string; assessmentId: string }> = {
  url: ({ id, assessmentId }) => `/program/${id}/assessments/${assessmentId}`,
  method: 'delete',
};
export const API_ADD_PROGRAM_MEDIA: ApiEndpoint<{ id: string }> = { url: ({ id }) => `/program/${id}/media`, method: 'post' };
export const API_GET_PROGRAM_MEDIA: ApiEndpoint<{ id: string; mediaId: string }> = {
  url: ({ id, mediaId }) => `/program/${id}/media/${mediaId}`,
  method: 'get',
};
export const API_DELETE_PROGRAM_MEDIA: ApiEndpoint<{ id: string; mediaId: string }> = {
  url: ({ id, mediaId }) => `/program/${id}/media/${mediaId}`,
  method: 'delete',
};
