// Declarative Goals endpoint descriptors (GoalController, /api/v1/goals).
import type { ApiEndpoint } from '../api-config';

export const API_GET_GOAL_BOARD: ApiEndpoint = { url: '/goals/board', method: 'get' };
export const API_LIST_GOALS: ApiEndpoint = { url: '/goals', method: 'get' };
export const API_CREATE_GOAL: ApiEndpoint = { url: '/goals', method: 'post' };
export const API_UPDATE_GOAL: ApiEndpoint<{ id: string }> = {
  url: ({ id }) => `/goals/${id}`,
  method: 'put',
};
export const API_SET_GOAL_STATUS: ApiEndpoint<{ id: string }> = {
  url: ({ id }) => `/goals/${id}/status`,
  method: 'patch',
};
export const API_DELETE_GOAL: ApiEndpoint<{ id: string }> = {
  url: ({ id }) => `/goals/${id}`,
  method: 'delete',
};
export const API_ADD_GOAL_CHECKIN: ApiEndpoint<{ id: string }> = {
  url: ({ id }) => `/goals/${id}/checkins`,
  method: 'post',
};
export const API_GET_GOAL_JOURNEY: ApiEndpoint<{ id: string }> = {
  url: ({ id }) => `/goals/${id}/journey`,
  method: 'get',
};
export const API_SAVE_GOAL_KIT_PAGE: ApiEndpoint<{ id: string; page: string }> = {
  url: ({ id, page }) => `/goals/${id}/kit/${page}`,
  method: 'put',
};
export const API_DELETE_GOAL_CHECKIN: ApiEndpoint<{ id: string; checkInId: string }> = {
  url: ({ id, checkInId }) => `/goals/${id}/checkins/${checkInId}`,
  method: 'delete',
};

// The camp (GoalCampController, /api/v1/goals/camp).
export const API_GET_CAMP: ApiEndpoint = { url: '/goals/camp', method: 'get' };
export const API_OPEN_CAMP_CHEST: ApiEndpoint = { url: '/goals/camp/chest/open', method: 'post' };
export const API_CLAIM_CAMP_QUEST: ApiEndpoint = { url: '/goals/camp/quests/claim', method: 'post' };
export const API_BUY_CAMP_ITEM: ApiEndpoint = { url: '/goals/camp/shop/buy', method: 'post' };
export const API_SET_CAMP_LOOK: ApiEndpoint = { url: '/goals/camp/look', method: 'put' };
