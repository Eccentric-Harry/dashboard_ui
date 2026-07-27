// Strictly-typed Workouts service — one-liners over instance.safeCall<T>().

import { instance } from './http/api-request';
import type { SafeResult } from '../types/api';
import type {
  StravaActivity,
  StravaActivityStats,
  CreateStravaActivityRequest,
  FeaturedEmbedRequest,
} from '../types/workouts';
import * as E from './endpoints/workouts-endpoints';

export interface WorkoutsServiceInterface {
  getWorkouts(): Promise<SafeResult<unknown>>;
  getActivities(): Promise<SafeResult<StravaActivity[]>>;
  getStats(): Promise<SafeResult<StravaActivityStats>>;
  createActivity(dto: CreateStravaActivityRequest): Promise<SafeResult<StravaActivity>>;
  importStravaJson(payload: unknown): Promise<SafeResult<unknown>>;
  getFeaturedEmbed(): Promise<SafeResult<{ id: string; token?: string }>>;
  updateFeaturedEmbed(dto: FeaturedEmbedRequest): Promise<SafeResult<unknown>>;
}

export const workoutsService: WorkoutsServiceInterface = {
  getWorkouts: () => instance.safeCall(E.API_GET_WORKOUTS),
  getActivities: () => instance.safeCall<StravaActivity[]>(E.API_GET_STRAVA_ACTIVITIES),
  getStats: () => instance.safeCall<StravaActivityStats>(E.API_GET_STRAVA_STATS),
  createActivity: (dto) => instance.safeCall<StravaActivity>(E.API_CREATE_STRAVA_ACTIVITY, { body: dto }),
  importStravaJson: (payload) => instance.safeCall(E.API_IMPORT_STRAVA_JSON, { body: payload }),
  getFeaturedEmbed: () => instance.safeCall<{ id: string; token?: string }>(E.API_GET_FEATURED_EMBED),
  updateFeaturedEmbed: (dto) => instance.safeCall(E.API_UPDATE_FEATURED_EMBED, { body: dto }),
};
