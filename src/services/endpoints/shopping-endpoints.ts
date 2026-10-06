// Declarative Shopping endpoint descriptors.
import type { ApiEndpoint } from '../api-config';

export const API_GET_SHOPPING_ITEMS: ApiEndpoint = { url: '/shopping/items', method: 'get' };
export const API_ADD_SHOPPING_ITEM: ApiEndpoint = { url: '/shopping/items', method: 'post' };
export const API_ADD_SHOPPING_ITEMS: ApiEndpoint = { url: '/shopping/items/batch', method: 'post' };
export const API_UPDATE_SHOPPING_ITEM: ApiEndpoint<{ id: string }> = {
  url: ({ id }) => `/shopping/items/${id}`,
  method: 'put',
};
export const API_CHECK_SHOPPING_ITEM: ApiEndpoint<{ id: string }> = {
  url: ({ id }) => `/shopping/items/${id}/checked`,
  method: 'patch',
};
export const API_DELETE_SHOPPING_ITEM: ApiEndpoint<{ id: string }> = {
  url: ({ id }) => `/shopping/items/${id}`,
  method: 'delete',
};
export const API_CLEAR_CHECKED_SHOPPING_ITEMS: ApiEndpoint = { url: '/shopping/items/clear-checked', method: 'post' };
export const API_CHECKOUT_SHOPPING: ApiEndpoint = { url: '/shopping/items/checkout', method: 'post' };
export const API_GET_SHOPPING_SUGGESTIONS: ApiEndpoint = { url: '/shopping/suggestions', method: 'get' };
export const API_FORGET_SHOPPING_SUGGESTION: ApiEndpoint = { url: '/shopping/suggestions/forget', method: 'post' };
