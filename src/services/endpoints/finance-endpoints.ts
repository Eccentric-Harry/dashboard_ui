// Declarative Finance endpoint descriptors, ported 1:1 from the URLs in lib/api.ts.
import type { ApiEndpoint } from '../api-config';

export const API_GET_FINANCE_DAILY_LOGS: ApiEndpoint = { url: '/finance/daily-logs', method: 'get' };
export const API_GET_SPENDING_SUMMARY: ApiEndpoint = { url: '/dashboard/spending-summary', method: 'get' };

export const API_GET_FINANCE_ACCOUNT: ApiEndpoint = { url: '/finance/account', method: 'get' };
export const API_UPDATE_FINANCE_BALANCE: ApiEndpoint = { url: '/finance/account/balance', method: 'put' };
export const API_GET_FINANCE_BUDGET: ApiEndpoint = { url: '/finance/budget', method: 'get' };
export const API_UPDATE_FINANCE_BUDGET: ApiEndpoint = { url: '/finance/budget', method: 'put' };

export const API_ADD_TRANSACTION: ApiEndpoint = { url: '/finance/transactions', method: 'post' };
export const API_UPDATE_TRANSACTION: ApiEndpoint<{ id: string }> = {
  url: ({ id }) => `/finance/transactions/${id}`,
  method: 'put',
};
export const API_DELETE_TRANSACTION: ApiEndpoint<{ id: string }> = {
  url: ({ id }) => `/finance/transactions/${id}`,
  method: 'delete',
};

export const API_GET_SLICE_REPAYMENTS: ApiEndpoint = { url: '/finance/slice-repayments', method: 'get' };

export const API_GET_SUBSCRIPTIONS: ApiEndpoint = { url: '/subscriptions', method: 'get' };
export const API_ADD_SUBSCRIPTION: ApiEndpoint = { url: '/subscriptions', method: 'post' };
export const API_DELETE_SUBSCRIPTION: ApiEndpoint<{ id: string }> = {
  url: ({ id }) => `/subscriptions/${id}`,
  method: 'delete',
};

export const API_GET_LENDING: ApiEndpoint = { url: '/finance/lending', method: 'get' };
export const API_ADD_LENDING: ApiEndpoint = { url: '/finance/lending', method: 'post' };
export const API_UPDATE_LENDING: ApiEndpoint<{ id: string }> = {
  url: ({ id }) => `/finance/lending/${id}`,
  method: 'put',
};
export const API_TOGGLE_LENDING: ApiEndpoint<{ id: string }> = {
  url: ({ id }) => `/finance/lending/${id}/toggle`,
  method: 'patch',
};
export const API_DELETE_LENDING: ApiEndpoint<{ id: string }> = {
  url: ({ id }) => `/finance/lending/${id}`,
  method: 'delete',
};
