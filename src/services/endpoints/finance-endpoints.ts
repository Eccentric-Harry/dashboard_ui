// Declarative Finance endpoint descriptors.
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

export const API_RECLASSIFY_CATEGORY: ApiEndpoint = { url: '/finance/categories/reclassify', method: 'post' };

export const API_GET_SLICE_REPAYMENTS: ApiEndpoint = { url: '/finance/slice-repayments', method: 'get' };

export const API_GET_SUBSCRIPTIONS: ApiEndpoint = { url: '/subscriptions', method: 'get' };
export const API_ADD_SUBSCRIPTION: ApiEndpoint = { url: '/subscriptions', method: 'post' };
export const API_UPDATE_SUBSCRIPTION: ApiEndpoint<{ id: string }> = {
  url: ({ id }) => `/subscriptions/${id}`,
  method: 'put',
};
export const API_DELETE_SUBSCRIPTION: ApiEndpoint<{ id: string }> = {
  url: ({ id }) => `/subscriptions/${id}`,
  method: 'delete',
};
export const API_PAY_SUBSCRIPTION: ApiEndpoint<{ id: string }> = {
  url: ({ id }) => `/subscriptions/${id}/payments`,
  method: 'post',
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

export const API_UPDATE_INCOME_PLAN: ApiEndpoint = { url: '/finance/account/income', method: 'put' };

export const API_GET_SAVINGS_GOALS: ApiEndpoint = { url: '/savings-goals', method: 'get' };
export const API_ADD_SAVINGS_GOAL: ApiEndpoint = { url: '/savings-goals', method: 'post' };
export const API_UPDATE_SAVINGS_GOAL: ApiEndpoint<{ id: string }> = {
  url: ({ id }) => `/savings-goals/${id}`,
  method: 'put',
};
export const API_SET_ASIDE_FOR_GOAL: ApiEndpoint<{ id: string }> = {
  url: ({ id }) => `/savings-goals/${id}/set-aside`,
  method: 'post',
};
export const API_TAKE_OUT_OF_GOAL: ApiEndpoint<{ id: string }> = {
  url: ({ id }) => `/savings-goals/${id}/take-out`,
  method: 'post',
};
export const API_BUY_GOAL: ApiEndpoint<{ id: string }> = {
  url: ({ id }) => `/savings-goals/${id}/buy`,
  method: 'post',
};
export const API_FIND_GOAL_SHOWCASE: ApiEndpoint<{ id: string }> = {
  url: ({ id }) => `/savings-goals/${id}/showcase/find`,
  method: 'post',
};
export const API_UPDATE_GOAL_SHOWCASE: ApiEndpoint<{ id: string }> = {
  url: ({ id }) => `/savings-goals/${id}/showcase`,
  method: 'put',
};
export const API_ARCHIVE_GOAL: ApiEndpoint<{ id: string }> = {
  url: ({ id }) => `/savings-goals/${id}/archive`,
  method: 'post',
};
