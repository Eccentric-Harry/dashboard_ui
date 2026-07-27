// Dashboard service. The /dashboard endpoint aggregates across every domain
// (health, finance, workouts, circularGoals, ...) with no single stable
// contract on the frontend today (the 12 existing consumers already read it
// as `any`/loosely-typed). Kept as `unknown` here rather than inventing an
// interface unverified against the real backend response — narrowing this is
// tracked as a follow-up, not silently guessed at during this migration.

import { instance } from './http/api-request';
import type { SafeResult } from '../types/api';
import * as E from './endpoints/dashboard-endpoints';

export interface DashboardServiceInterface {
  getDashboard(date?: string): Promise<SafeResult<unknown>>;
}

export const dashboardService: DashboardServiceInterface = {
  getDashboard: (date) => instance.safeCall<unknown>(E.API_GET_DASHBOARD, { query: { date } }),
};
