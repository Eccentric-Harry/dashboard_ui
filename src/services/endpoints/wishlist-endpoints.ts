// Declarative Wishlist endpoint descriptors.
import type { ApiEndpoint } from '../api-config';

const byId = (suffix = ''): ApiEndpoint<{ id: string }>['url'] => ({ id }) => `/wishlist/${id}${suffix}`;

export const API_GET_WISHLIST: ApiEndpoint = { url: '/wishlist', method: 'get' };
export const API_PREVIEW_WISH_LINK: ApiEndpoint = { url: '/wishlist/preview', method: 'post' };
export const API_CREATE_WISH: ApiEndpoint = { url: '/wishlist', method: 'post' };
export const API_UPDATE_WISH: ApiEndpoint<{ id: string }> = { url: byId(), method: 'put' };
export const API_REFRESH_WISH: ApiEndpoint<{ id: string }> = { url: byId('/refresh'), method: 'post' };
export const API_BUY_WISH: ApiEndpoint<{ id: string }> = { url: byId('/buy'), method: 'post' };
export const API_SAVE_FOR_WISH: ApiEndpoint<{ id: string }> = { url: byId('/save-for'), method: 'post' };
export const API_LET_GO_WISH: ApiEndpoint<{ id: string }> = { url: byId('/let-go'), method: 'post' };
export const API_REOPEN_WISH: ApiEndpoint<{ id: string }> = { url: byId('/reopen'), method: 'post' };
export const API_DELETE_WISH: ApiEndpoint<{ id: string }> = { url: byId(), method: 'delete' };
